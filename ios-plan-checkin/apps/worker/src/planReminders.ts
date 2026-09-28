import {
  businessDateAt,
  mondayOfWeek,
  reminderOccurrences,
  startOfBusinessDate,
  type BusinessDate,
  type IsoWeekday,
  type ReminderOccurrence,
  type ReminderPlanInput,
} from "@plan-checkin/domain";
import type { Pool } from "pg";
import { sendWebPushToUser } from "./webNotifications.js";
import { WebPushError, type WebPushSender } from "./webPush.js";

interface PlanRow {
  id: string;
  owner_id: string;
  kind: "fixed" | "weekly" | "one_time";
  status: "active" | "paused" | "archived" | "deleted";
  title: string;
  timezone: string;
  start_date: BusinessDate;
  end_date: BusinessDate | null;
  due_date: BusinessDate | null;
  enabled: boolean;
  time_local: string | null;
  reminder_weekdays: IsoWeekday[] | null;
  lead_days: 0 | 1 | 3 | null;
  rule_weekdays: IsoWeekday[] | null;
  weekly_target: number | null;
  terminal: boolean;
}
interface ReminderJob {
  id: string;
  payload: {
    userId: string;
    planId: string;
    businessDate: BusinessDate;
    when: string;
    channel: "web";
  };
  attempts: number;
}

async function dueOccurrence(
  pool: Pool,
  planId: string,
  at: Date,
): Promise<{ ownerId: string; occurrence: ReminderOccurrence } | null> {
  const plan = await pool.query<Pick<PlanRow, "timezone">>(
    "SELECT timezone FROM plans WHERE id=$1",
    [planId],
  );
  const timezone = plan.rows[0]?.timezone;
  if (!timezone) return null;
  const today = businessDateAt(at, timezone);
  const found = await pool.query<PlanRow>(
    `SELECT p.id,p.owner_id,p.kind,p.status,p.title,p.timezone,
       p.start_date::text,p.end_date::text,p.due_date::text,
       s.enabled,s.time_local::text,s.weekdays AS reminder_weekdays,s.lead_days,
       r.weekdays AS rule_weekdays,r.weekly_target,
       EXISTS(SELECT 1 FROM one_time_resolutions o WHERE o.plan_id=p.id) AS terminal
     FROM plans p JOIN users u ON u.id=p.owner_id AND u.status='active'
     JOIN reminder_settings s ON s.plan_id=p.id
     LEFT JOIN LATERAL (
       SELECT weekdays,weekly_target FROM plan_rule_versions r
       WHERE r.plan_id=p.id AND r.effective_date<=$2::date
       ORDER BY r.effective_date DESC LIMIT 1
     ) r ON true
     WHERE p.id=$1 AND p.status='active' AND s.enabled`,
    [planId, today],
  );
  const row = found.rows[0];
  if (!row) return null;
  const dates = await pool.query<{
    business_date: BusinessDate;
    result: string;
  }>(
    `SELECT business_date::text,result FROM checkins
     WHERE plan_id=$1 AND business_date BETWEEN $2::date AND $3::date`,
    [planId, mondayOfWeek(today), today],
  );
  const input: ReminderPlanInput = {
    id: row.id,
    title: row.title,
    kind: row.kind,
    lifecycle: row.status,
    timezone: row.timezone,
    startDate: row.start_date,
    endDate: row.end_date,
    dueDate: row.due_date,
    fixedWeekdays: row.rule_weekdays ?? [],
    weeklyTarget: row.weekly_target,
    terminal: row.terminal,
    recordedDates: dates.rows.map((item) => item.business_date),
    currentWeekSuccesses: dates.rows.filter((item) => item.result === "success")
      .length,
    reminder: {
      enabled: row.enabled,
      timeLocal: row.time_local?.slice(0, 5) ?? null,
      weekdays: row.reminder_weekdays ?? [],
      daysBeforeDue: row.lead_days,
    },
  };
  // The domain function emits future occurrences. Evaluate from the previous
  // local instant so an occurrence already due today can still be rechecked.
  const beforeToday = new Date(
    startOfBusinessDate(today, timezone).getTime() - 1,
  );
  const occurrence = reminderOccurrences(input, beforeToday, 2).find(
    (item) => item.businessDate === today,
  );
  return occurrence ? { ownerId: row.owner_id, occurrence } : null;
}

export async function enqueuePlanReminders(
  pool: Pool,
  at = new Date(),
): Promise<number> {
  const plans = await pool.query<{ id: string }>(
    `SELECT p.id FROM plans p JOIN reminder_settings s ON s.plan_id=p.id AND s.enabled
     JOIN users u ON u.id=p.owner_id AND u.status='active'
     WHERE p.status='active'`,
  );
  let queued = 0;
  for (const plan of plans.rows) {
    const due = await dueOccurrence(pool, plan.id, at);
    if (!due || due.occurrence.when.getTime() < at.getTime() - 60 * 60_000)
      continue;
    const { occurrence, ownerId } = due;
    const dedupe = `plan:${ownerId}:${plan.id}:${occurrence.businessDate}:${occurrence.when.toISOString()}:web`;
    const inserted = await pool.query(
      `INSERT INTO worker_jobs(name,payload,dedupe_key,run_after)
       VALUES('send-plan-reminder',$1,$2,$3)
       ON CONFLICT DO NOTHING RETURNING id`,
      [
        JSON.stringify({
          userId: ownerId,
          planId: plan.id,
          businessDate: occurrence.businessDate,
          when: occurrence.when.toISOString(),
          channel: "web",
        }),
        dedupe,
        occurrence.when,
      ],
    );
    queued += inserted.rowCount ?? 0;
  }
  return queued;
}

export async function claimPlanReminder(
  pool: Pool,
): Promise<ReminderJob | null> {
  const claimed = await pool.query<ReminderJob>(
    `UPDATE worker_jobs SET status='running',attempts=attempts+1,
       locked_until=now()+interval '2 minutes',updated_at=now()
     WHERE id=(SELECT id FROM worker_jobs WHERE name='send-plan-reminder'
       AND attempts<10 AND run_after<=now() AND
       (status IN ('queued','failed') OR (status='running' AND locked_until<now()))
       ORDER BY run_after,created_at FOR UPDATE SKIP LOCKED LIMIT 1)
     RETURNING id,payload,attempts`,
  );
  return claimed.rows[0] ?? null;
}

export async function processPlanReminder(
  pool: Pool,
  sender: Pick<WebPushSender, "send">,
  job: ReminderJob,
  key: Uint8Array,
  at = new Date(),
): Promise<void> {
  try {
    const stillEligible = async () => {
      if (job.payload.channel !== "web") return false;
      if (
        at.getTime() < Date.parse(job.payload.when) ||
        at.getTime() > Date.parse(job.payload.when) + 60 * 60_000
      )
        return false;
      const due = await dueOccurrence(pool, job.payload.planId, at);
      if (
        !due ||
        due.ownerId !== job.payload.userId ||
        due.occurrence.businessDate !== job.payload.businessDate ||
        due.occurrence.when.toISOString() !== job.payload.when
      )
        return false;
      const preference = await pool.query<{ allowed: boolean }>(
        `SELECT coalesce(p.plan_enabled,true) AS allowed FROM users u
         LEFT JOIN channel_notification_preferences p ON p.user_id=u.id AND p.channel='web'
         WHERE u.id=$1 AND u.status='active'`,
        [job.payload.userId],
      );
      return Boolean(preference.rows[0]?.allowed);
    };
    if (await stillEligible())
      await sendWebPushToUser(
        pool,
        sender,
        job.id,
        job.payload.userId,
        key,
        "plan",
        stillEligible,
      );
    await pool.query(
      "UPDATE worker_jobs SET status='succeeded',locked_until=NULL,updated_at=now(),last_error_code=NULL WHERE id=$1",
      [job.id],
    );
  } catch (cause) {
    const code =
      cause instanceof WebPushError
        ? "WEB_PLAN_PUSH_ERROR"
        : "PLAN_REMINDER_FAILED";
    const seconds = Math.min(3600, 2 ** Math.min(job.attempts, 10) * 15);
    await pool.query(
      `UPDATE worker_jobs SET status='failed',locked_until=NULL,
       run_after=now()+($2::int * interval '1 second'),updated_at=now(),last_error_code=$3 WHERE id=$1`,
      [job.id, seconds, code],
    );
    throw cause;
  }
}

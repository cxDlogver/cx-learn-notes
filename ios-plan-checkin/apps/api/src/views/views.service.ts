import { Injectable } from "@nestjs/common";
import type { PoolClient } from "pg";
import type {
  CalendarDayDto,
  CalendarEntryDto,
  CalendarMonthDto,
  CalendarStatus,
  CalendarWeekDto,
  OneTimeResolutionDto,
  PlanDetailDto,
  PlanStatisticsDto,
  TodayDto,
  TodayItemDto,
  WeeklySummaryDto,
} from "@plan-checkin/contracts";
import {
  addCalendarDays,
  assertTimezone,
  businessDateAt,
  fixedDateStatus,
  fixedStatistics,
  isActiveDate,
  isFixedDueDate,
  mondayOfWeek,
  oneTimeState,
  parseBusinessDate,
  ruleForDate,
  validatePlanTimeline,
  weeklyStatistics,
  weeklySummary,
  type BusinessDate,
  type IsoWeekday,
  type LifecycleEvent,
  type OneTimeFact,
  type PlanTimeline,
  type RecordFact,
  type RuleVersion,
} from "@plan-checkin/domain";
import { Database } from "../database.js";
import { fail } from "../http.js";
import {
  fromPlan,
  planColumns,
  toDto,
  type PlanRow,
} from "../plans/plans.service.js";
import { requireUuid } from "../plans/write.js";

interface CheckinRow {
  id: string;
  plan_id: string;
  business_date: string;
  result: "success" | "failure" | "skip";
  revision: number;
  is_backfilled: boolean;
  is_revised: boolean;
  rule_version: number;
}
interface ResolutionRow {
  plan_id: string;
  resolution: "completed" | "failed" | "cancelled";
  resolved_business_date: string;
  resolved_at: Date | string;
  note: string | null;
  revision: number;
}
interface Snapshot {
  row: PlanRow;
  timeline: PlanTimeline;
  records: CheckinRow[];
  facts: RecordFact[];
  resolution: ResolutionRow | null;
  reminderTimeLocal: string | null;
}
const instant = (value: Date | string) => new Date(value).toISOString();
const numericDate = (value: string): BusinessDate => {
  try {
    return parseBusinessDate(value);
  } catch {
    fail("PLAN_DATE_INVALID", 400, "业务日期不正确");
  }
};
function monthBounds(month: string): {
  start: BusinessDate;
  next: BusinessDate;
  last: BusinessDate;
} {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
    fail("PLAN_DATE_INVALID", 400, "月份格式应为 YYYY-MM");
  const start = numericDate(`${month}-01`);
  const [year, part] = month.split("-").map(Number) as [number, number];
  const next = numericDate(
    `${part === 12 ? year + 1 : year}-${String(part === 12 ? 1 : part + 1).padStart(2, "0")}-01`,
  );
  return { start, next, last: addCalendarDays(next, -1) };
}
function summaryRecord(
  record: CheckinRow,
): NonNullable<TodayItemDto["record"]> {
  return {
    id: record.id,
    result: record.result,
    revision: record.revision,
    isBackfilled: record.is_backfilled,
    isRevised: record.is_revised,
  };
}
function resolutionDto(
  row: ResolutionRow,
  dueDate: string,
): OneTimeResolutionDto {
  return {
    planId: row.plan_id,
    resolution: row.resolution,
    resolvedBusinessDate: row.resolved_business_date,
    resolvedAt: instant(row.resolved_at),
    note: row.note,
    revision: row.revision,
    isRevised: row.revision > 1,
    timing:
      row.resolution === "completed"
        ? row.resolved_business_date <= dueDate
          ? "on_time"
          : "late"
        : null,
  };
}
function recordEntry(snapshot: Snapshot, record: CheckinRow): CalendarEntryDto {
  return {
    planId: snapshot.row.id,
    title: snapshot.row.title,
    kind: snapshot.row.kind,
    direction: snapshot.row.direction,
    timezone: snapshot.row.timezone,
    businessDate: record.business_date,
    status: record.result,
    recordId: record.id,
    ruleVersion: record.rule_version,
    isBackfilled: record.is_backfilled,
    isRevised: record.is_revised,
  };
}
function dateEntry(
  snapshot: Snapshot,
  date: BusinessDate,
  status: CalendarStatus,
): CalendarEntryDto {
  return {
    planId: snapshot.row.id,
    title: snapshot.row.title,
    kind: snapshot.row.kind,
    direction: snapshot.row.direction,
    timezone: snapshot.row.timezone,
    businessDate: date,
    status,
    recordId: null,
    ruleVersion: ruleForDate(snapshot.timeline, date)?.version ?? 1,
    isBackfilled: false,
    isRevised: false,
  };
}
function counts(entries: CalendarEntryDto[]): CalendarDayDto["counts"] {
  return entries.reduce(
    (total, entry) => {
      if (
        entry.status === "success" ||
        entry.status === "completed" ||
        entry.status === "late_completed"
      )
        total.success++;
      else if (entry.status === "failure" || entry.status === "failed")
        total.failure++;
      else if (entry.status === "skip" || entry.status === "cancelled")
        total.skip++;
      else if (entry.status === "unrecorded") total.unrecorded++;
      return total;
    },
    { success: 0, failure: 0, skip: 0, unrecorded: 0 },
  );
}

@Injectable()
export class ViewsService {
  constructor(private readonly database: Database) {}

  private async snapshots(
    client: PoolClient,
    userId: string,
    options: {
      planId?: string;
      groupId?: string | null;
      from?: BusinessDate;
      through?: BusinessDate;
    } = {},
  ): Promise<Snapshot[]> {
    const planParams: unknown[] = [userId];
    let filter = "p.owner_id = $1 AND p.status <> 'deleted'";
    if (options.planId) {
      planParams.push(options.planId);
      filter += ` AND p.id = $${planParams.length}`;
    }
    if (options.groupId) {
      planParams.push(options.groupId);
      filter += ` AND p.group_id = $${planParams.length}`;
    }
    const found = await client.query<PlanRow>(
      `SELECT ${planColumns} ${fromPlan} WHERE ${filter} ORDER BY p.created_at, p.id`,
      planParams,
    );
    if (options.planId && !found.rows[0]) fail("NOT_FOUND", 404, "计划不存在");
    if (!found.rows.length) return [];
    const ids = found.rows.map((row) => row.id);
    const [rules, events, resolutions, reminders] = await Promise.all([
      client.query<{
        plan_id: string;
        version: number;
        effective_date: string;
        weekdays: number[] | null;
        weekly_target: number | null;
      }>(
        `SELECT plan_id, version, effective_date::text, weekdays, weekly_target
         FROM plan_rule_versions WHERE plan_id = ANY($1::uuid[]) ORDER BY plan_id, version`,
        [ids],
      ),
      client.query<{
        plan_id: string;
        seq: number;
        action: LifecycleEvent["action"];
        business_date: string;
        effective_at: Date | string;
      }>(
        `SELECT plan_id, seq, action, business_date::text, effective_at
         FROM plan_lifecycle_events WHERE plan_id = ANY($1::uuid[]) ORDER BY plan_id, seq`,
        [ids],
      ),
      client.query<ResolutionRow>(
        `SELECT plan_id, resolution, resolved_business_date::text, resolved_at, note, revision
         FROM one_time_resolutions WHERE plan_id = ANY($1::uuid[])`,
        [ids],
      ),
      client.query<{ plan_id: string; time_local: string | null }>(
        `SELECT plan_id, time_local::text FROM reminder_settings
         WHERE plan_id = ANY($1::uuid[]) AND enabled = true`,
        [ids],
      ),
    ]);
    const recordParams: unknown[] = [ids];
    let recordFilter = "c.plan_id = ANY($1::uuid[])";
    if (options.from) {
      recordParams.push(options.from);
      recordFilter += ` AND c.business_date >= $${recordParams.length}`;
    }
    if (options.through) {
      recordParams.push(options.through);
      recordFilter += ` AND c.business_date <= $${recordParams.length}`;
    }
    const records = await client.query<CheckinRow>(
      `SELECT c.id, c.plan_id, c.business_date::text, c.result, c.revision,
       c.is_backfilled, c.is_revised, r.version AS rule_version
       FROM checkins c JOIN plan_rule_versions r ON r.id = c.rule_version_id
       WHERE ${recordFilter} ORDER BY c.business_date, c.id`,
      recordParams,
    );
    const byPlan = <T extends { plan_id: string }>(rows: T[]) => {
      const map = new Map<string, T[]>();
      for (const row of rows)
        map.set(row.plan_id, [...(map.get(row.plan_id) ?? []), row]);
      return map;
    };
    const ruleMap = byPlan(rules.rows);
    const eventMap = byPlan(events.rows);
    const recordMap = byPlan(records.rows);
    const resolutionMap = new Map(
      resolutions.rows.map((row) => [row.plan_id, row]),
    );
    const reminderMap = new Map(
      reminders.rows.map((row) => [
        row.plan_id,
        row.time_local?.slice(0, 5) ?? null,
      ]),
    );
    return found.rows.map((row) => {
      const versions: RuleVersion[] = (ruleMap.get(row.id) ?? []).map((rule) =>
        row.kind === "fixed"
          ? {
              kind: "fixed",
              direction: row.direction,
              version: rule.version,
              effectiveDate: numericDate(rule.effective_date),
              weekdays: rule.weekdays as IsoWeekday[],
            }
          : row.kind === "weekly"
            ? {
                kind: "weekly",
                direction: row.direction,
                version: rule.version,
                effectiveDate: numericDate(rule.effective_date),
                weeklyTarget: rule.weekly_target!,
              }
            : {
                kind: "one_time",
                direction: "do",
                version: rule.version,
                effectiveDate: numericDate(rule.effective_date),
              },
      );
      const timeline: PlanTimeline = {
        timezone: row.timezone,
        startDate: numericDate(row.start_date),
        endDate: row.end_date ? numericDate(row.end_date) : null,
        dueDate: row.due_date ? numericDate(row.due_date) : null,
        rules: versions,
        lifecycleEvents: (eventMap.get(row.id) ?? []).map((event) => ({
          sequence: event.seq,
          action: event.action,
          businessDate: numericDate(event.business_date),
          occurredAt: instant(event.effective_at),
        })),
      };
      validatePlanTimeline(timeline);
      const ownRecords = recordMap.get(row.id) ?? [];
      return {
        row,
        timeline,
        records: ownRecords,
        facts: ownRecords.map((record) => ({
          businessDate: numericDate(record.business_date),
          result: record.result,
          ruleVersion: record.rule_version,
        })),
        resolution: resolutionMap.get(row.id) ?? null,
        reminderTimeLocal: reminderMap.get(row.id) ?? null,
      };
    });
  }

  private statistics(snapshot: Snapshot, now: string): PlanStatisticsDto {
    const { row, timeline, facts } = snapshot;
    if (row.kind === "fixed") {
      return {
        kind: "fixed",
        planId: row.id,
        ...fixedStatistics(timeline, facts, now),
      };
    }
    if (row.kind === "weekly") {
      const metrics = weeklyStatistics(timeline, facts, now);
      return {
        kind: "weekly",
        planId: row.id,
        ...metrics,
        ruleVersions: timeline.rules
          .filter(
            (rule) =>
              rule.effectiveDate <= metrics.statisticsThroughBusinessDate,
          )
          .map((rule) => rule.version),
      };
    }
    const throughDate = businessDateAt(now, row.timezone);
    const resolution: OneTimeFact | null = snapshot.resolution && {
      resolution: snapshot.resolution.resolution,
      resolvedAt: instant(snapshot.resolution.resolved_at),
      revision: snapshot.resolution.revision,
    };
    return {
      kind: "one_time",
      planId: row.id,
      timezone: row.timezone,
      statisticsThroughBusinessDate: throughDate,
      ruleVersions: timeline.rules
        .filter((rule) => rule.effectiveDate <= throughDate)
        .map((rule) => rule.version),
      dueDate: row.due_date!,
      state: oneTimeState(timeline, resolution, now),
      resolution: snapshot.resolution
        ? resolutionDto(snapshot.resolution, row.due_date!)
        : null,
    };
  }

  private todayItem(snapshot: Snapshot, now: string): TodayItemDto | null {
    const { row, timeline, records } = snapshot;
    const date = businessDateAt(now, row.timezone);
    const rule = ruleForDate(timeline, date);
    const record = records.find((item) => item.business_date === date);
    if (row.kind === "fixed") {
      if (!isFixedDueDate(timeline, date) && !record) return null;
      const status = fixedDateStatus(
        timeline,
        date,
        now,
        record && {
          businessDate: date,
          result: record.result,
          ruleVersion: record.rule_version,
        },
      );
      if (status === "not_due") return null;
      return {
        plan: toDto(row),
        planBusinessDate: date,
        status,
        activeRuleVersion: rule?.version ?? row.current_rule_version,
        record: record ? summaryRecord(record) : null,
        weeklyProgress: null,
        canCheckIn: Boolean(record) || isFixedDueDate(timeline, date),
        reminderTimeLocal: snapshot.reminderTimeLocal,
      };
    }
    if (row.kind === "weekly") {
      if (!isActiveDate(timeline, date) && !record) return null;
      const progress = weeklySummary(
        timeline,
        snapshot.facts,
        mondayOfWeek(date),
        now,
      );
      return {
        plan: toDto(row),
        planBusinessDate: date,
        status:
          record?.result ??
          (progress.target !== null && progress.successes >= progress.target
            ? "goal_met"
            : "pending"),
        activeRuleVersion: rule?.version ?? row.current_rule_version,
        record: record ? summaryRecord(record) : null,
        weeklyProgress: progress as WeeklySummaryDto,
        canCheckIn: Boolean(record) || isActiveDate(timeline, date),
        reminderTimeLocal: snapshot.reminderTimeLocal,
      };
    }
    const state = oneTimeState(
      timeline,
      snapshot.resolution && {
        resolution: snapshot.resolution.resolution,
        resolvedAt: instant(snapshot.resolution.resolved_at),
        revision: snapshot.resolution.revision,
      },
      now,
    );
    const resolvedToday = snapshot.resolution?.resolved_business_date === date;
    if (
      (row.status !== "active" && !resolvedToday) ||
      (snapshot.resolution && !resolvedToday) ||
      date < row.start_date
    )
      return null;
    return {
      plan: toDto(row),
      planBusinessDate: date,
      status: state,
      activeRuleVersion: rule?.version ?? row.current_rule_version,
      record: null,
      weeklyProgress: null,
      canCheckIn: !snapshot.resolution && row.status === "active",
      reminderTimeLocal: snapshot.reminderTimeLocal,
    };
  }

  async today(
    userId: string,
    viewTimezone = "Asia/Shanghai",
  ): Promise<TodayDto> {
    try {
      assertTimezone(viewTimezone);
    } catch {
      fail("VALIDATION_ERROR", 400, "显示时区不正确");
    }
    const now = new Date().toISOString();
    const viewDate = businessDateAt(now, viewTimezone);
    return this.database.transaction(async (client) => {
      await client.query(
        "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY",
      );
      const snapshots = await this.snapshots(client, userId, {
        from: mondayOfWeek(addCalendarDays(viewDate, -1)),
        through: addCalendarDays(viewDate, 1),
      });
      const items = snapshots
        .map((snapshot) => this.todayItem(snapshot, now))
        .filter((item): item is TodayItemDto => item !== null);
      const kindOrder = { fixed: 0, weekly: 1, one_time: 2 };
      items.sort(
        (a, b) =>
          kindOrder[a.plan.kind] - kindOrder[b.plan.kind] ||
          (a.reminderTimeLocal ?? "99:99").localeCompare(
            b.reminderTimeLocal ?? "99:99",
          ) ||
          a.plan.title.localeCompare(b.plan.title, "zh-CN") ||
          a.plan.id.localeCompare(b.plan.id),
      );
      return { viewTimezone, viewDate, items };
    });
  }

  async statisticsForPlan(
    userId: string,
    planId: string,
  ): Promise<PlanStatisticsDto> {
    requireUuid(planId);
    const now = new Date().toISOString();
    return this.database.transaction(async (client) => {
      await client.query(
        "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY",
      );
      const [snapshot] = await this.snapshots(client, userId, { planId });
      return this.statistics(snapshot!, now);
    });
  }

  async detail(userId: string, planId: string): Promise<PlanDetailDto> {
    requireUuid(planId);
    const now = new Date().toISOString();
    return this.database.transaction(async (client) => {
      await client.query(
        "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY",
      );
      const [snapshot] = await this.snapshots(client, userId, { planId });
      const item = this.todayItem(snapshot!, now);
      const recentRecords = [...snapshot!.records]
        .sort((a, b) => b.business_date.localeCompare(a.business_date))
        .slice(0, 30)
        .map((record) => recordEntry(snapshot!, record));
      return {
        plan: toDto(snapshot!.row),
        statistics: this.statistics(snapshot!, now),
        todayStatus: item?.status ?? "not_due",
        recentRecords,
      };
    });
  }

  async calendar(
    userId: string,
    month: string,
    groupId: string | null = null,
    planId?: string,
  ): Promise<CalendarMonthDto> {
    if (groupId) requireUuid(groupId);
    if (planId) requireUuid(planId);
    const { start, next, last } = monthBounds(month);
    const now = new Date().toISOString();
    return this.database.transaction(async (client) => {
      await client.query(
        "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY",
      );
      const snapshots = await this.snapshots(client, userId, {
        ...(planId ? { planId } : {}),
        groupId,
        from: mondayOfWeek(start),
        through: addCalendarDays(mondayOfWeek(last), 6),
      });
      const days: CalendarDayDto[] = [];
      const weeklySummaries: CalendarWeekDto[] = [];
      for (let date = start; date < next; date = addCalendarDays(date, 1)) {
        const entries: CalendarEntryDto[] = [];
        for (const snapshot of snapshots) {
          const { row, timeline, records } = snapshot;
          const record = records.find((item) => item.business_date === date);
          if (row.kind === "fixed") {
            const status = fixedDateStatus(
              timeline,
              date,
              now,
              record && {
                businessDate: date,
                result: record.result,
                ruleVersion: record.rule_version,
              },
            );
            if (status !== "not_due")
              entries.push(
                record
                  ? recordEntry(snapshot, record)
                  : dateEntry(snapshot, date, status),
              );
          } else if (row.kind === "weekly") {
            if (record) entries.push(recordEntry(snapshot, record));
          } else {
            if (
              row.due_date === date &&
              !(
                snapshot.resolution &&
                snapshot.resolution.resolved_business_date < date
              )
            ) {
              const state = oneTimeState(
                timeline,
                snapshot.resolution && {
                  resolution: snapshot.resolution.resolution,
                  resolvedAt: instant(snapshot.resolution.resolved_at),
                  revision: snapshot.resolution.revision,
                },
                now,
              );
              entries.push(
                dateEntry(
                  snapshot,
                  date,
                  snapshot.resolution?.resolved_business_date === date
                    ? state
                    : state === "overdue"
                      ? "overdue"
                      : "due",
                ),
              );
            } else if (snapshot.resolution?.resolved_business_date === date) {
              const state = oneTimeState(
                timeline,
                {
                  resolution: snapshot.resolution.resolution,
                  resolvedAt: instant(snapshot.resolution.resolved_at),
                  revision: snapshot.resolution.revision,
                },
                now,
              );
              entries.push(dateEntry(snapshot, date, state));
            }
          }
        }
        entries.sort(
          (a, b) =>
            a.title.localeCompare(b.title, "zh-CN") ||
            a.planId.localeCompare(b.planId),
        );
        days.push({ businessDate: date, counts: counts(entries), entries });
      }
      for (const snapshot of snapshots.filter(
        (item) => item.row.kind === "weekly",
      )) {
        for (
          let week = mondayOfWeek(start);
          week <= last;
          week = addCalendarDays(week, 7)
        ) {
          weeklySummaries.push({
            planId: snapshot.row.id,
            title: snapshot.row.title,
            timezone: snapshot.row.timezone,
            summary: weeklySummary(
              snapshot.timeline,
              snapshot.facts,
              week,
              now,
            ),
          });
        }
      }
      return {
        month,
        dateSemantics: "plan_business_date",
        groupId,
        days,
        weeklySummaries,
      };
    });
  }

  async calendarDay(
    userId: string,
    rawDate: string,
    groupId: string | null = null,
  ): Promise<CalendarDayDto> {
    const date = numericDate(rawDate);
    const month = date.slice(0, 7);
    const calendar = await this.calendar(userId, month, groupId);
    return calendar.days.find((day) => day.businessDate === date)!;
  }
}

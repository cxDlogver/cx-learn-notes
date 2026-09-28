import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createECDH, createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import process from "node:process";
import { URL } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { NotificationsService } from "../apps/api/dist/social/notifications.service.js";
import {
  claimPlanReminder,
  enqueuePlanReminders,
  processPlanReminder,
} from "../apps/worker/dist/planReminders.js";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(
  await readFile(new URL("db/migrations/manifest.json", root), "utf8"),
);
const pg = new PGlite();
let checks = 0;
function check(name, actual, expected) {
  assert.deepEqual(actual, expected, name);
  checks++;
  process.stdout.write(`PASS ${name}\n`);
}
try {
  for (const migration of manifest.migrations)
    await pg.exec(
      await readFile(new URL(`db/migrations/${migration.file}`, root), "utf8"),
    );
  const adapt = (client) => ({
    query: async (sql, params) => {
      const result = await client.query(sql, params);
      return {
        ...result,
        rowCount: result.rows.length || result.affectedRows || 0,
      };
    },
  });
  const database = {
    query: adapt(pg).query,
    transaction: (fn) => pg.transaction((tx) => fn(adapt(tx))),
  };
  const key = createHash("sha256").update("web-plan-reminder-fixture").digest();
  const service = new NotificationsService(database, {
    authIdempotencyKey: Buffer.alloc(32, 6),
    pushTokenEncryptionKey: key,
  });
  const user = (
    await pg.query(
      "INSERT INTO users(phone_ciphertext,phone_lookup_hash,username) VALUES($1,$2,'web_remind_fixture') RETURNING id",
      [Buffer.from(randomUUID()), Buffer.from(randomUUID())],
    )
  ).rows[0].id;
  const browserDevice = `browser-${randomUUID()}`;
  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();
  await service.registerWebPush(
    user,
    browserDevice,
    {
      endpoint: `https://fcm.googleapis.com/fcm/send/${randomUUID()}`,
      expirationTime: null,
      keys: {
        p256dh: ecdh.getPublicKey().toString("base64url"),
        auth: Buffer.alloc(16, 3).toString("base64url"),
      },
    },
    randomUUID(),
  );
  await pg.query(
    `INSERT INTO sessions(user_id,refresh_hash,device_id,expires_at,client_channel)
     VALUES($1,$2,$3,now()+interval '1 day','web')`,
    [user, Buffer.from(randomUUID()), browserDevice],
  );
  const date = "2026-09-28";
  const addPlan = async (kind, timezone, reminderTime, dueDate = null) => {
    const planId = (
      await pg.query(
        `INSERT INTO plans(owner_id,kind,direction,title,timezone,start_date,due_date)
         VALUES($1,$2,'do','合成提醒计划',$3,$4,$5) RETURNING id`,
        [user, kind, timezone, date, dueDate],
      )
    ).rows[0].id;
    const rule = (
      await pg.query(
        `INSERT INTO plan_rule_versions(plan_id,version,effective_date,weekdays,weekly_target)
         VALUES($1,1,$2,$3,$4) RETURNING id`,
        [
          planId,
          date,
          kind === "fixed" ? [1] : null,
          kind === "weekly" ? 1 : null,
        ],
      )
    ).rows[0].id;
    await pg.query(
      `INSERT INTO reminder_settings(plan_id,enabled,weekdays,time_local,lead_days)
       VALUES($1,true,$2,$3,$4)`,
      [
        planId,
        kind === "weekly" ? [1] : null,
        reminderTime,
        kind === "one_time" ? 1 : null,
      ],
    );
    return { planId, rule };
  };
  const fixed = await addPlan("fixed", "UTC", "10:05");
  const scanAt = new Date("2026-09-28T10:04:00.000Z");
  check(
    "future local reminder enqueued",
    await enqueuePlanReminders(adapt(pg), scanAt),
    1,
  );
  check(
    "same slot durable dedupe",
    await enqueuePlanReminders(adapt(pg), scanAt),
    0,
  );
  const due = await claimPlanReminder(adapt(pg));
  check("job carries Web channel", due.payload.channel, "web");
  check("job carries plan business date", due.payload.businessDate, date);
  const accepted = [];
  const sender = { send: async (_subscription, kind) => accepted.push(kind) };
  await processPlanReminder(
    adapt(pg),
    sender,
    due,
    key,
    new Date("2026-09-28T10:05:01.000Z"),
  );
  check("generic plan notification accepted", accepted, ["plan"]);
  await processPlanReminder(
    adapt(pg),
    sender,
    due,
    key,
    new Date("2026-09-28T10:05:02.000Z"),
  );
  check("accepted device not resent on retry", accepted, ["plan"]);
  const shanghai = await addPlan("fixed", "Asia/Shanghai", "18:05");
  check(
    "Shanghai 18:05 resolves to UTC 10:05",
    await enqueuePlanReminders(adapt(pg), scanAt),
    1,
  );
  const shanghaiJob = await claimPlanReminder(adapt(pg));
  check(
    "second job scheduled at correct instant",
    shanghaiJob.payload.when,
    "2026-09-28T10:05:00.000Z",
  );
  await service.updateWebPreferences(
    user,
    { planEnabled: false, baseRevision: 1 },
    randomUUID(),
  );
  await processPlanReminder(
    adapt(pg),
    sender,
    shanghaiJob,
    key,
    new Date("2026-09-28T10:05:01.000Z"),
  );
  check("Web plan switch suppresses send", accepted, ["plan"]);
  check(
    "iOS social preference unchanged",
    (await service.getPreferences(user)).friendRequests,
    true,
  );
  await service.updateWebPreferences(
    user,
    { planEnabled: true, baseRevision: 2 },
    randomUUID(),
  );
  const weekly = await addPlan("weekly", "UTC", "10:05");
  await pg.query(
    `INSERT INTO checkins(plan_id,owner_id,business_date,result,rule_version_id)
     VALUES($1,$2,$3,'success',$4)`,
    [weekly.planId, user, date, weekly.rule],
  );
  check(
    "completed weekly target produces no reminder",
    await enqueuePlanReminders(adapt(pg), scanAt),
    0,
  );
  const once = await addPlan("one_time", "UTC", "10:05", "2026-09-29");
  await pg.query(
    `INSERT INTO one_time_resolutions(plan_id,resolution,resolved_business_date,resolved_at)
     VALUES($1,'completed',$2,now())`,
    [once.planId, date],
  );
  check(
    "terminal one-time task produces no reminder",
    await enqueuePlanReminders(adapt(pg), scanAt),
    0,
  );
  const recordedAfterQueue = await addPlan("fixed", "UTC", "10:05");
  check(
    "unrecorded plan initially queued",
    await enqueuePlanReminders(adapt(pg), scanAt),
    1,
  );
  const recordedJob = await claimPlanReminder(adapt(pg));
  await pg.query(
    `INSERT INTO checkins(plan_id,owner_id,business_date,result,rule_version_id)
     VALUES($1,$2,$3,'success',$4)`,
    [recordedAfterQueue.planId, user, date, recordedAfterQueue.rule],
  );
  await processPlanReminder(
    adapt(pg),
    sender,
    recordedJob,
    key,
    new Date("2026-09-28T10:05:01.000Z"),
  );
  check("record created after queue suppresses send", accepted, ["plan"]);
  const pausedAfterQueue = await addPlan("fixed", "UTC", "10:05");
  check(
    "active plan initially queued",
    await enqueuePlanReminders(adapt(pg), scanAt),
    1,
  );
  const pausedJob = await claimPlanReminder(adapt(pg));
  await pg.query("UPDATE plans SET status='paused' WHERE id=$1", [
    pausedAfterQueue.planId,
  ]);
  await processPlanReminder(
    adapt(pg),
    sender,
    pausedJob,
    key,
    new Date("2026-09-28T10:05:01.000Z"),
  );
  check("pause after queue suppresses send", accepted, ["plan"]);
  await pg.query("UPDATE plans SET status='paused' WHERE id=$1", [
    fixed.planId,
  ]);
  check(
    "paused plan does not requeue",
    await enqueuePlanReminders(adapt(pg), scanAt),
    0,
  );
  check(
    "no extra jobs after lifecycle changes",
    (
      await pg.query(
        "SELECT count(*)::int AS n FROM worker_jobs WHERE name='send-plan-reminder'",
      )
    ).rows[0].n,
    4,
  );
  check(
    "fixture plan IDs remain distinct",
    new Set([
      fixed.planId,
      shanghai.planId,
      weekly.planId,
      once.planId,
      recordedAfterQueue.planId,
      pausedAfterQueue.planId,
    ]).size,
    6,
  );
  process.stdout.write(`WEB-PLAN-REMINDERS-SMOKE checks=${checks}\n`);
} finally {
  await pg.close();
}

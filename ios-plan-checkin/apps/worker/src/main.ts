import pg from "pg";
import { finalizeDeletedPlans, finalizeDueAccounts } from "./deletion.js";
import {
  claimDataExport,
  cleanupExpiredExports,
  processDataExport,
} from "./dataExport.js";
import {
  S3ObjectDeleter,
  claimMediaCleanup,
  enqueueMediaCleanup,
  processMediaCleanup,
} from "./mediaCleanup.js";
import {
  ApnsSender,
  claimSocialNotification,
  processSocialNotification,
  pushTokenKey,
} from "./socialNotifications.js";
import { claimWebPush, processWebPush } from "./webNotifications.js";
import {
  claimPlanReminder,
  enqueuePlanReminders,
  processPlanReminder,
} from "./planReminders.js";
import { WebPushSender } from "./webPush.js";

type CycleName =
  | "media_cleanup"
  | "social_notification"
  | "web_push"
  | "plan_reminder"
  | "data_export"
  | "deletion";
async function runCycle(
  name: CycleName,
  work: () => Promise<number>,
): Promise<void> {
  const started = performance.now();
  try {
    const processed = await work();
    process.stdout.write(
      JSON.stringify({
        event: "worker_cycle",
        at: new Date().toISOString(),
        name,
        result: "success",
        processed,
        durationMs: Math.round(performance.now() - started),
      }) + "\n",
    );
  } catch {
    // Do not serialize provider errors: they can contain phone numbers, URLs or credentials.
    process.stderr.write(
      JSON.stringify({
        event: "worker_cycle",
        at: new Date().toISOString(),
        name,
        result: "failed",
        durationMs: Math.round(performance.now() - started),
      }) + "\n",
    );
  }
}

async function bootstrap(): Promise<void> {
  if (!process.env.DATABASE_URL) throw new Error("Worker DATABASE_URL missing");
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  });
  const objects = new S3ObjectDeleter();
  const push = new ApnsSender();
  const pushKey = pushTokenKey(process.env.PUSH_TOKEN_ENCRYPTION_KEY ?? "");
  const webPush = process.env.VAPID_PRIVATE_KEY ? new WebPushSender() : null;
  if (process.env.APP_ENV === "production" && !webPush)
    throw new Error("Production Web Push requires VAPID configuration");
  let stopping = false;
  process.once("SIGTERM", () => {
    stopping = true;
  });
  process.once("SIGINT", () => {
    stopping = true;
  });
  process.stdout.write(
    JSON.stringify({ event: "worker_ready", at: new Date().toISOString() }) +
      "\n",
  );
  let lastRateLimitCleanup = 0;
  let lastPlanReminderScan = 0;
  try {
    while (!stopping) {
      await runCycle("media_cleanup", async () => {
        await enqueueMediaCleanup(pool);
        let processed = 0;
        for (let count = 0; count < 20; count++) {
          const job = await claimMediaCleanup(pool);
          if (!job) break;
          await processMediaCleanup(pool, objects, job);
          processed++;
        }
        return processed;
      });
      await runCycle("social_notification", async () => {
        let processed = 0;
        for (let count = 0; count < 20; count++) {
          const job = await claimSocialNotification(pool);
          if (!job) break;
          await processSocialNotification(pool, push, job, pushKey);
          processed++;
        }
        return processed;
      });
      await runCycle("web_push", async () => {
        if (!webPush) return 0;
        let processed = 0;
        for (let count = 0; count < 20; count++) {
          const job = await claimWebPush(pool);
          if (!job) break;
          await processWebPush(pool, webPush, job, pushKey);
          processed++;
        }
        return processed;
      });
      await runCycle("plan_reminder", async () => {
        if (!webPush) return 0;
        if (Date.now() - lastPlanReminderScan > 60_000) {
          await enqueuePlanReminders(pool);
          lastPlanReminderScan = Date.now();
        }
        let processed = 0;
        for (let count = 0; count < 20; count++) {
          const job = await claimPlanReminder(pool);
          if (!job) break;
          await processPlanReminder(pool, webPush, job, pushKey);
          processed++;
        }
        return processed;
      });
      await runCycle("data_export", async () => {
        let processed = 0;
        for (let count = 0; count < 3; count++) {
          const job = await claimDataExport(pool);
          if (!job) break;
          await processDataExport(pool, job);
          processed++;
        }
        await cleanupExpiredExports(pool);
        return processed;
      });
      await runCycle("deletion", async () => {
        await finalizeDeletedPlans(pool);
        await finalizeDueAccounts(pool);
        return 0;
      });
      try {
        await pool.query(
          "INSERT INTO worker_heartbeats(worker_name,updated_at) VALUES('primary',now()) ON CONFLICT(worker_name) DO UPDATE SET updated_at=excluded.updated_at",
        );
        if (Date.now() - lastRateLimitCleanup > 900_000) {
          await pool.query(
            "DELETE FROM rate_limit_buckets WHERE window_start<now()-interval '1 hour'",
          );
          lastRateLimitCleanup = Date.now();
        }
      } catch {
        process.stderr.write(
          JSON.stringify({
            event: "worker_maintenance",
            at: new Date().toISOString(),
            result: "failed",
          }) + "\n",
        );
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 15_000));
    }
  } finally {
    await pool.end();
  }
}

void bootstrap();

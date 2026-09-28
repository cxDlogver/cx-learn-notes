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

async function bootstrap(): Promise<void> {
  if (!process.env.DATABASE_URL) throw new Error("Worker DATABASE_URL missing");
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  });
  const objects = new S3ObjectDeleter();
  const push = new ApnsSender();
  const pushKey = pushTokenKey(process.env.PUSH_TOKEN_ENCRYPTION_KEY ?? "");
  let stopping = false;
  process.once("SIGTERM", () => {
    stopping = true;
  });
  process.once("SIGINT", () => {
    stopping = true;
  });
  process.stdout.write("plan-checkin worker ready\n");
  try {
    while (!stopping) {
      try {
        await enqueueMediaCleanup(pool);
        for (let count = 0; count < 20; count++) {
          const job = await claimMediaCleanup(pool);
          if (!job) break;
          await processMediaCleanup(pool, objects, job);
        }
      } catch {
        process.stderr.write("Media cleanup cycle failed\n");
      }
      try {
        for (let count = 0; count < 20; count++) {
          const job = await claimSocialNotification(pool);
          if (!job) break;
          await processSocialNotification(pool, push, job, pushKey);
        }
      } catch {
        process.stderr.write("Social notification cycle failed\n");
      }
      try {
        for (let count = 0; count < 3; count++) {
          const job = await claimDataExport(pool);
          if (!job) break;
          await processDataExport(pool, job);
        }
        await cleanupExpiredExports(pool);
      } catch {
        process.stderr.write("Data export cycle failed\n");
      }
      try {
        await finalizeDeletedPlans(pool);
        await finalizeDueAccounts(pool);
      } catch {
        process.stderr.write("Deletion cycle failed\n");
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 15_000));
    }
  } finally {
    await pool.end();
  }
}

void bootstrap();

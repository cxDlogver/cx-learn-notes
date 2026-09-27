import pg from "pg";
import {
  S3ObjectDeleter,
  claimMediaCleanup,
  enqueueMediaCleanup,
  processMediaCleanup,
} from "./mediaCleanup.js";

async function bootstrap(): Promise<void> {
  if (!process.env.DATABASE_URL) throw new Error("Worker DATABASE_URL missing");
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  });
  const objects = new S3ObjectDeleter();
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
      await new Promise<void>((resolve) => setTimeout(resolve, 15_000));
    }
  } finally {
    await pool.end();
  }
}

void bootstrap();

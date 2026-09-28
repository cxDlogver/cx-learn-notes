import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { Pool } from "pg";

interface CleanupJob {
  id: string;
  media_id: string;
  attempts: number;
}
interface MediaRow {
  object_key: string;
  status: "pending" | "ready" | "deleted";
  created_at: Date | string;
  deleted_at: Date | string | null;
  object_deleted_at: Date | string | null;
  target_deleted: boolean;
}
export interface ObjectDeleter {
  delete(key: string): Promise<void>;
}

export class S3ObjectDeleter implements ObjectDeleter {
  private readonly client: S3Client;
  private readonly bucket: string;
  constructor() {
    const endpoint = process.env.OBJECT_ENDPOINT;
    const bucket = process.env.OBJECT_BUCKET;
    const accessKeyId = process.env.OBJECT_ACCESS_KEY_ID;
    const secretAccessKey = process.env.OBJECT_SECRET_ACCESS_KEY;
    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey)
      throw new Error("Worker object storage configuration is incomplete");
    if (
      process.env.APP_ENV !== "development" &&
      !endpoint.startsWith("https://")
    )
      throw new Error("Worker object storage requires HTTPS");
    this.client = new S3Client({
      endpoint,
      region: process.env.OBJECT_REGION ?? "us-east-1",
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    });
    this.bucket = bucket;
  }
  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}

/** Idempotent sweep also catches deleted plans whose media did not get an explicit job. */
export async function enqueueMediaCleanup(pool: Pool): Promise<void> {
  await pool.query(
    `INSERT INTO worker_jobs(name,payload,dedupe_key)
     SELECT 'cleanup-orphan-media',jsonb_build_object('mediaId',m.id),NULL
     FROM media m
     LEFT JOIN checkins c ON c.id=m.checkin_id
     LEFT JOIN plans p ON p.id=coalesce(c.plan_id,m.one_time_plan_id)
     LEFT JOIN users u ON u.id=m.owner_id
     WHERE m.object_deleted_at IS NULL AND
       ((m.status='deleted' AND m.deleted_at<=now()-interval '11 minutes') OR
        (p.status='deleted' AND p.deleted_at<=now()-interval '11 minutes') OR u.status='deleted' OR
       (m.status='pending' AND m.created_at<now()-interval '24 hours'))
       AND NOT EXISTS (
         SELECT 1 FROM worker_jobs j WHERE j.name='cleanup-orphan-media'
           AND j.payload->>'mediaId'=m.id::text
           AND j.status IN ('queued','running') AND j.run_after<=now()+interval '5 minutes'
       )
     ORDER BY m.created_at LIMIT 100`,
  );
}

export async function claimMediaCleanup(
  pool: Pool,
): Promise<CleanupJob | null> {
  const claimed = await pool.query<{
    id: string;
    payload: { mediaId?: string };
    attempts: number;
  }>(
    `UPDATE worker_jobs SET status='running',attempts=attempts+1,
       locked_until=now()+interval '5 minutes',updated_at=now()
     WHERE id=(SELECT id FROM worker_jobs WHERE name='cleanup-orphan-media'
       AND attempts<20 AND run_after<=now() AND
       (status IN ('queued','failed') OR
        (status='running' AND locked_until<now()))
       ORDER BY run_after,created_at FOR UPDATE SKIP LOCKED LIMIT 1)
     RETURNING id,payload,attempts`,
  );
  const row = claimed.rows[0];
  return row?.payload.mediaId
    ? { id: row.id, media_id: row.payload.mediaId, attempts: row.attempts }
    : null;
}

export async function processMediaCleanup(
  pool: Pool,
  objects: ObjectDeleter,
  job: CleanupJob,
): Promise<void> {
  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // Hold the media row while deleting the object so completion cannot race cleanup.
      const media = await client.query<MediaRow>(
        `SELECT m.object_key,m.status,m.created_at,m.deleted_at,m.object_deleted_at,
           coalesce(p.status='deleted' AND p.deleted_at<=now()-interval '11 minutes',false)
             OR coalesce(u.status='deleted',false) AS target_deleted
         FROM media m
         LEFT JOIN checkins c ON c.id=m.checkin_id
         LEFT JOIN plans p ON p.id=coalesce(c.plan_id,m.one_time_plan_id)
         LEFT JOIN users u ON u.id=m.owner_id
         WHERE m.id=$1 FOR UPDATE OF m`,
        [job.media_id],
      );
      const row = media.rows[0];
      const shouldDelete =
        row &&
        !row.object_deleted_at &&
        ((row.status === "deleted" &&
          row.deleted_at &&
          new Date(row.deleted_at).getTime() <= Date.now() - 660_000) ||
          (row.status === "pending" &&
            (row.target_deleted ||
              new Date(row.created_at).getTime() < Date.now() - 86_400_000)) ||
          (row.status === "ready" && row.target_deleted));
      if (shouldDelete) await objects.delete(row.object_key);
      if (shouldDelete)
        await client.query(
          `UPDATE media SET status='deleted',deleted_at=coalesce(deleted_at,now()),
             object_deleted_at=now()
           WHERE id=$1 AND object_deleted_at IS NULL`,
          [job.media_id],
        );
      await client.query(
        `UPDATE worker_jobs SET status='succeeded',locked_until=NULL,updated_at=now()
         WHERE id=$1`,
        [job.id],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    const delaySeconds = Math.min(3600, 2 ** Math.min(job.attempts, 10));
    await pool.query(
      `UPDATE worker_jobs SET status='failed',locked_until=NULL,
         run_after=now()+($2::integer*interval '1 second'),
         last_error_code='MEDIA_CLEANUP_FAILED',updated_at=now() WHERE id=$1`,
      [job.id, delaySeconds],
    );
    throw error;
  }
}

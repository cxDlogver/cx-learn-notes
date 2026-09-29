import {
  GetObjectCommand,
  DeleteObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { Pool, PoolClient } from "pg";
import { MultipartZipSink, ZipWriter } from "./zip.js";

interface Job {
  id: string;
  exportId: string;
  attempts: number;
}
interface Dataset {
  name: string;
  fields: string[];
  sql: string;
}
export const datasets: Dataset[] = [
  {
    name: "profile",
    fields: [
      "id",
      "username",
      "nickname",
      "avatar_media_id",
      "created_at",
      "updated_at",
    ],
    sql: "SELECT id,username,nickname,avatar_media_id,created_at,updated_at FROM users WHERE id=current_setting('app.export_user')::uuid",
  },
  {
    name: "groups",
    fields: ["id", "name", "sort_order", "created_at", "updated_at"],
    sql: "SELECT id,name,sort_order,created_at,updated_at FROM groups WHERE owner_id=current_setting('app.export_user')::uuid ORDER BY id",
  },
  {
    name: "plans",
    fields: [
      "id",
      "group_id",
      "kind",
      "direction",
      "title",
      "description",
      "timezone",
      "start_date",
      "end_date",
      "due_date",
      "status",
      "revision",
      "created_at",
      "updated_at",
    ],
    sql: "SELECT id,group_id,kind,direction,title,description,timezone,start_date,end_date,due_date,status,revision,created_at,updated_at FROM plans WHERE owner_id=current_setting('app.export_user')::uuid ORDER BY id",
  },
  {
    name: "plan_rules",
    fields: [
      "id",
      "plan_id",
      "version",
      "effective_date",
      "weekdays",
      "weekly_target",
      "numeric_config",
      "created_at",
    ],
    sql: "SELECT r.id,r.plan_id,r.version,r.effective_date,r.weekdays,r.weekly_target,r.numeric_config,r.created_at FROM plan_rule_versions r JOIN plans p ON p.id=r.plan_id WHERE p.owner_id=current_setting('app.export_user')::uuid ORDER BY r.id",
  },
  {
    name: "plan_lifecycle",
    fields: [
      "id",
      "plan_id",
      "seq",
      "action",
      "effective_at",
      "business_date",
      "created_at",
    ],
    sql: "SELECT e.id,e.plan_id,e.seq,e.action,e.effective_at,e.business_date,e.created_at FROM plan_lifecycle_events e JOIN plans p ON p.id=e.plan_id WHERE p.owner_id=current_setting('app.export_user')::uuid ORDER BY e.id",
  },
  {
    name: "plan_numeric_config_versions",
    fields: [
      "id",
      "plan_id",
      "version",
      "effective_from",
      "label",
      "unit",
      "created_at",
    ],
    sql: "SELECT n.id,n.plan_id,n.version,n.effective_from,n.label,n.unit,n.created_at FROM plan_numeric_config_versions n JOIN plans p ON p.id=n.plan_id WHERE p.owner_id=current_setting('app.export_user')::uuid ORDER BY n.plan_id,n.version",
  },
  {
    name: "checkins",
    fields: [
      "id",
      "plan_id",
      "business_date",
      "result",
      "note",
      "failure_reason",
      "numeric_value",
      "numeric_unit",
      "numeric_label",
      "numeric_config_version_id",
      "rule_version_id",
      "is_backfilled",
      "is_revised",
      "revision",
      "created_at",
      "updated_at",
    ],
    sql: "SELECT id,plan_id,business_date,result,note,failure_reason,numeric_value,numeric_unit,numeric_label,numeric_config_version_id,rule_version_id,is_backfilled,is_revised,revision,created_at,updated_at FROM checkins WHERE owner_id=current_setting('app.export_user')::uuid ORDER BY id",
  },
  {
    name: "checkin_revisions",
    fields: [
      "id",
      "checkin_id",
      "revision",
      "before_snapshot",
      "after_snapshot",
      "actor_id",
      "changed_at",
      "reason",
      "resolution_of_conflict_id",
    ],
    sql: "SELECT r.id,r.checkin_id,r.revision,r.before_snapshot,r.after_snapshot,r.actor_id,r.changed_at,r.reason,r.resolution_of_conflict_id FROM checkin_revisions r JOIN checkins c ON c.id=r.checkin_id WHERE c.owner_id=current_setting('app.export_user')::uuid ORDER BY r.id",
  },
  {
    name: "checkin_conflicts",
    fields: [
      "id",
      "plan_id",
      "business_date",
      "current_revision",
      "submitted_summary",
      "created_at",
      "resolved_at",
    ],
    sql: "SELECT id,plan_id,business_date,current_revision,submitted_summary,created_at,resolved_at FROM checkin_conflicts WHERE owner_id=current_setting('app.export_user')::uuid ORDER BY id",
  },
  {
    name: "one_time_resolutions",
    fields: [
      "plan_id",
      "resolution",
      "resolved_business_date",
      "resolved_at",
      "note",
      "numeric_value",
      "numeric_unit",
      "numeric_label",
      "numeric_config_version_id",
      "revision",
    ],
    sql: "SELECT r.plan_id,r.resolution,r.resolved_business_date,r.resolved_at,r.note,r.numeric_value,r.numeric_unit,r.numeric_label,r.numeric_config_version_id,r.revision FROM one_time_resolutions r JOIN plans p ON p.id=r.plan_id WHERE p.owner_id=current_setting('app.export_user')::uuid ORDER BY r.plan_id",
  },
  {
    name: "one_time_resolution_revisions",
    fields: [
      "plan_id",
      "revision",
      "before_snapshot",
      "after_snapshot",
      "changed_at",
      "reason",
    ],
    sql: "SELECT r.plan_id,r.revision,r.before_snapshot,r.after_snapshot,r.changed_at,r.reason FROM one_time_resolution_revisions r JOIN plans p ON p.id=r.plan_id WHERE p.owner_id=current_setting('app.export_user')::uuid ORDER BY r.plan_id,r.revision",
  },
  {
    name: "photos",
    fields: [
      "id",
      "checkin_id",
      "one_time_plan_id",
      "mime",
      "bytes",
      "sha256",
      "created_at",
      "completed_at",
    ],
    sql: "SELECT id,checkin_id,one_time_plan_id,mime,bytes,encode(sha256,'hex') AS sha256,created_at,completed_at FROM media WHERE owner_id=current_setting('app.export_user')::uuid AND status='ready' ORDER BY id",
  },
  {
    name: "friends",
    fields: ["friend_id", "username", "nickname", "created_at"],
    sql: "SELECT u.id AS friend_id,u.username,u.nickname,f.created_at FROM friendships f JOIN users u ON u.id=CASE WHEN f.user_low=current_setting('app.export_user')::uuid THEN f.user_high ELSE f.user_low END WHERE (f.user_low=current_setting('app.export_user')::uuid OR f.user_high=current_setting('app.export_user')::uuid) ORDER BY u.id",
  },
  {
    name: "friend_requests",
    fields: [
      "id",
      "sender_id",
      "receiver_id",
      "status",
      "created_at",
      "responded_at",
    ],
    sql: "SELECT id,sender_id,receiver_id,status,created_at,responded_at FROM friend_requests WHERE sender_id=current_setting('app.export_user')::uuid OR receiver_id=current_setting('app.export_user')::uuid ORDER BY id",
  },
  {
    name: "blocks",
    fields: ["blocker_id", "blocked_id", "created_at"],
    sql: "SELECT blocker_id,blocked_id,created_at FROM blocks WHERE blocker_id=current_setting('app.export_user')::uuid ORDER BY blocked_id",
  },
  {
    name: "plan_shares",
    fields: ["plan_id", "friend_id", "granted_at", "revoked_at", "revision"],
    sql: "SELECT s.plan_id,s.friend_id,s.granted_at,s.revoked_at,s.revision FROM plan_shares s JOIN plans p ON p.id=s.plan_id WHERE p.owner_id=current_setting('app.export_user')::uuid ORDER BY s.plan_id,s.friend_id",
  },
  {
    name: "incoming_shares",
    fields: ["plan_id", "owner_id", "granted_at", "revision"],
    sql: "SELECT s.plan_id,p.owner_id,s.granted_at,s.revision FROM plan_shares s JOIN plans p ON p.id=s.plan_id JOIN friendships f ON f.user_low=least(p.owner_id,s.friend_id) AND f.user_high=greatest(p.owner_id,s.friend_id) WHERE s.friend_id=current_setting('app.export_user')::uuid AND s.revoked_at IS NULL AND p.status<>'deleted' AND NOT EXISTS(SELECT 1 FROM blocks b WHERE (b.blocker_id=p.owner_id AND b.blocked_id=s.friend_id) OR (b.blocker_id=s.friend_id AND b.blocked_id=p.owner_id)) ORDER BY s.plan_id",
  },
  {
    name: "encouragements",
    fields: [
      "id",
      "checkin_id",
      "sender_id",
      "owner_id",
      "kind",
      "body",
      "created_at",
    ],
    sql: "SELECT e.id,e.checkin_id,e.sender_id,e.owner_id,e.kind,e.body,e.created_at FROM encouragements e WHERE e.owner_id=current_setting('app.export_user')::uuid OR (e.sender_id=current_setting('app.export_user')::uuid AND EXISTS(SELECT 1 FROM checkins c JOIN plans p ON p.id=c.plan_id JOIN plan_shares s ON s.plan_id=p.id AND s.friend_id=e.sender_id AND s.revoked_at IS NULL JOIN friendships f ON (f.user_low=least(e.owner_id,e.sender_id) AND f.user_high=greatest(e.owner_id,e.sender_id)) WHERE c.id=e.checkin_id AND p.status<>'deleted' AND NOT EXISTS(SELECT 1 FROM blocks b WHERE (b.blocker_id=e.owner_id AND b.blocked_id=e.sender_id) OR (b.blocker_id=e.sender_id AND b.blocked_id=e.owner_id)))) ORDER BY e.id",
  },
  {
    name: "reminders",
    fields: [
      "plan_id",
      "enabled",
      "weekdays",
      "time_local",
      "lead_days",
      "revision",
      "updated_at",
    ],
    sql: "SELECT r.plan_id,r.enabled,r.weekdays,r.time_local,r.lead_days,r.revision,r.updated_at FROM reminder_settings r JOIN plans p ON p.id=r.plan_id WHERE p.owner_id=current_setting('app.export_user')::uuid ORDER BY r.plan_id",
  },
  {
    name: "notification_preferences",
    fields: [
      "friend_requests",
      "shared_updates",
      "encouragements",
      "revision",
      "updated_at",
    ],
    sql: "SELECT friend_requests,shared_updates,encouragements,revision,updated_at FROM notification_preferences WHERE user_id=current_setting('app.export_user')::uuid",
  },
  {
    name: "channel_notification_preferences",
    fields: [
      "channel",
      "plan_enabled",
      "friend_requests",
      "shared_updates",
      "encouragements",
      "revision",
      "updated_at",
    ],
    sql: "SELECT channel,plan_enabled,friend_requests,shared_updates,encouragements,revision,updated_at FROM channel_notification_preferences WHERE user_id=current_setting('app.export_user')::uuid ORDER BY channel",
  },
  {
    name: "inbox_messages",
    fields: [
      "id",
      "event_type",
      "actor_user_id",
      "subject_id",
      "sanitized_payload",
      "created_at",
      "read_at",
    ],
    sql: "SELECT id,event_type,actor_user_id,subject_id,sanitized_payload,created_at,read_at FROM inbox_messages WHERE recipient_user_id=current_setting('app.export_user')::uuid ORDER BY created_at,id",
  },
];
const csv = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  const text =
    typeof value === "object" && !(value instanceof Date)
      ? JSON.stringify(value)
      : String(value instanceof Date ? value.toISOString() : value);
  const safe = /^[\s\t]*[=+@-]/.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
};
const stableError = (error: unknown): string => {
  const code = error instanceof Error ? error.message : "";
  return [
    "EXPORT_TOO_LARGE",
    "EXPORT_TOO_MANY_FILES",
    "EXPORT_PHOTO_UNAVAILABLE",
    "EXPORT_ACCOUNT_INACTIVE",
  ].includes(code)
    ? code
    : "EXPORT_FAILED";
};
async function* rows(
  client: PoolClient,
  sql: string,
): AsyncGenerator<Record<string, unknown>> {
  await client.query(`DECLARE export_cursor NO SCROLL CURSOR FOR ${sql}`);
  try {
    while (true) {
      const page = await client.query<Record<string, unknown>>(
        "FETCH FORWARD 500 FROM export_cursor",
      );
      if (!page.rowCount) break;
      for (const row of page.rows) yield row;
    }
  } finally {
    await client.query("CLOSE export_cursor");
  }
}
async function* jsonLines(
  client: PoolClient,
  dataset: Dataset,
): AsyncGenerator<Buffer> {
  yield Buffer.from("[\n");
  let first = true;
  for await (const row of rows(client, dataset.sql)) {
    yield Buffer.from(`${first ? "" : ",\n"}${JSON.stringify(row)}`);
    first = false;
  }
  yield Buffer.from("\n]\n");
}
async function* csvLines(
  client: PoolClient,
  dataset: Dataset,
): AsyncGenerator<Buffer> {
  yield Buffer.from(`\uFEFF${dataset.fields.join(",")}\r\n`);
  for await (const row of rows(client, dataset.sql))
    yield Buffer.from(
      `${dataset.fields.map((field) => csv(row[field])).join(",")}\r\n`,
    );
}
function objectClient(): { s3: S3Client; bucket: string } {
  const endpoint = process.env.OBJECT_ENDPOINT,
    bucket = process.env.OBJECT_BUCKET,
    accessKeyId = process.env.OBJECT_ACCESS_KEY_ID,
    secretAccessKey = process.env.OBJECT_SECRET_ACCESS_KEY;
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey)
    throw new Error("EXPORT_OBJECT_CONFIG_MISSING");
  return {
    s3: new S3Client({
      endpoint,
      region: process.env.OBJECT_REGION ?? "us-east-1",
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    }),
    bucket,
  };
}
export async function claimDataExport(pool: Pool): Promise<Job | null> {
  const claimed = await pool.query<{
    id: string;
    payload: { exportId?: string };
    attempts: number;
  }>(
    `UPDATE worker_jobs SET status='running',attempts=attempts+1,locked_until=now()+interval '30 minutes',updated_at=now()
     WHERE id=(SELECT id FROM worker_jobs WHERE name='prepare-data-export' AND attempts<3 AND run_after<=now()
       AND (status IN ('queued','failed') OR (status='running' AND locked_until<now()))
       ORDER BY run_after,created_at FOR UPDATE SKIP LOCKED LIMIT 1)
     RETURNING id,payload,attempts`,
  );
  const row = claimed.rows[0];
  return row?.payload.exportId
    ? { id: row.id, exportId: row.payload.exportId, attempts: row.attempts }
    : null;
}
export async function processDataExport(pool: Pool, job: Job): Promise<void> {
  const found = await pool.query<{
    id: string;
    user_id: string;
    status: string;
  }>(
    `SELECT e.id,e.user_id,e.status FROM data_exports e JOIN users u ON u.id=e.user_id
     WHERE e.id=$1 AND u.status='active'`,
    [job.exportId],
  );
  const exportRow = found.rows[0];
  if (!exportRow || !["queued", "running"].includes(exportRow.status)) {
    if (!exportRow)
      await pool.query(
        "UPDATE data_exports SET status='failed',error_code='EXPORT_ACCOUNT_INACTIVE' WHERE id=$1 AND status IN ('queued','running')",
        [job.exportId],
      );
    await pool.query(
      "UPDATE worker_jobs SET status='succeeded',locked_until=NULL,updated_at=now() WHERE id=$1",
      [job.id],
    );
    return;
  }
  await pool.query(
    "UPDATE data_exports SET status='running',started_at=coalesce(started_at,now()),error_code=NULL WHERE id=$1",
    [job.exportId],
  );
  const key = `exports/${exportRow.user_id}/${job.exportId}.zip`;
  const sink = new MultipartZipSink(key);
  const zip = new ZipWriter(sink);
  const client = await pool.connect();
  let uploaded = false;
  let uploadedHash: string | null = null;
  let committed = false;
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    await client.query("SELECT set_config('app.export_user',$1,true)", [
      exportRow.user_id,
    ]);
    for (const dataset of datasets) {
      await zip.add(`json/${dataset.name}.json`, jsonLines(client, dataset));
      await zip.add(`csv/${dataset.name}.csv`, csvLines(client, dataset));
      await pool.query(
        "UPDATE worker_jobs SET locked_until=now()+interval '30 minutes' WHERE id=$1 AND status='running'",
        [job.id],
      );
    }
    const { s3, bucket } = objectClient();
    for await (const raw of rows(
      client,
      `SELECT m.id,m.object_key,m.mime,encode(m.sha256,'hex') AS sha256,coalesce(c.plan_id,m.one_time_plan_id) AS plan_id,m.checkin_id
       FROM media m LEFT JOIN checkins c ON c.id=m.checkin_id
       WHERE m.owner_id=current_setting('app.export_user')::uuid AND m.status='ready' ORDER BY m.id`,
    )) {
      const photo = raw as {
        id: string;
        object_key: string;
        mime: string;
        sha256: string | null;
        plan_id: string;
        checkin_id: string | null;
      };
      const object = await s3.send(
        new GetObjectCommand({ Bucket: bucket, Key: photo.object_key }),
      );
      if (!object.Body) throw new Error("EXPORT_PHOTO_UNAVAILABLE");
      const extension = (
        {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/heic": "heic",
          "image/webp": "webp",
        } as Record<string, string>
      )[photo.mime];
      if (!extension || !photo.plan_id) throw new Error("EXPORT_PHOTO_INVALID");
      await zip.add(
        `photos/${photo.plan_id}/${photo.checkin_id ?? "one-time"}/${photo.id}.${extension}`,
        (async function* () {
          for await (const bytes of object.Body as AsyncIterable<Uint8Array>)
            yield Buffer.from(bytes);
        })(),
      );
      if (photo.sha256 && zip.lastFileHash !== photo.sha256)
        throw new Error("EXPORT_PHOTO_HASH_MISMATCH");
      await pool.query(
        "UPDATE worker_jobs SET locked_until=now()+interval '30 minutes' WHERE id=$1 AND status='running'",
        [job.id],
      );
    }
    const manifest = {
      schemaVersion: "1.0",
      generatedAt: new Date().toISOString(),
      fileCount: zip.fileCount + 1,
      files: zip.files,
      fields: Object.fromEntries(
        datasets.map((dataset) => [dataset.name, dataset.fields]),
      ),
    };
    await zip.add("manifest.json", [
      Buffer.from(JSON.stringify(manifest, null, 2) + "\n"),
    ]);
    await zip.finish();
    const sha256 = await sink.finish();
    uploaded = true;
    uploadedHash = sha256;
    await client.query("COMMIT");
    committed = true;
    const updated = await pool.query(
      `UPDATE data_exports SET status='ready',object_key=$2,file_bytes=$3,file_sha256=decode($4,'hex'),file_count=$5,
         completed_at=now(),expires_at=now()+interval '24 hours'
       WHERE id=$1 AND EXISTS(SELECT 1 FROM users WHERE id=data_exports.user_id AND status='active')`,
      [job.exportId, key, sink.bytes, sha256, zip.fileCount],
    );
    if (!updated.rowCount) {
      throw new Error("EXPORT_ACCOUNT_INACTIVE");
    }
    await pool.query(
      "UPDATE worker_jobs SET status='succeeded',locked_until=NULL,updated_at=now() WHERE id=$1",
      [job.id],
    );
  } catch (error) {
    if (!committed) await client.query("ROLLBACK").catch(() => {});
    let orphaned = false;
    if (uploaded) {
      const { s3, bucket } = objectClient();
      await s3
        .send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
        .catch(() => {
          orphaned = true;
        });
    } else await sink.abort().catch(() => {});
    const last = job.attempts >= 3;
    const code = stableError(error);
    if (orphaned && uploadedHash)
      await pool.query(
        `UPDATE data_exports SET status='ready',object_key=$2,file_bytes=$3,file_sha256=decode($4,'hex'),file_count=$5,
           expires_at=now(),error_code=$6 WHERE id=$1`,
        [job.exportId, key, sink.bytes, uploadedHash, zip.fileCount, code],
      );
    else
      await pool.query(
        "UPDATE data_exports SET status=$2,object_key=NULL,file_bytes=NULL,file_sha256=NULL,file_count=NULL,expires_at=NULL,error_code=$3 WHERE id=$1",
        [job.exportId, last ? "failed" : "queued", code],
      );
    await pool.query(
      "UPDATE worker_jobs SET status='failed',locked_until=NULL,run_after=now()+($2::int * interval '1 minute'),last_error_code=$3,updated_at=now() WHERE id=$1",
      [job.id, Math.min(30, 2 ** job.attempts), code],
    );
  } finally {
    client.release();
  }
}
export async function cleanupExpiredExports(pool: Pool): Promise<void> {
  const expired = await pool.query<{ id: string; object_key: string }>(
    "SELECT id,object_key FROM data_exports WHERE status='ready' AND expires_at<=now() ORDER BY expires_at LIMIT 20",
  );
  if (!expired.rows.length) return;
  const { s3, bucket } = objectClient();
  for (const row of expired.rows) {
    await s3.send(
      new DeleteObjectCommand({ Bucket: bucket, Key: row.object_key }),
    );
    await pool.query(
      "UPDATE data_exports SET status='expired',object_key=NULL,file_sha256=NULL,file_bytes=NULL,file_count=NULL WHERE id=$1 AND status='ready'",
      [row.id],
    );
  }
}

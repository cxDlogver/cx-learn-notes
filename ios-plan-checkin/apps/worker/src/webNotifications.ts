import { createDecipheriv } from "node:crypto";
import type { Pool } from "pg";
import { WebPushError, type WebPushSender } from "./webPush.js";

interface Job {
  id: string;
  payload: { kind: "social"; messageId: string; recipientId: string };
  attempts: number;
}
interface Message {
  event_type:
    | "friend_request"
    | "friend_accepted"
    | "share"
    | "shared_update"
    | "encouragement";
  actor_user_id: string | null;
  subject_id: string | null;
  recipient_user_id: string;
}
interface Subscription {
  id: string;
  endpoint_ciphertext: Uint8Array;
  p256dh_ciphertext: Uint8Array;
  auth_ciphertext: Uint8Array;
}

function decrypt(value: Uint8Array, key: Uint8Array): string {
  const bytes = Buffer.from(value);
  if (bytes.length < 29) throw new Error("Invalid encrypted Web Push value");
  const decipher = createDecipheriv("aes-256-gcm", key, bytes.subarray(0, 12));
  decipher.setAuthTag(bytes.subarray(12, 28));
  return Buffer.concat([
    decipher.update(bytes.subarray(28)),
    decipher.final(),
  ]).toString("utf8");
}

export async function claimWebPush(pool: Pool): Promise<Job | null> {
  const claimed = await pool.query<Job>(
    `UPDATE worker_jobs SET status='running',attempts=attempts+1,
       locked_until=now()+interval '2 minutes',updated_at=now()
     WHERE id=(SELECT id FROM worker_jobs WHERE name='send-web-push'
       AND attempts<10 AND run_after<=now() AND
       (status IN ('queued','failed') OR (status='running' AND locked_until<now()))
       ORDER BY run_after,created_at FOR UPDATE SKIP LOCKED LIMIT 1)
     RETURNING id,payload,attempts`,
  );
  return claimed.rows[0] ?? null;
}

async function messageVisible(pool: Pool, message: Message): Promise<boolean> {
  const actor = message.actor_user_id;
  const subject = message.subject_id;
  const recipient = message.recipient_user_id;
  if (!actor || !subject) return false;
  if (message.event_type === "friend_request") {
    const found = await pool.query(
      `SELECT 1 FROM friend_requests r JOIN users a ON a.id=r.sender_id AND a.status='active'
       WHERE r.id=$1 AND r.receiver_id=$2 AND r.sender_id=$3 AND r.status='pending'
       AND NOT EXISTS(SELECT 1 FROM blocks b WHERE
         (b.blocker_id=$2 AND b.blocked_id=$3) OR (b.blocker_id=$3 AND b.blocked_id=$2))`,
      [subject, recipient, actor],
    );
    return Boolean(found.rowCount);
  }
  if (message.event_type === "friend_accepted") {
    const found = await pool.query(
      `SELECT 1 FROM friendships f JOIN users a ON a.id=$2 AND a.status='active'
       WHERE f.user_low=least($1::uuid,$2::uuid) AND f.user_high=greatest($1::uuid,$2::uuid)
       AND NOT EXISTS(SELECT 1 FROM blocks b WHERE
         (b.blocker_id=$1 AND b.blocked_id=$2) OR (b.blocker_id=$2 AND b.blocked_id=$1))`,
      [recipient, actor],
    );
    return Boolean(found.rowCount);
  }
  if (
    message.event_type === "share" ||
    message.event_type === "shared_update"
  ) {
    const found = await pool.query(
      `SELECT 1 FROM plan_shares s
       JOIN plans p ON p.id=s.plan_id AND p.owner_id=$3 AND p.status<>'deleted'
       JOIN users a ON a.id=$3 AND a.status='active'
       JOIN friendships f ON f.user_low=least($2::uuid,$3::uuid)
         AND f.user_high=greatest($2::uuid,$3::uuid)
       WHERE s.plan_id=$1 AND s.friend_id=$2 AND s.revoked_at IS NULL
       AND NOT EXISTS(SELECT 1 FROM blocks b WHERE
         (b.blocker_id=$2 AND b.blocked_id=$3) OR (b.blocker_id=$3 AND b.blocked_id=$2))`,
      [subject, recipient, actor],
    );
    return Boolean(found.rowCount);
  }
  const found = await pool.query(
    `SELECT 1 FROM checkins c JOIN plans p ON p.id=c.plan_id AND p.owner_id=$2 AND p.status<>'deleted'
     JOIN users a ON a.id=$3 AND a.status='active'
     WHERE c.id=$1`,
    [subject, recipient, actor],
  );
  return Boolean(found.rowCount);
}

export async function sendWebPushToUser(
  pool: Pool,
  sender: Pick<WebPushSender, "send">,
  jobId: string,
  userId: string,
  key: Uint8Array,
  kind: "plan" | "social",
  stillEligible: () => Promise<boolean>,
): Promise<void> {
  const subscriptions = await pool.query<Subscription>(
    `SELECT s.id,s.endpoint_ciphertext,s.p256dh_ciphertext,s.auth_ciphertext
     FROM web_push_subscriptions s WHERE s.user_id=$1 AND s.enabled AND s.revoked_at IS NULL
       AND (s.expires_at IS NULL OR s.expires_at>now())
       AND EXISTS(SELECT 1 FROM sessions x WHERE x.user_id=s.user_id
         AND x.device_id=s.browser_device_id AND x.client_channel='web'
         AND x.revoked_at IS NULL AND x.expires_at>now())`,
    [userId],
  );
  for (const subscription of subscriptions.rows) {
    if (!(await stillEligible())) break;
    const already = await pool.query(
      "SELECT 1 FROM web_push_deliveries WHERE job_id=$1 AND subscription_id=$2",
      [jobId, subscription.id],
    );
    if (already.rowCount) continue;
    try {
      await sender.send(
        {
          endpoint: decrypt(subscription.endpoint_ciphertext, key),
          p256dh: decrypt(subscription.p256dh_ciphertext, key),
          auth: decrypt(subscription.auth_ciphertext, key),
        },
        kind,
      );
      await pool.query(
        "INSERT INTO web_push_deliveries(job_id,subscription_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
        [jobId, subscription.id],
      );
      await pool.query(
        "UPDATE web_push_subscriptions SET last_success_at=now(),last_failure_code=NULL WHERE id=$1",
        [subscription.id],
      );
    } catch (cause) {
      if (cause instanceof WebPushError && cause.expired) {
        await pool.query(
          `UPDATE web_push_subscriptions SET enabled=false,revoked_at=coalesce(revoked_at,now()),
             last_failure_code='EXPIRED',updated_at=now() WHERE id=$1`,
          [subscription.id],
        );
        continue;
      }
      throw cause;
    }
  }
}

export async function processWebPush(
  pool: Pool,
  sender: Pick<WebPushSender, "send">,
  job: Job,
  key: Uint8Array,
): Promise<void> {
  try {
    if (job.payload.kind !== "social")
      throw new Error("Unsupported Web Push job");
    const found = await pool.query<Message>(
      `SELECT m.event_type,m.actor_user_id,m.subject_id,m.recipient_user_id
       FROM inbox_messages m JOIN users u ON u.id=m.recipient_user_id AND u.status='active'
       WHERE m.id=$1 AND m.recipient_user_id=$2`,
      [job.payload.messageId, job.payload.recipientId],
    );
    const message = found.rows[0];
    if (message && (await messageVisible(pool, message))) {
      const category =
        message.event_type === "friend_request" ||
        message.event_type === "friend_accepted"
          ? "friend_requests"
          : message.event_type === "encouragement"
            ? "encouragements"
            : "shared_updates";
      const pref = await pool.query<{ allowed: boolean }>(
        `SELECT coalesce(p.${category},true) AS allowed FROM users u
         LEFT JOIN channel_notification_preferences p ON p.user_id=u.id AND p.channel='web'
         WHERE u.id=$1 AND u.status='active'`,
        [job.payload.recipientId],
      );
      if (pref.rows[0]?.allowed) {
        await sendWebPushToUser(
          pool,
          sender,
          job.id,
          job.payload.recipientId,
          key,
          "social",
          () => messageVisible(pool, message),
        );
      }
    }
    await pool.query(
      "UPDATE worker_jobs SET status='succeeded',locked_until=NULL,updated_at=now(),last_error_code=NULL WHERE id=$1",
      [job.id],
    );
  } catch (cause) {
    const code =
      cause instanceof WebPushError
        ? cause.retryable
          ? "WEB_PUSH_RETRYABLE"
          : "WEB_PUSH_REJECTED"
        : "WEB_PUSH_FAILED";
    const seconds = Math.min(3600, 2 ** Math.min(job.attempts, 10) * 15);
    await pool.query(
      `UPDATE worker_jobs SET status='failed',locked_until=NULL,
       run_after=now()+($2::int * interval '1 second'),updated_at=now(),last_error_code=$3 WHERE id=$1`,
      [job.id, seconds, code],
    );
    throw cause;
  }
}

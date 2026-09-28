import { createDecipheriv, createHash, randomUUID, sign } from "node:crypto";
import { connect } from "node:http2";
import type { Pool } from "pg";

export type SocialEvent =
  | { kind: "friend_request"; requestId: string; recipientId: string }
  | {
      kind: "plan_share";
      planId: string;
      recipientId: string;
      revision: number;
    }
  | { kind: "encouragement"; encouragementId: string; recipientId: string };
interface Job {
  id: string;
  payload: SocialEvent;
  attempts: number;
}
interface Device {
  id: string;
  apns_token_ciphertext: Uint8Array;
}
interface Alert {
  title: string;
  body: string;
  category: "friend_requests" | "shared_updates" | "encouragements";
}
export interface PushSender {
  send(
    token: string,
    alert: Alert,
    collapseId: string,
  ): Promise<{ apnsId: string }>;
}
export class ApnsError extends Error {
  constructor(
    readonly status: number,
    readonly reason: string,
  ) {
    super(`APNs ${status}: ${reason}`);
  }
  get invalidToken(): boolean {
    return (
      this.status === 410 ||
      ["BadDeviceToken", "Unregistered", "DeviceTokenNotForTopic"].includes(
        this.reason,
      )
    );
  }
  get retryable(): boolean {
    return this.status === 429 || this.status >= 500 || this.status === 0;
  }
}

export class ApnsSender implements PushSender {
  private readonly provider: string;
  private readonly host: string;
  private readonly topic: string;
  private readonly teamId: string;
  private readonly keyId: string;
  private readonly privateKey: string;
  private token: { value: string; until: number } | null = null;
  constructor(environment = process.env) {
    this.provider =
      environment.APNS_PROVIDER ??
      (environment.APP_ENV === "development" ? "stub" : "apns");
    if (!["stub", "apns"].includes(this.provider))
      throw new Error("Unsupported APNS_PROVIDER");
    if (this.provider === "stub" && environment.APP_ENV !== "development")
      throw new Error("APNs stub is only allowed in development");
    if (
      this.provider === "apns" &&
      !["sandbox", "production"].includes(environment.APNS_ENV ?? "")
    )
      throw new Error("APNS_ENV must be sandbox or production");
    if (
      environment.APP_ENV === "production" &&
      environment.APNS_ENV !== "production"
    )
      throw new Error("Production must use production APNs");
    this.host =
      environment.APNS_ENV === "production"
        ? "api.push.apple.com"
        : "api.sandbox.push.apple.com";
    this.topic = environment.APNS_BUNDLE_ID ?? "";
    this.teamId = environment.APNS_TEAM_ID ?? "";
    this.keyId = environment.APNS_KEY_ID ?? "";
    this.privateKey = environment.APNS_PRIVATE_KEY_BASE64
      ? Buffer.from(environment.APNS_PRIVATE_KEY_BASE64, "base64").toString(
          "utf8",
        )
      : "";
    if (
      this.provider === "apns" &&
      (!this.topic || !this.teamId || !this.keyId || !this.privateKey)
    )
      throw new Error("APNs credentials are incomplete");
  }
  private bearer(): string {
    const now = Math.floor(Date.now() / 1000);
    if (this.token && this.token.until > now) return this.token.value;
    const base64 = (value: object) =>
      Buffer.from(JSON.stringify(value)).toString("base64url");
    const signingInput = `${base64({ alg: "ES256", kid: this.keyId })}.${base64({ iss: this.teamId, iat: now })}`;
    const signature = sign("sha256", Buffer.from(signingInput), {
      key: this.privateKey,
      dsaEncoding: "ieee-p1363",
    }).toString("base64url");
    const value = `${signingInput}.${signature}`;
    this.token = { value, until: now + 50 * 60 };
    return value;
  }
  async send(
    token: string,
    alert: Alert,
    collapseId: string,
  ): Promise<{ apnsId: string }> {
    if (this.provider === "stub") return { apnsId: randomUUID() };
    const apnsId = randomUUID();
    const body = JSON.stringify({
      aps: {
        alert: { title: alert.title, body: alert.body },
        "thread-id": "social",
      },
      kind: "social",
    });
    const session = connect(`https://${this.host}`);
    return new Promise((resolve, reject) => {
      let settled = false;
      const done = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        session.close();
        if (error) reject(error);
        else resolve({ apnsId });
      };
      const timeout = setTimeout(() => {
        session.destroy();
        done(new ApnsError(0, "Timeout"));
      }, 10_000);
      session.on("error", () => done(new ApnsError(0, "ConnectionError")));
      const stream = session.request({
        ":method": "POST",
        ":path": `/3/device/${token}`,
        authorization: `bearer ${this.bearer()}`,
        "apns-topic": this.topic,
        "apns-push-type": "alert",
        "apns-priority": "10",
        "apns-expiration": String(Math.floor(Date.now() / 1000) + 3600),
        "apns-collapse-id": collapseId,
        "apns-id": apnsId,
      });
      let status = 0;
      let response = "";
      stream.on("response", (headers) => {
        status = Number(headers[":status"] ?? 0);
      });
      stream.on("data", (chunk: Buffer) => {
        if (response.length < 2048) response += chunk.toString("utf8");
      });
      stream.on("error", () => done(new ApnsError(0, "StreamError")));
      stream.on("end", () => {
        if (status === 200) return done();
        let reason = "Unknown";
        try {
          reason = JSON.parse(response).reason ?? reason;
        } catch {
          /* No APNs reason. */
        }
        done(new ApnsError(status, reason));
      });
      stream.end(body);
    });
  }
}

function decryptToken(ciphertext: Uint8Array, key: Uint8Array): string {
  const bytes = Buffer.from(ciphertext);
  if (bytes.length < 29) throw new Error("Invalid encrypted APNs token");
  const decipher = createDecipheriv("aes-256-gcm", key, bytes.subarray(0, 12));
  decipher.setAuthTag(bytes.subarray(12, 28));
  return Buffer.concat([
    decipher.update(bytes.subarray(28)),
    decipher.final(),
  ]).toString("utf8");
}

export async function claimSocialNotification(pool: Pool): Promise<Job | null> {
  const claimed = await pool.query<Job>(
    `UPDATE worker_jobs SET status='running',attempts=attempts+1,
       locked_until=now()+interval '2 minutes',updated_at=now()
     WHERE id=(SELECT id FROM worker_jobs WHERE name='send-social-notification'
       AND attempts<10 AND run_after<=now() AND
       (status IN ('queued','failed') OR (status='running' AND locked_until<now()))
       ORDER BY run_after,created_at FOR UPDATE SKIP LOCKED LIMIT 1)
     RETURNING id,payload,attempts`,
  );
  return claimed.rows[0] ?? null;
}

async function visible(pool: Pool, event: SocialEvent): Promise<Alert | null> {
  if (event.kind === "friend_request") {
    const result = await pool.query(
      `SELECT 1 FROM friend_requests r JOIN users a ON a.id=r.sender_id AND a.status='active'
       JOIN users b ON b.id=r.receiver_id AND b.status='active'
       WHERE r.id=$1 AND r.receiver_id=$2 AND r.status='pending'
       AND NOT EXISTS(SELECT 1 FROM blocks x WHERE
         (x.blocker_id=r.sender_id AND x.blocked_id=r.receiver_id) OR
         (x.blocker_id=r.receiver_id AND x.blocked_id=r.sender_id))`,
      [event.requestId, event.recipientId],
    );
    return result.rowCount
      ? {
          title: "计划打卡",
          body: "有新的好友申请",
          category: "friend_requests",
        }
      : null;
  }
  if (event.kind === "plan_share") {
    const result = await pool.query(
      `SELECT 1 FROM plan_shares s JOIN plans p ON p.id=s.plan_id AND p.status<>'deleted'
       JOIN users a ON a.id=p.owner_id AND a.status='active'
       JOIN users b ON b.id=s.friend_id AND b.status='active'
       JOIN friendships f ON f.user_low=least(a.id,b.id) AND f.user_high=greatest(a.id,b.id)
       WHERE s.plan_id=$1 AND s.friend_id=$2 AND s.revision=$3 AND s.revoked_at IS NULL
       AND NOT EXISTS(SELECT 1 FROM blocks x WHERE
         (x.blocker_id=a.id AND x.blocked_id=b.id) OR
         (x.blocker_id=b.id AND x.blocked_id=a.id))`,
      [event.planId, event.recipientId, event.revision],
    );
    return result.rowCount
      ? {
          title: "计划打卡",
          body: "有新的计划分享",
          category: "shared_updates",
        }
      : null;
  }
  const result = await pool.query(
    `SELECT 1 FROM encouragements e JOIN checkins c ON c.id=e.checkin_id
     JOIN plans p ON p.id=c.plan_id AND p.status<>'deleted'
     JOIN users a ON a.id=e.sender_id AND a.status='active'
     JOIN users b ON b.id=e.owner_id AND b.status='active'
     JOIN plan_shares s ON s.plan_id=p.id AND s.friend_id=e.sender_id AND s.revoked_at IS NULL
     JOIN friendships f ON f.user_low=least(a.id,b.id) AND f.user_high=greatest(a.id,b.id)
     WHERE e.id=$1 AND e.owner_id=$2
     AND NOT EXISTS(SELECT 1 FROM blocks x WHERE
       (x.blocker_id=a.id AND x.blocked_id=b.id) OR
       (x.blocker_id=b.id AND x.blocked_id=a.id))`,
    [event.encouragementId, event.recipientId],
  );
  return result.rowCount
    ? {
        title: "计划打卡",
        body: "收到一条鼓励留言",
        category: "encouragements",
      }
    : null;
}

export async function processSocialNotification(
  pool: Pool,
  sender: PushSender,
  job: Job,
  key: Uint8Array,
): Promise<void> {
  try {
    const alert = await visible(pool, job.payload);
    if (alert) {
      const pref = await pool.query<{ allowed: boolean }>(
        `SELECT coalesce(n.${alert.category},true) AS allowed FROM users u
         LEFT JOIN notification_preferences n ON n.user_id=u.id
         WHERE u.id=$1 AND u.status='active'`,
        [job.payload.recipientId],
      );
      if (pref.rows[0]?.allowed) {
        const devices = await pool.query<Device>(
          `SELECT d.id,d.apns_token_ciphertext FROM devices d WHERE d.user_id=$1 AND d.platform='ios'
           AND d.notifications_enabled=true AND d.apns_token_ciphertext IS NOT NULL
           AND EXISTS(SELECT 1 FROM sessions s WHERE s.user_id=d.user_id
             AND s.device_id=d.id::text AND s.revoked_at IS NULL AND s.expires_at>now())`,
          [job.payload.recipientId],
        );
        for (const device of devices.rows) {
          if (!(await visible(pool, job.payload))) break;
          const prior = await pool.query(
            "SELECT 1 FROM notification_deliveries WHERE job_id=$1 AND device_id=$2",
            [job.id, device.id],
          );
          if (prior.rowCount) continue;
          const token = decryptToken(device.apns_token_ciphertext, key);
          try {
            const accepted = await sender.send(
              token,
              alert,
              `social-${alert.category}`,
            );
            await pool.query(
              "INSERT INTO notification_deliveries(job_id,device_id,apns_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
              [job.id, device.id, accepted.apnsId],
            );
          } catch (cause) {
            if (cause instanceof ApnsError && cause.invalidToken) {
              await pool.query(
                "UPDATE devices SET notifications_enabled=false,apns_token_ciphertext=NULL,push_token_hash=NULL WHERE id=$1",
                [device.id],
              );
              continue;
            }
            throw cause;
          }
        }
      }
    }
    await pool.query(
      "UPDATE worker_jobs SET status='succeeded',locked_until=NULL,updated_at=now(),last_error_code=NULL WHERE id=$1",
      [job.id],
    );
  } catch (cause) {
    const code =
      cause instanceof ApnsError
        ? cause.retryable
          ? "APNS_RETRYABLE"
          : "APNS_REJECTED"
        : "SOCIAL_PUSH_FAILED";
    const seconds = Math.min(3600, 2 ** Math.min(job.attempts, 10) * 15);
    await pool.query(
      `UPDATE worker_jobs SET status='failed',locked_until=NULL,
       run_after=now()+($2::int * interval '1 second'),updated_at=now(),last_error_code=$3 WHERE id=$1`,
      [job.id, seconds, code],
    );
    throw cause;
  }
}

export function pushTokenKey(secret: string): Uint8Array {
  if (!secret) throw new Error("PUSH_TOKEN_ENCRYPTION_KEY missing");
  if (
    process.env.APP_ENV !== "development" &&
    (secret.length < 32 || secret.startsWith("local_only_"))
  )
    throw new Error(
      "PUSH_TOKEN_ENCRYPTION_KEY must be an injected production secret",
    );
  return createHash("sha256").update(secret).digest();
}

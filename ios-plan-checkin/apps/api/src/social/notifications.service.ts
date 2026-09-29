import {
  createCipheriv,
  createECDH,
  createHmac,
  randomBytes,
} from "node:crypto";
import { isIP } from "node:net";
import { Injectable } from "@nestjs/common";
import type {
  NotificationPreferencesDto,
  PushTokenRegistrationDto,
  RegisterWebPushSubscriptionRequest,
  RegisterPushTokenRequest,
  UpdateNotificationPreferencesRequest,
  UpdateWebNotificationPreferencesRequest,
  WebNotificationPreferencesDto,
  WebPushSubscriptionDto,
} from "@plan-checkin/contracts";
import { ApiConfig } from "../config.js";
import { Database } from "../database.js";
import { fail } from "../http.js";
import { guardFields, PlanWrite, requireUuid } from "../plans/write.js";

interface PrefRow {
  plan_enabled?: boolean;
  friend_requests: boolean;
  shared_updates: boolean;
  encouragements: boolean;
  revision: number;
  updated_at: Date | string;
}
const columns =
  "friend_requests,shared_updates,encouragements,revision,updated_at";
function encryptPushValue(value: string, key: Uint8Array): Buffer {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([nonce, cipher.getAuthTag(), ciphertext]);
}
function validateWebPush(
  input: RegisterWebPushSubscriptionRequest,
): Date | null {
  guardFields(input, ["endpoint", "expirationTime", "keys"]);
  if (typeof input.endpoint !== "string" || input.endpoint.length > 2048)
    fail("VALIDATION_ERROR", 400, "Push 地址格式不正确");
  let endpoint: URL;
  try {
    endpoint = new URL(input.endpoint);
  } catch {
    fail("VALIDATION_ERROR", 400, "Push 地址格式不正确");
  }
  if (
    endpoint.protocol !== "https:" ||
    !endpoint.hostname.includes(".") ||
    isIP(endpoint.hostname) !== 0 ||
    endpoint.port ||
    endpoint.username ||
    endpoint.password ||
    endpoint.hash ||
    endpoint.href !== input.endpoint ||
    !(
      endpoint.hostname === "fcm.googleapis.com" ||
      [
        "push.apple.com",
        "push.services.mozilla.com",
        "notify.windows.com",
      ].some(
        (suffix) =>
          endpoint.hostname === suffix ||
          endpoint.hostname.endsWith(`.${suffix}`),
      )
    )
  )
    fail("VALIDATION_ERROR", 400, "Push 服务地址不受支持");
  guardFields(input.keys, ["p256dh", "auth"]);
  const key = input.keys.p256dh;
  const auth = input.keys.auth;
  if (
    typeof key !== "string" ||
    typeof auth !== "string" ||
    !/^[A-Za-z0-9_-]+$/.test(key) ||
    !/^[A-Za-z0-9_-]+$/.test(auth)
  )
    fail("VALIDATION_ERROR", 400, "Push 密钥格式不正确");
  const publicKey = Buffer.from(key, "base64url");
  const authSecret = Buffer.from(auth, "base64url");
  if (
    publicKey.length !== 65 ||
    publicKey[0] !== 4 ||
    authSecret.length !== 16 ||
    publicKey.toString("base64url") !== key ||
    authSecret.toString("base64url") !== auth
  )
    fail("VALIDATION_ERROR", 400, "Push 密钥长度不正确");
  try {
    const probe = createECDH("prime256v1");
    probe.generateKeys();
    probe.computeSecret(publicKey);
  } catch {
    fail("VALIDATION_ERROR", 400, "Push 公钥不在 P-256 曲线上");
  }
  if (input.expirationTime === null) return null;
  if (typeof input.expirationTime !== "string")
    fail("VALIDATION_ERROR", 400, "订阅过期时间不正确");
  const expiry = new Date(input.expirationTime);
  if (
    !Number.isFinite(expiry.getTime()) ||
    expiry.toISOString() !== input.expirationTime ||
    expiry.getTime() <= Date.now() ||
    expiry.getTime() > Date.now() + 366 * 24 * 60 * 60_000
  )
    fail("VALIDATION_ERROR", 400, "订阅过期时间不正确");
  return expiry;
}
function dto(row: PrefRow): NotificationPreferencesDto {
  return {
    friendRequests: row.friend_requests,
    sharedUpdates: row.shared_updates,
    encouragements: row.encouragements,
    revision: row.revision,
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

@Injectable()
export class NotificationsService {
  private readonly write: PlanWrite;
  constructor(
    private readonly database: Database,
    private readonly config: ApiConfig,
  ) {
    this.write = new PlanWrite(database, config);
  }

  async register(
    userId: string,
    input: RegisterPushTokenRequest,
  ): Promise<PushTokenRegistrationDto> {
    guardFields(input, ["deviceId", "platform", "token", "enabled"]);
    const deviceId = requireUuid(input.deviceId);
    if (input.platform !== "ios" || typeof input.enabled !== "boolean")
      fail("VALIDATION_ERROR", 400, "设备类型或通知状态不正确");
    if (
      input.enabled &&
      (typeof input.token !== "string" ||
        !/^[0-9a-f]{64,200}$/i.test(input.token))
    )
      fail("VALIDATION_ERROR", 400, "APNs 设备令牌格式不正确");
    if (!input.enabled && input.token !== null)
      fail("VALIDATION_ERROR", 400, "关闭远程通知时令牌应为空");
    const token = input.enabled ? input.token!.toLowerCase() : null;
    const key = this.config.pushTokenEncryptionKey;
    const digest = token
      ? createHmac("sha256", key).update(token).digest()
      : null;
    let ciphertext: Buffer | null = null;
    if (token) {
      const nonce = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", key, nonce);
      const encrypted = Buffer.concat([
        cipher.update(token, "utf8"),
        cipher.final(),
      ]);
      ciphertext = Buffer.concat([nonce, cipher.getAuthTag(), encrypted]);
    }
    return this.database.transaction(async (client) => {
      const existing = await client.query<{ user_id: string }>(
        "SELECT user_id FROM devices WHERE id=$1 FOR UPDATE",
        [deviceId],
      );
      if (existing.rows[0] && existing.rows[0].user_id !== userId && !token)
        fail("NOT_FOUND", 404, "设备不存在");
      if (digest)
        await client.query(
          `UPDATE devices SET apns_token_ciphertext=NULL,push_token_hash=NULL,notifications_enabled=false
         WHERE push_token_hash=$1 AND id<>$2`,
          [digest, deviceId],
        );
      await client.query(
        `INSERT INTO devices(id,user_id,platform,apns_token_ciphertext,push_token_hash,notifications_enabled,last_seen_at)
         VALUES($1,$2,'ios',$3,$4,$5,now())
         ON CONFLICT(id) DO UPDATE SET user_id=$2,apns_token_ciphertext=$3,push_token_hash=$4,
           notifications_enabled=$5,last_seen_at=now()`,
        [deviceId, userId, ciphertext, digest, input.enabled],
      );
      return { deviceId, registered: input.enabled };
    });
  }

  async getPreferences(userId: string): Promise<NotificationPreferencesDto> {
    await this.database.query(
      "INSERT INTO notification_preferences(user_id) VALUES($1) ON CONFLICT DO NOTHING",
      [userId],
    );
    const found = await this.database.query<PrefRow>(
      `SELECT ${columns} FROM notification_preferences WHERE user_id=$1`,
      [userId],
    );
    return dto(found.rows[0]!);
  }

  async updatePreferences(
    userId: string,
    input: UpdateNotificationPreferencesRequest,
    key: string,
  ): Promise<NotificationPreferencesDto> {
    guardFields(input, [
      "friendRequests",
      "sharedUpdates",
      "encouragements",
      "baseRevision",
    ]);
    if (
      !Number.isInteger(input.baseRevision) ||
      input.baseRevision < 1 ||
      [input.friendRequests, input.sharedUpdates, input.encouragements].some(
        (value) => value !== undefined && typeof value !== "boolean",
      ) ||
      [input.friendRequests, input.sharedUpdates, input.encouragements].every(
        (value) => value === undefined,
      )
    )
      fail("VALIDATION_ERROR", 400, "通知偏好参数不正确");
    return this.write.run(
      userId,
      key,
      "notification-preferences-update",
      input,
      async (client) => {
        await client.query(
          "INSERT INTO notification_preferences(user_id) VALUES($1) ON CONFLICT DO NOTHING",
          [userId],
        );
        const changed = await client.query<PrefRow>(
          `UPDATE notification_preferences SET friend_requests=coalesce($3,friend_requests),
          shared_updates=coalesce($4,shared_updates),encouragements=coalesce($5,encouragements),
          revision=revision+1,updated_at=now()
         WHERE user_id=$1 AND revision=$2 RETURNING ${columns}`,
          [
            userId,
            input.baseRevision,
            input.friendRequests ?? null,
            input.sharedUpdates ?? null,
            input.encouragements ?? null,
          ],
        );
        if (!changed.rows[0])
          fail("RULE_CHANGED", 409, "通知设置已变化，请刷新后重试");
        return dto(changed.rows[0]);
      },
    );
  }

  async getWebPreferences(
    userId: string,
  ): Promise<WebNotificationPreferencesDto> {
    await this.database.query(
      "INSERT INTO channel_notification_preferences(user_id,channel) VALUES($1,'web') ON CONFLICT DO NOTHING",
      [userId],
    );
    const found = await this.database.query<PrefRow>(
      `SELECT plan_enabled,${columns} FROM channel_notification_preferences WHERE user_id=$1 AND channel='web'`,
      [userId],
    );
    return {
      ...dto(found.rows[0]!),
      planEnabled: found.rows[0]!.plan_enabled!,
    };
  }

  async updateWebPreferences(
    userId: string,
    input: UpdateWebNotificationPreferencesRequest,
    key: string,
  ): Promise<WebNotificationPreferencesDto> {
    guardFields(input, [
      "planEnabled",
      "friendRequests",
      "sharedUpdates",
      "encouragements",
      "baseRevision",
    ]);
    const changes = [
      input.planEnabled,
      input.friendRequests,
      input.sharedUpdates,
      input.encouragements,
    ];
    if (
      !Number.isInteger(input.baseRevision) ||
      input.baseRevision < 1 ||
      changes.some(
        (value) => value !== undefined && typeof value !== "boolean",
      ) ||
      changes.every((value) => value === undefined)
    )
      fail("VALIDATION_ERROR", 400, "Web 通知偏好参数不正确");
    return this.write.run(
      userId,
      key,
      "web-notification-preferences-update",
      input,
      async (client) => {
        await client.query(
          "INSERT INTO channel_notification_preferences(user_id,channel) VALUES($1,'web') ON CONFLICT DO NOTHING",
          [userId],
        );
        const changed = await client.query<PrefRow>(
          `UPDATE channel_notification_preferences SET
            plan_enabled=coalesce($3,plan_enabled),
            friend_requests=coalesce($4,friend_requests),
            shared_updates=coalesce($5,shared_updates),
            encouragements=coalesce($6,encouragements),
            revision=revision+1,updated_at=now()
           WHERE user_id=$1 AND channel='web' AND revision=$2
           RETURNING plan_enabled,${columns}`,
          [
            userId,
            input.baseRevision,
            input.planEnabled ?? null,
            input.friendRequests ?? null,
            input.sharedUpdates ?? null,
            input.encouragements ?? null,
          ],
        );
        if (!changed.rows[0])
          fail("RULE_CHANGED", 409, "Web 通知设置已变化，请刷新后重试");
        return {
          ...dto(changed.rows[0]),
          planEnabled: changed.rows[0].plan_enabled!,
        };
      },
    );
  }

  async getWebPushStatus(
    userId: string,
    browserDeviceId: string,
  ): Promise<WebPushSubscriptionDto> {
    const active = await this.database.query<{ id: string }>(
      `SELECT id FROM web_push_subscriptions
       WHERE user_id=$1 AND browser_device_id=$2 AND enabled AND revoked_at IS NULL
         AND (expires_at IS NULL OR expires_at>now())`,
      [userId, browserDeviceId],
    );
    return {
      id: active.rows[0]?.id ?? null,
      registered: Boolean(active.rows[0]),
    };
  }

  async registerWebPush(
    userId: string,
    browserDeviceId: string,
    input: RegisterWebPushSubscriptionRequest,
    key: string,
  ): Promise<WebPushSubscriptionDto> {
    const expiresAt = validateWebPush(input);
    if (browserDeviceId.length < 8 || browserDeviceId.length > 128)
      fail("VALIDATION_ERROR", 400, "浏览器设备标识不正确");
    const secret = this.config.pushTokenEncryptionKey;
    const endpointHash = createHmac("sha256", secret)
      .update(input.endpoint)
      .digest();
    const requestHash = createHmac("sha256", secret)
      .update(JSON.stringify(input))
      .digest("hex");
    return this.write.run(
      userId,
      key,
      "web-push-subscription-register",
      { requestHash, browserDeviceId },
      async (client) => {
        await client.query(
          "DELETE FROM web_push_subscriptions WHERE endpoint_hash=$1 AND (user_id<>$2 OR browser_device_id<>$3)",
          [endpointHash, userId, browserDeviceId],
        );
        const saved = await client.query<{ id: string }>(
          `INSERT INTO web_push_subscriptions
           (user_id,browser_device_id,endpoint_hash,endpoint_ciphertext,p256dh_ciphertext,auth_ciphertext,expires_at)
           VALUES($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT(user_id,browser_device_id) DO UPDATE SET
             endpoint_hash=excluded.endpoint_hash,
             endpoint_ciphertext=excluded.endpoint_ciphertext,
             p256dh_ciphertext=excluded.p256dh_ciphertext,
             auth_ciphertext=excluded.auth_ciphertext,
             expires_at=excluded.expires_at,
             enabled=true,revoked_at=NULL,last_failure_code=NULL,updated_at=now()
           RETURNING id`,
          [
            userId,
            browserDeviceId,
            endpointHash,
            encryptPushValue(input.endpoint, secret),
            encryptPushValue(input.keys.p256dh, secret),
            encryptPushValue(input.keys.auth, secret),
            expiresAt,
          ],
        );
        return { id: saved.rows[0]!.id, registered: true };
      },
    );
  }

  async deleteWebPush(
    userId: string,
    browserDeviceId: string,
    key: string,
  ): Promise<WebPushSubscriptionDto> {
    return this.write.run(
      userId,
      key,
      "web-push-subscription-delete",
      { browserDeviceId },
      async (client) => {
        const removed = await client.query<{ id: string }>(
          `UPDATE web_push_subscriptions SET enabled=false,
             revoked_at=coalesce(revoked_at,now()),updated_at=now()
           WHERE user_id=$1 AND browser_device_id=$2 RETURNING id`,
          [userId, browserDeviceId],
        );
        return {
          id: removed.rows[0]?.id ?? null,
          registered: false,
        };
      },
    );
  }
}

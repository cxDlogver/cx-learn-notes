import { createCipheriv, createHmac, randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type {
  NotificationPreferencesDto,
  PushTokenRegistrationDto,
  RegisterPushTokenRequest,
  UpdateNotificationPreferencesRequest,
} from "@plan-checkin/contracts";
import { ApiConfig } from "../config.js";
import { Database } from "../database.js";
import { fail } from "../http.js";
import { guardFields, PlanWrite, requireUuid } from "../plans/write.js";

interface PrefRow {
  friend_requests: boolean;
  shared_updates: boolean;
  encouragements: boolean;
  revision: number;
  updated_at: Date | string;
}
const columns =
  "friend_requests,shared_updates,encouragements,revision,updated_at";
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
}

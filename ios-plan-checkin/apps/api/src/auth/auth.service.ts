import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { Injectable } from "@nestjs/common";
import { SignJWT, jwtVerify } from "jose";
import type { PoolClient } from "pg";
import type {
  AuthTokens,
  SmsChallengeRequest,
  SmsVerifyRequest,
} from "@plan-checkin/contracts";
import { ApiConfig } from "../config.js";
import { Database } from "../database.js";
import { fail, observeActor } from "../http.js";
import { appendUserChange } from "../sync/change-log.js";
import { SmsProvider } from "./sms-provider.js";

interface ChallengeRow {
  id: string;
  phone_ciphertext: Buffer;
  phone_lookup_hash: Buffer;
  code_hash: Buffer;
  purpose: string;
  attempts: number;
  expires_at: Date;
  consumed_at: Date | null;
}
interface SessionRow {
  id: string;
  user_id: string;
  refresh_hash: Buffer;
  expires_at: Date;
  revoked_at: Date | null;
  device_id: string;
  status: string;
  client_channel: "ios" | "web";
}

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ApiConfig,
    private readonly database: Database,
    private readonly sms: SmsProvider,
  ) {}

  private digest(key: Uint8Array, value: string): Buffer {
    return createHmac("sha256", key).update(value).digest();
  }

  private encryptPhone(phone: string): Buffer {
    const iv = randomBytes(12);
    const cipher = createCipheriv(
      "aes-256-gcm",
      this.config.phoneEncryptionKey,
      iv,
    );
    return Buffer.concat([
      iv,
      cipher.update(phone, "utf8"),
      cipher.final(),
      cipher.getAuthTag(),
    ]);
  }

  private decryptPhone(ciphertext: Buffer): string {
    const iv = ciphertext.subarray(0, 12);
    const tag = ciphertext.subarray(ciphertext.length - 16);
    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.config.phoneEncryptionKey,
      iv,
    );
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(ciphertext.subarray(12, -16)),
      decipher.final(),
    ]).toString("utf8");
  }

  private equal(a: Buffer, b: Buffer): boolean {
    return a.length === b.length && timingSafeEqual(a, b);
  }

  private encryptIdempotentResponse(value: unknown): Buffer {
    const iv = randomBytes(12);
    const cipher = createCipheriv(
      "aes-256-gcm",
      this.config.authIdempotencyKey,
      iv,
    );
    return Buffer.concat([
      iv,
      cipher.update(JSON.stringify(value), "utf8"),
      cipher.final(),
      cipher.getAuthTag(),
    ]);
  }

  private decryptIdempotentResponse<T>(value: Buffer): T {
    const iv = value.subarray(0, 12);
    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.config.authIdempotencyKey,
      iv,
    );
    decipher.setAuthTag(value.subarray(-16));
    return JSON.parse(
      Buffer.concat([
        decipher.update(value.subarray(12, -16)),
        decipher.final(),
      ]).toString("utf8"),
    ) as T;
  }

  private async idempotent<T>(
    key: string,
    operation:
      | "sms_challenge"
      | "sms_verify"
      | "refresh"
      | "logout"
      | "change_phone_challenge"
      | "change_phone_confirm",
    request: unknown,
    work: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        key,
      )
    ) {
      fail("VALIDATION_ERROR", 400, "缺少有效的幂等键");
    }
    const requestHash = this.digest(
      this.config.authIdempotencyKey,
      JSON.stringify({ operation, request }),
    );
    return this.database.transaction(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [key]);
      const found = await client.query<{
        operation: string;
        request_hash: Buffer;
        response_ciphertext: Buffer;
        expires_at: Date;
      }>("SELECT * FROM auth_idempotency_keys WHERE key = $1 FOR UPDATE", [
        key,
      ]);
      const existing = found.rows[0];
      if (existing && existing.expires_at.getTime() > Date.now()) {
        if (
          existing.operation !== operation ||
          !this.equal(existing.request_hash, requestHash)
        ) {
          fail("IDEMPOTENCY_KEY_REUSED", 409, "该操作标识已用于另一请求");
        }
        return this.decryptIdempotentResponse<T>(existing.response_ciphertext);
      }
      if (existing)
        await client.query("DELETE FROM auth_idempotency_keys WHERE key = $1", [
          key,
        ]);
      const response = await work(client);
      await client.query(
        `INSERT INTO auth_idempotency_keys (key, operation, request_hash, response_ciphertext, expires_at)
         VALUES ($1, $2, $3, $4, now() + interval '1 day')`,
        [key, operation, requestHash, this.encryptIdempotentResponse(response)],
      );
      return response;
    });
  }

  private async accessToken(
    userId: string,
    sessionId: string,
    channel: "ios" | "web" = "ios",
  ): Promise<string> {
    return new SignJWT({ sid: sessionId })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuer("plan-checkin-api")
      .setAudience(
        channel === "web" ? "plan-checkin-web" : "plan-checkin-mobile",
      )
      .setSubject(userId)
      .setIssuedAt()
      .setExpirationTime("15m")
      .sign(this.config.accessTokenKey);
  }

  private async createSession(
    client: PoolClient,
    userId: string,
    deviceId: string,
    isNewUser: boolean,
    rotatedFrom?: string,
    channel: "ios" | "web" = "ios",
  ): Promise<AuthTokens> {
    const sessionId = randomUUID();
    const refreshToken = `${sessionId}.${randomBytes(32).toString("base64url")}`;
    const refreshHash = createHash("sha256").update(refreshToken).digest();
    await client.query(
      `INSERT INTO sessions (id, user_id, refresh_hash, device_id, expires_at, rotated_from, client_channel)
       VALUES ($1, $2, $3, $4, now() + interval '30 days', $5, $6)`,
      [sessionId, userId, refreshHash, deviceId, rotatedFrom ?? null, channel],
    );
    return {
      accessToken: await this.accessToken(userId, sessionId, channel),
      refreshToken,
      accessExpiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
      userId,
      isNewUser,
    };
  }

  async createChallenge(
    input: SmsChallengeRequest,
    requester: string,
    idempotencyKey: string,
  ): Promise<{
    challengeId: string;
    expiresAt: string;
    resendAfterSeconds: number;
  }> {
    if (
      !input ||
      input.countryCode !== "+86" ||
      typeof input.phone !== "string" ||
      !/^1[3-9]\d{9}$/.test(input.phone)
    ) {
      fail("VALIDATION_ERROR", 400, "请输入有效的中国大陆手机号");
    }
    if (!["login", "cancel_deletion"].includes(input.purpose)) {
      fail("VALIDATION_ERROR", 400, "验证码用途不正确");
    }
    const phone = `+86${input.phone}`;
    const phoneHash = this.digest(this.config.phoneLookupKey, phone);
    const requesterHash = this.digest(this.config.phoneLookupKey, requester);
    const challengeId = randomUUID();
    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    return this.idempotent(
      idempotencyKey,
      "sms_challenge",
      { input, requester },
      async (client) => {
        await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
          phoneHash.toString("hex"),
        ]);
        const recent = await client.query<{
          phone_count: string;
          requester_count: string;
          last_sent_at: Date | null;
        }>(
          `SELECT
           (SELECT count(*) FROM auth_challenges WHERE phone_lookup_hash = $1 AND created_at > now() - interval '1 hour') AS phone_count,
           (SELECT count(*) FROM auth_challenges WHERE requester_hash = $2 AND created_at > now() - interval '1 hour') AS requester_count,
           (SELECT max(created_at) FROM auth_challenges WHERE phone_lookup_hash = $1) AS last_sent_at`,
          [phoneHash, requesterHash],
        );
        if (
          Number(recent.rows[0]?.phone_count) >= 5 ||
          Number(recent.rows[0]?.requester_count) >= 20 ||
          (recent.rows[0]?.last_sent_at &&
            Date.now() - recent.rows[0].last_sent_at.getTime() < 60_000)
        ) {
          fail("OTP_RATE_LIMITED", 429, "验证码请求过于频繁，请稍后再试");
        }
        await client.query(
          `INSERT INTO auth_challenges
           (id, phone_lookup_hash, phone_ciphertext, requester_hash, code_hash, purpose, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, now() + interval '5 minutes')`,
          [
            challengeId,
            phoneHash,
            this.encryptPhone(phone),
            requesterHash,
            this.digest(this.config.otpHashKey, `${challengeId}:${code}`),
            input.purpose,
          ],
        );
        try {
          await this.sms.send(phone, code, input.purpose);
        } catch {
          fail("SMS_UNAVAILABLE", 503, "短信暂时无法发送，请稍后再试");
        }
        return {
          challengeId,
          expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
          resendAfterSeconds: 60,
        };
      },
    );
  }

  async verify(
    input: SmsVerifyRequest,
    deviceId: string,
    idempotencyKey: string,
    purpose: "login" | "cancel_deletion" = "login",
    channel: "ios" | "web" = "ios",
  ): Promise<AuthTokens> {
    if (
      !input ||
      !/^[0-9]{6}$/.test(input.code) ||
      !/^[0-9a-f-]{36}$/i.test(input.challengeId)
    ) {
      fail("OTP_INVALID", 400, "验证码不正确");
    }
    const outcome = await this.idempotent(
      idempotencyKey,
      "sms_verify",
      { input, deviceId, purpose, channel },
      async (client) => {
        const found = await client.query<ChallengeRow>(
          "SELECT * FROM auth_challenges WHERE id = $1 FOR UPDATE",
          [input.challengeId],
        );
        const challenge = found.rows[0];
        if (
          !challenge ||
          challenge.purpose !== purpose ||
          challenge.consumed_at ||
          challenge.expires_at.getTime() <= Date.now()
        ) {
          return { kind: "expired" } as const;
        }
        if (challenge.attempts >= 5) return { kind: "limited" } as const;
        const expected = this.digest(
          this.config.otpHashKey,
          `${challenge.id}:${input.code}`,
        );
        if (!this.equal(expected, challenge.code_hash)) {
          await client.query(
            "UPDATE auth_challenges SET attempts = attempts + 1 WHERE id = $1",
            [challenge.id],
          );
          return { kind: "invalid" } as const;
        }
        await client.query(
          "UPDATE auth_challenges SET consumed_at = now() WHERE id = $1",
          [challenge.id],
        );
        const existing = await client.query<{
          id: string;
          status: string;
          deletion_due_at: Date | null;
        }>(
          "SELECT id, status, deletion_due_at FROM users WHERE phone_lookup_hash = $1 FOR UPDATE",
          [challenge.phone_lookup_hash],
        );
        if (purpose === "cancel_deletion") {
          const account = existing.rows[0];
          if (
            account?.status !== "deletion_pending" ||
            !account.deletion_due_at ||
            account.deletion_due_at.getTime() <= Date.now()
          )
            return { kind: "forbidden" } as const;
          await client.query(
            "UPDATE users SET status='active',deletion_due_at=NULL,updated_at=now() WHERE id=$1 AND status='deletion_pending'",
            [account.id],
          );
          await client.query(
            "UPDATE deletion_jobs SET status='cancelled',updated_at=now() WHERE user_id=$1 AND status IN ('pending','failed')",
            [account.id],
          );
          const friends = await client.query<{ other_id: string }>(
            `SELECT CASE WHEN user_low=$1 THEN user_high ELSE user_low END AS other_id
             FROM friendships WHERE user_low=$1 OR user_high=$1`,
            [account.id],
          );
          for (const friend of friends.rows)
            await appendUserChange(
              client,
              friend.other_id,
              "friend",
              account.id,
              "upsert",
            );
          return {
            kind: "success",
            tokens: await this.createSession(
              client,
              account.id,
              deviceId,
              false,
              undefined,
              channel,
            ),
          } as const;
        }
        if (existing.rows[0]?.status === "deletion_pending")
          return { kind: "deletion_pending" } as const;
        if (existing.rows[0]?.status === "deleted")
          return { kind: "forbidden" } as const;
        let userId = existing.rows[0]?.id;
        let isNewUser = false;
        if (!userId) {
          const phone = this.decryptPhone(challenge.phone_ciphertext);
          const inserted = await client.query<{ id: string }>(
            "INSERT INTO users (phone_ciphertext, phone_lookup_hash) VALUES ($1, $2) ON CONFLICT (phone_lookup_hash) DO NOTHING RETURNING id",
            [this.encryptPhone(phone), challenge.phone_lookup_hash],
          );
          userId = inserted.rows[0]?.id;
          isNewUser = Boolean(userId);
          if (!userId) {
            const raced = await client.query<{ id: string; status: string }>(
              "SELECT id, status FROM users WHERE phone_lookup_hash = $1 FOR UPDATE",
              [challenge.phone_lookup_hash],
            );
            if (raced.rows[0]?.status !== "active")
              return { kind: "deletion_pending" } as const;
            userId = raced.rows[0]!.id;
          }
        }
        const tokens = await this.createSession(
          client,
          userId,
          deviceId,
          isNewUser,
          undefined,
          channel,
        );
        return { kind: "success", tokens } as const;
      },
    );
    if (outcome.kind === "expired")
      fail("OTP_EXPIRED", 400, "验证码已过期，请重新获取");
    if (outcome.kind === "limited")
      fail("OTP_RATE_LIMITED", 429, "验证码尝试次数已达上限");
    if (outcome.kind === "invalid") fail("OTP_INVALID", 400, "验证码不正确");
    if (outcome.kind === "deletion_pending")
      fail(
        "ACCOUNT_DELETION_PENDING",
        403,
        "账号注销处理中，请使用撤销注销流程",
      );
    if (outcome.kind === "forbidden") fail("FORBIDDEN", 403, "账号不可使用");
    return outcome.tokens;
  }

  async refresh(
    refreshToken: string,
    idempotencyKey: string,
    channel: "ios" | "web" = "ios",
  ): Promise<AuthTokens> {
    const sessionId = refreshToken.match(
      /^([0-9a-f-]{36})\.[A-Za-z0-9_-]{43}$/i,
    )?.[1];
    if (!sessionId) fail("UNAUTHENTICATED", 401, "会话已失效，请重新登录");
    return this.idempotent(
      idempotencyKey,
      "refresh",
      { refreshToken, channel },
      async (client) => {
        const found = await client.query<SessionRow>(
          `SELECT s.*, u.status FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.id = $1 FOR UPDATE OF s`,
          [sessionId],
        );
        const current = found.rows[0];
        const hash = createHash("sha256").update(refreshToken).digest();
        if (
          !current ||
          current.revoked_at ||
          current.expires_at.getTime() <= Date.now() ||
          current.status !== "active" ||
          current.client_channel !== channel ||
          !this.equal(hash, current.refresh_hash)
        ) {
          fail("UNAUTHENTICATED", 401, "会话已失效，请重新登录");
        }
        await client.query(
          "UPDATE sessions SET revoked_at = now() WHERE id = $1",
          [current.id],
        );
        return this.createSession(
          client,
          current.user_id,
          current.device_id,
          false,
          current.id,
          channel,
        );
      },
    );
  }

  async resumeWebSession(refreshToken: string): Promise<{
    accessToken: string;
    accessExpiresAt: string;
    userId: string;
    isNewUser: false;
  }> {
    const sessionId = refreshToken.match(
      /^([0-9a-f-]{36})\.[A-Za-z0-9_-]{43}$/i,
    )?.[1];
    if (!sessionId) fail("UNAUTHENTICATED", 401, "会话已失效，请重新登录");
    const hash = createHash("sha256").update(refreshToken).digest();
    const found = await this.database.query<SessionRow>(
      `SELECT s.*,u.status FROM sessions s JOIN users u ON u.id=s.user_id
       WHERE s.id=$1 AND s.client_channel='web' AND s.revoked_at IS NULL
         AND s.expires_at>now() AND u.status='active'`,
      [sessionId],
    );
    const current = found.rows[0];
    if (!current || !this.equal(hash, current.refresh_hash))
      fail("UNAUTHENTICATED", 401, "会话已失效，请重新登录");
    return {
      accessToken: await this.accessToken(current.user_id, current.id, "web"),
      accessExpiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
      userId: current.user_id,
      isNewUser: false,
    };
  }

  async logout(
    refreshToken: string,
    idempotencyKey: string,
    channel: "ios" | "web" = "ios",
  ): Promise<void> {
    const sessionId = refreshToken.match(
      /^([0-9a-f-]{36})\.[A-Za-z0-9_-]{43}$/i,
    )?.[1];
    await this.idempotent(
      idempotencyKey,
      "logout",
      { refreshToken, channel },
      async (client) => {
        if (sessionId) {
          const hash = createHash("sha256").update(refreshToken).digest();
          const ended = await client.query<{
            user_id: string;
            device_id: string;
          }>(
            `UPDATE sessions SET revoked_at=now()
             WHERE id=$1 AND refresh_hash=$2 AND client_channel=$3 AND revoked_at IS NULL
             RETURNING user_id,device_id`,
            [sessionId, hash, channel],
          );
          const row = ended.rows[0];
          if (row && channel === "ios")
            await client.query(
              `UPDATE devices SET notifications_enabled=false,apns_token_ciphertext=NULL,push_token_hash=NULL
               WHERE id::text=$1 AND user_id=$2`,
              [row.device_id, row.user_id],
            );
          if (row && channel === "web")
            await client.query(
              `UPDATE web_push_subscriptions SET enabled=false,revoked_at=coalesce(revoked_at,now()),updated_at=now()
               WHERE user_id=$1 AND browser_device_id=$2 AND revoked_at IS NULL`,
              [row.user_id, row.device_id],
            );
        }
        return { loggedOut: true };
      },
    );
  }

  async createPhoneChange(
    userId: string,
    input: { countryCode: string; phone: string },
    idempotencyKey: string,
  ): Promise<{
    requestId: string;
    oldMasked: string;
    newMasked: string;
    expiresAt: string;
  }> {
    if (
      !input ||
      input.countryCode !== "+86" ||
      !/^1[3-9]\d{9}$/.test(input.phone)
    ) {
      fail("VALIDATION_ERROR", 400, "请输入有效的新手机号");
    }
    const newPhone = `+86${input.phone}`;
    const newHash = this.digest(this.config.phoneLookupKey, newPhone);
    return this.idempotent(
      idempotencyKey,
      "change_phone_challenge",
      { userId, input },
      async (client) => {
        const user = await client.query<{
          phone_ciphertext: Buffer;
          phone_lookup_hash: Buffer;
          status: string;
        }>(
          "SELECT phone_ciphertext, phone_lookup_hash, status FROM users WHERE id = $1 FOR UPDATE",
          [userId],
        );
        if (user.rows[0]?.status !== "active")
          fail("FORBIDDEN", 403, "账号不可使用");
        if (this.equal(user.rows[0].phone_lookup_hash, newHash)) {
          fail("VALIDATION_ERROR", 400, "新手机号不能与当前手机号相同");
        }
        const taken = await client.query(
          "SELECT id FROM users WHERE phone_lookup_hash = $1",
          [newHash],
        );
        if (taken.rowCount) fail("PHONE_TAKEN", 409, "该手机号已绑定其他账号");
        const count = await client.query<{ n: string }>(
          "SELECT count(*) AS n FROM phone_change_requests WHERE user_id = $1 AND created_at > now() - interval '1 hour'",
          [userId],
        );
        if (Number(count.rows[0]?.n) >= 3)
          fail("OTP_RATE_LIMITED", 429, "换号验证码请求过于频繁");
        const oldPhone = this.decryptPhone(user.rows[0].phone_ciphertext);
        const requestId = randomUUID();
        const oldCode = randomInt(0, 1_000_000).toString().padStart(6, "0");
        const newCode = randomInt(0, 1_000_000).toString().padStart(6, "0");
        await client.query(
          `INSERT INTO phone_change_requests
          (id, user_id, new_phone_ciphertext, new_phone_lookup_hash, old_code_hash, new_code_hash, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, now() + interval '5 minutes')`,
          [
            requestId,
            userId,
            this.encryptPhone(newPhone),
            newHash,
            this.digest(this.config.otpHashKey, `${requestId}:old:${oldCode}`),
            this.digest(this.config.otpHashKey, `${requestId}:new:${newCode}`),
          ],
        );
        try {
          await this.sms.send(oldPhone, oldCode, "change_phone_old");
          await this.sms.send(newPhone, newCode, "change_phone_new");
        } catch {
          fail("SMS_UNAVAILABLE", 503, "短信暂时无法发送，请稍后再试");
        }
        const mask = (phone: string) =>
          `${phone.slice(0, 6)}****${phone.slice(-4)}`;
        return {
          requestId,
          oldMasked: mask(oldPhone),
          newMasked: mask(newPhone),
          expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
        };
      },
    );
  }

  async confirmPhoneChange(
    userId: string,
    input: { requestId: string; oldCode: string; newCode: string },
    idempotencyKey: string,
  ): Promise<{ changed: true }> {
    if (
      !input ||
      !/^[0-9a-f-]{36}$/i.test(input.requestId) ||
      !/^[0-9]{6}$/.test(input.oldCode) ||
      !/^[0-9]{6}$/.test(input.newCode)
    ) {
      fail("OTP_INVALID", 400, "验证码不正确");
    }
    const outcome = await this.idempotent(
      idempotencyKey,
      "change_phone_confirm",
      { userId, input },
      async (client) => {
        const found = await client.query<{
          id: string;
          user_id: string;
          new_phone_ciphertext: Buffer;
          new_phone_lookup_hash: Buffer;
          old_code_hash: Buffer;
          new_code_hash: Buffer;
          attempts: number;
          expires_at: Date;
          consumed_at: Date | null;
        }>("SELECT * FROM phone_change_requests WHERE id = $1 FOR UPDATE", [
          input.requestId,
        ]);
        const request = found.rows[0];
        if (
          !request ||
          request.user_id !== userId ||
          request.consumed_at ||
          request.expires_at.getTime() <= Date.now()
        ) {
          return { kind: "expired" } as const;
        }
        if (request.attempts >= 5) return { kind: "limited" } as const;
        const oldValid = this.equal(
          request.old_code_hash,
          this.digest(
            this.config.otpHashKey,
            `${request.id}:old:${input.oldCode}`,
          ),
        );
        const newValid = this.equal(
          request.new_code_hash,
          this.digest(
            this.config.otpHashKey,
            `${request.id}:new:${input.newCode}`,
          ),
        );
        if (!oldValid || !newValid) {
          await client.query(
            "UPDATE phone_change_requests SET attempts = attempts + 1 WHERE id = $1",
            [request.id],
          );
          return { kind: "invalid" } as const;
        }
        const owner = await client.query<{ id: string }>(
          "SELECT id FROM users WHERE phone_lookup_hash = $1 AND id <> $2",
          [request.new_phone_lookup_hash, userId],
        );
        if (owner.rowCount) return { kind: "taken" } as const;
        const updated = await client.query(
          "UPDATE users SET phone_ciphertext = $1, phone_lookup_hash = $2, revision = revision + 1, updated_at = now() WHERE id = $3 AND status = 'active'",
          [request.new_phone_ciphertext, request.new_phone_lookup_hash, userId],
        );
        if (!updated.rowCount) return { kind: "forbidden" } as const;
        await client.query(
          "UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL",
          [userId],
        );
        await client.query(
          "UPDATE phone_change_requests SET consumed_at = now() WHERE id = $1",
          [request.id],
        );
        return { kind: "success" } as const;
      },
    ).catch((error: unknown) => {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23505"
      ) {
        fail("PHONE_TAKEN", 409, "该手机号已绑定其他账号");
      }
      throw error;
    });
    if (outcome.kind === "expired")
      fail("OTP_EXPIRED", 400, "换号验证码已过期");
    if (outcome.kind === "limited")
      fail("OTP_RATE_LIMITED", 429, "验证码尝试次数已达上限");
    if (outcome.kind === "invalid") fail("OTP_INVALID", 400, "验证码不正确");
    if (outcome.kind === "taken")
      fail("PHONE_TAKEN", 409, "该手机号已绑定其他账号");
    if (outcome.kind === "forbidden") fail("FORBIDDEN", 403, "账号不可使用");
    return { changed: true };
  }

  async authenticate(bearer: string): Promise<string> {
    const token = bearer.startsWith("Bearer ") ? bearer.slice(7) : "";
    if (!token) fail("UNAUTHENTICATED", 401, "请先登录");
    try {
      const verified = await jwtVerify(token, this.config.accessTokenKey, {
        issuer: "plan-checkin-api",
        audience: ["plan-checkin-mobile", "plan-checkin-web"],
        algorithms: ["HS256"],
      });
      const userId = verified.payload.sub;
      const sessionId = verified.payload.sid;
      if (typeof userId !== "string" || typeof sessionId !== "string")
        throw new Error("Missing JWT claims.");
      const found = await this.database.query<{
        id: string;
        client_channel: "ios" | "web";
      }>(
        `SELECT s.id,s.client_channel FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.id = $1 AND s.user_id = $2 AND s.revoked_at IS NULL AND s.expires_at > now() AND u.status = 'active'`,
        [sessionId, userId],
      );
      if (
        !found.rowCount ||
        verified.payload.aud !==
          (found.rows[0]?.client_channel === "web"
            ? "plan-checkin-web"
            : "plan-checkin-mobile")
      )
        throw new Error("Revoked or mismatched session.");
      observeActor(userId, this.config.accessTokenKey);
      return userId;
    } catch {
      fail("UNAUTHENTICATED", 401, "会话已失效，请重新登录");
    }
  }
}

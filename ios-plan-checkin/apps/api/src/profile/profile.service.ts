import { createHmac } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type { UserDto } from "@plan-checkin/contracts";
import { ApiConfig } from "../config.js";
import { Database } from "../database.js";
import { fail } from "../http.js";
import { appendUserChange } from "../sync/change-log.js";

interface UserRow {
  id: string;
  username: string | null;
  nickname: string | null;
  avatar_media_id: string | null;
  status: "active" | "deletion_pending";
  revision: number;
}

function toDto(row: UserRow): UserDto {
  return {
    id: row.id,
    username: row.username,
    nickname: row.nickname,
    avatarMediaId: row.avatar_media_id,
    accountStatus: row.status,
    revision: row.revision,
  };
}

function usernameValue(value: string): string {
  if (typeof value !== "string")
    fail("VALIDATION_ERROR", 400, "用户名格式不正确");
  const normalized = value.normalize("NFKC").trim();
  if (
    [...normalized].length < 3 ||
    [...normalized].length > 30 ||
    !/^[\p{L}\p{N}_]+$/u.test(normalized)
  ) {
    fail("VALIDATION_ERROR", 400, "用户名需为 3–30 个字母、数字或下划线");
  }
  return normalized;
}

@Injectable()
export class ProfileService {
  constructor(
    private readonly database: Database,
    private readonly config: ApiConfig,
  ) {}

  async getMe(userId: string): Promise<UserDto> {
    const found = await this.database.query<UserRow>(
      "SELECT id, username, nickname, avatar_media_id, status, revision FROM users WHERE id = $1 AND status <> 'deleted'",
      [userId],
    );
    if (!found.rows[0]) fail("NOT_FOUND", 404, "账号不存在");
    return toDto(found.rows[0]);
  }

  async usernameAvailability(
    username: string,
    userId: string,
  ): Promise<{ available: boolean; normalized: string }> {
    const normalized = usernameValue(username);
    const found = await this.database.query<{ id: string }>(
      "SELECT id FROM users WHERE username_normalized = lower($1) AND id <> $2",
      [normalized, userId],
    );
    return { available: !found.rowCount, normalized };
  }

  async updateMe(
    userId: string,
    input: {
      username?: string;
      nickname?: string;
      avatarMediaId?: string | null;
      baseRevision: number;
    },
    idempotencyKey: string,
  ): Promise<UserDto> {
    if (
      !input ||
      !Number.isInteger(input.baseRevision) ||
      input.baseRevision < 1
    ) {
      fail("VALIDATION_ERROR", 400, "缺少有效的资料版本");
    }
    if (
      Object.keys(input).some(
        (key) =>
          !["username", "nickname", "avatarMediaId", "baseRevision"].includes(
            key,
          ),
      ) ||
      Object.keys(input).every((key) => key === "baseRevision")
    ) {
      fail("VALIDATION_ERROR", 400, "资料字段不正确");
    }
    if (!/^[0-9a-f-]{36}$/i.test(idempotencyKey))
      fail("VALIDATION_ERROR", 400, "缺少有效的幂等键");
    const username =
      input.username === undefined ? undefined : usernameValue(input.username);
    if (input.nickname !== undefined && typeof input.nickname !== "string") {
      fail("VALIDATION_ERROR", 400, "昵称格式不正确");
    }
    const nickname =
      input.nickname === undefined
        ? undefined
        : input.nickname.normalize("NFKC").trim();
    if (
      nickname !== undefined &&
      (nickname.length < 1 || nickname.length > 40)
    ) {
      fail("VALIDATION_ERROR", 400, "昵称需为 1–40 个字符");
    }
    if (
      input.avatarMediaId !== undefined &&
      input.avatarMediaId !== null &&
      !/^[0-9a-f-]{36}$/i.test(input.avatarMediaId)
    ) {
      fail("VALIDATION_ERROR", 400, "头像标识无效");
    }
    const digest = createHmac("sha256", this.config.authIdempotencyKey)
      .update(JSON.stringify({ userId, input }))
      .digest();
    try {
      return await this.database.transaction(async (client) => {
        await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
          idempotencyKey,
        ]);
        const old = await client.query<{
          request_hash: Buffer;
          response_json: UserDto;
        }>(
          "SELECT request_hash, response_json FROM idempotency_keys WHERE user_id = $1 AND key = $2 AND expires_at > now()",
          [userId, idempotencyKey],
        );
        if (old.rows[0]) {
          if (!Buffer.from(old.rows[0].request_hash).equals(digest)) {
            fail("IDEMPOTENCY_KEY_REUSED", 409, "该操作标识已用于另一请求");
          }
          return old.rows[0].response_json;
        }
        await client.query(
          "DELETE FROM idempotency_keys WHERE user_id = $1 AND key = $2 AND expires_at <= now()",
          [userId, idempotencyKey],
        );
        if (username !== undefined) {
          const current = await client.query<{ username: string | null }>(
            "SELECT username FROM users WHERE id = $1 FOR UPDATE",
            [userId],
          );
          if (
            current.rows[0]?.username &&
            current.rows[0].username !== username
          )
            fail("FORBIDDEN", 403, "用户名设置后不可修改");
        }
        if (input.avatarMediaId) {
          const media = await client.query(
            "SELECT id FROM media WHERE id = $1 AND owner_id = $2 AND status = 'ready'",
            [input.avatarMediaId, userId],
          );
          if (!media.rowCount) fail("FORBIDDEN", 403, "头像不可使用");
        }
        const sets: string[] = [];
        const values: unknown[] = [];
        if (username !== undefined) {
          values.push(username);
          sets.push(`username = $${values.length}`);
        }
        if (nickname !== undefined) {
          values.push(nickname);
          sets.push(`nickname = $${values.length}`);
        }
        if (input.avatarMediaId !== undefined) {
          values.push(input.avatarMediaId);
          sets.push(`avatar_media_id = $${values.length}`);
        }
        values.push(userId, input.baseRevision);
        const updated = await client.query<UserRow>(
          `UPDATE users SET ${sets.join(", ")}, revision = revision + 1, updated_at = now()
           WHERE id = $${values.length - 1} AND revision = $${values.length} AND status = 'active'
           RETURNING id, username, nickname, avatar_media_id, status, revision`,
          values,
        );
        if (!updated.rows[0])
          fail("RULE_CHANGED", 409, "资料已在其他设备更新，请刷新后重试");
        const result = toDto(updated.rows[0]);
        await appendUserChange(client, userId, "user", userId, "upsert", {
          revision: result.revision,
        });
        await client.query(
          `INSERT INTO idempotency_keys (user_id, key, request_hash, status_code, response_json, expires_at)
           VALUES ($1, $2, $3, 200, $4, now() + interval '1 day')`,
          [userId, idempotencyKey, digest, result],
        );
        return result;
      });
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23505"
      ) {
        fail("USERNAME_TAKEN", 409, "用户名已被使用");
      }
      throw error;
    }
  }
}

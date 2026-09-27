import { createHmac } from "node:crypto";
import type { PoolClient } from "pg";
import { ApiConfig } from "../config.js";
import { Database } from "../database.js";
import { fail } from "../http.js";

export const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function requireUuid(value: string | undefined): string {
  if (!value || !uuidPattern.test(value))
    fail("VALIDATION_ERROR", 400, "标识格式不正确");
  return value;
}

export class PlanWrite {
  constructor(
    private readonly database: Database,
    private readonly config: ApiConfig,
  ) {}

  async run<T>(
    userId: string,
    key: string,
    operation: string,
    input: unknown,
    work: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    requireUuid(key);
    const digest = createHmac("sha256", this.config.authIdempotencyKey)
      .update(JSON.stringify({ operation, input }))
      .digest();
    return this.database.transaction(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
        `${userId}:${key}`,
      ]);
      const old = await client.query<{
        request_hash: Buffer;
        response_json: T;
      }>(
        "SELECT request_hash, response_json FROM idempotency_keys WHERE user_id = $1 AND key = $2 AND expires_at > now()",
        [userId, key],
      );
      if (old.rows[0]) {
        if (!Buffer.from(old.rows[0].request_hash).equals(digest))
          fail("IDEMPOTENCY_KEY_REUSED", 409, "该操作标识已用于另一请求");
        return old.rows[0].response_json;
      }
      await client.query(
        "DELETE FROM idempotency_keys WHERE user_id = $1 AND key = $2 AND expires_at <= now()",
        [userId, key],
      );
      const result = await work(client);
      await client.query(
        `INSERT INTO idempotency_keys (user_id, key, request_hash, status_code, response_json, expires_at)
         VALUES ($1, $2, $3, 200, $4, now() + interval '1 day')`,
        [userId, key, digest, result],
      );
      return result;
    });
  }
}

export function guardFields(
  input: unknown,
  allowed: readonly string[],
): asserts input is Record<string, unknown> {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.keys(input).some((key) => !allowed.includes(key))
  ) {
    fail("VALIDATION_ERROR", 400, "请求字段不正确");
  }
}

export function cleanText(
  value: unknown,
  limit: number,
  required = true,
): string | null {
  if (value === null && !required) return null;
  if (typeof value !== "string")
    fail("VALIDATION_ERROR", 400, "文字字段格式不正确");
  const result = value.normalize("NFKC").trim();
  if ((!result && required) || result.length > limit)
    fail("VALIDATION_ERROR", 400, `文字字段长度必须在 1–${limit} 字符之间`);
  return result || null;
}

export function revision(value: unknown): number {
  if (!Number.isInteger(value) || Number(value) < 1)
    fail("VALIDATION_ERROR", 400, "缺少有效的修订号");
  return Number(value);
}

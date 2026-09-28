import { createHmac } from "node:crypto";
import { ApiConfig } from "./config.js";
import { Database } from "./database.js";

export interface RateLimitRequest {
  method?: string;
  originalUrl?: string;
  ip?: string;
  socket?: { remoteAddress?: string };
  headers: Record<string, string | string[] | undefined>;
}

export interface RateDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  policy: string;
}

export function ratePolicy(
  method: string,
  path: string,
): { name: string; limit: number } | null {
  if (method === "POST" && path === "/api/v1/auth/sms/challenges")
    return { name: "sms_challenge", limit: 30 };
  if (method === "POST" && path === "/api/v1/auth/sms/verify")
    return { name: "sms_verify", limit: 60 };
  if (method === "POST" && path === "/api/v1/me/deletion-cancel")
    return { name: "deletion_cancel", limit: 15 };
  if (method === "POST" && path === "/api/v1/auth/refresh")
    return { name: "refresh", limit: 120 };
  if (method === "GET" && path === "/api/v1/usernames/availability")
    return { name: "username_lookup", limit: 120 };
  if (
    ["POST", "PUT", "PATCH", "DELETE"].includes(method) &&
    path.startsWith("/api/v1/")
  )
    return { name: "business_write", limit: 240 };
  return null;
}

/** A PostgreSQL upsert keeps the limit shared across API replicas. Keys are HMACs, never raw IPs or tokens. */
export class ApiRateLimiter {
  constructor(
    private readonly database: Database,
    private readonly config: ApiConfig,
  ) {}

  async check(request: RateLimitRequest): Promise<RateDecision | null> {
    const path = (request.originalUrl ?? "").split("?", 1)[0] ?? "";
    const policy = ratePolicy(request.method ?? "", path);
    if (!policy) return null;
    const bearer = request.headers.authorization;
    const source =
      policy.name === "sms_challenge" ||
      policy.name === "sms_verify" ||
      policy.name === "deletion_cancel" ||
      policy.name === "refresh"
        ? `ip:${request.ip ?? request.socket?.remoteAddress ?? "unknown"}`
        : typeof bearer === "string" && bearer.startsWith("Bearer ")
          ? `session:${bearer.slice(7)}`
          : `ip:${request.ip ?? request.socket?.remoteAddress ?? "unknown"}`;
    const hash = createHmac("sha256", this.config.accessTokenKey)
      .update(`${policy.name}:${source}`)
      .digest();
    const updated = await this.database.query<{
      hits: number;
      retry_after: number;
    }>(
      `INSERT INTO rate_limit_buckets(scope_hash,window_start,hits)
       VALUES($1,date_trunc('minute',now()),1)
       ON CONFLICT(scope_hash,window_start) DO UPDATE SET hits=rate_limit_buckets.hits+1
       RETURNING hits,ceil(extract(epoch FROM date_trunc('minute',now())+interval '1 minute'-now()))::integer AS retry_after`,
      [hash],
    );
    const hits = updated.rows[0]?.hits ?? policy.limit + 1;
    return {
      allowed: hits <= policy.limit,
      limit: policy.limit,
      remaining: Math.max(0, policy.limit - hits),
      retryAfterSeconds: Math.max(1, updated.rows[0]?.retry_after ?? 60),
      policy: policy.name,
    };
  }
}

import { timingSafeEqual } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { ApiConfig } from "./config.js";
import { Database } from "./database.js";
import {
  opaqueHash,
  requestId,
  requestTrace,
  type RequestTrace,
} from "./http.js";
import { ApiRateLimiter, type RateLimitRequest } from "./rate-limit.js";

interface HttpRequest extends RateLimitRequest {
  route?: { path?: string };
  params?: Record<string, unknown>;
  body?: unknown;
}
interface HttpResponse {
  statusCode: number;
  setHeader(name: string, value: string | number): void;
  on(event: "finish", callback: () => void): void;
  status(code: number): HttpResponse;
  json(value: unknown): void;
  end(value?: string): void;
}
type Next = () => void;
const buckets = [0.05, 0.1, 0.3, 1, 3, 10];
interface Sample {
  count: number;
  sum: number;
  buckets: number[];
}
const requests = new Map<string, Sample>();
const events = new Map<string, number>();
const label = (value: string) =>
  value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("\n", "\\n");
const tokenEqual = (a: string, b: string): boolean => {
  const first = Buffer.from(a);
  const second = Buffer.from(b);
  return first.length === second.length && timingSafeEqual(first, second);
};

export function countEvent(
  name: "sms_success" | "sms_failure" | "rate_limited",
): void {
  events.set(name, (events.get(name) ?? 0) + 1);
}

function record(
  method: string,
  route: string,
  status: number,
  seconds: number,
  code: string,
): void {
  const safeRoute =
    route.length <= 120 && /^[/A-Za-z0-9:_{}.-]+$/.test(route)
      ? route
      : "other";
  const safeCode = /^[A-Z_]{1,48}$/.test(code) ? code : "OTHER";
  const key = JSON.stringify([method, safeRoute, status, safeCode]);
  const sample = requests.get(key) ?? {
    count: 0,
    sum: 0,
    buckets: buckets.map(() => 0),
  };
  sample.count++;
  sample.sum += seconds;
  for (let i = 0; i < buckets.length; i++)
    if (seconds <= buckets[i]!) sample.buckets[i]!++;
  requests.set(key, sample);
}

async function renderMetrics(database: Database): Promise<string> {
  const lines = [
    "# TYPE plan_checkin_http_requests_total counter",
    "# TYPE plan_checkin_http_request_duration_seconds histogram",
  ];
  for (const [key, sample] of requests) {
    const [method, route, status, code] = JSON.parse(key) as [
      string,
      string,
      number,
      string,
    ];
    const labels = `method="${label(method)}",route="${label(route)}",status="${status}",code="${label(code)}"`;
    lines.push(`plan_checkin_http_requests_total{${labels}} ${sample.count}`);
    for (let i = 0; i < buckets.length; i++)
      lines.push(
        `plan_checkin_http_request_duration_seconds_bucket{${labels},le="${buckets[i]}"} ${sample.buckets[i]}`,
      );
    lines.push(
      `plan_checkin_http_request_duration_seconds_bucket{${labels},le="+Inf"} ${sample.count}`,
    );
    lines.push(
      `plan_checkin_http_request_duration_seconds_sum{${labels}} ${sample.sum}`,
    );
    lines.push(
      `plan_checkin_http_request_duration_seconds_count{${labels}} ${sample.count}`,
    );
  }
  lines.push("# TYPE plan_checkin_events_total counter");
  for (const [name, count] of events)
    lines.push(`plan_checkin_events_total{kind="${name}"} ${count}`);
  const health = await database.query<{
    worker_stalled: string;
    deletion_overdue: string;
    media_cleanup_stalled: string;
    export_stalled: string;
    sync_conflicts_open: string;
    social_notifications_stalled: string;
    apns_retryable: string;
    apns_rejected: string;
    worker_heartbeat_age_seconds: string;
    db_connections: string;
    db_lock_waits: string;
  }>(
    `SELECT
      (SELECT count(*) FROM worker_jobs WHERE status IN ('queued','failed') AND run_after<now()-interval '5 minutes')::text AS worker_stalled,
      (SELECT count(*) FROM deletion_jobs WHERE status IN ('pending','failed') AND due_at<now()-interval '1 hour')::text AS deletion_overdue,
      (SELECT count(*) FROM media WHERE object_deleted_at IS NULL AND ((status='deleted' AND deleted_at<now()-interval '30 minutes') OR (status='pending' AND created_at<now()-interval '25 hours')))::text AS media_cleanup_stalled,
      (SELECT count(*) FROM data_exports WHERE status IN ('queued','running') AND created_at<now()-interval '30 minutes')::text AS export_stalled,
      (SELECT count(*) FROM checkin_conflicts WHERE resolved_at IS NULL AND expires_at>now())::text AS sync_conflicts_open,
      (SELECT count(*) FROM worker_jobs WHERE name='send-social-notification' AND status IN ('queued','failed') AND run_after<now()-interval '5 minutes')::text AS social_notifications_stalled,
      (SELECT count(*) FROM worker_jobs WHERE name='send-social-notification' AND status='failed' AND last_error_code='APNS_RETRYABLE')::text AS apns_retryable,
      (SELECT count(*) FROM worker_jobs WHERE name='send-social-notification' AND status='failed' AND last_error_code='APNS_REJECTED')::text AS apns_rejected,
      (SELECT coalesce(extract(epoch FROM now()-max(updated_at)),-1) FROM worker_heartbeats WHERE worker_name='primary')::text AS worker_heartbeat_age_seconds,
      (SELECT count(*) FROM pg_stat_activity WHERE datname=current_database())::text AS db_connections,
      (SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock')::text AS db_lock_waits`,
  );
  const row = health.rows[0];
  for (const [name, value] of Object.entries(row ?? {})) {
    lines.push(`# TYPE plan_checkin_${name} gauge`);
    lines.push(`plan_checkin_${name} ${Number(value) || 0}`);
  }
  return lines.join("\n") + "\n";
}

export function installObservability(
  app: INestApplication,
  database: Database,
  config: ApiConfig,
): void {
  const limiter = new ApiRateLimiter(database, config);
  const express = app.getHttpAdapter().getInstance() as {
    set(name: string, value: number): void;
    get(
      path: string,
      handler: (request: HttpRequest, response: HttpResponse) => void,
    ): void;
  };
  express.set("trust proxy", config.trustProxyHops);
  express.get("/internal/metrics", (request, response) => {
    const header = request.headers.authorization;
    const provided =
      typeof header === "string" && header.startsWith("Bearer ")
        ? header.slice(7)
        : "";
    const local = ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(
      request.socket?.remoteAddress ?? "",
    );
    if (
      config.metricsToken ? !tokenEqual(provided, config.metricsToken) : !local
    ) {
      response.status(403).end();
      return;
    }
    void renderMetrics(database)
      .then((body) => {
        response.setHeader(
          "Content-Type",
          "text/plain; version=0.0.4; charset=utf-8",
        );
        response.setHeader("Cache-Control", "no-store");
        response.status(200).end(body);
      })
      .catch(() => response.status(503).end());
  });
  app.use((request: HttpRequest, response: HttpResponse, next: Next) => {
    const id = requestId(request);
    const trace: RequestTrace = { requestId: id };
    const start = process.hrtime.bigint();
    response.setHeader("X-Request-Id", id);
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("Cache-Control", "no-store");
    response.on("finish", () => {
      const seconds = Number(process.hrtime.bigint() - start) / 1e9;
      const route = request.route?.path ?? "unmatched";
      const safeRoute =
        route.length <= 120 && /^[/A-Za-z0-9:_{}.-]+$/.test(route)
          ? route
          : "other";
      const code =
        trace.errorCode && /^[A-Z_]{1,48}$/.test(trace.errorCode)
          ? trace.errorCode
          : "NONE";
      const method =
        request.method &&
        /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/.test(request.method)
          ? request.method
          : "OTHER";
      const resourceId = Object.values(request.params ?? {}).find(
        (value) =>
          typeof value === "string" &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            value,
          ),
      );
      if (!trace.resourceHash && typeof resourceId === "string")
        trace.resourceHash = opaqueHash(
          config.accessTokenKey,
          "resource",
          resourceId,
        );
      const body =
        request.body && typeof request.body === "object"
          ? (request.body as Record<string, unknown>)
          : {};
      if (
        trace.baseRevision === undefined &&
        Number.isSafeInteger(body.baseRevision)
      )
        trace.baseRevision = body.baseRevision as number;
      record(method, safeRoute, response.statusCode, seconds, code);
      const key = request.headers["idempotency-key"];
      process.stdout.write(
        JSON.stringify({
          event: "http_request",
          at: new Date().toISOString(),
          requestId: id,
          method,
          route: safeRoute,
          status: response.statusCode,
          durationMs: Math.round(seconds * 1000),
          code,
          ...(trace.actorHash ? { actorHash: trace.actorHash } : {}),
          operation: trace.operation ?? method.toLowerCase(),
          ...(trace.resourceHash ? { resourceHash: trace.resourceHash } : {}),
          ...(trace.baseRevision !== undefined
            ? { baseRevision: trace.baseRevision }
            : {}),
          ...(typeof key === "string"
            ? {
                idempotencyHash: opaqueHash(
                  config.accessTokenKey,
                  "idempotency",
                  key,
                ),
              }
            : {}),
        }) + "\n",
      );
    });
    requestTrace.run(trace, () => {
      void limiter
        .check(request)
        .then((decision) => {
          if (!decision || decision.allowed) {
            next();
            return;
          }
          countEvent("rate_limited");
          trace.errorCode = "RATE_LIMITED";
          response.setHeader("Retry-After", decision.retryAfterSeconds);
          response.status(429).json({
            code: "RATE_LIMITED",
            message: "请求过于频繁，请稍后再试",
            requestId: id,
          });
        })
        .catch(() => {
          trace.errorCode = "SERVICE_UNAVAILABLE";
          response.status(503).json({
            code: "SERVICE_UNAVAILABLE",
            message: "服务暂时不可用，请稍后重试",
            requestId: id,
          });
        });
    });
  });
}

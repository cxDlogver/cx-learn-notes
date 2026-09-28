import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Buffer } from "node:buffer";
import { URL } from "node:url";
import process from "node:process";
import { PGlite } from "@electric-sql/pglite";
import { ApiRateLimiter } from "../apps/api/dist/rate-limit.js";

const pg = new PGlite();
try {
  const manifest = JSON.parse(
    await readFile(
      new URL("../db/migrations/manifest.json", import.meta.url),
      "utf8",
    ),
  );
  for (const migration of manifest.migrations)
    await pg.exec(
      await readFile(
        new URL(`../db/migrations/${migration.file}`, import.meta.url),
        "utf8",
      ),
    );
  const secret = Buffer.alloc(32, 23);
  const limiter = new ApiRateLimiter(
    { query: (sql, params) => pg.query(sql, params) },
    { accessTokenKey: secret },
  );
  const request = {
    method: "POST",
    originalUrl: "/api/v1/me/deletion-cancel",
    ip: "198.51.100.23",
    headers: {},
  };
  for (let i = 1; i <= 15; i++) {
    const result = await limiter.check(request);
    assert.equal(result.allowed, true);
    assert.equal(result.remaining, 15 - i);
  }
  const denied = await limiter.check(request);
  assert.equal(denied.allowed, false);
  assert.ok(denied.retryAfterSeconds >= 1 && denied.retryAfterSeconds <= 60);
  assert.equal(
    (await limiter.check({ ...request, ip: "198.51.100.24" })).allowed,
    true,
  );
  assert.equal(await limiter.check({ ...request, method: "GET" }), null);
  const bucket = (
    await pg.query(
      "SELECT encode(scope_hash,'hex') AS hash,hits FROM rate_limit_buckets WHERE hits=16",
    )
  ).rows[0];
  assert.equal(bucket.hits, 16);
  assert.equal(
    bucket.hash,
    createHmac("sha256", secret)
      .update("deletion_cancel:ip:198.51.100.23")
      .digest("hex"),
  );
  const alerts = await readFile(
    new URL("../infra/observability/alerts.yml", import.meta.url),
    "utf8",
  );
  for (const metric of [
    "plan_checkin_deletion_overdue",
    "plan_checkin_worker_heartbeat_age_seconds",
    "plan_checkin_media_cleanup_stalled",
    "plan_checkin_social_notifications_stalled",
    "plan_checkin_sync_conflicts_open",
    "plan_checkin_http_requests_total",
  ])
    assert.ok(alerts.includes(metric), `Missing alert for ${metric}`);
  process.stdout.write(
    "Observability smoke passed: shared rate limits, hashed buckets and alert coverage.\n",
  );
} finally {
  await pg.close();
}

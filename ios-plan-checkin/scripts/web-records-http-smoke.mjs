import assert from "node:assert/strict";
import { randomInt, randomUUID } from "node:crypto";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import process from "node:process";
import { URL } from "node:url";

const databaseUrl = process.env.WEB_ATDD_DATABASE_URL;
if (!databaseUrl) throw new Error("WEB_ATDD_DATABASE_URL is required");
const parsed = new URL(databaseUrl);
if (
  !["127.0.0.1", "localhost"].includes(parsed.hostname) ||
  !/^web_atdd(?:_[a-z0-9]+)?$/.test(parsed.pathname.slice(1))
)
  throw new Error("HTTP smoke requires an isolated loopback web_atdd database");
const reservation = createServer();
await new Promise((resolve) => reservation.listen(0, "127.0.0.1", resolve));
const port = reservation.address().port;
await new Promise((resolve) => reservation.close(resolve));
const origin = `http://127.0.0.1:${port}`;
Object.assign(process.env, {
  APP_ENV: "development",
  DATABASE_URL: databaseUrl,
  WEB_ORIGIN: origin,
  SMS_PROVIDER: "stub",
  OBJECT_ENDPOINT: "http://127.0.0.1:9000",
  OBJECT_BUCKET: "web-atdd-unused",
  OBJECT_ACCESS_KEY_ID: "web-atdd-unused",
  OBJECT_SECRET_ACCESS_KEY: "web-atdd-unused",
  ACCESS_TOKEN_SECRET: "web_atdd_only_access",
  PHONE_ENCRYPTION_KEY: "web_atdd_only_phone_encrypt",
  PHONE_LOOKUP_KEY: "web_atdd_only_phone_lookup",
  OTP_HASH_KEY: "web_atdd_only_otp",
  AUTH_IDEMPOTENCY_KEY: "web_atdd_only_idempotency",
  PUSH_TOKEN_ENCRYPTION_KEY: "web_atdd_only_push",
});
const requireApi = createRequire(
  new URL("../apps/api/package.json", import.meta.url),
);
const { NestFactory } = requireApi("@nestjs/core");
const { AppModule } = await import("../apps/api/dist/app.module.js");
const { ApiExceptionFilter } = await import("../apps/api/dist/http.js");
const { ApiConfig } = await import("../apps/api/dist/config.js");
const { Database } = await import("../apps/api/dist/database.js");
const { SmsProvider } = await import("../apps/api/dist/auth/sms-provider.js");
const { installObservability } =
  await import("../apps/api/dist/observability.js");
const { addCalendarDays, businessDateAt } =
  await import("../packages/domain/dist/index.js");
const app = await NestFactory.create(AppModule, { logger: false });
let delivered;
app.get(SmsProvider).send = async (_phone, code) => {
  delivered = code;
};
app.setGlobalPrefix("api/v1");
app.useGlobalFilters(new ApiExceptionFilter());
const db = app.get(Database);
installObservability(app, db, app.get(ApiConfig));
try {
  await app.listen(port, "127.0.0.1");
  const request = async (method, path, body, token, key) => {
    const response = await globalThis.fetch(`${origin}/api/v1/${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        "x-client-request-id": randomUUID(),
        ...(method !== "GET" ? { "idempotency-key": key ?? randomUUID() } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(path === "auth/web/verify"
          ? { origin, "x-device-id": randomUUID() }
          : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return {
      status: response.status,
      body: await response.json(),
      cacheControl: response.headers.get("cache-control"),
    };
  };
  const login = async () => {
    const challenge = await request("POST", "auth/sms/challenges", {
      countryCode: "+86",
      phone: `138${String(randomInt(0, 100_000_000)).padStart(8, "0")}`,
      purpose: "login",
    });
    assert.equal(challenge.status, 201);
    const verified = await request("POST", "auth/web/verify", {
      challengeId: challenge.body.data.challengeId,
      code: delivered,
    });
    assert.equal(verified.status, 201);
    return verified.body.data;
  };
  const owner = await login();
  const outsider = await login();
  const token = owner.accessToken;
  const today = businessDateAt(new Date(), "Asia/Shanghai");
  const yesterday = addCalendarDays(today, -1);
  const created = await request(
    "POST",
    "plans",
    {
      kind: "fixed",
      direction: "do",
      title: "WEB-08 HTTP 数值历史",
      timezone: "Asia/Shanghai",
      startDate: yesterday,
      rule: { weekdays: [1, 2, 3, 4, 5, 6, 7] },
      numericItem: { label: "距离", unit: "公里" },
    },
    token,
  );
  assert.equal(created.status, 201);
  const planId = created.body.data.id;
  // Seed an already-effective append-only version; the service must pick by date.
  await db.query(
    `INSERT INTO plan_numeric_config_versions
      (plan_id,version,effective_from,label,unit) VALUES ($1,2,$2,'用时','分钟')`,
    [planId, today],
  );
  const putBody = (numeric, baseRevision = 0) => ({
    result: "success",
    note: "HTTP 记录",
    numeric,
    baseRevision,
    clientCreatedAt: new Date().toISOString(),
    clientOperationId: randomUUID(),
    ruleVersion: 1,
  });
  const oldBody = putBody({ value: "2.5", unit: "公里" });
  const retryKey = randomUUID();
  const old = await request(
    "PUT",
    `plans/${planId}/checkins/${yesterday}`,
    oldBody,
    token,
    retryKey,
  );
  assert.equal(old.status, 200);
  assert.equal(old.body.data.numeric.configVersion, 1);
  assert.equal(old.body.data.isBackfilled, true);
  const retry = await request(
    "PUT",
    `plans/${planId}/checkins/${yesterday}`,
    oldBody,
    token,
    retryKey,
  );
  assert.equal(retry.status, 200);
  assert.deepEqual(retry.body.data, old.body.data);
  const newRecord = await request(
    "PUT",
    `plans/${planId}/checkins/${today}`,
    putBody({ value: "30", unit: "分钟" }),
    token,
  );
  assert.equal(newRecord.status, 200);
  assert.equal(newRecord.body.data.numeric.configVersion, 2);
  const wrongUnit = await request(
    "PUT",
    `plans/${planId}/checkins/${today}`,
    putBody({ value: "3", unit: "公里" }, 1),
    token,
  );
  assert.equal(wrongUnit.status, 409);
  assert.equal(wrongUnit.body.code, "RULE_CHANGED");
  const revised = await request(
    "PUT",
    `plans/${planId}/checkins/${yesterday}`,
    putBody({ value: "3", unit: "公里" }, 1),
    token,
  );
  assert.equal(revised.status, 200);
  assert.equal(revised.body.data.numeric.configVersion, 1);
  const stranger = await request(
    "GET",
    `plans/${planId}/checkins/${yesterday}`,
    undefined,
    outsider.accessToken,
  );
  assert.equal(stranger.status, 404);

  const racingPlan = await request(
    "POST",
    "plans",
    {
      kind: "fixed",
      direction: "do",
      title: "WEB-08 并发",
      timezone: "Asia/Shanghai",
      startDate: today,
      rule: { weekdays: [1, 2, 3, 4, 5, 6, 7] },
    },
    token,
  );
  assert.equal(racingPlan.status, 201);
  const racePath = `plans/${racingPlan.body.data.id}/checkins/${today}`;
  const race = await Promise.all([
    request("PUT", racePath, putBody(null), token),
    request("PUT", racePath, putBody(null), token),
  ]);
  assert.deepEqual(race.map((result) => result.status).sort(), [200, 409]);
  assert.equal(
    race.find((result) => result.status === 409).body.code,
    "CHECKIN_CONFLICT",
  );

  const oneTime = await request(
    "POST",
    "plans",
    {
      kind: "one_time",
      direction: "do",
      title: "WEB-08 一次性结果",
      timezone: "Asia/Shanghai",
      dueDate: today,
      numericItem: { label: "页数", unit: "页" },
    },
    token,
  );
  assert.equal(oneTime.status, 201);
  const oneTimeId = oneTime.body.data.id;
  const mediaId = randomUUID();
  await db.query(
    `INSERT INTO media (id,owner_id,object_key,mime,bytes)
     VALUES ($1,$2,$3,'image/jpeg',128)`,
    [mediaId, owner.userId, `private/${randomUUID()}`],
  );
  const resolution = await request(
    "POST",
    `plans/${oneTimeId}/one-time-resolution`,
    {
      resolution: "failed",
      baseRevision: 0,
      note: "初稿",
      numeric: { value: "12", unit: "页" },
      mediaIds: [mediaId],
    },
    token,
  );
  assert.equal(resolution.status, 201);
  assert.equal(resolution.body.data.numeric.label, "页数");
  assert.deepEqual(resolution.body.data.mediaIds, [mediaId]);
  const corrected = await request(
    "PATCH",
    `plans/${oneTimeId}/one-time-resolution`,
    {
      resolution: "completed",
      baseRevision: 1,
      completedAt: new Date().toISOString(),
      note: "已交稿",
      numeric: { value: "20", unit: "页" },
    },
    token,
  );
  assert.equal(corrected.status, 200);
  assert.equal(corrected.body.data.revision, 2);
  assert.deepEqual(corrected.body.data.mediaIds, [mediaId]);
  const detail = await request(
    "GET",
    `plans/${oneTimeId}/detail`,
    undefined,
    token,
  );
  assert.equal(detail.status, 200);
  assert.deepEqual(detail.body.data.statistics.resolution.mediaIds, [mediaId]);
  assert.equal(
    detail.body.data.statistics.resolution.numeric.value,
    "20.000000",
  );

  const count = async (sql, params) =>
    Number((await db.query(sql, params)).rows[0].n);
  const summary = {
    oldWrite: old.status,
    retry: retry.status,
    currentWrite: newRecord.status,
    wrongUnit: wrongUnit.status,
    correction: revised.status,
    foreignRead: stranger.status,
    race: race.map((item) => item.status).sort(),
    oneTimeCreate: resolution.status,
    oneTimeCorrection: corrected.status,
    detail: detail.status,
    cacheControl: old.cacheControl,
    oldNumeric: old.body.data.numeric,
    newNumeric: newRecord.body.data.numeric,
    checkins: await count(
      "SELECT count(*)::text AS n FROM checkins WHERE plan_id=$1",
      [planId],
    ),
    checkinRevisions: await count(
      "SELECT count(*)::text AS n FROM checkin_revisions WHERE checkin_id=$1",
      [old.body.data.id],
    ),
    racingRows: await count(
      "SELECT count(*)::text AS n FROM checkins WHERE plan_id=$1",
      [racingPlan.body.data.id],
    ),
    raceConflicts: await count(
      "SELECT count(*)::text AS n FROM checkin_conflicts WHERE plan_id=$1",
      [racingPlan.body.data.id],
    ),
    oneTimeRows: await count(
      "SELECT count(*)::text AS n FROM one_time_resolutions WHERE plan_id=$1",
      [oneTimeId],
    ),
    oneTimeRevisions: await count(
      "SELECT count(*)::text AS n FROM one_time_resolution_revisions WHERE plan_id=$1",
      [oneTimeId],
    ),
    mediaLinked: await count(
      "SELECT count(*)::text AS n FROM media WHERE one_time_plan_id=$1",
      [oneTimeId],
    ),
  };
  assert.equal(summary.checkins, 2);
  assert.equal(summary.checkinRevisions, 2);
  assert.equal(summary.racingRows, 1);
  assert.equal(summary.raceConflicts, 1);
  assert.equal(summary.oneTimeRows, 1);
  assert.equal(summary.oneTimeRevisions, 2);
  assert.equal(summary.mediaLinked, 1);
  assert.equal(summary.cacheControl, "no-store");
  process.stdout.write(`${JSON.stringify(summary)}\n`);
} finally {
  await app.close();
}

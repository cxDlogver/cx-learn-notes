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
) {
  throw new Error(
    "HTTP smoke only connects to an isolated loopback web_atdd database",
  );
}
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
const { businessDateAt, addCalendarDays } =
  await import("../packages/domain/dist/index.js");
const app = await NestFactory.create(AppModule, { logger: false });
let delivered;
app.get(SmsProvider).send = async (_phone, code) => {
  delivered = code;
};
app.setGlobalPrefix("api/v1");
app.useGlobalFilters(new ApiExceptionFilter());
installObservability(app, app.get(Database), app.get(ApiConfig));
try {
  await app.listen(port, "127.0.0.1");
  const request = async (method, path, body, accessToken, extra = {}) => {
    const response = await globalThis.fetch(`${origin}/api/v1/${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        "x-client-request-id": randomUUID(),
        ...(method !== "GET" ? { "idempotency-key": randomUUID() } : {}),
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        ...extra,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return {
      status: response.status,
      payload: await response.json(),
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
    const verified = await request(
      "POST",
      "auth/web/verify",
      { challengeId: challenge.payload.data.challengeId, code: delivered },
      undefined,
      { origin, "x-device-id": randomUUID() },
    );
    assert.equal(verified.status, 201);
    return verified.payload.data.accessToken;
  };
  const ownerToken = await login();
  const otherToken = await login();
  const today = businessDateAt(new Date(), "Asia/Shanghai");
  const created = await request(
    "POST",
    "plans",
    {
      kind: "fixed",
      direction: "do",
      title: "HTTP 数值项",
      timezone: "Asia/Shanghai",
      startDate: today,
      rule: { weekdays: [1, 3, 5] },
      numericItem: { label: "距离", unit: "公里" },
    },
    ownerToken,
  );
  assert.equal(created.status, 201);
  assert.equal(created.payload.data.numericItem.version, 1);
  const planId = created.payload.data.id;
  const loaded = await request("GET", `plans/${planId}`, undefined, ownerToken);
  assert.equal(loaded.status, 200);
  assert.equal(loaded.payload.data.numericItem.unit, "公里");
  assert.equal(loaded.cacheControl, "no-store");
  const forbidden = await request(
    "GET",
    `plans/${planId}`,
    undefined,
    otherToken,
  );
  assert.equal(forbidden.status, 404);
  const foreignEdit = await request(
    "PATCH",
    `plans/${planId}/numeric-config`,
    { label: "窃改", unit: "米", baseRevision: created.payload.data.revision },
    otherToken,
  );
  assert.equal(foreignEdit.status, 404);
  const edited = await request(
    "PATCH",
    `plans/${planId}/numeric-config`,
    {
      label: "用时",
      unit: "分钟",
      baseRevision: created.payload.data.revision,
    },
    ownerToken,
  );
  assert.equal(edited.status, 200);
  assert.deepEqual(edited.payload.data.numericItem, {
    label: "用时",
    unit: "分钟",
    version: 2,
    effectiveFrom: addCalendarDays(today, 1),
  });
  const pendingConflict = await request(
    "PATCH",
    `plans/${planId}/numeric-config`,
    {
      label: "速度",
      unit: "公里每小时",
      baseRevision: edited.payload.data.revision,
    },
    ownerToken,
  );
  assert.equal(pendingConflict.status, 409);
  assert.equal(pendingConflict.payload.code, "RULE_CHANGED");
  const staleRevision = await request(
    "PATCH",
    `plans/${planId}/numeric-config`,
    { label: "速度", unit: "米", baseRevision: created.payload.data.revision },
    ownerToken,
  );
  assert.equal(staleRevision.status, 409);
  const invalidLabel = await request(
    "PATCH",
    `plans/${planId}/numeric-config`,
    {
      label: "x".repeat(41),
      unit: "米",
      baseRevision: edited.payload.data.revision,
    },
    ownerToken,
  );
  assert.equal(invalidLabel.status, 400);
  const oldClient = await request(
    "POST",
    "plans",
    {
      kind: "one_time",
      direction: "do",
      title: "旧客户端格式",
      timezone: "Asia/Shanghai",
      dueDate: today,
    },
    ownerToken,
  );
  assert.equal(oldClient.status, 201);
  assert.equal(oldClient.payload.data.numericItem, null);
  const added = await request(
    "POST",
    `plans/${oldClient.payload.data.id}/numeric-config`,
    {
      label: "体重",
      unit: "千克",
      baseRevision: oldClient.payload.data.revision,
    },
    ownerToken,
  );
  assert.equal(added.status, 201);
  assert.equal(added.payload.data.numericItem.version, 1);
  assert.equal(
    added.payload.data.numericItem.effectiveFrom,
    addCalendarDays(today, 1),
  );
  process.stdout.write(
    `${JSON.stringify({
      create: created.status,
      read: loaded.status,
      foreignRead: forbidden.status,
      foreignEdit: foreignEdit.status,
      edit: edited.status,
      pendingConflict: pendingConflict.status,
      staleRevision: staleRevision.status,
      invalidLabel: invalidLabel.status,
      oldClientCreate: oldClient.status,
      addToExisting: added.status,
      initialItem: created.payload.data.numericItem,
      editedItem: edited.payload.data.numericItem,
      addedItem: added.payload.data.numericItem,
      cacheControl: loaded.cacheControl,
    })}\n`,
  );
} finally {
  await app.close();
}

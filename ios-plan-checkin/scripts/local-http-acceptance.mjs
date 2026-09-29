import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHash, randomInt, randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import process from "node:process";
import { URL } from "node:url";

const base = process.env.LOCAL_API_URL ?? "http://127.0.0.1:3000";
const metricsBase = process.env.LOCAL_METRICS_URL ?? base;
if (
  ![base, metricsBase].every(
    (url) =>
      url.startsWith("http://127.0.0.1:") ||
      url.startsWith("http://localhost:"),
  )
)
  throw new Error("Local HTTP acceptance only targets a loopback API.");
const evidence = [];
const startedAt = new Date().toISOString();
let accessToken = "";
let refreshToken = "";
let phone = "";
let privateNote = "";
const request = async (method, path, body, options = {}) => {
  const id = randomUUID();
  const response = await globalThis.fetch(`${base}/api/v1/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Client-Request-Id": id,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(body && method !== "GET"
        ? { "Idempotency-Key": options.key ?? randomUUID() }
        : {}),
      ...(options.headers ?? {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json();
  assert.equal(response.headers.get("x-request-id"), id);
  assert.equal(payload.requestId, id);
  return {
    status: response.status,
    payload,
    requestId: id,
    retryAfter: response.headers.get("retry-after"),
  };
};
const step = async (caseId, action) => {
  try {
    const requestIds = await action();
    evidence.push({
      caseId,
      status: "PASS",
      requestIds,
      assertionTypes: ["functional", "negative"],
    });
  } catch (error) {
    evidence.push({
      caseId,
      status: "FAIL",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
};

try {
  await step("AUTH-09-api-unauthenticated", async () => {
    const result = await request("GET", "plans");
    assert.equal(result.status, 401);
    assert.equal(result.payload.code, "UNAUTHENTICATED");
    return [result.requestId];
  });
  phone = `138${String(randomInt(0, 100_000_000)).padStart(8, "0")}`;
  await step("AUTH-01-04-api-login", async () => {
    const challenge = await request("POST", "auth/sms/challenges", {
      countryCode: "+86",
      phone,
      purpose: "login",
    });
    assert.equal(challenge.status, 201);
    assert.ok(challenge.payload.data.challengeId);
    const outbox = JSON.parse(
      await readFile(
        new URL("../apps/api/.local/sms-outbox-login.json", import.meta.url),
        "utf8",
      ),
    );
    assert.equal(outbox.phoneE164, `+86${phone}`);
    const verified = await request(
      "POST",
      "auth/sms/verify",
      { challengeId: challenge.payload.data.challengeId, code: outbox.code },
      { headers: { "X-Device-Id": randomUUID() } },
    );
    assert.equal(verified.status, 201);
    assert.equal(verified.payload.data.isNewUser, true);
    accessToken = verified.payload.data.accessToken;
    refreshToken = verified.payload.data.refreshToken;
    assert.ok(accessToken && refreshToken);
    return [challenge.requestId, verified.requestId];
  });
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  let plan;
  await step("PLAN-02-api-empty-rule", async () => {
    const invalid = await request("POST", "plans", {
      kind: "fixed",
      direction: "do",
      title: "Local acceptance invalid",
      timezone: "Asia/Shanghai",
      startDate: date,
      rule: { weekdays: [] },
    });
    assert.equal(invalid.status, 400);
    const list = await request("GET", "plans");
    assert.equal(list.payload.data.length, 0);
    return [invalid.requestId, list.requestId];
  });
  await step("PLAN-03-api-create-idempotency", async () => {
    const key = randomUUID();
    const body = {
      kind: "fixed",
      direction: "do",
      title: "Local acceptance daily",
      timezone: "Asia/Shanghai",
      startDate: date,
      rule: { weekdays: [1, 2, 3, 4, 5, 6, 7] },
    };
    const created = await request("POST", "plans", body, { key });
    assert.equal(created.status, 201);
    plan = created.payload.data;
    assert.equal(plan.ruleVersion, 1);
    const repeated = await request("POST", "plans", body, { key });
    assert.equal(repeated.payload.data.id, plan.id);
    const list = await request("GET", "plans");
    assert.equal(
      list.payload.data.filter((item) => item.id === plan.id).length,
      1,
    );
    return [created.requestId, repeated.requestId, list.requestId];
  });
  privateNote = `PRIVATE_SMOKE_${randomUUID()}`;
  await step("CHECK-01-SYNC-03-api-checkin", async () => {
    const key = randomUUID();
    const body = {
      result: "success",
      note: privateNote,
      baseRevision: 0,
      clientCreatedAt: new Date().toISOString(),
      clientOperationId: randomUUID(),
      ruleVersion: 1,
    };
    const first = await request(
      "PUT",
      `plans/${plan.id}/checkins/${date}`,
      body,
      { key },
    );
    assert.equal(first.status, 200);
    assert.equal(first.payload.data.result, "success");
    const repeated = await request(
      "PUT",
      `plans/${plan.id}/checkins/${date}`,
      body,
      { key },
    );
    assert.equal(repeated.payload.data.id, first.payload.data.id);
    const detail = await request("GET", `plans/${plan.id}/checkins/${date}`);
    assert.equal(detail.payload.data.note, privateNote);
    assert.equal(detail.payload.data.revision, 1);
    return [first.requestId, repeated.requestId, detail.requestId];
  });
  await step("SYNC-06-api-stale-revision", async () => {
    const stale = await request("PUT", `plans/${plan.id}/checkins/${date}`, {
      result: "failure",
      failureReason: "missed",
      baseRevision: 0,
      clientCreatedAt: new Date().toISOString(),
      clientOperationId: randomUUID(),
      ruleVersion: 1,
    });
    assert.equal(stale.status, 409);
    const detail = await request("GET", `plans/${plan.id}/checkins/${date}`);
    assert.equal(detail.payload.data.result, "success");
    return [stale.requestId, detail.requestId];
  });
  await step("VIEW-api-today-statistics", async () => {
    const today = await request("GET", "today?timezone=Asia%2FShanghai");
    const statistics = await request("GET", `plans/${plan.id}/statistics`);
    assert.equal(today.status, 200);
    assert.equal(statistics.status, 200);
    return [today.requestId, statistics.requestId];
  });
  await step("MEDIA-api-signed-upload-private-download", async () => {
    const record = await request("GET", `plans/${plan.id}/checkins/${date}`);
    const bytes = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2jYxkAAAAASUVORK5CYII=",
      "base64",
    );
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const intent = await request("POST", "media/upload-intents", {
      mime: "image/png",
      bytes: bytes.length,
      sha256,
    });
    assert.equal(intent.status, 201);
    assert.deepEqual(intent.payload.data.headers, {
      "Content-Type": "image/png",
    });
    const uploaded = await globalThis.fetch(intent.payload.data.uploadUrl, {
      method: "PUT",
      headers: intent.payload.data.headers,
      body: bytes,
    });
    if (!uploaded.ok) {
      const responseText = await uploaded.text();
      const safeCode =
        responseText.match(/<Code>([A-Za-z0-9]+)<\/Code>/)?.[1] ?? "UNKNOWN";
      const signed = new URL(intent.payload.data.uploadUrl);
      throw new Error(
        `Signed upload failed with HTTP ${uploaded.status}, S3 code ${safeCode}; query keys ${[...signed.searchParams.keys()].join(",")}; signed headers ${signed.searchParams.get("X-Amz-SignedHeaders")}`,
      );
    }
    const completed = await request(
      "POST",
      `media/${intent.payload.data.id}/complete`,
      { checkinId: record.payload.data.id },
    );
    assert.equal(completed.status, 201);
    assert.equal(completed.payload.data.status, "ready");
    const download = await request(
      "GET",
      `media/${intent.payload.data.id}/download-url`,
    );
    assert.equal(download.status, 200);
    const fetched = await globalThis.fetch(download.payload.data.url);
    assert.equal(fetched.status, 200);
    assert.deepEqual(Buffer.from(await fetched.arrayBuffer()), bytes);
    const removed = await request("DELETE", `media/${intent.payload.data.id}`);
    assert.equal(removed.status, 200);
    const forbidden = await request(
      "GET",
      `media/${intent.payload.data.id}/download-url`,
    );
    assert.equal(forbidden.status, 404);
    return [
      record.requestId,
      intent.requestId,
      completed.requestId,
      download.requestId,
      removed.requestId,
      forbidden.requestId,
    ];
  });
  await step("AUTH-09-api-logout", async () => {
    const logout = await request("POST", "auth/logout", { refreshToken });
    assert.equal(logout.status, 201);
    const after = await request("GET", "plans");
    assert.equal(after.status, 401);
    return [logout.requestId, after.requestId];
  });
  const metrics = await globalThis.fetch(`${metricsBase}/internal/metrics`, {
    headers: { Authorization: `Bearer ${process.env.API_METRICS_TOKEN}` },
  });
  assert.equal(metrics.status, 200);
  const metricText = await metrics.text();
  assert.match(metricText, /plan_checkin_worker_heartbeat_age_seconds/);
  const log = await readFile(
    new URL("../apps/api/.local/api.out.log", import.meta.url),
    "utf8",
  );
  for (const sensitive of [phone, accessToken, refreshToken, privateNote])
    assert.equal(
      log.includes(sensitive),
      false,
      "Sensitive value leaked into API log",
    );
  evidence.push({
    caseId: "OPS-04-api-metrics-and-redaction",
    status: "PASS",
    assertionTypes: ["functional", "negative"],
  });
} catch (error) {
  process.exitCode = 1;
  process.stderr.write(
    `${error instanceof Error ? error.message : "Local HTTP acceptance failed"}\n`,
  );
} finally {
  const report = {
    kind: "local-http-development-check",
    formalAtdd: false,
    startedAt,
    endedAt: new Date().toISOString(),
    environment: "Windows loopback + Docker PostgreSQL 17/Redis/SeaweedFS",
    cases: evidence,
  };
  await writeFile(
    new URL("../apps/api/.local/local-http-acceptance.json", import.meta.url),
    JSON.stringify(report, null, 2) + "\n",
  );
  process.stdout.write(
    `Local HTTP checks: ${evidence.filter((item) => item.status === "PASS").length}/${evidence.length} passed.\n`,
  );
}

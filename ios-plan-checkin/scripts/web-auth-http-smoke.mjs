import assert from "node:assert/strict";
import { randomInt, randomUUID } from "node:crypto";
import { createServer } from "node:net";
import process from "node:process";
import { URL } from "node:url";
import { createRequire } from "node:module";

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
  const request = async (method, path, body, extra = {}) => {
    const response = await globalThis.fetch(`${origin}/api/v1/${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        "x-client-request-id": randomUUID(),
        ...(method !== "GET" ? { "idempotency-key": randomUUID() } : {}),
        ...extra,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { response, payload: await response.json() };
  };
  const challenge = await request("POST", "auth/sms/challenges", {
    countryCode: "+86",
    phone: `138${String(randomInt(0, 100_000_000)).padStart(8, "0")}`,
    purpose: "login",
  });
  assert.equal(challenge.response.status, 201);
  const device = randomUUID();
  const verified = await request(
    "POST",
    "auth/web/verify",
    {
      challengeId: challenge.payload.data.challengeId,
      code: delivered,
    },
    { origin, "x-device-id": device },
  );
  assert.equal(verified.response.status, 201);
  assert.equal("refreshToken" in verified.payload.data, false);
  assert.equal(verified.response.headers.get("cache-control"), "no-store");
  let cookie = verified.response.headers.get("set-cookie").split(";", 1)[0];
  assert.ok(cookie.startsWith("__Host-plan-refresh="));
  const session = await request("GET", "auth/web/session", undefined, {
    cookie,
  });
  assert.equal(session.response.status, 200);
  assert.equal(session.payload.data.userId, verified.payload.data.userId);
  const denied = await request("POST", "auth/web/refresh", undefined, {
    origin: "https://evil.example",
    cookie,
    "x-csrf-token": verified.payload.data.csrfToken,
  });
  assert.equal(denied.response.status, 403);
  assert.equal(denied.payload.code, "FORBIDDEN");
  const invalidCsrf = await request("POST", "auth/web/refresh", undefined, {
    origin,
    cookie,
    "x-csrf-token": "wrong",
  });
  assert.equal(invalidCsrf.response.status, 403);
  const oldCookie = cookie;
  const refreshed = await request("POST", "auth/web/refresh", undefined, {
    origin,
    cookie,
    "x-csrf-token": verified.payload.data.csrfToken,
  });
  assert.equal(refreshed.response.status, 201);
  cookie = refreshed.response.headers.get("set-cookie").split(";", 1)[0];
  assert.notEqual(cookie, oldCookie);
  const stale = await request("POST", "auth/web/refresh", undefined, {
    origin,
    cookie: oldCookie,
    "x-csrf-token": verified.payload.data.csrfToken,
  });
  assert.equal(stale.response.status, 401);
  assert.equal(stale.response.headers.get("set-cookie"), null);
  const loggedOut = await request("POST", "auth/web/logout", undefined, {
    origin,
    cookie,
    "x-csrf-token": refreshed.payload.data.csrfToken,
  });
  assert.equal(loggedOut.response.status, 201);
  assert.match(loggedOut.response.headers.get("set-cookie"), /Max-Age=0/);
  const ended = await request("GET", "auth/web/session", undefined, { cookie });
  assert.equal(ended.response.status, 401);
  process.stdout.write(
    `${JSON.stringify({
      verified: verified.response.status,
      refreshInBody: "refreshToken" in verified.payload.data,
      cookieAttributes: verified.response.headers
        .get("set-cookie")
        .split(";")
        .slice(1)
        .map((part) => part.trim()),
      cacheControl: verified.response.headers.get("cache-control"),
      resumed: session.response.status,
      foreignOrigin: denied.response.status,
      invalidCsrf: invalidCsrf.response.status,
      rotated: refreshed.response.status,
      stale: stale.response.status,
      staleSetCookie: stale.response.headers.has("set-cookie"),
      logout: loggedOut.response.status,
      afterLogout: ended.response.status,
    })}\n`,
  );
  process.stdout.write(
    "Web HTTP auth passed: public SMS registration, Cookie-only refresh, session restore, no-store, Origin/CSRF 403, rotation, stale 401 without cookie clear, logout 401.\n",
  );
} finally {
  await app.close();
}

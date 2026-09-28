import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import process from "node:process";
import { URL } from "node:url";
import { TextEncoder } from "node:util";
import { PGlite } from "@electric-sql/pglite";
import { AuthController } from "../apps/api/dist/auth/auth.controller.js";
import { AuthService } from "../apps/api/dist/auth/auth.service.js";
import { ratePolicy } from "../apps/api/dist/rate-limit.js";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(
  await readFile(new URL("db/migrations/manifest.json", root), "utf8"),
);
const pg = new PGlite();
try {
  for (const migration of manifest.migrations)
    await pg.exec(
      await readFile(new URL(`db/migrations/${migration.file}`, root), "utf8"),
    );
  const adapt = (client) => ({
    query: async (sql, params) => {
      const result = await client.query(sql, params);
      return {
        ...result,
        rowCount: result.rows.length || result.affectedRows || 0,
      };
    },
  });
  const database = {
    query: adapt(pg).query,
    transaction: (fn) => pg.transaction((tx) => fn(adapt(tx))),
  };
  const key = (label) => new TextEncoder().encode(label.padEnd(32, "x"));
  const config = {
    accessTokenKey: key("access"),
    phoneEncryptionKey: key("phone-encryption"),
    phoneLookupKey: key("phone-lookup"),
    otpHashKey: key("otp"),
    authIdempotencyKey: key("auth-idempotency"),
    webOrigin: "https://plan.example.test",
  };
  let delivered;
  const auth = new AuthService(config, database, {
    send: async (_phone, code) => {
      delivered = code;
    },
  });
  assert.equal(
    ratePolicy("POST", "/api/v1/auth/web/verify")?.name,
    "sms_verify",
  );
  assert.equal(ratePolicy("POST", "/api/v1/auth/web/refresh")?.name, "refresh");
  const controller = new AuthController(auth, config);
  const response = () => ({
    headers: {},
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
  });
  const request = { headers: {} };
  const challenge = await auth.createChallenge(
    { countryCode: "+86", phone: "13800138001", purpose: "login" },
    "127.0.0.1",
    randomUUID(),
  );
  const deviceId = randomUUID();
  const firstResponse = response();
  const verified = await controller.verifyWeb(
    { challengeId: challenge.challengeId, code: delivered },
    config.webOrigin,
    "plan.example.test",
    deviceId,
    randomUUID(),
    request,
    firstResponse,
  );
  assert.equal(verified.data.isNewUser, true);
  assert.equal("refreshToken" in verified.data, false);
  assert.equal(firstResponse.headers["cache-control"], "no-store");
  assert.match(firstResponse.headers["set-cookie"], /^__Host-plan-refresh=/);
  for (const part of [
    "Secure",
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    "Max-Age=2592000",
  ])
    assert.ok(firstResponse.headers["set-cookie"].includes(part));
  const cookie = firstResponse.headers["set-cookie"].split(";", 1)[0];
  const claims = JSON.parse(
    Buffer.from(verified.data.accessToken.split(".")[1], "base64url"),
  );
  assert.equal(claims.aud, "plan-checkin-web");
  assert.equal(claims.exp - claims.iat, 15 * 60);
  assert.equal(
    await auth.authenticate(`Bearer ${verified.data.accessToken}`),
    verified.data.userId,
  );
  const resumed = await controller.webSession(
    "plan.example.test",
    cookie,
    request,
    response(),
  );
  assert.equal(resumed.data.userId, verified.data.userId);
  assert.equal(resumed.data.csrfToken, verified.data.csrfToken);

  await assert.rejects(
    controller.refreshWeb(
      "https://evil.example",
      "plan.example.test",
      cookie,
      verified.data.csrfToken,
      randomUUID(),
      request,
      response(),
    ),
    /请求来源不受信任/,
  );
  await assert.rejects(
    controller.refreshWeb(
      config.webOrigin,
      "plan.example.test",
      cookie,
      "wrong",
      randomUUID(),
      request,
      response(),
    ),
    /会话校验失败/,
  );
  await assert.rejects(
    auth.refresh(cookie.split("=")[1], randomUUID()),
    /会话已失效/,
  );
  const rotationKey = randomUUID();
  const rotatedResponse = response();
  const rotated = await controller.refreshWeb(
    config.webOrigin,
    "plan.example.test",
    cookie,
    verified.data.csrfToken,
    rotationKey,
    request,
    rotatedResponse,
  );
  assert.equal("refreshToken" in rotated.data, false);
  assert.notEqual(rotated.data.csrfToken, verified.data.csrfToken);
  const rotatedCookie = rotatedResponse.headers["set-cookie"].split(";", 1)[0];
  const retryResponse = response();
  const retried = await controller.refreshWeb(
    config.webOrigin,
    "plan.example.test",
    cookie,
    verified.data.csrfToken,
    rotationKey,
    request,
    retryResponse,
  );
  assert.deepEqual(retried.data, rotated.data);
  assert.equal(
    retryResponse.headers["set-cookie"].split(";", 1)[0],
    rotatedCookie,
  );
  const staleResponse = response();
  await assert.rejects(
    controller.refreshWeb(
      config.webOrigin,
      "plan.example.test",
      cookie,
      verified.data.csrfToken,
      randomUUID(),
      request,
      staleResponse,
    ),
    /会话已失效/,
  );
  assert.equal(staleResponse.headers["set-cookie"], undefined);

  const nextResponse = response();
  const next = await controller.refreshWeb(
    config.webOrigin,
    "plan.example.test",
    rotatedCookie,
    rotated.data.csrfToken,
    randomUUID(),
    request,
    nextResponse,
  );
  const activeCookie = nextResponse.headers["set-cookie"].split(";", 1)[0];
  const lateResponse = response();
  await assert.rejects(
    controller.refreshWeb(
      config.webOrigin,
      "plan.example.test",
      cookie,
      verified.data.csrfToken,
      rotationKey,
      request,
      lateResponse,
    ),
    /会话已失效/,
  );
  assert.equal(lateResponse.headers["set-cookie"], undefined);

  const rotatedSessionId = activeCookie.split("=")[1].split(".")[0];
  const expiry = await pg.query("SELECT expires_at FROM sessions WHERE id=$1", [
    rotatedSessionId,
  ]);
  const remainingDays =
    (new Date(expiry.rows[0].expires_at).getTime() - Date.now()) / 86_400_000;
  assert.ok(remainingDays > 29.9 && remainingDays <= 30.1);
  await pg.query(
    "UPDATE sessions SET expires_at=now()-interval '1 second' WHERE id=$1",
    [rotatedSessionId],
  );
  await assert.rejects(
    controller.webSession(
      "plan.example.test",
      activeCookie,
      request,
      response(),
    ),
    /会话已失效/,
  );
  await pg.query(
    "UPDATE sessions SET expires_at=now()+interval '30 days' WHERE id=$1",
    [rotatedSessionId],
  );

  await pg.query(
    `INSERT INTO devices(id,user_id,platform,notifications_enabled,apns_token_ciphertext,push_token_hash)
     VALUES($1,$2,'ios',true,decode('01','hex'),decode('02','hex'))`,
    [deviceId, verified.data.userId],
  );
  await pg.query(
    `INSERT INTO web_push_subscriptions
      (user_id,browser_device_id,endpoint_hash,endpoint_ciphertext,p256dh_ciphertext,auth_ciphertext)
     VALUES($1,$2,decode(repeat('a1',32),'hex'),decode('01','hex'),decode('02','hex'),decode('03','hex'))`,
    [verified.data.userId, deviceId],
  );
  const logoutResponse = response();
  await controller.logoutWeb(
    config.webOrigin,
    "plan.example.test",
    activeCookie,
    next.data.csrfToken,
    randomUUID(),
    request,
    logoutResponse,
  );
  assert.match(logoutResponse.headers["set-cookie"], /Max-Age=0/);
  const mobileDevice = await pg.query(
    "SELECT notifications_enabled,apns_token_ciphertext IS NOT NULL AS has_apns FROM devices WHERE id=$1",
    [deviceId],
  );
  assert.deepEqual(mobileDevice.rows[0], {
    notifications_enabled: true,
    has_apns: true,
  });
  const webPush = await pg.query(
    "SELECT enabled,revoked_at IS NOT NULL AS revoked FROM web_push_subscriptions WHERE browser_device_id=$1",
    [deviceId],
  );
  assert.deepEqual(webPush.rows[0], { enabled: false, revoked: true });
  await assert.rejects(
    controller.webSession(
      "plan.example.test",
      activeCookie,
      request,
      response(),
    ),
    /会话已失效/,
  );

  const mobileChallenge = await auth.createChallenge(
    { countryCode: "+86", phone: "13800138002", purpose: "login" },
    "127.0.0.1",
    randomUUID(),
  );
  const mobile = await auth.verify(
    { challengeId: mobileChallenge.challengeId, code: delivered },
    randomUUID(),
    randomUUID(),
  );
  assert.ok(mobile.refreshToken);
  const mobileClaims = JSON.parse(
    Buffer.from(mobile.accessToken.split(".")[1], "base64url"),
  );
  assert.equal(mobileClaims.aud, "plan-checkin-mobile");
  assert.equal(
    await auth.authenticate(`Bearer ${mobile.accessToken}`),
    mobile.userId,
  );
  process.stdout.write(
    "Web auth smoke passed: Cookie flags, Web audience, CSRF/Origin, 15m access, 30d refresh/expiry, rotation/replay, logout channel isolation and mobile JSON compatibility.\n",
  );
} finally {
  await pg.close();
}

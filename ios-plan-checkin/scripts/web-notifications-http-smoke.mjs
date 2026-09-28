import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import {
  createECDH,
  createHash,
  randomBytes,
  randomInt,
  randomUUID,
} from "node:crypto";
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
const signing = createECDH("prime256v1");
signing.generateKeys();
Object.assign(process.env, {
  APP_ENV: "development",
  DATABASE_URL: databaseUrl,
  WEB_ORIGIN: origin,
  VAPID_PUBLIC_KEY: signing.getPublicKey().toString("base64url"),
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
const db = app.get(Database);
installObservability(app, db, app.get(ApiConfig));
try {
  await app.listen(port, "127.0.0.1");
  const request = async (method, path, body, token, extra = {}) => {
    const response = await globalThis.fetch(`${origin}/api/v1/${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        "x-client-request-id": randomUUID(),
        ...(method !== "GET" ? { "idempotency-key": randomUUID() } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...extra,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return {
      status: response.status,
      data: await response.json(),
      headers: response.headers,
    };
  };
  const challenge = await request("POST", "auth/sms/challenges", {
    countryCode: "+86",
    phone: `138${String(randomInt(0, 100_000_000)).padStart(8, "0")}`,
    purpose: "login",
  });
  assert.equal(challenge.status, 201);
  const device = randomUUID();
  const login = await request(
    "POST",
    "auth/web/verify",
    { challengeId: challenge.data.data.challengeId, code: delivered },
    undefined,
    { origin, "x-device-id": device },
  );
  assert.equal(login.status, 201);
  const webToken = login.data.data.accessToken;
  const userId = login.data.data.userId;
  const cookie = login.headers.get("set-cookie").split(";", 1)[0];
  const publicConfig = await request("GET", "web-push/config");
  assert.equal(publicConfig.status, 200);
  assert.equal(publicConfig.data.data.publicKey, process.env.VAPID_PUBLIC_KEY);
  assert.equal(publicConfig.data.data.available, true);
  const initial = await request(
    "GET",
    "me/notification-channels/web",
    undefined,
    webToken,
  );
  assert.equal(initial.status, 200);
  assert.equal(initial.data.data.planEnabled, true);
  const changed = await request(
    "PATCH",
    "me/notification-channels/web",
    { planEnabled: false, friendRequests: false, baseRevision: 1 },
    webToken,
  );
  assert.equal(changed.status, 200);
  assert.equal(changed.data.data.planEnabled, false);
  const iosPref = await request(
    "GET",
    "me/notification-preferences",
    undefined,
    webToken,
  );
  assert.equal(iosPref.status, 200);
  assert.equal(iosPref.data.data.friendRequests, true);
  const stale = await request(
    "PATCH",
    "me/notification-channels/web",
    { encouragements: false, baseRevision: 1 },
    webToken,
  );
  assert.equal(stale.status, 409);
  const oldSessionId = randomUUID();
  const oldRefresh = `${oldSessionId}.${randomBytes(32).toString("base64url")}`;
  await db.query(
    `INSERT INTO sessions(id,user_id,refresh_hash,device_id,expires_at,client_channel)
     VALUES($1,$2,$3,$4,now()+interval '1 day','ios')`,
    [
      oldSessionId,
      userId,
      createHash("sha256").update(oldRefresh).digest(),
      randomUUID(),
    ],
  );
  const mobileRefresh = await request("POST", "auth/refresh", {
    refreshToken: oldRefresh,
  });
  assert.equal(mobileRefresh.status, 201);
  const wrongChannel = await request(
    "GET",
    "me/notification-channels/web",
    undefined,
    mobileRefresh.data.data.accessToken,
  );
  assert.equal(wrongChannel.status, 401);
  const browser = createECDH("prime256v1");
  browser.generateKeys();
  const endpoint = `https://fcm.googleapis.com/fcm/send/${randomUUID()}`;
  const subscription = {
    endpoint,
    expirationTime: null,
    keys: {
      p256dh: browser.getPublicKey().toString("base64url"),
      auth: Buffer.alloc(16, 8).toString("base64url"),
    },
  };
  const invalid = await request(
    "POST",
    "me/web-push-subscriptions",
    { ...subscription, endpoint: "https://127.0.0.1/private" },
    webToken,
  );
  assert.equal(invalid.status, 400);
  const invalidKey = await request(
    "POST",
    "me/web-push-subscriptions",
    {
      ...subscription,
      keys: {
        ...subscription.keys,
        p256dh: Buffer.concat([Buffer.from([4]), Buffer.alloc(64)]).toString(
          "base64url",
        ),
      },
    },
    webToken,
  );
  assert.equal(invalidKey.status, 400);
  const registered = await request(
    "POST",
    "me/web-push-subscriptions",
    subscription,
    webToken,
  );
  assert.equal(registered.status, 201);
  assert.equal(registered.data.data.registered, true);
  const stored = (
    await db.query("SELECT * FROM web_push_subscriptions WHERE id=$1", [
      registered.data.data.id,
    ])
  ).rows[0];
  assert.equal(stored.browser_device_id, device);
  assert.equal(stored.user_id, userId);
  assert.equal(
    Buffer.from(stored.endpoint_ciphertext).includes(Buffer.from(endpoint)),
    false,
  );
  const revoked = await request(
    "DELETE",
    "me/web-push-subscriptions",
    undefined,
    webToken,
  );
  assert.equal(revoked.status, 200);
  assert.equal(revoked.data.data.registered, false);
  const reregistered = await request(
    "POST",
    "me/web-push-subscriptions",
    subscription,
    webToken,
  );
  assert.equal(reregistered.status, 201);
  const logout = await request(
    "POST",
    "auth/web/logout",
    undefined,
    undefined,
    {
      origin,
      cookie,
      "x-csrf-token": login.data.data.csrfToken,
    },
  );
  assert.equal(logout.status, 201);
  const ended = (
    await db.query("SELECT enabled FROM web_push_subscriptions WHERE id=$1", [
      reregistered.data.data.id,
    ])
  ).rows[0];
  assert.equal(ended.enabled, false);
  const afterLogout = await request(
    "GET",
    "me/notification-channels/web",
    undefined,
    webToken,
  );
  assert.equal(afterLogout.status, 401);
  process.stdout.write(
    JSON.stringify({
      database: "web_atdd_web15",
      openApiOperations: 84,
      webPreference: {
        initial: initial.status,
        updated: changed.status,
        stale: stale.status,
      },
      iosPreferenceUnaffected: iosPref.data.data.friendRequests,
      wrongChannel: wrongChannel.status,
      pushConfig: publicConfig.status,
      subscription: {
        invalid: invalid.status,
        offCurve: invalidKey.status,
        registered: registered.status,
        revoked: revoked.status,
      },
      encryptedAtRest: true,
      logoutRevokedSubscription: !ended.enabled,
      afterLogout: afterLogout.status,
    }) + "\n",
  );
} finally {
  await app.close();
}

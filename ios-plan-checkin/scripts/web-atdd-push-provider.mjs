import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createECDH, randomBytes } from "node:crypto";
import process from "node:process";
import { WebPushError, WebPushSender } from "../apps/worker/dist/webPush.js";

if (
  process.env.APP_ENV !== "development" ||
  process.env.SMS_PROVIDER !== "stub"
)
  throw new Error("Push provider probe requires isolated development settings");
const vapid = createECDH("prime256v1");
vapid.generateKeys();
const subscriber = createECDH("prime256v1");
subscriber.generateKeys();
const sender = new WebPushSender({
  VAPID_PRIVATE_KEY: vapid.getPrivateKey().toString("base64url"),
  VAPID_PUBLIC_KEY: vapid.getPublicKey().toString("base64url"),
  VAPID_SUBJECT: "mailto:web-atdd@example.test",
});
const subscription = {
  endpoint: "https://fcm.googleapis.com/fcm/send/web-atdd-only",
  p256dh: subscriber.getPublicKey().toString("base64url"),
  auth: randomBytes(16).toString("base64url"),
};
const originalFetch = globalThis.fetch;
let nextStatus = 201;
const observed = [];
globalThis.fetch = async (url, options) => {
  assert.equal(String(url), subscription.endpoint);
  assert.equal(options.method, "POST");
  assert.equal(options.redirect, "manual");
  assert.equal(options.headers["Content-Encoding"], "aes128gcm");
  assert.equal(options.headers["Content-Type"], "application/octet-stream");
  assert.equal(options.headers.TTL, "3600");
  const [scheme, token] = options.headers.Authorization.split(" t=");
  assert.equal(scheme, "vapid");
  const jwt = token.split(", k=")[0];
  const claims = JSON.parse(Buffer.from(jwt.split(".")[1], "base64url"));
  assert.equal(claims.aud, "https://fcm.googleapis.com");
  assert.equal(claims.sub, "mailto:web-atdd@example.test");
  const encrypted = Buffer.from(options.body);
  assert.ok(encrypted.length > 100);
  assert.equal(encrypted.includes(Buffer.from("有计划需要关注")), false);
  assert.equal(encrypted.includes(Buffer.from("收到新互动")), false);
  observed.push({ status: nextStatus, bytes: encrypted.length });
  return new globalThis.Response(null, { status: nextStatus });
};
try {
  await sender.send(subscription, "plan");
  nextStatus = 202;
  await sender.send(subscription, "social");
  nextStatus = 410;
  await assert.rejects(sender.send(subscription, "plan"), (error) => {
    assert.ok(error instanceof WebPushError);
    assert.equal(error.expired, true);
    return true;
  });
  nextStatus = 503;
  await assert.rejects(sender.send(subscription, "social"), (error) => {
    assert.ok(error instanceof WebPushError);
    assert.equal(error.retryable, true);
    return true;
  });
  await assert.rejects(
    sender.send(
      { ...subscription, endpoint: "https://127.0.0.1/push" },
      "plan",
    ),
    /Unsupported Web Push endpoint origin/,
  );
  assert.deepEqual(
    observed.map((item) => item.status),
    [201, 202, 410, 503],
  );
  process.stdout.write(
    `${JSON.stringify({
      kind: "controlled-in-process-push-provider",
      acceptedStatuses: [201, 202],
      expiredStatus: 410,
      retryableStatus: 503,
      internalEndpointRejected: true,
      encryptedPayloadBytes: observed.map((item) => item.bytes),
      privateContentAbsentFromCiphertext: true,
      externalNetworkCalls: 0,
      formalBusinessAtdd: false,
    })}\n`,
  );
} finally {
  globalThis.fetch = originalFetch;
}

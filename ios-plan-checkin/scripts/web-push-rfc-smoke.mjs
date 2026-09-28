import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createECDH } from "node:crypto";
import process from "node:process";
import { WebPushSender, encodeWebPush } from "../apps/worker/dist/webPush.js";

const compact = (value) => value.replaceAll(/\s/g, "");
const plaintext = Buffer.from(
  "V2hlbiBJIGdyb3cgdXAsIEkgd2FudCB0byBiZSBhIHdhdGVybWVsb24",
  "base64url",
);
const senderPrivate = Buffer.from(
  "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw",
  "base64url",
);
const recipientPublic = Buffer.from(
  compact(`BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-
    JvLexhqUzORcx aOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4`),
  "base64url",
);
const salt = Buffer.from("DGv6ra1nlYgDCS1FRnbzlw", "base64url");
const auth = Buffer.from("BTBZMqHH6r4Tts7J_aSIgg", "base64url");
const encoded = encodeWebPush(recipientPublic, auth, plaintext, {
  salt,
  privateKey: senderPrivate,
});
assert.equal(
  encoded.subarray(0, 86).toString("base64url"),
  compact(`DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z 9KsN6nGRTbVYI_c7VJSPQTBtkgcy27ml
    mlMoZIIgDll6e3vCYLocInmYWAmS6Tlz AC8wEqKK6PBru3jl7A8`),
  "RFC 8291 encrypted content header",
);
assert.equal(
  encoded.subarray(86).toString("base64url"),
  compact(`8pfeW0KbunFT06SuDKoJH9Ql87S1QUrd irN6GcG7sFz1y1sqLgVi1VhjVkHsUoEs
    bI_0LpXMuGvnzQ`),
  "RFC 8291 encrypted record",
);
process.stdout.write("PASS RFC 8291 header and encrypted record vector\n");

const signing = createECDH("prime256v1");
signing.generateKeys();
const sender = new WebPushSender({
  VAPID_PRIVATE_KEY: signing.getPrivateKey().toString("base64url"),
  VAPID_PUBLIC_KEY: signing.getPublicKey().toString("base64url"),
  VAPID_SUBJECT: "mailto:push@example.test",
});
const observed = [];
const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = async (url, init) => {
    observed.push({ url: String(url), init });
    return { status: 201, body: null };
  };
  await sender.send(
    {
      endpoint: "https://fcm.googleapis.com/fcm/send/controlled-fixture",
      p256dh: recipientPublic.toString("base64url"),
      auth: auth.toString("base64url"),
    },
    "social",
  );
  assert.equal(observed.length, 1);
  assert.equal(observed[0].init.headers["Content-Encoding"], "aes128gcm");
  assert.equal(observed[0].init.headers.TTL, "3600");
  assert.match(observed[0].init.headers.Authorization, /^vapid t=.+, k=.+$/);
  const jwt =
    observed[0].init.headers.Authorization.match(/^vapid t=([^,]+),/)[1];
  const claims = JSON.parse(Buffer.from(jwt.split(".")[1], "base64url"));
  assert.equal(claims.aud, "https://fcm.googleapis.com");
  assert.ok(claims.exp <= Math.floor(Date.now() / 1000) + 3600);
  assert.equal(claims.sub, "mailto:push@example.test");
  assert.ok(observed[0].init.body.byteLength < 4096);
  process.stdout.write(
    "PASS VAPID origin, generic encrypted payload and provider request\n",
  );
} finally {
  globalThis.fetch = originalFetch;
}

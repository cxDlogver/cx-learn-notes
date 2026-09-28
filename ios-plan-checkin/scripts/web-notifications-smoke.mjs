import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHash, createECDH, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import process from "node:process";
import { URL } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { NotificationsService } from "../apps/api/dist/social/notifications.service.js";
import { enqueueSocialNotification } from "../apps/api/dist/social/notification-jobs.js";
import {
  claimWebPush,
  processWebPush,
} from "../apps/worker/dist/webNotifications.js";
import { WebPushError } from "../apps/worker/dist/webPush.js";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(
  await readFile(new URL("db/migrations/manifest.json", root), "utf8"),
);
const pg = new PGlite();
let checks = 0;
function check(name, actual, expected) {
  assert.deepEqual(actual, expected, name);
  checks++;
  process.stdout.write(`PASS ${name}\n`);
}
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
  const secret = createHash("sha256").update("web-notification-test").digest();
  const service = new NotificationsService(database, {
    authIdempotencyKey: Buffer.alloc(32, 6),
    pushTokenEncryptionKey: secret,
  });
  const users = [];
  for (const name of ["webnotify_a", "webnotify_b"])
    users.push(
      (
        await pg.query(
          "INSERT INTO users(phone_ciphertext,phone_lookup_hash,username) VALUES($1,$2,$3) RETURNING id",
          [Buffer.from(randomUUID()), Buffer.from(randomUUID()), name],
        )
      ).rows[0].id,
    );
  const [alice, bob] = users;
  const oldIos = await service.getPreferences(alice);
  const initialWeb = await service.getWebPreferences(alice);
  check("Web default is independent from iOS", initialWeb.planEnabled, true);
  check("Web social default matches expected", initialWeb.friendRequests, true);
  const changed = await service.updateWebPreferences(
    alice,
    { planEnabled: false, friendRequests: false, baseRevision: 1 },
    randomUUID(),
  );
  check("Web plan delivery can be disabled", changed.planEnabled, false);
  check("Web social delivery can be disabled", changed.friendRequests, false);
  check(
    "iOS preference remains independent",
    await service.getPreferences(alice),
    oldIos,
  );
  check(
    "other account Web preference remains default",
    (await service.getWebPreferences(bob)).planEnabled,
    true,
  );
  let stale = false;
  try {
    await service.updateWebPreferences(
      alice,
      { encouragements: false, baseRevision: 1 },
      randomUUID(),
    );
  } catch (error) {
    stale = error.status === 409;
  }
  check("stale Web revision rejected", stale, true);
  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();
  const endpoint = `https://fcm.googleapis.com/fcm/send/${randomUUID()}`;
  const input = {
    endpoint,
    expirationTime: null,
    keys: {
      p256dh: ecdh.getPublicKey().toString("base64url"),
      auth: Buffer.alloc(16, 7).toString("base64url"),
    },
  };
  const device = `browser-${randomUUID()}`;
  const registered = await service.registerWebPush(
    alice,
    device,
    input,
    randomUUID(),
  );
  check("Web Push subscription registered", registered.registered, true);
  const stored = (
    await pg.query("SELECT * FROM web_push_subscriptions WHERE id=$1", [
      registered.id,
    ])
  ).rows[0];
  check(
    "subscription bound to authenticated browser device",
    stored.browser_device_id,
    device,
  );
  check("subscription bound to account", stored.user_id, alice);
  check(
    "endpoint is encrypted at rest",
    Buffer.from(stored.endpoint_ciphertext).includes(Buffer.from(endpoint)),
    false,
  );
  check(
    "public key is encrypted at rest",
    Buffer.from(stored.p256dh_ciphertext).includes(
      Buffer.from(input.keys.p256dh),
    ),
    false,
  );
  let rejected = false;
  try {
    await service.registerWebPush(
      alice,
      device,
      { ...input, endpoint: "https://127.0.0.1/unsafe" },
      randomUUID(),
    );
  } catch (error) {
    rejected = error.status === 400;
  }
  check("IP endpoint rejected", rejected, true);
  let invalidPoint = false;
  try {
    await service.registerWebPush(
      alice,
      device,
      {
        ...input,
        keys: {
          ...input.keys,
          p256dh: Buffer.concat([Buffer.from([4]), Buffer.alloc(64)]).toString(
            "base64url",
          ),
        },
      },
      randomUUID(),
    );
  } catch (error) {
    invalidPoint = error.status === 400;
  }
  check("off-curve P-256 key rejected", invalidPoint, true);
  const removed = await service.deleteWebPush(alice, device, randomUUID());
  check("Web Push subscription revoked", removed.registered, false);
  check(
    "revocation is persistent",
    (
      await pg.query("SELECT enabled FROM web_push_subscriptions WHERE id=$1", [
        registered.id,
      ])
    ).rows[0].enabled,
    false,
  );
  check(
    "iOS preference still unchanged after Web revoke",
    await service.getPreferences(alice),
    oldIos,
  );
  const bobDevice = `browser-${randomUUID()}`;
  const bobSubscription = await service.registerWebPush(
    bob,
    bobDevice,
    input,
    randomUUID(),
  );
  await pg.query(
    `INSERT INTO sessions(user_id,refresh_hash,device_id,expires_at,client_channel)
     VALUES($1,$2,$3,now()+interval '1 day','web')`,
    [bob, Buffer.from(randomUUID()), bobDevice],
  );
  const addRequest = async () => {
    await pg.query(
      "UPDATE friend_requests SET status='rejected' WHERE sender_id=$1 AND receiver_id=$2 AND status='pending'",
      [alice, bob],
    );
    const requestId = (
      await pg.query(
        "INSERT INTO friend_requests(sender_id,receiver_id) VALUES($1,$2) RETURNING id",
        [alice, bob],
      )
    ).rows[0].id;
    await enqueueSocialNotification(adapt(pg), {
      kind: "friend_request",
      requestId,
      recipientId: bob,
    });
  };
  await addRequest();
  const sent = [];
  const sender = {
    send: async (subscription, kind) => {
      sent.push({ subscription, kind });
    },
  };
  const firstJob = await claimWebPush(adapt(pg));
  check("social event enqueues Web Push", firstJob.payload.kind, "social");
  await processWebPush(adapt(pg), sender, firstJob, secret);
  check("provider accepted one Web device", sent.length, 1);
  check("payload category is generic social", sent[0].kind, "social");
  await processWebPush(adapt(pg), sender, firstJob, secret);
  check("provider acceptance is idempotent per job and device", sent.length, 1);
  check(
    "delivery row tracks accepted subscription",
    (
      await pg.query(
        "SELECT count(*)::int AS n FROM web_push_deliveries WHERE subscription_id=$1",
        [bobSubscription.id],
      )
    ).rows[0].n,
    1,
  );
  await service.updateWebPreferences(
    bob,
    { friendRequests: false, baseRevision: 1 },
    randomUUID(),
  );
  await addRequest();
  const mutedJob = await claimWebPush(adapt(pg));
  await processWebPush(adapt(pg), sender, mutedJob, secret);
  check("Web social switch suppresses provider send", sent.length, 1);
  await service.updateWebPreferences(
    bob,
    { friendRequests: true, baseRevision: 2 },
    randomUUID(),
  );
  await addRequest();
  const expiredJob = await claimWebPush(adapt(pg));
  await processWebPush(
    adapt(pg),
    {
      send: async () => {
        throw new WebPushError(410);
      },
    },
    expiredJob,
    secret,
  );
  check(
    "410 clears expired subscription",
    (
      await pg.query("SELECT enabled FROM web_push_subscriptions WHERE id=$1", [
        bobSubscription.id,
      ])
    ).rows[0].enabled,
    false,
  );
  check(
    "permanent failure does not retry expired endpoint",
    (
      await pg.query("SELECT status FROM worker_jobs WHERE id=$1", [
        expiredJob.id,
      ])
    ).rows[0].status,
    "succeeded",
  );
  await service.registerWebPush(bob, bobDevice, input, randomUUID());
  await addRequest();
  const transientJob = await claimWebPush(adapt(pg));
  let transientRejected = false;
  try {
    await processWebPush(
      adapt(pg),
      {
        send: async () => {
          throw new WebPushError(503);
        },
      },
      transientJob,
      secret,
    );
  } catch (error) {
    transientRejected = error instanceof WebPushError && error.status === 503;
  }
  check("503 reported for retry", transientRejected, true);
  check(
    "503 persisted retryable failed job",
    (
      await pg.query(
        "SELECT status,last_error_code FROM worker_jobs WHERE id=$1",
        [transientJob.id],
      )
    ).rows[0],
    { status: "failed", last_error_code: "WEB_PUSH_RETRYABLE" },
  );
  await pg.query(
    "UPDATE worker_jobs SET run_after=now()-interval '1 second' WHERE id=$1",
    [transientJob.id],
  );
  const retried = await claimWebPush(adapt(pg));
  check("503 job reclaimed after backoff", retried.id, transientJob.id);
  await processWebPush(adapt(pg), sender, retried, secret);
  check("retry accepted after provider recovered", sent.length, 2);
  check(
    "recovered job marked succeeded",
    (await pg.query("SELECT status FROM worker_jobs WHERE id=$1", [retried.id]))
      .rows[0].status,
    "succeeded",
  );
  process.stdout.write(`WEB-NOTIFICATIONS-SMOKE checks=${checks}\n`);
} finally {
  await pg.close();
}

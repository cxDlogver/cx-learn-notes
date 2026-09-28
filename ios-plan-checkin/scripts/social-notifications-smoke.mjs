import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import process from "node:process";
import { URL } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { SocialService } from "../apps/api/dist/social/social.service.js";
import { SharesService } from "../apps/api/dist/social/shares.service.js";
import { EncouragementsService } from "../apps/api/dist/social/encouragements.service.js";
import { NotificationsService } from "../apps/api/dist/social/notifications.service.js";
import {
  ApnsError,
  claimSocialNotification,
  processSocialNotification,
} from "../apps/worker/dist/socialNotifications.js";
import {
  addCalendarDays,
  businessDateAt,
} from "../packages/domain/dist/index.js";

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
  const key = createHash("sha256").update("local-soc05-test-secret").digest();
  const config = {
    authIdempotencyKey: Buffer.alloc(32, 9),
    pushTokenEncryptionKey: key,
  };
  const social = new SocialService(database, config);
  const shares = new SharesService(database, config);
  const encouragements = new EncouragementsService(database, config);
  const notifications = new NotificationsService(database, config);
  const users = [];
  for (const username of ["alice", "bob", "charlie"])
    users.push(
      (
        await pg.query(
          "INSERT INTO users(phone_ciphertext,phone_lookup_hash,username) VALUES($1,$2,$3) RETURNING id",
          [Buffer.from(randomUUID()), Buffer.from(randomUUID()), username],
        )
      ).rows[0].id,
    );
  const [alice, bob, charlie] = users;
  const devices = new Map();
  for (const [user, token] of [
    [alice, "a".repeat(64)],
    [bob, "b".repeat(64)],
  ]) {
    const deviceId = randomUUID();
    devices.set(user, deviceId);
    assert.deepEqual(
      await notifications.register(user, {
        deviceId,
        platform: "ios",
        token,
        enabled: true,
      }),
      { deviceId, registered: true },
    );
    const stored = (
      await pg.query(
        "SELECT apns_token_ciphertext,push_token_hash FROM devices WHERE id=$1",
        [deviceId],
      )
    ).rows[0];
    assert.ok(stored.apns_token_ciphertext.length > 64);
    assert.ok(
      !Buffer.from(stored.apns_token_ciphertext).includes(Buffer.from(token)),
    );
    assert.ok(!Buffer.from(stored.push_token_hash).equals(Buffer.from(token)));
    await pg.query(
      "INSERT INTO sessions(user_id,refresh_hash,device_id,expires_at) VALUES($1,$2,$3,now()+interval '1 day')",
      [user, Buffer.from(randomUUID()), deviceId],
    );
  }
  const pushes = [];
  const sender = {
    send: async (token, alert, collapseId) => {
      pushes.push({ token, alert, collapseId });
      return { apnsId: randomUUID() };
    },
  };
  const request = await social.request(alice, bob, randomUUID());
  const requestJob = await claimSocialNotification(adapt(pg));
  assert.equal(requestJob.payload.kind, "friend_request");
  await processSocialNotification(adapt(pg), sender, requestJob, key);
  assert.equal(pushes.length, 1);
  assert.equal(pushes[0].token, "b".repeat(64));
  await processSocialNotification(adapt(pg), sender, requestJob, key);
  assert.equal(pushes.length, 1, "accepted device is not sent twice");
  await social.accept(bob, request.id, randomUUID());
  const today = businessDateAt(new Date(), "Asia/Shanghai");
  const start = addCalendarDays(today, -4);
  const planId = (
    await pg.query(
      "INSERT INTO plans(owner_id,kind,direction,title,timezone,start_date) VALUES($1,'fixed','do','跑步','Asia/Shanghai',$2) RETURNING id",
      [alice, start],
    )
  ).rows[0].id;
  const ruleId = (
    await pg.query(
      "INSERT INTO plan_rule_versions(plan_id,version,effective_date,weekdays) VALUES($1,1,$2,ARRAY[1,2,3,4,5,6,7]::smallint[]) RETURNING id",
      [planId, start],
    )
  ).rows[0].id;
  const checkinId = (
    await pg.query(
      "INSERT INTO checkins(plan_id,owner_id,business_date,result,note,numeric_value,numeric_unit,rule_version_id) VALUES($1,$2,$3,'success','私人备注',42,'kg',$4) RETURNING id",
      [planId, alice, addCalendarDays(today, -1), ruleId],
    )
  ).rows[0].id;
  const preview = await shares.preview(alice, planId, bob, today.slice(0, 7));
  const granted = await shares.share(
    alice,
    planId,
    bob,
    preview.previewToken,
    randomUUID(),
  );
  const shareJob = await claimSocialNotification(adapt(pg));
  assert.equal(shareJob.payload.kind, "plan_share");
  assert.equal(
    (await shares.sharedHistory(bob, planId, today.slice(0, 7))).entries.find(
      (entry) => entry.checkinId === checkinId,
    )?.status,
    "success",
  );
  await shares.revoke(alice, planId, bob, randomUUID());
  await processSocialNotification(adapt(pg), sender, shareJob, key);
  assert.equal(
    pushes.length,
    1,
    "revoked share cannot emit queued notification",
  );
  await assert.rejects(
    encouragements.create(
      bob,
      checkinId,
      { kind: "emoji", body: "👏" },
      randomUUID(),
    ),
    /已无法查看/,
  );
  const nextPreview = await shares.preview(
    alice,
    planId,
    bob,
    today.slice(0, 7),
  );
  await shares.share(
    alice,
    planId,
    bob,
    nextPreview.previewToken,
    randomUUID(),
  );
  const newShareJob = await claimSocialNotification(adapt(pg));
  assert.notEqual(newShareJob.payload.revision, granted.revision);
  await processSocialNotification(adapt(pg), sender, newShareJob, key);
  assert.equal(pushes.length, 2);
  const postKey = randomUUID();
  const posted = await encouragements.create(
    bob,
    checkinId,
    { kind: "emoji", body: "👏" },
    postKey,
  );
  assert.deepEqual(
    await encouragements.create(
      bob,
      checkinId,
      { kind: "emoji", body: "👏" },
      postKey,
    ),
    posted,
  );
  assert.equal((await encouragements.list(alice, checkinId)).length, 1);
  assert.equal((await encouragements.list(bob, checkinId)).length, 1);
  await assert.rejects(encouragements.list(charlie, checkinId), /已无法查看/);
  await assert.rejects(
    encouragements.create(
      alice,
      checkinId,
      { kind: "emoji", body: "👏" },
      randomUUID(),
    ),
    /不能给自己的记录/,
  );
  const encouragementJob = await claimSocialNotification(adapt(pg));
  assert.equal(encouragementJob.payload.kind, "encouragement");
  const prefs = await notifications.getPreferences(alice);
  const prefKey = randomUUID();
  const disabled = await notifications.updatePreferences(
    alice,
    { baseRevision: prefs.revision, encouragements: false },
    prefKey,
  );
  assert.deepEqual(
    await notifications.updatePreferences(
      alice,
      { baseRevision: prefs.revision, encouragements: false },
      prefKey,
    ),
    disabled,
  );
  await assert.rejects(
    notifications.updatePreferences(
      alice,
      { baseRevision: prefs.revision, encouragements: true },
      randomUUID(),
    ),
    /已变化/,
  );
  await processSocialNotification(adapt(pg), sender, encouragementJob, key);
  assert.equal(
    pushes.length,
    2,
    "independent notification preference suppresses push",
  );
  await shares.revoke(alice, planId, bob, randomUUID());
  await assert.rejects(encouragements.list(bob, checkinId), /已无法查看/);
  assert.equal((await encouragements.list(alice, checkinId)).length, 1);
  assert.ok(
    pushes.every(
      ({ alert }) =>
        !JSON.stringify(alert).includes("私人备注") &&
        !JSON.stringify(alert).includes("42") &&
        !JSON.stringify(alert).includes("👏"),
    ),
  );
  await social.request(charlie, bob, randomUUID());
  const retryJob = await claimSocialNotification(adapt(pg));
  await assert.rejects(
    processSocialNotification(
      adapt(pg),
      {
        send: async () => {
          throw new ApnsError(500, "InternalServerError");
        },
      },
      retryJob,
      key,
    ),
    /APNs 500/,
  );
  assert.equal(
    (
      await pg.query(
        "SELECT status,last_error_code FROM worker_jobs WHERE id=$1",
        [retryJob.id],
      )
    ).rows[0].last_error_code,
    "APNS_RETRYABLE",
  );
  await pg.query("UPDATE worker_jobs SET run_after=now() WHERE id=$1", [
    retryJob.id,
  ]);
  const retried = await claimSocialNotification(adapt(pg));
  await processSocialNotification(adapt(pg), sender, retried, key);
  assert.equal(pushes.length, 3, "transient APNs failure is retried once");
  const charlieRequest = await social.request(charlie, alice, randomUUID());
  const invalidJob = await claimSocialNotification(adapt(pg));
  await processSocialNotification(
    adapt(pg),
    {
      send: async () => {
        throw new ApnsError(410, "Unregistered");
      },
    },
    invalidJob,
    key,
  );
  assert.equal(
    (
      await pg.query("SELECT notifications_enabled FROM devices WHERE id=$1", [
        devices.get(alice),
      ])
    ).rows[0].notifications_enabled,
    false,
  );
  await social.accept(alice, charlieRequest.id, randomUUID());
  const thirdPreview = await shares.preview(
    alice,
    planId,
    charlie,
    today.slice(0, 7),
  );
  await shares.share(
    alice,
    planId,
    charlie,
    thirdPreview.previewToken,
    randomUUID(),
  );
  assert.deepEqual(
    await encouragements.list(charlie, checkinId),
    [],
    "another authorized friend cannot read Bob's message",
  );
  process.stdout.write(
    "social notifications smoke: scoped messages, revocation, preferences, queue and private payload passed\n",
  );
} finally {
  await pg.close();
}

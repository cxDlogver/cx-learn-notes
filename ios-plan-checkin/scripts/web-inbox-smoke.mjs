import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import process from "node:process";
import { URL } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { PlansService } from "../apps/api/dist/plans/plans.service.js";
import { RecordsService } from "../apps/api/dist/records/records.service.js";
import { EncouragementsService } from "../apps/api/dist/social/encouragements.service.js";
import { InboxService } from "../apps/api/dist/social/inbox.service.js";
import { enqueueSocialNotification } from "../apps/api/dist/social/notification-jobs.js";
import { SharesService } from "../apps/api/dist/social/shares.service.js";
import { SocialService } from "../apps/api/dist/social/social.service.js";
import { businessDateAt } from "../packages/domain/dist/index.js";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(
  await readFile(new URL("db/migrations/manifest.json", root), "utf8"),
);
const pg = new PGlite();
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
const config = { authIdempotencyKey: Buffer.alloc(32, 13) };
const social = new SocialService(database, config);
const shares = new SharesService(database, config);
const plans = new PlansService(database, config);
const records = new RecordsService(database, config);
const encouragements = new EncouragementsService(database, config);
const inbox = new InboxService(database, config);
const secondBrowser = new InboxService(database, config);
const count = async (userId, eventType) =>
  Number(
    (
      await pg.query(
        "SELECT count(*)::text AS n FROM inbox_messages WHERE recipient_user_id=$1 AND event_type=$2",
        [userId, eventType],
      )
    ).rows[0].n,
  );
try {
  for (const migration of manifest.migrations)
    await pg.exec(
      await readFile(new URL(`db/migrations/${migration.file}`, root), "utf8"),
    );
  const users = {};
  for (const alias of ["a", "b", "c", "d"]) {
    users[alias] = (
      await pg.query(
        `INSERT INTO users (phone_ciphertext,phone_lookup_hash,username,nickname)
       VALUES ($1,$2,$3,$4) RETURNING id`,
        [
          Buffer.from(randomUUID()),
          Buffer.from(randomUUID()),
          `atdd_inbox_${alias}`,
          alias,
        ],
      )
    ).rows[0].id;
  }
  const { a, b, c, d } = users;
  const requestKey = randomUUID();
  const request = await social.request(a, b, requestKey);
  assert.deepEqual(await social.request(a, b, requestKey), request);
  assert.equal(await count(b, "friend_request"), 1);
  await database.transaction((client) =>
    enqueueSocialNotification(client, {
      kind: "friend_request",
      requestId: request.id,
      recipientId: b,
    }),
  );
  assert.equal(await count(b, "friend_request"), 1);
  assert.equal((await inbox.list(b)).messages[0].canOpen, true);
  await social.accept(b, request.id, randomUUID());
  assert.equal(await count(a, "friend_accepted"), 1);
  assert.equal((await secondBrowser.list(b)).messages[0].canOpen, false);

  const today = businessDateAt(new Date(), "Asia/Shanghai");
  const plan = await plans.create(
    a,
    {
      kind: "fixed",
      direction: "do",
      title: "隔离分享",
      timezone: "Asia/Shanghai",
      startDate: today,
      rule: { weekdays: [1, 2, 3, 4, 5, 6, 7] },
    },
    randomUUID(),
  );
  const preview = await shares.preview(a, plan.id, b, today.slice(0, 7));
  const grantKey = randomUUID();
  const granted = await shares.share(
    a,
    plan.id,
    b,
    preview.previewToken,
    grantKey,
  );
  assert.deepEqual(
    await shares.share(a, plan.id, b, preview.previewToken, grantKey),
    granted,
  );
  assert.equal(await count(b, "share"), 1);
  assert.equal((await inbox.list(b)).messages[0].canOpen, true);
  const checkin = await records.put(
    a,
    plan.id,
    today,
    {
      result: "success",
      note: "只在分享详情可见的备注",
      baseRevision: 0,
      clientCreatedAt: new Date().toISOString(),
      clientOperationId: randomUUID(),
      ruleVersion: 1,
    },
    randomUUID(),
  );
  assert.equal(await count(b, "shared_update"), 1);
  assert.equal(JSON.stringify(await inbox.list(b)).includes("只在分享"), false);
  await encouragements.create(
    b,
    checkin.id,
    { kind: "message", body: "继续加油" },
    randomUUID(),
  );
  assert.equal(await count(a, "encouragement"), 1);
  assert.equal(JSON.stringify(await inbox.list(a)).includes("继续加油"), false);

  const firstPage = await inbox.list(b, undefined, "1");
  assert.equal(firstPage.messages.length, 1);
  assert.equal(firstPage.hasMore, true);
  assert.ok(firstPage.nextCursor);
  const secondPage = await secondBrowser.list(b, firstPage.nextCursor, "1");
  assert.equal(secondPage.messages.length, 1);
  assert.notEqual(secondPage.messages[0].id, firstPage.messages[0].id);
  await assert.rejects(
    inbox.list(c, firstPage.nextCursor, "1"),
    /消息游标无效/,
  );
  await assert.rejects(
    inbox.list(b, `${firstPage.nextCursor}x`, "1"),
    /消息游标无效/,
  );
  const readKey = randomUUID();
  const read = await inbox.markRead(b, firstPage.messages[0].id, readKey);
  assert.deepEqual(
    await inbox.markRead(b, firstPage.messages[0].id, readKey),
    read,
  );
  assert.equal((await secondBrowser.list(b)).messages[0].readAt, read.readAt);
  await assert.rejects(
    inbox.markRead(c, firstPage.messages[0].id, randomUUID()),
    /消息不存在/,
  );

  await shares.revoke(a, plan.id, b, randomUUID());
  const revoked = await secondBrowser.list(b);
  assert.equal(
    revoked.messages.find((message) => message.eventType === "share").canOpen,
    false,
  );
  assert.equal(
    revoked.messages.find((message) => message.eventType === "shared_update")
      .subjectId,
    null,
  );
  await assert.rejects(shares.sharedPlan(b, plan.id), /分享已撤销/);
  await social.block(a, d, randomUUID());
  await assert.rejects(
    social.request(d, a, randomUUID()),
    /无法向该用户发送好友申请/,
  );
  assert.equal((await inbox.list(c)).messages.length, 0);
  assert.equal((await inbox.list(d)).messages.length, 0);
  process.stdout.write(
    `${JSON.stringify({
      users: 4,
      friendRequestMessages: await count(b, "friend_request"),
      friendAcceptedMessages: await count(a, "friend_accepted"),
      shareMessages: await count(b, "share"),
      sharedUpdateMessages: await count(b, "shared_update"),
      encouragementMessages: await count(a, "encouragement"),
      pagination: true,
      crossBrowserRead: true,
      dedupe: true,
      revokedSubjectHidden: true,
      strangerAndBlockedEmpty: true,
    })}\n`,
  );
} finally {
  await pg.close();
}

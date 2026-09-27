import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import process from "node:process";
import { URL } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { SocialService } from "../apps/api/dist/social/social.service.js";
import { SharesService } from "../apps/api/dist/social/shares.service.js";
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
  const config = { authIdempotencyKey: Buffer.alloc(32, 9) };
  const social = new SocialService(database, config);
  const shares = new SharesService(database, config);
  const ids = [];
  for (const username of ["alice", "bob", "charlie"])
    ids.push(
      (
        await pg.query(
          `INSERT INTO users (phone_ciphertext, phone_lookup_hash, username)
       VALUES ($1, $2, $3) RETURNING id`,
          [Buffer.from(randomUUID()), Buffer.from(randomUUID()), username],
        )
      ).rows[0].id,
    );
  const [alice, bob, charlie] = ids;
  const today = businessDateAt(new Date(), "Asia/Shanghai");
  const startDate = addCalendarDays(today, -5);
  const recordDate = addCalendarDays(today, -3);
  const month = recordDate.slice(0, 7);
  const planId = (
    await pg.query(
      `INSERT INTO plans (owner_id, kind, direction, title, timezone, start_date)
     VALUES ($1, 'fixed', 'do', '跑步', 'Asia/Shanghai', $2) RETURNING id`,
      [alice, startDate],
    )
  ).rows[0].id;
  const ruleId = (
    await pg.query(
      `INSERT INTO plan_rule_versions (plan_id, version, effective_date, weekdays)
     VALUES ($1, 1, $2, ARRAY[1,2,3,4,5,6,7]::smallint[]) RETURNING id`,
      [planId, startDate],
    )
  ).rows[0].id;
  await pg.query(
    `INSERT INTO checkins (plan_id, owner_id, business_date, result, note,
      failure_reason, numeric_value, numeric_unit, rule_version_id)
     VALUES ($1, $2, $3, 'failure', '私人文字但可分享', '天气原因', 42, 'kg', $4)`,
    [planId, alice, recordDate, ruleId],
  );
  await assert.rejects(shares.sharedPlan(bob, planId), /可分享的好友/);
  const request = await social.request(alice, bob, randomUUID());
  await social.accept(bob, request.id, randomUUID());
  await assert.rejects(shares.sharedPlan(bob, planId), /分享已撤销/);
  await assert.rejects(
    shares.preview(charlie, planId, bob, month),
    /计划不存在/,
  );
  const preview = await shares.preview(alice, planId, bob, month);
  assert.match(preview.disclosure, /历史失败原因/);
  assert.equal(
    preview.entries.find((entry) => entry.businessDate === recordDate).note,
    "私人文字但可分享",
  );
  assert.ok(preview.entries.some((entry) => entry.status === "unrecorded"));
  assert.ok(!JSON.stringify(preview).includes("numericValue"));
  assert.ok(!JSON.stringify(preview).includes("mediaIds"));
  await assert.rejects(
    shares.share(alice, planId, bob, "bad", randomUUID()),
    /分享预览凭证无效/,
  );
  await pg.query(
    "UPDATE checkins SET note = '修订后的内容', revision = 2, updated_at = now() WHERE plan_id = $1",
    [planId],
  );
  await assert.rejects(
    shares.share(alice, planId, bob, preview.previewToken, randomUUID()),
    /重新预览/,
  );
  const refreshed = await shares.preview(alice, planId, bob, month);
  const key = randomUUID();
  const granted = await shares.share(
    alice,
    planId,
    bob,
    refreshed.previewToken,
    key,
  );
  assert.deepEqual(
    await shares.share(alice, planId, bob, refreshed.previewToken, key),
    granted,
  );
  assert.equal((await shares.listFriendPlans(bob, alice)).length, 1);
  assert.equal((await shares.listShares(alice, planId)).length, 1);
  assert.equal((await shares.sharedPlan(bob, planId)).title, "跑步");
  assert.equal(
    (await shares.sharedHistory(bob, planId, month)).entries.find(
      (entry) => entry.businessDate === recordDate,
    ).note,
    "修订后的内容",
  );
  await assert.rejects(
    shares.sharedHistory(charlie, planId, month),
    /可分享的好友/,
  );
  assert.ok(
    !JSON.stringify(await shares.sharedHistory(bob, planId, month)).includes(
      "numeric",
    ),
  );
  const weeklyId = (
    await pg.query(
      `INSERT INTO plans (owner_id, kind, direction, title, timezone, start_date)
     VALUES ($1, 'weekly', 'do', '每周阅读', 'Asia/Shanghai', $2) RETURNING id`,
      [alice, startDate],
    )
  ).rows[0].id;
  await pg.query(
    `INSERT INTO plan_rule_versions (plan_id, version, effective_date, weekly_target)
     VALUES ($1, 1, $2, 3)`,
    [weeklyId, startDate],
  );
  const weeklyPreview = await shares.preview(
    alice,
    weeklyId,
    bob,
    today.slice(0, 7),
  );
  assert.equal(weeklyPreview.plan.progress.kind, "weekly");
  assert.ok(weeklyPreview.weeklySummaries.length >= 1);
  assert.equal(weeklyPreview.weeklySummaries.at(-1).target, 3);

  const oneTimeId = (
    await pg.query(
      `INSERT INTO plans (owner_id, kind, direction, title, timezone, start_date, due_date)
     VALUES ($1, 'one_time', 'do', '一次性任务', 'Asia/Shanghai', $2, $3) RETURNING id`,
      [alice, startDate, addCalendarDays(today, -1)],
    )
  ).rows[0].id;
  await pg.query(
    `INSERT INTO plan_rule_versions (plan_id, version, effective_date)
     VALUES ($1, 1, $2)`,
    [oneTimeId, startDate],
  );
  await pg.query(
    `INSERT INTO one_time_resolutions (plan_id, resolution, resolved_business_date, resolved_at, note)
     VALUES ($1, 'completed', $2, now(), '延期完成说明')`,
    [oneTimeId, today],
  );
  const oneTimePreview = await shares.preview(
    alice,
    oneTimeId,
    bob,
    today.slice(0, 7),
  );
  assert.equal(oneTimePreview.plan.progress.state, "late_completed");
  assert.equal(
    oneTimePreview.entries.find((entry) => entry.businessDate === today).note,
    "延期完成说明",
  );
  await shares.revoke(alice, planId, bob, randomUUID());
  await assert.rejects(shares.sharedPlan(bob, planId), /分享已撤销/);
  assert.equal((await shares.listFriendPlans(bob, alice)).length, 0);
  assert.ok(
    (
      await pg.query(
        "SELECT 1 FROM change_log WHERE user_id = $1 AND entity_type = 'share' AND operation = 'revoke'",
        [bob],
      )
    ).rows.length,
  );
  await social.block(alice, bob, randomUUID());
  await assert.rejects(
    shares.preview(alice, planId, bob, month),
    /可分享的好友/,
  );
  process.stdout.write("Share authorization smoke passed.\n");
} finally {
  await pg.close();
}

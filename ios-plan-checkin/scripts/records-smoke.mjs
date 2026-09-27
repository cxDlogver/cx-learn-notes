import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import process from "node:process";
import { URL } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { PlansService } from "../apps/api/dist/plans/plans.service.js";
import { RecordsService } from "../apps/api/dist/records/records.service.js";
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
  const plans = new PlansService(database, config);
  const records = new RecordsService(database, config);
  const owner = (
    await pg.query(
      "INSERT INTO users (phone_ciphertext, phone_lookup_hash) VALUES (decode('11','hex'), decode('12','hex')) RETURNING id",
    )
  ).rows[0].id;
  const outsider = (
    await pg.query(
      "INSERT INTO users (phone_ciphertext, phone_lookup_hash) VALUES (decode('13','hex'), decode('14','hex')) RETURNING id",
    )
  ).rows[0].id;
  const today = businessDateAt(new Date(), "Asia/Shanghai");
  const yesterday = addCalendarDays(today, -1);
  const plan = await plans.create(
    owner,
    {
      kind: "fixed",
      direction: "avoid",
      title: "不吸烟",
      timezone: "Asia/Shanghai",
      startDate: yesterday,
      rule: { weekdays: [1, 2, 3, 4, 5, 6, 7] },
    },
    randomUUID(),
  );
  const request = (overrides = {}) => ({
    result: "success",
    baseRevision: 0,
    clientCreatedAt: new Date().toISOString(),
    clientOperationId: randomUUID(),
    ruleVersion: 1,
    ...overrides,
  });
  const firstInput = request();
  const key = randomUUID();
  const first = await records.put(owner, plan.id, today, firstInput, key);
  assert.equal(first.revision, 1);
  assert.equal(first.isBackfilled, false);
  assert.deepEqual(
    await records.put(owner, plan.id, today, firstInput, key),
    first,
  );
  assert.equal(
    (await records.get(owner, plan.id, today)).syncSequence,
    first.syncSequence,
  );
  await assert.rejects(records.get(outsider, plan.id, today), /计划不存在/);
  await assert.rejects(
    records.put(
      owner,
      plan.id,
      addCalendarDays(today, 1),
      request(),
      randomUUID(),
    ),
    /不能记录未来日期/,
  );
  const conflicting = request({ result: "failure", baseRevision: 0 });
  let conflict;
  try {
    await records.put(owner, plan.id, today, conflicting, randomUUID());
  } catch (error) {
    conflict = error.getResponse().details;
  }
  assert.equal(conflict.currentRevision, 1);
  assert.equal(conflict.serverRecord.result, "success");
  const revised = await records.put(
    owner,
    plan.id,
    today,
    request({
      result: "failure",
      failureReason: "吸烟了",
      note: "晚间",
      baseRevision: 1,
      resolutionOfConflictId: conflict.conflictId,
    }),
    randomUUID(),
  );
  assert.equal(revised.revision, 2);
  assert.equal(revised.isRevised, true);
  assert.equal(revised.failureReason, "吸烟了");
  const audit = (
    await pg.query(
      "SELECT revision, reason, before_snapshot, after_snapshot, resolution_of_conflict_id FROM checkin_revisions WHERE checkin_id = $1 ORDER BY revision",
      [first.id],
    )
  ).rows;
  assert.deepEqual(
    audit.map((row) => row.reason),
    ["create", "conflict_resolution"],
  );
  assert.equal(audit[1].before_snapshot.result, "success");
  assert.equal(audit[1].after_snapshot.result, "failure");
  assert.equal(audit[1].resolution_of_conflict_id, conflict.conflictId);
  const backfill = await records.put(
    owner,
    plan.id,
    yesterday,
    request({ mediaIds: [randomUUID()] }),
    randomUUID(),
  );
  assert.equal(backfill.isBackfilled, true);
  assert.equal(backfill.mediaAttachFailed, true);
  assert.equal(
    (await records.get(owner, plan.id, yesterday)).result,
    "success",
  );
  const changedPlan = await plans.update(
    owner,
    plan.id,
    { rule: { weekdays: [1, 3, 5] }, baseRevision: 1 },
    randomUUID(),
  );
  assert.equal(changedPlan.ruleVersion, 2);
  await assert.rejects(
    records.put(
      owner,
      plan.id,
      today,
      request({ baseRevision: 2, ruleVersion: 2 }),
      randomUUID(),
    ),
    /计划规则已变化/,
  );
  const corrected = await records.put(
    owner,
    plan.id,
    today,
    request({ result: "success", baseRevision: 2 }),
    randomUUID(),
  );
  assert.equal(corrected.revision, 3);
  const paused = await plans.lifecycle(
    owner,
    plan.id,
    "pause",
    2,
    randomUUID(),
  );
  assert.equal(paused.lifecycle, "paused");
  const revisedDuringPause = await records.put(
    owner,
    plan.id,
    today,
    request({ result: "failure", baseRevision: 3 }),
    randomUUID(),
  );
  assert.equal(revisedDuringPause.revision, 4);
  const pausedPlan = await plans.create(
    owner,
    {
      kind: "weekly",
      direction: "do",
      title: "运动",
      timezone: "Asia/Shanghai",
      startDate: yesterday,
      rule: { weeklyTarget: 3 },
    },
    randomUUID(),
  );
  const weeklySkip = await records.put(
    owner,
    pausedPlan.id,
    yesterday,
    request({ result: "skip", numeric: { value: "2.50", unit: "公里" } }),
    randomUUID(),
  );
  assert.equal(weeklySkip.result, "skip");
  assert.deepEqual(weeklySkip.numeric, { value: "2.500000", unit: "公里" });
  await plans.lifecycle(owner, pausedPlan.id, "pause", 1, randomUUID());
  await assert.rejects(
    records.put(owner, pausedPlan.id, today, request(), randomUUID()),
    /此日期不在可记录范围/,
  );
  const oneTime = await plans.create(
    owner,
    {
      kind: "one_time",
      direction: "do",
      title: "交稿",
      timezone: "Asia/Shanghai",
      dueDate: today,
    },
    randomUUID(),
  );
  const failed = await records.resolveOneTime(
    owner,
    oneTime.id,
    { resolution: "failed", reason: "错过", baseRevision: 0 },
    randomUUID(),
    false,
  );
  assert.equal(failed.revision, 1);
  await assert.rejects(
    records.resolveOneTime(
      owner,
      oneTime.id,
      { resolution: "completed", baseRevision: 0 },
      randomUUID(),
      false,
    ),
    /终态记录已变化/,
  );
  const correctedOneTime = await records.resolveOneTime(
    owner,
    oneTime.id,
    {
      resolution: "completed",
      completedAt: new Date().toISOString(),
      baseRevision: 1,
    },
    randomUUID(),
    true,
  );
  assert.equal(correctedOneTime.revision, 2);
  assert.equal(correctedOneTime.timing, "on_time");
  assert.equal(
    (
      await pg.query(
        "SELECT count(*)::integer AS n FROM one_time_resolution_revisions WHERE plan_id = $1",
        [oneTime.id],
      )
    ).rows[0].n,
    2,
  );
  assert.equal(
    (
      await pg.query(
        "SELECT count(*)::integer AS n FROM checkins WHERE plan_id = $1 AND business_date = $2",
        [plan.id, today],
      )
    ).rows[0].n,
    1,
  );
  process.stdout.write(
    "Records smoke passed: owner scope, one-per-day, conflict selection, backfill, audit, media isolation and one-time correction.\n",
  );
} finally {
  await pg.close();
}

import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import process from "node:process";
import { URL } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { PlansService } from "../apps/api/dist/plans/plans.service.js";
import { RecordsService } from "../apps/api/dist/records/records.service.js";
import { ViewsService } from "../apps/api/dist/views/views.service.js";
import {
  addCalendarDays,
  businessDateAt,
} from "../packages/domain/dist/index.js";

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
const config = { authIdempotencyKey: Buffer.alloc(32, 8) };
const plans = new PlansService(database, config);
const records = new RecordsService(database, config);
const views = new ViewsService(database);
const queryOne = async (sql, params) => (await pg.query(sql, params)).rows[0];
const request = (overrides = {}) => ({
  result: "success",
  baseRevision: 0,
  clientCreatedAt: new Date().toISOString(),
  clientOperationId: randomUUID(),
  ruleVersion: 1,
  ...overrides,
});
const count = async (sql, params) => Number((await queryOne(sql, params)).n);
try {
  for (const migration of manifest.migrations)
    await pg.exec(
      await readFile(new URL(`db/migrations/${migration.file}`, root), "utf8"),
    );
  const owner = (
    await pg.query(
      "INSERT INTO users (phone_ciphertext, phone_lookup_hash) VALUES (decode('31','hex'), decode('32','hex')) RETURNING id",
    )
  ).rows[0].id;
  const today = businessDateAt(new Date(), "Asia/Shanghai");
  const yesterday = addCalendarDays(today, -1);
  const plan = await plans.create(
    owner,
    {
      kind: "fixed",
      direction: "do",
      title: "数值项历史版本",
      timezone: "Asia/Shanghai",
      startDate: yesterday,
      rule: { weekdays: [1, 2, 3, 4, 5, 6, 7] },
      numericItem: { label: "距离", unit: "公里" },
    },
    randomUUID(),
  );
  // Simulate a previously scheduled edit whose effective date is now today.
  await pg.query(
    `INSERT INTO plan_numeric_config_versions
      (plan_id, version, effective_from, label, unit) VALUES ($1,2,$2,'用时','分钟')`,
    [plan.id, today],
  );
  const oldInput = request({ numeric: { value: "2.5", unit: "公里" } });
  const oldKey = randomUUID();
  const old = await records.put(owner, plan.id, yesterday, oldInput, oldKey);
  assert.equal(old.isBackfilled, true);
  assert.deepEqual(old.numeric, {
    value: "2.500000",
    unit: "公里",
    label: "距离",
    configVersion: 1,
  });
  assert.deepEqual(
    await records.put(owner, plan.id, yesterday, oldInput, oldKey),
    old,
  );
  const current = await records.put(
    owner,
    plan.id,
    today,
    request({ numeric: { value: "30", unit: "分钟" } }),
    randomUUID(),
  );
  assert.equal(current.numeric.label, "用时");
  assert.equal(current.numeric.configVersion, 2);
  await assert.rejects(
    records.put(
      owner,
      plan.id,
      today,
      request({ baseRevision: 1, numeric: { value: "3", unit: "公里" } }),
      randomUUID(),
    ),
    /数值项单位已变化/,
  );
  const corrected = await records.put(
    owner,
    plan.id,
    yesterday,
    request({
      baseRevision: 1,
      note: "补记修正",
      numeric: { value: "3", unit: "公里" },
    }),
    randomUUID(),
  );
  assert.equal(corrected.numeric.configVersion, 1);
  assert.equal(corrected.revision, 2);
  const checkinRows = await pg.query(
    `SELECT business_date::text, numeric_value::text, numeric_unit,
      numeric_label, numeric_config_version_id FROM checkins
     WHERE plan_id=$1 ORDER BY business_date`,
    [plan.id],
  );
  assert.equal(checkinRows.rows.length, 2);
  assert.deepEqual(
    checkinRows.rows.map((row) => [
      row.business_date,
      row.numeric_unit,
      row.numeric_label,
    ]),
    [
      [yesterday, "公里", "距离"],
      [today, "分钟", "用时"],
    ],
  );
  const checkinAudit = await pg.query(
    `SELECT revision, before_snapshot, after_snapshot FROM checkin_revisions
     WHERE checkin_id=$1 ORDER BY revision`,
    [old.id],
  );
  assert.equal(checkinAudit.rows.length, 2);
  assert.equal(checkinAudit.rows[1].before_snapshot.numeric.value, "2.500000");
  assert.equal(checkinAudit.rows[1].after_snapshot.numeric.unit, "公里");

  const oneTime = await plans.create(
    owner,
    {
      kind: "one_time",
      direction: "do",
      title: "一次性结果附加内容",
      timezone: "Asia/Shanghai",
      dueDate: today,
      numericItem: { label: "页数", unit: "页" },
    },
    randomUUID(),
  );
  const mediaId = randomUUID();
  await pg.query(
    `INSERT INTO media (id, owner_id, object_key, mime, bytes)
     VALUES ($1,$2,$3,'image/jpeg',128)`,
    [mediaId, owner, `private/${randomUUID()}`],
  );
  const resolutionInput = {
    resolution: "failed",
    baseRevision: 0,
    note: "初稿未完成",
    numeric: { value: "12", unit: "页" },
    mediaIds: [mediaId],
  };
  const resolutionKey = randomUUID();
  const first = await records.resolveOneTime(
    owner,
    oneTime.id,
    resolutionInput,
    resolutionKey,
    false,
  );
  assert.equal(first.note, "初稿未完成");
  assert.equal(first.numeric.label, "页数");
  assert.equal(first.numeric.configVersion, 1);
  assert.deepEqual(first.mediaIds, [mediaId]);
  assert.equal(first.mediaAttachFailed, undefined);
  assert.deepEqual(
    await records.resolveOneTime(
      owner,
      oneTime.id,
      resolutionInput,
      resolutionKey,
      false,
    ),
    first,
  );
  const revised = await records.resolveOneTime(
    owner,
    oneTime.id,
    {
      resolution: "completed",
      completedAt: new Date().toISOString(),
      baseRevision: 1,
      note: "已交稿",
      numeric: { value: "20", unit: "页" },
    },
    randomUUID(),
    true,
  );
  assert.equal(revised.revision, 2);
  assert.deepEqual(revised.mediaIds, [mediaId]);
  const detail = await views.detail(owner, oneTime.id);
  assert.equal(detail.statistics.resolution?.numeric?.label, "页数");
  assert.deepEqual(detail.statistics.resolution?.mediaIds, [mediaId]);
  const oneTimeAudit = await pg.query(
    `SELECT revision, before_snapshot, after_snapshot
     FROM one_time_resolution_revisions WHERE plan_id=$1 ORDER BY revision`,
    [oneTime.id],
  );
  assert.equal(oneTimeAudit.rows.length, 2);
  assert.equal(oneTimeAudit.rows[1].before_snapshot.numeric.value, "12.000000");
  assert.equal(oneTimeAudit.rows[1].after_snapshot.numeric.value, "20.000000");
  assert.equal(
    (
      await queryOne("SELECT one_time_plan_id FROM media WHERE id=$1", [
        mediaId,
      ])
    ).one_time_plan_id,
    oneTime.id,
  );
  const summary = {
    businessDates: [yesterday, today],
    checkins: await count(
      "SELECT count(*)::text AS n FROM checkins WHERE plan_id=$1",
      [plan.id],
    ),
    checkinRevisions: checkinAudit.rows.length,
    oldNumeric: old.numeric,
    newNumeric: current.numeric,
    correctionNumeric: corrected.numeric,
    oneTimeRows: await count(
      "SELECT count(*)::text AS n FROM one_time_resolutions WHERE plan_id=$1",
      [oneTime.id],
    ),
    oneTimeRevisions: oneTimeAudit.rows.length,
    oneTimeMedia: revised.mediaIds.length,
    retryStable: true,
    wrongUnitRejected: true,
    detailConsistent: true,
  };
  process.stdout.write(`${JSON.stringify(summary)}\n`);
} finally {
  await pg.close();
}

import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import process from "node:process";
import { URL } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { GroupsService } from "../apps/api/dist/plans/groups.service.js";
import { PlansService } from "../apps/api/dist/plans/plans.service.js";
import {
  addCalendarDays,
  businessDateAt,
  ruleForDate,
  validatePlanTimeline,
} from "../packages/domain/dist/index.js";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(
  await readFile(new URL("db/migrations/manifest.json", root), "utf8"),
);
const pg = new PGlite();
try {
  for (const migration of manifest.migrations) {
    await pg.exec(
      await readFile(new URL(`db/migrations/${migration.file}`, root), "utf8"),
    );
  }
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
  const config = { authIdempotencyKey: Buffer.alloc(32, 7) };
  const groups = new GroupsService(database, config);
  const plans = new PlansService(database, config);
  const owner = (
    await pg.query(
      "INSERT INTO users (phone_ciphertext, phone_lookup_hash) VALUES (decode('01','hex'), decode('02','hex')) RETURNING id",
    )
  ).rows[0].id;
  const other = (
    await pg.query(
      "INSERT INTO users (phone_ciphertext, phone_lookup_hash) VALUES (decode('03','hex'), decode('04','hex')) RETURNING id",
    )
  ).rows[0].id;
  const groupKey = randomUUID();
  const group = await groups.create(owner, { name: "健康" }, groupKey);
  assert.deepEqual(
    await groups.create(owner, { name: "健康" }, groupKey),
    group,
  );
  await assert.rejects(
    groups.create(owner, { name: "健康" }, randomUUID()),
    /分组名称已存在/,
  );
  const today = businessDateAt(new Date(), "Asia/Shanghai");
  const startDate = addCalendarDays(today, -7);
  const input = {
    kind: "fixed",
    direction: "do",
    title: "跑步",
    timezone: "Asia/Shanghai",
    startDate,
    groupId: group.id,
    rule: { weekdays: [1, 3] },
  };
  const key = randomUUID();
  const created = await plans.create(owner, input, key);
  assert.equal(created.ruleVersion, 1);
  assert.deepEqual(await plans.create(owner, input, key), created);
  await assert.rejects(plans.get(other, created.id), /计划不存在/);
  await assert.rejects(
    plans.create(
      other,
      { ...input, title: "越权", groupId: group.id },
      randomUUID(),
    ),
    /分组不可使用/,
  );
  assert.equal((await plans.list(other)).length, 0);
  await assert.rejects(
    plans.update(
      owner,
      created.id,
      { timezone: "UTC", baseRevision: 1 },
      randomUUID(),
    ),
    /请求字段不正确/,
  );
  const firstEdit = await plans.update(
    owner,
    created.id,
    { rule: { weekdays: [2, 4] }, baseRevision: 1 },
    randomUUID(),
  );
  const secondEdit = await plans.update(
    owner,
    created.id,
    { rule: { weekdays: [5] }, baseRevision: 2 },
    randomUUID(),
  );
  assert.equal(firstEdit.ruleVersion, 2);
  assert.equal(secondEdit.ruleVersion, 3);
  assert.equal(secondEdit.ruleEffectiveDate, addCalendarDays(today, 1));
  await assert.rejects(
    plans.update(
      owner,
      created.id,
      { title: "过期修改", baseRevision: 1 },
      randomUUID(),
    ),
    /计划已在其他设备修改/,
  );
  const rules = (
    await pg.query(
      "SELECT version, effective_date::text, weekdays FROM plan_rule_versions WHERE plan_id = $1 ORDER BY version",
      [created.id],
    )
  ).rows;
  assert.equal(rules.length, 3);
  const timelineRules = rules.map((row) => ({
    kind: "fixed",
    direction: "do",
    version: row.version,
    effectiveDate: row.effective_date,
    weekdays: row.weekdays,
  }));
  validatePlanTimeline({
    timezone: "Asia/Shanghai",
    startDate,
    endDate: null,
    dueDate: null,
    rules: timelineRules,
    lifecycleEvents: [],
  });
  assert.equal(ruleForDate({ rules: timelineRules }, today).version, 1);
  assert.equal(
    ruleForDate({ rules: timelineRules }, addCalendarDays(today, 1)).version,
    3,
  );
  const paused = await plans.lifecycle(
    owner,
    created.id,
    "pause",
    3,
    randomUUID(),
  );
  assert.equal(paused.lifecycle, "paused");
  const resumed = await plans.lifecycle(
    owner,
    created.id,
    "resume",
    4,
    randomUUID(),
  );
  assert.equal(resumed.lifecycle, "active");
  const events = (
    await pg.query(
      "SELECT action, business_date::text FROM plan_lifecycle_events WHERE plan_id = $1 ORDER BY seq",
      [created.id],
    )
  ).rows;
  assert.deepEqual(
    events.map((row) => row.business_date),
    [today, today],
  );
  const oneTime = await plans.create(
    owner,
    {
      kind: "one_time",
      direction: "do",
      title: "提交",
      timezone: "Asia/Shanghai",
      dueDate: today,
    },
    randomUUID(),
  );
  assert.equal(oneTime.startDate, today);
  await assert.rejects(
    plans.create(
      owner,
      {
        kind: "one_time",
        direction: "do",
        title: "过期",
        timezone: "Asia/Shanghai",
        dueDate: addCalendarDays(today, -1),
      },
      randomUUID(),
    ),
    /截止日期不能早于/,
  );
  const removed = await groups.remove(owner, group.id, 1, randomUUID());
  assert.equal(removed.deleted, true);
  assert.equal((await plans.get(owner, created.id)).groupId, null);
  assert.equal((await plans.get(owner, created.id)).revision, 6);
  assert.deepEqual(
    await plans.lifecycle(owner, created.id, "delete", 6, randomUUID()),
    { deleted: true },
  );
  await assert.rejects(plans.get(owner, created.id), /计划不存在/);
  assert.equal(
    (
      await pg.query(
        "SELECT count(*)::integer AS n FROM plan_rule_versions WHERE plan_id = $1",
        [created.id],
      )
    ).rows[0].n,
    3,
  );
  process.stdout.write(
    "Plans smoke passed: ownership, idempotency, grouped CRUD, rule versions, lifecycle and soft delete.\n",
  );
} finally {
  await pg.close();
}

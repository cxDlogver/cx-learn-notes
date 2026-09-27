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
  mondayOfWeek,
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
  const views = new ViewsService(database);
  const owner = (
    await pg.query(
      "INSERT INTO users (phone_ciphertext, phone_lookup_hash) VALUES (decode('21','hex'), decode('22','hex')) RETURNING id",
    )
  ).rows[0].id;
  const outsider = (
    await pg.query(
      "INSERT INTO users (phone_ciphertext, phone_lookup_hash) VALUES (decode('23','hex'), decode('24','hex')) RETURNING id",
    )
  ).rows[0].id;
  const today = businessDateAt(new Date(), "Asia/Shanghai");
  const yesterday = addCalendarDays(today, -1);
  const month = today.slice(0, 7);
  const indexes = (
    await pg.query(
      "SELECT indexname FROM pg_indexes WHERE schemaname = 'public'",
    )
  ).rows.map((row) => row.indexname);
  for (const name of [
    "ix_plans_owner_status",
    "ix_checkins_plan_date",
    "ix_rule_versions_order",
    "ix_lifecycle_plan_date",
  ])
    assert.ok(indexes.includes(name), `Missing aggregation index ${name}`);
  assert.ok(
    (
      await pg.query(
        "EXPLAIN SELECT c.id FROM checkins c WHERE c.plan_id = $1 AND c.business_date BETWEEN $2 AND $3 ORDER BY c.business_date",
        [randomUUID(), yesterday, today],
      )
    ).rows.length,
  );
  assert.deepEqual((await views.today(owner)).items, []);
  const fixed = await plans.create(
    owner,
    {
      kind: "fixed",
      direction: "do",
      title: "晨读",
      timezone: "Asia/Shanghai",
      startDate: yesterday,
      rule: { weekdays: [1, 2, 3, 4, 5, 6, 7] },
    },
    randomUUID(),
  );
  const weekly = await plans.create(
    owner,
    {
      kind: "weekly",
      direction: "do",
      title: "每周跑步",
      timezone: "Asia/Shanghai",
      startDate: yesterday,
      rule: { weeklyTarget: 2 },
    },
    randomUUID(),
  );
  const oneTime = await plans.create(
    owner,
    {
      kind: "one_time",
      direction: "do",
      title: "缴费",
      timezone: "Asia/Shanghai",
      startDate: today,
      dueDate: today,
    },
    randomUUID(),
  );
  const before = await views.statisticsForPlan(owner, fixed.id);
  assert.equal(before.kind, "fixed");
  assert.equal(before.statisticsThroughBusinessDate, yesterday);
  assert.equal(before.unrecordedCount, 1);
  const input = (result, baseRevision = 0) => ({
    result,
    baseRevision,
    clientCreatedAt: new Date().toISOString(),
    clientOperationId: randomUUID(),
    ruleVersion: 1,
    ...(result === "failure" ? { failureReason: "未完成" } : {}),
  });
  await records.put(owner, fixed.id, today, input("success"), randomUUID());
  await records.put(owner, weekly.id, today, input("success"), randomUUID());
  const current = await views.today(owner);
  assert.equal(
    (await views.today(owner, "Pacific/Honolulu")).items.find(
      (item) => item.plan.id === fixed.id,
    ).planBusinessDate,
    today,
  );
  assert.equal(
    current.items.find((item) => item.plan.id === fixed.id).status,
    "success",
  );
  assert.equal(
    current.items.find((item) => item.plan.id === weekly.id).weeklyProgress
      .successes,
    1,
  );
  assert.equal(
    current.items.find((item) => item.plan.id === oneTime.id).status,
    "pending",
  );
  const calendar = await views.calendar(owner, month);
  const day = calendar.days.find((item) => item.businessDate === today);
  assert.equal(day.counts.success, 2);
  assert.equal(
    day.entries.find((entry) => entry.planId === fixed.id).status,
    "success",
  );
  assert.equal((await views.calendarDay(owner, today)).counts.success, 2);
  assert.equal(
    (await views.detail(owner, fixed.id)).statistics.successCount,
    1,
  );
  assert.equal(
    (await views.statisticsForPlan(owner, fixed.id)).successCount,
    1,
  );
  assert.equal(
    calendar.weeklySummaries.find(
      (item) =>
        item.planId === weekly.id &&
        item.summary.weekStartDate === mondayOfWeek(today),
    ).summary.successes,
    1,
  );
  assert.equal(
    calendar.days
      .flatMap((item) => item.entries)
      .filter(
        (entry) => entry.planId === weekly.id && entry.status === "unrecorded",
      ).length,
    0,
  );
  await records.put(owner, fixed.id, today, input("failure", 1), randomUUID());
  const after = await views.statisticsForPlan(owner, fixed.id);
  assert.equal(after.successCount, 0);
  assert.equal(after.failureCount, 1);
  assert.equal(
    (await views.detail(owner, fixed.id)).statistics.failureCount,
    1,
  );
  assert.equal(
    (await views.today(owner)).items.find((item) => item.plan.id === fixed.id)
      .status,
    "failure",
  );
  assert.equal(
    (await views.calendarDay(owner, today)).entries.find(
      (entry) => entry.planId === fixed.id,
    ).status,
    "failure",
  );
  await records.resolveOneTime(
    owner,
    oneTime.id,
    { resolution: "completed", baseRevision: 0 },
    randomUUID(),
    false,
  );
  assert.equal(
    (await views.statisticsForPlan(owner, oneTime.id)).state,
    "completed",
  );
  assert.equal(
    (await views.calendarDay(owner, today)).entries.find(
      (entry) => entry.planId === oneTime.id,
    ).status,
    "completed",
  );
  assert.equal(
    (await views.today(owner)).items.find((item) => item.plan.id === oneTime.id)
      .status,
    "completed",
  );
  await assert.rejects(views.detail(outsider, fixed.id), /计划不存在/);
  await assert.rejects(views.calendar(owner, "2026-13"), /月份格式/);
  assert.deepEqual(
    (await views.calendar(outsider, month)).days.flatMap(
      (item) => item.entries,
    ),
    [],
  );
  process.stdout.write(
    "Views PGlite smoke passed: Today, calendar, detail and statistics agree after revision.\n",
  );
} finally {
  await pg.close();
}

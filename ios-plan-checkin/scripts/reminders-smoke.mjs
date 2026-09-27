import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import process from "node:process";
import { URL } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { PlansService } from "../apps/api/dist/plans/plans.service.js";
import { RemindersService } from "../apps/api/dist/plans/reminders.service.js";
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
  const config = { authIdempotencyKey: Buffer.alloc(32, 7) };
  const plans = new PlansService(database, config);
  const reminders = new RemindersService(database, config);
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
  const today = businessDateAt(new Date(), "Asia/Shanghai");
  const base = { direction: "do", timezone: "Asia/Shanghai", startDate: today };
  await assert.rejects(
    plans.create(
      owner,
      {
        ...base,
        kind: "weekly",
        title: "缺少提醒星期",
        rule: { weeklyTarget: 3 },
        reminder: { enabled: true, timeLocal: "19:00" },
      },
      randomUUID(),
    ),
    /请选择提醒星期/,
  );
  await assert.rejects(
    plans.create(
      owner,
      {
        ...base,
        kind: "one_time",
        title: "缺少提醒时机",
        dueDate: addCalendarDays(today, 4),
        reminder: { enabled: true, timeLocal: "10:00" },
      },
      randomUUID(),
    ),
    /请选择一次性任务提醒时机/,
  );
  const fixed = await plans.create(
    owner,
    { ...base, kind: "fixed", title: "阅读", rule: { weekdays: [1, 3, 5] } },
    randomUUID(),
  );
  const weekly = await plans.create(
    owner,
    { ...base, kind: "weekly", title: "健身", rule: { weeklyTarget: 3 } },
    randomUUID(),
  );
  const once = await plans.create(
    owner,
    {
      ...base,
      kind: "one_time",
      title: "材料",
      dueDate: addCalendarDays(today, 4),
    },
    randomUUID(),
  );
  assert.deepEqual((await reminders.get(owner, fixed.id)).weekdays, [1, 3, 5]);
  assert.equal((await reminders.get(owner, fixed.id)).revision, 0);
  await assert.rejects(reminders.get(other, fixed.id), /计划不存在/);
  const fixedInput = { enabled: true, timeLocal: "08:00", baseRevision: 0 };
  const fixedKey = randomUUID();
  const saved = await reminders.put(owner, fixed.id, fixedInput, fixedKey);
  assert.equal(saved.revision, 1);
  assert.equal(saved.timeLocal, "08:00");
  assert.deepEqual(
    await reminders.put(owner, fixed.id, fixedInput, fixedKey),
    saved,
  );
  await assert.rejects(
    reminders.put(owner, fixed.id, fixedInput, randomUUID()),
    /提醒设置已变化/,
  );
  await assert.rejects(
    reminders.put(
      other,
      fixed.id,
      { ...fixedInput, baseRevision: 1 },
      randomUUID(),
    ),
    /计划不存在/,
  );
  await assert.rejects(
    reminders.put(
      owner,
      fixed.id,
      { ...fixedInput, baseRevision: 1, weekdays: [2] },
      randomUUID(),
    ),
    /跟随计划/,
  );
  const disabled = await reminders.put(
    owner,
    fixed.id,
    { enabled: false, baseRevision: 1 },
    randomUUID(),
  );
  assert.equal(disabled.enabled, false);
  assert.equal(disabled.revision, 2);
  await assert.rejects(
    reminders.put(
      owner,
      weekly.id,
      { enabled: true, timeLocal: "19:00", weekdays: [], baseRevision: 0 },
      randomUUID(),
    ),
    /请选择提醒星期/,
  );
  const week = await reminders.put(
    owner,
    weekly.id,
    { enabled: true, timeLocal: "19:00", weekdays: [2, 4, 6], baseRevision: 0 },
    randomUUID(),
  );
  assert.deepEqual(week.weekdays, [2, 4, 6]);
  await assert.rejects(
    reminders.put(
      owner,
      weekly.id,
      { enabled: true, timeLocal: "19:00", weekdays: [2, 2], baseRevision: 1 },
      randomUUID(),
    ),
    /提醒星期不正确/,
  );
  await assert.rejects(
    reminders.put(
      owner,
      once.id,
      { enabled: true, timeLocal: "10:00", baseRevision: 0 },
      randomUUID(),
    ),
    /提醒时机不正确/,
  );
  const one = await reminders.put(
    owner,
    once.id,
    { enabled: true, timeLocal: "10:00", daysBeforeDue: 3, baseRevision: 0 },
    randomUUID(),
  );
  assert.equal(one.daysBeforeDue, 3);
  const change = await pg.query(
    "SELECT count(*)::int AS count FROM change_log WHERE user_id=$1 AND entity_type='plan' AND entity_id=$2",
    [owner, fixed.id],
  );
  assert.ok(change.rows[0].count >= 3);
  process.stdout.write(
    "reminders smoke: owner scope, all rule kinds, idempotency, revisions and change log passed",
  );
} finally {
  await pg.close();
}

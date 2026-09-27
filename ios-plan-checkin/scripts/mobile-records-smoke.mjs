import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { URL } from "node:url";
import process from "node:process";
import ts from "typescript";

async function load(relativePath, imports) {
  const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", code)(
    (name) => {
      if (name in imports) return imports[name];
      throw new Error(`Unexpected import: ${name}`);
    },
    module,
    module.exports,
  );
  return module.exports;
}

const domain = {
  businessDateAt: () => "2026-09-28",
  parseBusinessDate: (value) => new Date(`${value}T12:00:00Z`),
  isoWeekday: (value) => value.getUTCDay() || 7,
};
const { LocalCache } = await load("../apps/mobile/src/data/localCache.ts", {
  "@plan-checkin/domain": domain,
  "./localStore": {},
});
let state = {
  plans: new Map(),
  rules: new Map(),
  checkins: new Map(),
  outbox: new Map(),
  cursors: new Map(),
};
let failOutbox = false;
function database(snapshot) {
  return {
    async getFirstAsync(sql, ...args) {
      if (sql.includes("FROM local_rule_versions"))
        return snapshot.rules.get(args[0]);
      if (sql.includes("FROM local_checkins"))
        return snapshot.checkins.get(`${args[0]}:${args[1]}`) ?? null;
      if (sql.includes("FROM local_outbox")) {
        const row = snapshot.outbox.get(args[0]);
        return row?.status === "pending" ? row : null;
      }
      if (sql.includes("FROM local_sync_cursor"))
        return (
          snapshot.cursors.get(
            sql.includes("scope=?")
              ? args[0]
              : sql.includes("today:snapshot")
                ? "today:snapshot"
                : "plans:list-fetched",
          ) ?? null
        );
      return null;
    },
    async runAsync(sql, ...args) {
      if (sql.includes("INSERT INTO local_plans"))
        snapshot.plans.set(args[0], JSON.parse(args[3]));
      else if (sql.includes("INSERT INTO local_rule_versions"))
        snapshot.rules.set(args[0], { version: args[1], payload: args[3] });
      else if (sql.includes("INSERT INTO local_checkins"))
        snapshot.checkins.set(`${args[0]}:${args[1]}`, {
          payload: args[3],
          operation_id: args[4],
          sync_state: "local",
        });
      else if (sql.includes("INSERT INTO local_outbox")) {
        if (failOutbox) throw new Error("outbox unavailable");
        snapshot.outbox.set(args[0], { payload: args[4], status: "pending" });
      } else if (sql.includes("UPDATE local_outbox"))
        snapshot.outbox.set(args[1], { payload: args[0], status: "pending" });
      else if (sql.includes("INSERT INTO local_sync_cursor"))
        snapshot.cursors.set(
          sql.includes("VALUES(?,?,?)")
            ? args[0]
            : sql.includes("today:snapshot")
              ? "today:snapshot"
              : "plans:list-fetched",
          { cursor: sql.includes("VALUES(?,?,?)") ? args[1] : args[0] },
        );
      else if (sql.includes("DELETE FROM local_sync_cursor")) {
        for (const key of snapshot.cursors.keys())
          if (
            key.startsWith("calendar:") ||
            key === "today:snapshot" ||
            key === args[0]
          )
            snapshot.cursors.delete(key);
      }
    },
    async getAllAsync() {
      return [];
    },
  };
}
const store = {
  async transaction(_account, callback) {
    const copy = Object.fromEntries(
      Object.entries(state).map(([key, value]) => [key, new Map(value)]),
    );
    const result = await callback(database(copy));
    state = copy;
    return result;
  },
  async read(_account, callback) {
    return callback(database(state));
  },
};
const cache = new LocalCache(store);
const plan = {
  id: "plan-1",
  kind: "weekly",
  lifecycle: "active",
  direction: "do",
  title: "阅读",
  timezone: "Asia/Shanghai",
  startDate: "2026-09-01",
  endDate: null,
  ruleVersion: 1,
  ruleEffectiveDate: "2026-09-01",
  rule: { weeklyTarget: 3 },
  revision: 1,
  updatedAt: "2026-09-28T00:00:00Z",
};
const input = (id, result) => ({
  result,
  baseRevision: 0,
  ruleVersion: 1,
  clientOperationId: id,
  clientCreatedAt: "2026-09-28T01:00:00Z",
});
const first = await cache.savePendingCheckin(
  "user",
  plan,
  "2026-09-28",
  input("op-1", "success"),
);
assert.equal(first.record.result, "success");
assert.equal(state.outbox.size, 1);
const second = await cache.savePendingCheckin(
  "user",
  plan,
  "2026-09-28",
  input("op-2", "failure"),
);
assert.equal(second.operationId, "op-1");
assert.equal(second.record.result, "failure");
assert.equal(state.outbox.size, 1);
assert.equal(JSON.parse(state.outbox.get("op-1").payload).result, "failure");
assert.equal(
  (await cache.checkin("user", plan.id, "2026-09-28")).record.result,
  "failure",
);
await assert.rejects(
  cache.savePendingCheckin(
    "user",
    plan,
    "2026-09-29",
    input("op-3", "success"),
  ),
  /日期/,
);
failOutbox = true;
await assert.rejects(
  cache.savePendingCheckin(
    "user",
    plan,
    "2026-09-27",
    input("op-4", "success"),
  ),
  /outbox unavailable/,
);
assert.equal(state.checkins.has("plan-1:2026-09-27"), false);
assert.equal(state.outbox.size, 1);
failOutbox = false;
const uncachedRule = { ...input("op-5", "success"), ruleVersion: 2 };
await assert.rejects(
  cache.savePendingCheckin("user", plan, "2026-09-26", uncachedRule),
  /缺少此日期的规则版本/,
);
await cache.savePendingCheckin("user", plan, "2026-09-26", uncachedRule, true);
assert.equal(state.outbox.size, 2);
const today = {
  viewDate: "2026-09-28",
  viewTimezone: "Asia/Shanghai",
  items: [],
};
await cache.saveTodaySnapshot("user", today);
assert.deepEqual(await cache.todaySnapshot("user", "2026-09-28"), today);
assert.equal(await cache.todaySnapshot("user", "2026-09-29"), null);
const calendar = {
  month: "2026-09",
  days: [],
  weeklySummaries: [],
  groupId: null,
  dateSemantics: "plan_business_date",
};
await cache.saveCalendarSnapshot("user", "global:all:2026-09", calendar);
await cache.savePlanDetailSnapshot("user", {
  plan,
  statistics: {},
  recentRecords: [],
});
assert.deepEqual(
  await cache.calendarSnapshot("user", "global:all:2026-09"),
  calendar,
);
await cache.invalidateViewSnapshots("user", plan.id);
assert.equal(await cache.todaySnapshot("user", "2026-09-28"), null);
assert.equal(await cache.calendarSnapshot("user", "global:all:2026-09"), null);
assert.equal(await cache.planDetailSnapshot("user", plan.id), null);

const { TodaySessionStore } = await load(
  "../apps/mobile/src/data/todaySession.ts",
  {},
);
const session = new TodaySessionStore();
const card = {
  plan,
  planBusinessDate: "2026-09-28",
  status: "due",
  record: null,
};
session.hold(card, second.record);
assert.equal(session.merge({ ...today, items: [] }).items[0].status, "failure");
session.clear();
assert.equal(session.merge(today).items.length, 0);
process.stdout.write(
  "Mobile records smoke passed: atomic rollback, same-day coalescing, online rule fallback, snapshot invalidation and card retention.\n",
);

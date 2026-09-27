import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import process from "node:process";
import { URL } from "node:url";
import ts from "typescript";
import * as domain from "../packages/domain/dist/index.js";

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
const { monthCells, shiftMonth, dayState } = await load(
  "../apps/mobile/src/screens/calendar/calendarModel.ts",
  {},
);
assert.equal(monthCells("2024-02").filter(Boolean).length, 29);
assert.equal(monthCells("2024-02")[3], "2024-02-01");
assert.equal(shiftMonth("2026-12", 1), "2027-01");
assert.equal(shiftMonth("2026-01", -1), "2025-12");
assert.equal(
  dayState({ counts: { success: 2, failure: 1, skip: 0, unrecorded: 0 } }),
  "failure",
);

let sequence = 0;
const { MockRepository } = await load(
  "../apps/mobile/src/data/mockRepository.ts",
  {
    "@plan-checkin/domain": domain,
    "expo-crypto": {
      randomUUID: () =>
        `00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`,
    },
  },
);
const today = domain.businessDateAt(new Date(), "Asia/Shanghai");
const weekday = domain.isoWeekday(domain.parseBusinessDate(today));
const fixed = {
  id: "fixed",
  ownerId: "user",
  kind: "fixed",
  direction: "do",
  title: "阅读",
  description: null,
  timezone: "Asia/Shanghai",
  startDate: today,
  endDate: null,
  dueDate: null,
  groupId: "group-1",
  lifecycle: "active",
  ruleVersion: 1,
  ruleEffectiveDate: today,
  rule: { weekdays: [weekday] },
  revision: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
const weekly = {
  ...fixed,
  id: "weekly",
  kind: "weekly",
  title: "健身",
  groupId: null,
  rule: { weeklyTarget: 3 },
};
const once = {
  ...fixed,
  id: "once",
  kind: "one_time",
  title: "签合同",
  groupId: null,
  rule: null,
  dueDate: today,
};
const repository = new MockRepository([fixed, weekly, once]);
const month = today.slice(0, 7);
const initial = await repository.getCalendar(month);
assert.equal(
  initial.days
    .find((day) => day.businessDate === today)
    ?.entries.some((entry) => entry.planId === "fixed"),
  true,
);
assert.equal(
  initial.days.some((day) =>
    day.entries.some((entry) => entry.planId === "weekly"),
  ),
  false,
);
await repository.saveCheckin(weekly, today, {
  result: "success",
  baseRevision: 0,
  ruleVersion: 1,
  clientCreatedAt: new Date().toISOString(),
  clientOperationId: "operation-1",
});
const calendar = await repository.getCalendar(month);
assert.equal(
  calendar.days.find((day) => day.businessDate === today)?.counts.success,
  1,
);
assert.equal(
  (await repository.getCalendar(month, "group-1")).days.find(
    (day) => day.businessDate === today,
  )?.entries.length,
  1,
);
assert.equal(
  (await repository.getPlanCalendar("weekly", month)).days.find(
    (day) => day.businessDate === today,
  )?.entries.length,
  1,
);
assert.equal(
  (await repository.getPlanDetail("weekly")).statistics.kind,
  "weekly",
);
assert.equal(
  (await repository.getPlanDetail("fixed")).statistics.kind,
  "fixed",
);
assert.equal(
  (await repository.getPlanDetail("once")).statistics.kind,
  "one_time",
);
process.stdout.write(
  "Mobile calendar smoke passed: leap month, mixed states, group and plan filters, and three detail variants.\n",
);

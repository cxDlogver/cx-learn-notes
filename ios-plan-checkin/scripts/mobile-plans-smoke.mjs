import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import process from "node:process";
import { URL } from "node:url";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const source = await readFile(
  new URL("apps/mobile/src/screens/plans/planForm.ts", root),
  "utf8",
);
const javascript = ts
  .transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  })
  .outputText.replaceAll(
    'from "@plan-checkin/domain"',
    `from "${new URL("packages/domain/dist/index.js", root).href}"`,
  );
const {
  initialDraft,
  validateDraft,
  createRequest,
  updateRequest,
  todayIn,
  pickerDate,
  dateFromPicker,
} = await import(`data:text/javascript,${encodeURIComponent(javascript)}`);
const zone = "Asia/Shanghai";
const today = todayIn(zone);
const yesterday = new Date(`${today}T12:00:00Z`);
yesterday.setUTCDate(yesterday.getUTCDate() - 1);
const before = yesterday.toISOString().slice(0, 10);
const fixed = { ...initialDraft("fixed"), title: "晨练", weekdays: [5, 1] };
assert.equal(
  validateDraft("fixed", { ...fixed, weekdays: [] }, zone),
  "至少选择一天",
);
assert.equal(
  validateDraft("fixed", { ...fixed, endDate: before }, zone),
  "结束日期不能早于开始日期",
);
assert.deepEqual(createRequest("fixed", fixed, zone).rule, {
  weekdays: [1, 5],
});
assert.equal(
  validateDraft("weekly", { ...fixed, weeklyTarget: 0 }, zone),
  "每周目标需为 1–7 次",
);
assert.equal(
  validateDraft("one_time", { ...fixed, dueDate: before }, zone),
  "截止日期不能早于今天",
);
assert.equal(
  createRequest(
    "one_time",
    { ...fixed, dueDate: today, direction: "avoid" },
    zone,
  ).direction,
  "do",
);
assert.equal(dateFromPicker(pickerDate("2026-09-28")), "2026-09-28");
const old = {
  kind: "weekly",
  title: "晨练",
  description: null,
  groupId: null,
  endDate: null,
  dueDate: null,
  startDate: today,
  timezone: zone,
  direction: "do",
  rule: { weeklyTarget: 3 },
  revision: 7,
};
const unchanged = initialDraft("weekly", old);
assert.deepEqual(updateRequest(old, unchanged), { baseRevision: 7 });
assert.deepEqual(updateRequest(old, { ...unchanged, weeklyTarget: 4 }), {
  baseRevision: 7,
  rule: { weeklyTarget: 4 },
});
process.stdout.write(
  "Mobile plan form smoke passed: date boundary, rule range, immutable direction, update delta.\n",
);

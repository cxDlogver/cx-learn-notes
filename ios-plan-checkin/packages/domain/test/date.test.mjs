import assert from "node:assert/strict";
import test from "node:test";
import {
  addCalendarDays,
  businessDateAt,
  businessWeekBounds,
  canBackfillDate,
  canRecordOnDate,
  endOfBusinessDate,
  isFixedDueDate,
  mondayOfWeek,
  nextRuleEffectiveDate,
  parseBusinessDate,
  ruleForDate,
  startOfBusinessDate,
  validateOneTimeDueDate,
  validatePlanTimeline,
} from "../dist/index.js";

test("plan date changes at its own timezone midnight", () => {
  assert.equal(
    businessDateAt("2026-09-27T15:59:59Z", "Asia/Shanghai"),
    "2026-09-27",
  );
  assert.equal(
    businessDateAt("2026-09-27T16:00:00Z", "Asia/Shanghai"),
    "2026-09-28",
  );
  assert.equal(
    nextRuleEffectiveDate("Asia/Shanghai", "2026-09-27T16:00:00Z"),
    "2026-09-29",
  );
});

test("Gregorian dates and Monday week bounds cross month and year safely", () => {
  assert.throws(() => parseBusinessDate("2026-02-29"), RangeError);
  assert.equal(addCalendarDays("2024-02-28", 1), "2024-02-29");
  assert.equal(addCalendarDays("2026-12-31", 1), "2027-01-01");
  assert.equal(mondayOfWeek("2026-09-27"), "2026-09-21");
  const week = businessWeekBounds("2026-09-27", "Asia/Shanghai");
  assert.equal(week.monday, "2026-09-21");
  assert.equal(week.nextMonday, "2026-09-28");
  assert.equal(week.start.toISOString(), "2026-09-20T16:00:00.000Z");
});

test("DST dates have 23 or 25 real hours, never an assumed 24", () => {
  const spring =
    endOfBusinessDate("2026-03-08", "America/New_York").getTime() -
    startOfBusinessDate("2026-03-08", "America/New_York").getTime();
  const autumn =
    endOfBusinessDate("2026-11-01", "America/New_York").getTime() -
    startOfBusinessDate("2026-11-01", "America/New_York").getTime();
  assert.equal(spring / 3_600_000, 23);
  assert.equal(autumn / 3_600_000, 25);
  assert.throws(
    () => startOfBusinessDate("2011-12-30", "Pacific/Apia"),
    RangeError,
  );
});

test("fixed dates and backfill use historical rule and lifecycle", () => {
  const plan = {
    timezone: "Asia/Shanghai",
    startDate: "2026-09-21",
    endDate: null,
    dueDate: null,
    rules: [
      {
        kind: "fixed",
        direction: "do",
        version: 1,
        effectiveDate: "2026-09-21",
        weekdays: [1, 3],
      },
      {
        kind: "fixed",
        direction: "do",
        version: 2,
        effectiveDate: "2026-09-29",
        weekdays: [2, 4],
      },
    ],
    lifecycleEvents: [
      {
        sequence: 1,
        action: "pause",
        businessDate: "2026-09-23",
        occurredAt: "2026-09-23T05:00:00Z",
      },
      {
        sequence: 2,
        action: "resume",
        businessDate: "2026-09-23",
        occurredAt: "2026-09-23T06:00:00Z",
      },
    ],
  };
  validatePlanTimeline(plan);
  assert.equal(isFixedDueDate(plan, "2026-09-21"), true);
  assert.equal(isFixedDueDate(plan, "2026-09-22"), false);
  assert.equal(isFixedDueDate(plan, "2026-09-23"), false);
  assert.equal(isFixedDueDate(plan, "2026-09-30"), false);
  assert.equal(isFixedDueDate(plan, "2026-10-01"), true);
  assert.equal(
    canBackfillDate(plan, "2026-09-21", "2026-09-27T08:00:00Z"),
    true,
  );
  assert.equal(
    canBackfillDate(plan, "2026-09-23", "2026-09-27T08:00:00Z"),
    false,
  );
  assert.equal(
    canRecordOnDate(plan, "2026-10-01", "2026-09-27T08:00:00Z"),
    false,
  );
});

test("one-time due date cannot be in the past in the plan timezone", () => {
  assert.throws(() =>
    validateOneTimeDueDate(
      "2026-09-26",
      "Asia/Shanghai",
      "2026-09-27T08:00:00Z",
    ),
  );
  assert.doesNotThrow(() =>
    validateOneTimeDueDate(
      "2026-09-27",
      "Asia/Shanghai",
      "2026-09-27T08:00:00Z",
    ),
  );
});

test("multiple rule edits for tomorrow preserve versions and latest rule wins", () => {
  const plan = {
    timezone: "Asia/Shanghai",
    startDate: "2026-09-21",
    endDate: null,
    dueDate: null,
    rules: [
      {
        kind: "weekly",
        direction: "do",
        version: 1,
        effectiveDate: "2026-09-21",
        weeklyTarget: 3,
      },
      {
        kind: "weekly",
        direction: "do",
        version: 2,
        effectiveDate: "2026-09-28",
        weeklyTarget: 4,
      },
      {
        kind: "weekly",
        direction: "do",
        version: 3,
        effectiveDate: "2026-09-28",
        weeklyTarget: 5,
      },
    ],
    lifecycleEvents: [],
  };
  validatePlanTimeline(plan);
  assert.equal(ruleForDate(plan, "2026-09-27").weeklyTarget, 3);
  assert.equal(ruleForDate(plan, "2026-09-28").weeklyTarget, 5);
});

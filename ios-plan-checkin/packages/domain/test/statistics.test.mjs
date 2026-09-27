import assert from "node:assert/strict";
import test from "node:test";
import {
  fixedDateStatus,
  fixedStatistics,
  oneTimeState,
  weeklyStatistics,
} from "../dist/index.js";

const fixed = {
  timezone: "Asia/Shanghai",
  startDate: "2026-09-25",
  endDate: null,
  dueDate: null,
  rules: [
    {
      kind: "fixed",
      direction: "avoid",
      version: 1,
      effectiveDate: "2026-09-25",
      weekdays: [5, 6, 7],
    },
  ],
  lifecycleEvents: [],
};
const now = "2026-09-27T08:00:00Z";

test("fixed plan excludes unsubmitted today and never auto-succeeds an avoid plan", () => {
  const records = [
    { businessDate: "2026-09-25", result: "success", ruleVersion: 1 },
    { businessDate: "2026-09-26", result: "skip", ruleVersion: 1 },
  ];
  assert.equal(fixedDateStatus(fixed, "2026-09-27", now), "pending");
  const before = fixedStatistics(fixed, records, now);
  assert.equal(before.statisticsThroughBusinessDate, "2026-09-26");
  assert.equal(before.successCount, 1);
  assert.equal(before.skipCount, 1);
  assert.equal(before.denominator, 1);
  assert.equal(before.completionRate, 1);
  const after = fixedStatistics(
    fixed,
    [
      ...records,
      { businessDate: "2026-09-27", result: "failure", ruleVersion: 1 },
    ],
    now,
  );
  assert.equal(after.statisticsThroughBusinessDate, "2026-09-27");
  assert.equal(after.denominator, 2);
  assert.equal(after.completionRate, 0.5);
});

test("past unrecorded date stays in denominator while skipped date does not", () => {
  const result = fixedStatistics(
    fixed,
    [{ businessDate: "2026-09-25", result: "skip", ruleVersion: 1 }],
    now,
  );
  assert.equal(result.unrecordedCount, 1);
  assert.equal(result.denominator, 1);
  assert.equal(result.completionRate, 0);
  assert.equal(
    fixedStatistics(fixed, [], "2026-09-25T08:00:00Z").completionRate,
    null,
  );
});

test("pause immediately cancels pending duty but preserves submitted record", () => {
  const paused = {
    ...fixed,
    lifecycleEvents: [
      {
        sequence: 1,
        action: "pause",
        businessDate: "2026-09-27",
        occurredAt: now,
      },
    ],
  };
  assert.equal(fixedDateStatus(paused, "2026-09-27", now), "not_due");
  assert.equal(fixedStatistics(paused, [], now).denominator, 2);
  const kept = fixedStatistics(
    paused,
    [{ businessDate: "2026-09-27", result: "success", ruleVersion: 1 }],
    now,
  );
  assert.equal(kept.successCount, 1);
  assert.equal(kept.denominator, 3);
});

test("weekly attainment counts only complete closed weeks and current progress stays visible", () => {
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
        weeklyTarget: 2,
      },
    ],
    lifecycleEvents: [],
  };
  const records = [
    { businessDate: "2026-09-21", result: "success", ruleVersion: 1 },
    { businessDate: "2026-09-23", result: "success", ruleVersion: 1 },
    { businessDate: "2026-09-28", result: "success", ruleVersion: 1 },
  ];
  const stats = weeklyStatistics(plan, records, "2026-09-29T08:00:00Z");
  assert.equal(stats.completeWeekCount, 1);
  assert.equal(stats.attainedWeekCount, 1);
  assert.equal(stats.attainmentRate, 1);
  assert.equal(stats.currentWeek.successes, 1);
  assert.equal(stats.currentWeek.progressRate, 0.5);
  assert.equal(stats.currentWeek.attained, null);
});

test("a partial week from rule change is not a failed week", () => {
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
        weeklyTarget: 2,
      },
      {
        kind: "weekly",
        direction: "do",
        version: 2,
        effectiveDate: "2026-09-24",
        weeklyTarget: 3,
      },
    ],
    lifecycleEvents: [],
  };
  const stats = weeklyStatistics(plan, [], "2026-09-29T08:00:00Z");
  assert.equal(stats.completeWeekCount, 0);
  assert.equal(stats.attainmentRate, null);
});

test("one-time status is based on actual completion instant in plan timezone", () => {
  const plan = {
    timezone: "Asia/Shanghai",
    startDate: "2026-09-27",
    endDate: null,
    dueDate: "2026-09-28",
    rules: [
      {
        kind: "one_time",
        direction: "do",
        version: 1,
        effectiveDate: "2026-09-27",
      },
    ],
    lifecycleEvents: [],
  };
  assert.equal(oneTimeState(plan, null, "2026-09-28T15:59:59Z"), "pending");
  assert.equal(oneTimeState(plan, null, "2026-09-28T16:00:00Z"), "overdue");
  assert.equal(
    oneTimeState(
      plan,
      {
        resolution: "completed",
        resolvedAt: "2026-09-28T16:00:00Z",
        revision: 1,
      },
      now,
    ),
    "late_completed",
  );
  assert.equal(
    oneTimeState(
      plan,
      { resolution: "failed", resolvedAt: now, revision: 1 },
      now,
    ),
    "failed",
  );
});

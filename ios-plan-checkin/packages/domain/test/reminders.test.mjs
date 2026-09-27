import assert from "node:assert/strict";
import { test } from "node:test";
import { reminderOccurrences, wallTimeInstant } from "../dist/index.js";

test("plan timezone determines local reminder time across device travel and DST", () => {
  assert.equal(
    wallTimeInstant("2026-09-28", "20:00", "Asia/Shanghai")?.toISOString(),
    "2026-09-28T12:00:00.000Z",
  );
  assert.equal(
    wallTimeInstant("2026-03-08", "02:30", "America/New_York"),
    null,
  );
  assert.equal(
    wallTimeInstant("2026-11-01", "01:30", "America/New_York")?.toISOString(),
    "2026-11-01T05:30:00.000Z",
  );
});

test("fixed, weekly and one-time reminders stop when their record state changes", () => {
  const base = {
    id: "plan-a",
    title: "阅读",
    lifecycle: "active",
    timezone: "Asia/Shanghai",
    startDate: "2026-09-01",
    endDate: null,
    dueDate: null,
    fixedWeekdays: [1],
    weeklyTarget: 2,
    terminal: false,
    recordedDates: [],
    currentWeekSuccesses: 0,
    reminder: {
      enabled: true,
      timeLocal: "20:00",
      weekdays: [1, 3],
      daysBeforeDue: null,
    },
  };
  const now = new Date("2026-09-28T00:00:00.000Z");
  assert.equal(
    reminderOccurrences({ ...base, kind: "fixed" }, now, 7).length,
    1,
  );
  assert.equal(
    reminderOccurrences(
      { ...base, kind: "fixed", fixedTodayEligible: false },
      now,
      7,
    ).length,
    0,
  );
  assert.equal(
    reminderOccurrences(
      { ...base, kind: "fixed", fixedWeekdays: [], fixedTodayEligible: true },
      now,
      7,
    )[0]?.businessDate,
    "2026-09-28",
  );
  assert.equal(
    reminderOccurrences(
      { ...base, kind: "fixed", recordedDates: ["2026-09-28"] },
      now,
      7,
    ).length,
    0,
  );
  assert.equal(
    reminderOccurrences(
      { ...base, kind: "weekly", currentWeekSuccesses: 2 },
      now,
      7,
    ).length,
    0,
  );
  assert.equal(
    reminderOccurrences(
      { ...base, kind: "weekly", currentWeekSuccesses: 1 },
      now,
      7,
    ).length,
    2,
  );
  assert.equal(
    reminderOccurrences({ ...base, lifecycle: "paused", kind: "fixed" }, now, 7)
      .length,
    0,
  );
  const oneTime = {
    ...base,
    kind: "one_time",
    dueDate: "2026-09-30",
    reminder: { ...base.reminder, daysBeforeDue: 1 },
  };
  assert.equal(
    reminderOccurrences(oneTime, now, 7)[0]?.businessDate,
    "2026-09-29",
  );
  assert.equal(
    reminderOccurrences({ ...oneTime, terminal: true }, now, 7).length,
    0,
  );
});

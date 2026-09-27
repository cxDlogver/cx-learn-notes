import {
  addCalendarDays,
  businessDateAt,
  isoWeekday,
  mondayOfWeek,
  parseBusinessDate,
  type BusinessDate,
} from "./date.js";
import {
  isActiveDate,
  isFixedDueDate,
  ruleForDate,
  validatePlanTimeline,
  type PlanTimeline,
} from "./rules.js";

export type CheckinResult = "success" | "failure" | "skip";
export interface RecordFact {
  businessDate: BusinessDate;
  result: CheckinResult;
  ruleVersion: number;
}
export interface OneTimeFact {
  resolution: "completed" | "failed" | "cancelled";
  resolvedAt: string;
  revision: number;
}

function recordIndex(
  records: readonly RecordFact[],
): Map<BusinessDate, RecordFact> {
  const index = new Map<BusinessDate, RecordFact>();
  for (const record of records) {
    parseBusinessDate(record.businessDate);
    if (!(["success", "failure", "skip"] as string[]).includes(record.result)) {
      throw new RangeError(
        "Checkin result must be explicitly success, failure or skip.",
      );
    }
    if (index.has(record.businessDate)) {
      throw new RangeError(
        `Duplicate current record for ${record.businessDate}.`,
      );
    }
    index.set(record.businessDate, record);
  }
  return index;
}

/** Current date without a record stays pending; avoid plans never pass automatically. */
export function fixedDateStatus(
  plan: PlanTimeline,
  date: BusinessDate,
  serverNow: string,
  record?: RecordFact,
): "not_due" | "future" | "pending" | "unrecorded" | CheckinResult {
  const today = businessDateAt(serverNow, plan.timezone);
  if (record) return record.result;
  if (!isFixedDueDate(plan, date)) return "not_due";
  if (date > today) return "future";
  return date === today ? "pending" : "unrecorded";
}

export interface FixedStatistics {
  timezone: string;
  statisticsThroughBusinessDate: BusinessDate;
  ruleVersions: number[];
  successCount: number;
  failureCount: number;
  skipCount: number;
  unrecordedCount: number;
  denominator: number;
  completionRate: number | null;
  consecutiveDueSuccesses: number;
}

export function fixedStatistics(
  plan: PlanTimeline,
  records: readonly RecordFact[],
  serverNow: string,
  windowStart: BusinessDate = plan.startDate,
): FixedStatistics {
  validatePlanTimeline(plan);
  if (plan.rules[0]?.kind !== "fixed")
    throw new RangeError("Expected a fixed plan.");
  const today = businessDateAt(serverNow, plan.timezone);
  const first = windowStart > plan.startDate ? windowStart : plan.startDate;
  const index = recordIndex(records);
  let successCount = 0;
  let failureCount = 0;
  let skipCount = 0;
  let unrecordedCount = 0;
  let denominator = 0;
  let consecutiveDueSuccesses = 0;
  const versions = new Set<number>();
  for (let date = first; date <= today; date = addCalendarDays(date, 1)) {
    const rule = ruleForDate(plan, date);
    const record = index.get(date);
    // An already submitted record survives a pause/archive on that same date.
    const due =
      isFixedDueDate(plan, date) ||
      (record &&
        rule?.kind === "fixed" &&
        rule.weekdays.includes(isoWeekday(date)) &&
        (!plan.endDate || date <= plan.endDate));
    if (!due || rule?.kind !== "fixed") continue;
    if (date === today && !record) continue;
    versions.add(rule.version);
    if (
      record?.ruleVersion !== undefined &&
      record.ruleVersion !== rule.version
    ) {
      throw new RangeError(`Record rule version mismatch on ${date}.`);
    }
    if (record?.result === "success") {
      successCount += 1;
      denominator += 1;
      consecutiveDueSuccesses += 1;
    } else if (record?.result === "skip") {
      skipCount += 1;
      consecutiveDueSuccesses = 0;
    } else if (record?.result === "failure") {
      failureCount += 1;
      denominator += 1;
      consecutiveDueSuccesses = 0;
    } else {
      unrecordedCount += 1;
      denominator += 1;
      consecutiveDueSuccesses = 0;
    }
  }
  return {
    timezone: plan.timezone,
    statisticsThroughBusinessDate: index.has(today)
      ? today
      : addCalendarDays(today, -1),
    ruleVersions: [...versions].sort((a, b) => a - b),
    successCount,
    failureCount,
    skipCount,
    unrecordedCount,
    denominator,
    completionRate: denominator === 0 ? null : successCount / denominator,
    consecutiveDueSuccesses,
  };
}

export interface WeeklySummary {
  weekStartDate: BusinessDate;
  ruleVersion: number | null;
  target: number | null;
  successes: number;
  completeWeek: boolean;
  attained: boolean | null;
  progressRate: number | null;
}

export function weeklySummary(
  plan: PlanTimeline,
  records: readonly RecordFact[],
  weekStartDate: BusinessDate,
  serverNow: string,
): WeeklySummary {
  validatePlanTimeline(plan);
  if (plan.rules[0]?.kind !== "weekly")
    throw new RangeError("Expected a weekly plan.");
  if (mondayOfWeek(weekStartDate) !== weekStartDate)
    throw new RangeError("Week must start Monday.");
  const today = businessDateAt(serverNow, plan.timezone);
  const index = recordIndex(records);
  const weekEnd = addCalendarDays(weekStartDate, 7);
  const activeRules = Array.from({ length: 7 }, (_, offset) => {
    const date = addCalendarDays(weekStartDate, offset);
    return isActiveDate(plan, date) ? ruleForDate(plan, date) : null;
  });
  const firstRule = activeRules[0];
  const firstActiveRule = activeRules.find((rule) => rule?.kind === "weekly");
  const completeWeek =
    weekEnd <= today &&
    firstRule?.kind === "weekly" &&
    activeRules.every(
      (rule) => rule?.kind === "weekly" && rule.version === firstRule.version,
    );
  const displayRule = firstActiveRule;
  const target =
    displayRule?.kind === "weekly" ? displayRule.weeklyTarget : null;
  let successes = 0;
  for (
    let date = weekStartDate;
    date < weekEnd && date <= today;
    date = addCalendarDays(date, 1)
  ) {
    if (index.get(date)?.result === "success") successes += 1;
  }
  return {
    weekStartDate,
    ruleVersion: firstActiveRule?.version ?? null,
    target,
    successes,
    completeWeek: Boolean(completeWeek),
    attained: completeWeek && target !== null ? successes >= target : null,
    progressRate: target === null ? null : Math.min(successes / target, 1),
  };
}

export interface WeeklyStatistics {
  timezone: string;
  statisticsThroughBusinessDate: BusinessDate;
  completeWeekCount: number;
  attainedWeekCount: number;
  attainmentRate: number | null;
  consecutiveAttainedWeeks: number;
  currentWeek: WeeklySummary;
  completedWeeks: WeeklySummary[];
}

export function weeklyStatistics(
  plan: PlanTimeline,
  records: readonly RecordFact[],
  serverNow: string,
): WeeklyStatistics {
  const today = businessDateAt(serverNow, plan.timezone);
  const currentStart = mondayOfWeek(today);
  const closedWeeks: WeeklySummary[] = [];
  for (
    let week = mondayOfWeek(plan.startDate);
    week < currentStart;
    week = addCalendarDays(week, 7)
  ) {
    const summary = weeklySummary(plan, records, week, serverNow);
    closedWeeks.push(summary);
  }
  const completedWeeks = closedWeeks.filter((week) => week.completeWeek);
  const attainedWeekCount = completedWeeks.filter(
    (week) => week.attained,
  ).length;
  let consecutiveAttainedWeeks = 0;
  for (const week of [...closedWeeks].reverse()) {
    if (!week.completeWeek || !week.attained) break;
    consecutiveAttainedWeeks += 1;
  }
  return {
    timezone: plan.timezone,
    statisticsThroughBusinessDate: addCalendarDays(today, -1),
    completeWeekCount: completedWeeks.length,
    attainedWeekCount,
    attainmentRate: completedWeeks.length
      ? attainedWeekCount / completedWeeks.length
      : null,
    consecutiveAttainedWeeks,
    currentWeek: weeklySummary(plan, records, currentStart, serverNow),
    completedWeeks,
  };
}

export type OneTimeState =
  | "pending"
  | "overdue"
  | "completed"
  | "late_completed"
  | "failed"
  | "cancelled";

export function oneTimeState(
  plan: PlanTimeline,
  resolution: OneTimeFact | null,
  serverNow: string,
): OneTimeState {
  validatePlanTimeline(plan);
  if (plan.rules[0]?.kind !== "one_time" || !plan.dueDate) {
    throw new RangeError("Expected a one-time plan.");
  }
  if (resolution) {
    if (
      resolution.resolution === "failed" ||
      resolution.resolution === "cancelled"
    ) {
      return resolution.resolution;
    }
    return businessDateAt(resolution.resolvedAt, plan.timezone) > plan.dueDate
      ? "late_completed"
      : "completed";
  }
  return businessDateAt(serverNow, plan.timezone) > plan.dueDate
    ? "overdue"
    : "pending";
}

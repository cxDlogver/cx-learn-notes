import {
  addCalendarDays,
  assertTimezone,
  businessDateAt,
  compareBusinessDates,
  isoWeekday,
  parseBusinessDate,
  type BusinessDate,
  type IsoWeekday,
} from "./date.js";

export type Direction = "do" | "avoid";
export type LifecycleAction = "pause" | "resume" | "archive" | "delete";

interface RuleVersionBase {
  version: number;
  effectiveDate: BusinessDate;
  direction: Direction;
}
export type RuleVersion =
  | (RuleVersionBase & { kind: "fixed"; weekdays: readonly IsoWeekday[] })
  | (RuleVersionBase & { kind: "weekly"; weeklyTarget: number })
  | (Omit<RuleVersionBase, "direction"> & {
      kind: "one_time";
      direction: "do";
    });

export interface LifecycleEvent {
  sequence: number;
  action: LifecycleAction;
  businessDate: BusinessDate;
  occurredAt: string;
}

export interface PlanTimeline {
  timezone: string;
  startDate: BusinessDate;
  endDate: BusinessDate | null;
  dueDate: BusinessDate | null;
  rules: readonly RuleVersion[];
  lifecycleEvents: readonly LifecycleEvent[];
}

export function validatePlanTimeline(plan: PlanTimeline): void {
  assertTimezone(plan.timezone);
  parseBusinessDate(plan.startDate);
  if (plan.endDate && compareBusinessDates(plan.endDate, plan.startDate) < 0) {
    throw new RangeError("Plan end date precedes start date.");
  }
  if (
    !plan.rules.length ||
    plan.rules[0]?.version !== 1 ||
    plan.rules[0]?.effectiveDate !== plan.startDate
  ) {
    throw new RangeError(
      "Plan must begin with rule version 1 on its start date.",
    );
  }
  const kind = plan.rules[0].kind;
  for (const [index, rule] of plan.rules.entries()) {
    parseBusinessDate(rule.effectiveDate);
    if (rule.kind !== kind || rule.version !== index + 1) {
      throw new RangeError(
        "Rule versions must be contiguous and retain plan kind.",
      );
    }
    if (
      index > 0 &&
      compareBusinessDates(
        rule.effectiveDate,
        plan.rules[index - 1]!.effectiveDate,
      ) < 0
    ) {
      throw new RangeError("Rule effective dates cannot move backward.");
    }
    if (rule.kind === "fixed") {
      if (
        rule.weekdays.length === 0 ||
        new Set(rule.weekdays).size !== rule.weekdays.length ||
        rule.weekdays.some(
          (day) => !Number.isInteger(day) || day < 1 || day > 7,
        )
      ) {
        throw new RangeError(
          "Fixed weekdays must be a nonempty distinct ISO 1–7 set.",
        );
      }
    } else if (rule.kind === "weekly") {
      if (
        !Number.isInteger(rule.weeklyTarget) ||
        rule.weeklyTarget < 1 ||
        rule.weeklyTarget > 7
      ) {
        throw new RangeError("Weekly target must be an integer from 1 to 7.");
      }
    } else if (rule.direction !== "do") {
      throw new RangeError("One-time plans only support the do direction.");
    }
  }
  if (kind === "one_time") {
    if (
      !plan.dueDate ||
      compareBusinessDates(plan.dueDate, plan.startDate) < 0 ||
      plan.endDate
    ) {
      throw new RangeError(
        "One-time plan requires a due date at or after start and no end date.",
      );
    }
  } else if (plan.dueDate) {
    throw new RangeError("Recurring plans cannot have a one-time due date.");
  }
  let priorSequence = 0;
  let priorEventDate = plan.startDate;
  for (const event of plan.lifecycleEvents) {
    parseBusinessDate(event.businessDate);
    if (
      event.sequence <= priorSequence ||
      compareBusinessDates(event.businessDate, priorEventDate) < 0
    ) {
      throw new RangeError(
        "Lifecycle events must be sequence ordered and after plan start.",
      );
    }
    priorSequence = event.sequence;
    priorEventDate = event.businessDate;
  }
}

export function ruleForDate(
  plan: PlanTimeline,
  date: BusinessDate,
): RuleVersion | null {
  parseBusinessDate(date);
  let selected: RuleVersion | null = null;
  for (const rule of plan.rules) {
    if (rule.effectiveDate <= date) selected = rule;
    else break;
  }
  return selected;
}

export function lifecycleOnDate(
  plan: PlanTimeline,
  date: BusinessDate,
): {
  state: "active" | "paused" | "archived" | "deleted";
  obligationCancelled: boolean;
} {
  parseBusinessDate(date);
  let state: "active" | "paused" | "archived" | "deleted" = "active";
  let obligationCancelled = false;
  for (const event of plan.lifecycleEvents) {
    if (event.businessDate > date) break;
    if (event.businessDate === date) obligationCancelled = true;
    if (event.action === "pause") state = "paused";
    else if (event.action === "archive") state = "archived";
    else if (event.action === "delete") state = "deleted";
    else if (state !== "deleted") state = "active";
  }
  return { state, obligationCancelled };
}

export function isActiveDate(plan: PlanTimeline, date: BusinessDate): boolean {
  parseBusinessDate(date);
  if (date < plan.startDate || (plan.endDate && date > plan.endDate))
    return false;
  const lifecycle = lifecycleOnDate(plan, date);
  return lifecycle.state === "active" && !lifecycle.obligationCancelled;
}

export function isFixedDueDate(
  plan: PlanTimeline,
  date: BusinessDate,
): boolean {
  const rule = ruleForDate(plan, date);
  return (
    rule?.kind === "fixed" &&
    isActiveDate(plan, date) &&
    rule.weekdays.includes(isoWeekday(date))
  );
}

export function canRecordOnDate(
  plan: PlanTimeline,
  date: BusinessDate,
  serverNow: string,
): boolean {
  const today = businessDateAt(serverNow, plan.timezone);
  if (date > today || !isActiveDate(plan, date)) return false;
  const rule = ruleForDate(plan, date);
  if (rule?.kind === "fixed") return rule.weekdays.includes(isoWeekday(date));
  return rule?.kind === "weekly";
}

export function canBackfillDate(
  plan: PlanTimeline,
  date: BusinessDate,
  serverNow: string,
): boolean {
  const today = businessDateAt(serverNow, plan.timezone);
  return date < today && canRecordOnDate(plan, date, serverNow);
}

export function validateOneTimeDueDate(
  dueDate: BusinessDate,
  timezone: string,
  serverNow: string,
): void {
  parseBusinessDate(dueDate);
  if (dueDate < businessDateAt(serverNow, timezone)) {
    throw new RangeError(
      "One-time due date must be today or later in the plan timezone.",
    );
  }
}

/** A rule edit is effective at the next plan business date, regardless of device timezone. */
export function nextRuleEffectiveDate(
  timezone: string,
  serverNow: string,
): BusinessDate {
  return addCalendarDays(businessDateAt(serverNow, timezone), 1);
}

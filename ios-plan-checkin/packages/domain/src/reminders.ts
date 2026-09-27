import {
  addCalendarDays,
  assertTimezone,
  businessDateAt,
  isoWeekday,
  parseBusinessDate,
  type BusinessDate,
  type IsoWeekday,
} from "./date.js";

export interface ReminderPlanInput {
  id: string;
  title: string;
  kind: "fixed" | "weekly" | "one_time";
  lifecycle: "active" | "paused" | "archived" | "deleted";
  timezone: string;
  startDate: BusinessDate;
  endDate: BusinessDate | null;
  dueDate: BusinessDate | null;
  fixedWeekdays: IsoWeekday[];
  fixedTodayEligible?: boolean;
  weeklyTarget: number | null;
  terminal: boolean;
  recordedDates: BusinessDate[];
  currentWeekSuccesses: number;
  reminder: {
    enabled: boolean;
    timeLocal: string | null;
    weekdays: IsoWeekday[];
    daysBeforeDue: 0 | 1 | 3 | null;
  };
}
export interface ReminderOccurrence {
  planId: string;
  title: string;
  businessDate: BusinessDate;
  when: Date;
  timezone: string;
}

/** Resolve a plan's wall time to an instant; nonexistent DST times are omitted. */
export function wallTimeInstant(
  date: BusinessDate,
  timeLocal: string,
  timezone: string,
): Date | null {
  parseBusinessDate(date);
  assertTimezone(timezone);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(timeLocal))
    throw new RangeError("Invalid reminder time");
  const [year, month, day] = date.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const [hour, minute] = timeLocal.split(":").map(Number) as [number, number];
  const target = Date.UTC(year, month - 1, day, hour, minute);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  let guess = target;
  const wallValue = (stamp: number): number => {
    const parts = formatter.formatToParts(new Date(stamp));
    const value = (name: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((part) => part.type === name)?.value);
    return Date.UTC(
      value("year"),
      value("month") - 1,
      value("day"),
      value("hour"),
      value("minute"),
    );
  };
  for (let step = 0; step < 5; step++) {
    const difference = target - wallValue(guess);
    if (difference === 0) {
      // Fall-back overlap: prefer the first occurrence of the repeated local time.
      for (const offset of [3_600_000, 1_800_000])
        if (wallValue(guess - offset) === target) guess -= offset;
      return new Date(guess);
    }
    guess += difference;
  }
  return null;
}

export function reminderOccurrences(
  plan: ReminderPlanInput,
  now: Date,
  horizonDays = 14,
): ReminderOccurrence[] {
  const rule = plan.reminder;
  if (
    plan.lifecycle !== "active" ||
    !rule.enabled ||
    !rule.timeLocal ||
    plan.terminal
  )
    return [];
  if (!Number.isInteger(horizonDays) || horizonDays < 1 || horizonDays > 31)
    throw new RangeError("Reminder horizon must be 1–31 days");
  const today = businessDateAt(now, plan.timezone);
  const recorded = new Set(plan.recordedDates);
  const result: ReminderOccurrence[] = [];
  for (let offset = 0; offset < horizonDays; offset++) {
    const date = addCalendarDays(today, offset);
    if (date < plan.startDate || (plan.endDate && date > plan.endDate))
      continue;
    if (plan.kind === "one_time") {
      if (
        !plan.dueDate ||
        rule.daysBeforeDue === null ||
        date !== addCalendarDays(plan.dueDate, -rule.daysBeforeDue)
      )
        continue;
    } else if (plan.kind === "fixed") {
      const eligible =
        date === today && plan.fixedTodayEligible !== undefined
          ? plan.fixedTodayEligible
          : plan.fixedWeekdays.includes(isoWeekday(date));
      if (!eligible || recorded.has(date)) continue;
    } else {
      if (!rule.weekdays.includes(isoWeekday(date)) || recorded.has(date))
        continue;
      if (
        offset < 7 &&
        plan.currentWeekSuccesses >= (plan.weeklyTarget ?? 8) &&
        date < addCalendarDays(today, 8 - isoWeekday(today))
      )
        continue;
    }
    const when = wallTimeInstant(date, rule.timeLocal, plan.timezone);
    if (when && when.getTime() > now.getTime())
      result.push({
        planId: plan.id,
        title: plan.title,
        businessDate: date,
        when,
        timezone: plan.timezone,
      });
  }
  return result;
}

export type BusinessDate = `${number}-${number}-${number}`;
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

function utcCalendarDate(year: number, month: number, day: number): Date {
  const value = new Date(0);
  value.setUTCFullYear(year, month - 1, day);
  value.setUTCHours(0, 0, 0, 0);
  return value;
}

/** Calendar arithmetic uses UTC only as a Gregorian date carrier, never as the plan's timezone. */
export function parseBusinessDate(value: string): BusinessDate {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new RangeError(`Invalid business date: ${value}`);
  const [year, month, day] = value.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const utc = utcCalendarDate(year, month, day);
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    throw new RangeError(`Invalid Gregorian date: ${value}`);
  }
  return value as BusinessDate;
}

export function assertTimezone(timezone: string): string {
  if (!timezone || (!timezone.includes("/") && timezone !== "UTC")) {
    throw new RangeError(`Invalid IANA timezone: ${timezone}`);
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
  } catch {
    throw new RangeError(`Invalid IANA timezone: ${timezone}`);
  }
  return timezone;
}

export function addCalendarDays(
  date: BusinessDate,
  days: number,
): BusinessDate {
  parseBusinessDate(date);
  if (!Number.isSafeInteger(days))
    throw new RangeError("Calendar offset must be an integer.");
  const [year, month, day] = date.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const value = utcCalendarDate(year, month, day + days);
  return `${value.getUTCFullYear().toString().padStart(4, "0")}-${(value.getUTCMonth() + 1).toString().padStart(2, "0")}-${value.getUTCDate().toString().padStart(2, "0")}` as BusinessDate;
}

export function compareBusinessDates(
  a: BusinessDate,
  b: BusinessDate,
): -1 | 0 | 1 {
  parseBusinessDate(a);
  parseBusinessDate(b);
  return a === b ? 0 : a < b ? -1 : 1;
}

export function isoWeekday(date: BusinessDate): IsoWeekday {
  const [year, month, day] = parseBusinessDate(date).split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const weekday = utcCalendarDate(year, month, day).getUTCDay();
  return (weekday === 0 ? 7 : weekday) as IsoWeekday;
}

export function mondayOfWeek(date: BusinessDate): BusinessDate {
  return addCalendarDays(date, 1 - isoWeekday(date));
}

export function nextMonday(date: BusinessDate): BusinessDate {
  return addCalendarDays(mondayOfWeek(date), 7);
}

/** Returns the plan-timezone calendar date for an absolute instant. */
export function businessDateAt(
  instant: string | number | Date,
  timezone: string,
): BusinessDate {
  assertTimezone(timezone);
  const value = new Date(instant);
  if (Number.isNaN(value.getTime())) throw new RangeError("Invalid instant.");
  const parts = new Intl.DateTimeFormat("en-US-u-ca-gregory-nu-latn", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const part = (name: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === name)?.value;
  return parseBusinessDate(`${part("year")}-${part("month")}-${part("day")}`);
}

/** The first real instant in a local calendar date, including DST gaps and repeated hours. */
export function startOfBusinessDate(
  date: BusinessDate,
  timezone: string,
): Date {
  parseBusinessDate(date);
  assertTimezone(timezone);
  const [year, month, day] = date.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const approximate = utcCalendarDate(year, month, day).getTime();
  let low = approximate - 48 * 60 * 60 * 1000;
  let high = approximate + 48 * 60 * 60 * 1000;
  while (low < high) {
    const middle = low + Math.floor((high - low) / 2);
    if (businessDateAt(middle, timezone) < date) low = middle + 1;
    else high = middle;
  }
  if (businessDateAt(low, timezone) !== date) {
    throw new RangeError(
      `Business date does not exist in ${timezone}: ${date}`,
    );
  }
  return new Date(low);
}

export function endOfBusinessDate(date: BusinessDate, timezone: string): Date {
  return startOfBusinessDate(addCalendarDays(date, 1), timezone);
}

export function businessWeekBounds(
  date: BusinessDate,
  timezone: string,
): {
  monday: BusinessDate;
  nextMonday: BusinessDate;
  start: Date;
  end: Date;
} {
  const monday = mondayOfWeek(date);
  const next = addCalendarDays(monday, 7);
  return {
    monday,
    nextMonday: next,
    start: startOfBusinessDate(monday, timezone),
    end: startOfBusinessDate(next, timezone),
  };
}

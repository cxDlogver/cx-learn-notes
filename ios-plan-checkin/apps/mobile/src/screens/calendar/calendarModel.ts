import type { CalendarDayDto } from "@plan-checkin/contracts";

export function shiftMonth(month: string, delta: number): string {
  const year = Number(month.slice(0, 4));
  const value = Number(month.slice(5, 7));
  const date = new Date(Date.UTC(year, value - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthCells(month: string): (string | null)[] {
  const year = Number(month.slice(0, 4));
  const value = Number(month.slice(5, 7));
  const first = new Date(Date.UTC(year, value - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, value, 0)).getUTCDate();
  return [
    ...Array<null>(offset).fill(null),
    ...Array.from(
      { length: days },
      (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`,
    ),
  ];
}

export function dayState(
  day: CalendarDayDto | undefined,
): "failure" | "unrecorded" | "success" | "skip" | "none" {
  if (!day) return "none";
  if (day.counts.failure) return "failure";
  if (day.counts.unrecorded) return "unrecorded";
  if (day.counts.success) return "success";
  if (day.counts.skip) return "skip";
  return "none";
}

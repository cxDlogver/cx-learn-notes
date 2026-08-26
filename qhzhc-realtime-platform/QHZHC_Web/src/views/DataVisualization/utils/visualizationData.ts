import type { LegacyTelemetryPoint } from "../services/realtimeTypes";

export interface DataEnvelope<T> {
  code: number;
  data: T[];
  message?: string;
  msg?: string;
  [key: string]: unknown;
}

export type ThresholdRange = readonly [number, number];

export const REALTIME_CHART_WINDOW_MS = 5 * 60 * 1000;

export function appendRealtimePoint<T extends object>(
  points: T[] | null | undefined,
  point: T | null | undefined,
  maxPoints = 300,
): T[] {
  const currentPoints = Array.isArray(points) ? points : [];
  if (!point || typeof point !== "object") {
    return currentPoints.slice(-maxPoints);
  }
  return [...currentPoints, point].slice(-maxPoints);
}

export function appendRealtimeBatch<T extends object>(
  points: T[] | null | undefined,
  incoming: T[] | null | undefined,
  maxPoints = 300,
): T[] {
  const currentPoints = Array.isArray(points) ? points : [];
  const nextPoints = Array.isArray(incoming)
    ? incoming.filter((point) => point && typeof point === "object")
    : [];
  if (!nextPoints.length) return currentPoints.slice(-maxPoints);
  return currentPoints.concat(nextPoints).slice(-maxPoints);
}

export function appendRealtimeTimeWindow<
  T extends { time?: string | number | Date },
>(
  points: T[] | null | undefined,
  incoming: T[] | null | undefined,
  windowMs = REALTIME_CHART_WINDOW_MS,
): T[] {
  const combined = [
    ...(Array.isArray(points) ? points : []),
    ...(Array.isArray(incoming) ? incoming : []),
  ];
  const timestamped = combined
    .map((point) => {
      const value = point && point.time;
      const timestamp =
        value instanceof Date
          ? value.getTime()
          : value === undefined || value === null
            ? Number.NaN
            : new Date(value).getTime();
      return { point, timestamp };
    })
    .filter(({ point, timestamp }) => {
      return Boolean(point) && Number.isFinite(timestamp);
    });

  if (!timestamped.length) {
    return [];
  }

  const end = Math.max(...timestamped.map(({ timestamp }) => timestamp));
  const start = end - windowMs;
  return timestamped
    .filter(({ timestamp }) => timestamp >= start && timestamp <= end)
    .map(({ point }) => point);
}

export function normalizeEnvelope<T = LegacyTelemetryPoint>(payload: unknown): DataEnvelope<T> {
  if (!payload || typeof payload !== "object") {
    throw new Error("response must be an object");
  }
  const envelope = payload as Partial<DataEnvelope<T>>;
  if (!Array.isArray(envelope.data)) {
    throw new Error("data must be an array");
  }
  if (!Number.isFinite(Number(envelope.code))) {
    throw new Error("code must be numeric");
  }
  return {
    ...envelope,
    code: Number(envelope.code),
  } as DataEnvelope<T>;
}

export function validateHistoryRange(
  day: string,
  range: readonly [string, string] | string[] | null | undefined,
): { start: string; end: string } {
  if (!day || !Array.isArray(range) || !range[0] || !range[1]) {
    throw new Error("请选择日期和完整时间范围");
  }

  const start = `${day} ${range[0]}`;
  const end = `${day} ${range[1]}`;
  const startDate = new Date(start.replace(/-/g, "/"));
  const endDate = new Date(end.replace(/-/g, "/"));
  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime()) ||
    startDate >= endDate
  ) {
    throw new Error("结束时间必须晚于开始时间");
  }

  return { start, end };
}

export function validateThresholdRanges(
  ranges: ReadonlyArray<ThresholdRange | number[]> | null | undefined,
): Array<[number, number]> {
  if (!Array.isArray(ranges) || !ranges.length) {
    throw new Error("阈值区间不能为空");
  }

  const normalizedRanges: Array<[number, number]> = ranges.map((range) => {
    const lower = Number(range && range[0]);
    const upper = Number(range && range[1]);
    if (!Number.isFinite(lower) || !Number.isFinite(upper)) {
      throw new Error("必须为有限数值");
    }
    if (lower >= upper) {
      throw new Error("下界必须小于上界");
    }
    return [lower, upper];
  });

  normalizedRanges.slice(1).forEach((range, index) => {
    if (range[0] !== normalizedRanges[index][1]) {
      throw new Error("区间必须连续");
    }
  });

  return normalizedRanges;
}

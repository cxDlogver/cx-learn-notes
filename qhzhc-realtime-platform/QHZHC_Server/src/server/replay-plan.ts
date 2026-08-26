import type { TelemetryPoint } from "../shared/index.js";
import { AppDatabase } from "./database.js";

export type ReplayPlan =
  | { kind: "none"; latestSequence: number }
  | {
      kind: "gap";
      requestedFrom: number;
      earliestAvailable: number;
      latestSequence: number;
    }
  | { kind: "replay"; latestSequence: number; points: TelemetryPoint[] };

export function createReplayPlan(
  database: AppDatabase,
  robotId: string,
  lastSequence: number,
  maximumPoints = 5_000,
): ReplayPlan {
  const latestSequence = database.latestSequence(robotId);
  if (latestSequence <= lastSequence) return { kind: "none", latestSequence };
  const requestedFrom = lastSequence + 1;
  const earliestAvailable = database.earliestSequence(robotId);
  if (
    requestedFrom < earliestAvailable ||
    latestSequence - lastSequence > maximumPoints
  ) {
    return {
      kind: "gap",
      requestedFrom,
      earliestAvailable,
      latestSequence,
    };
  }
  return {
    kind: "replay",
    latestSequence,
    points: database.telemetryBySequence(
      robotId,
      requestedFrom,
      latestSequence,
      maximumPoints,
    ),
  };
}

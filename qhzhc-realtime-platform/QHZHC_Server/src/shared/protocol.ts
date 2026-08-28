import type { SimulatorStatus, TelemetryPoint } from "./types.js";

export const PROTOCOL_VERSION = 1;
export const WS_CLOSE = {
  NORMAL: 1000,
  AUTHENTICATION_EXPIRED: 4001,
  FORBIDDEN: 4003,
  PROTOCOL_ERROR: 4100,
  SERVER_ERROR: 4500,
} as const;

export type ClientMessage =
  | {
      type: "authenticate";
      accessToken: string;
      protocolVersion: number;
      robotId: string;
      lastSequence: number;
    }
  | { type: "ping"; nonce: string; sentAt: number }
  | { type: "ack"; sequence: number }
  | { type: "resend"; fromSequence: number; toSequence: number };

export type ServerMessage =
  | {
      type: "welcome";
      protocolVersion: number;
      connectionId: string;
      robotId: string;
      heartbeatIntervalMs: number;
      latestSequence: number;
      resumedFrom: number;
    }
  | {
      type: "telemetry_batch";
      batchId: string;
      firstSequence: number;
      lastSequence: number;
      points: TelemetryPoint[];
      sentAt: number;
      replay: boolean;
    }
  | { type: "pong"; nonce: string; serverTime: number; latestSequence: number }
  | { type: "simulator_status"; status: SimulatorStatus }
  | {
      type: "gap";
      requestedFrom: number;
      earliestAvailable: number;
      latestSequence: number;
      action: "skip-to-latest";
    }
  | { type: "error"; code: string; message: string; recoverable: boolean };

export function isClientMessage(value: unknown): value is ClientMessage {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  switch (candidate.type) {
    case "authenticate":
      return (
        typeof candidate.accessToken === "string" &&
        candidate.accessToken.length > 0 &&
        candidate.protocolVersion === PROTOCOL_VERSION &&
        typeof candidate.robotId === "string" &&
        Number.isSafeInteger(candidate.lastSequence) &&
        Number(candidate.lastSequence) >= 0
      );
    case "ping":
      return typeof candidate.nonce === "string" && Number.isFinite(candidate.sentAt);
    case "ack":
      return Number.isSafeInteger(candidate.sequence) && Number(candidate.sequence) >= 0;
    case "resend":
      return (
        Number.isSafeInteger(candidate.fromSequence) &&
        Number.isSafeInteger(candidate.toSequence) &&
        Number(candidate.fromSequence) > 0 &&
        Number(candidate.toSequence) >= Number(candidate.fromSequence)
      );
    default:
      return false;
  }
}

export function serializeServerMessage(message: ServerMessage): string {
  return JSON.stringify(message);
}

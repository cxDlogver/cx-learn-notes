import { describe, expect, it } from "vitest";
import { PROTOCOL_VERSION, isClientMessage } from "../src/shared/index.js";

describe("WebSocket protocol validation", () => {
  it("accepts authenticate, ping, ack and bounded resend shapes", () => {
    expect(isClientMessage({
      type: "authenticate",
      accessToken: "header.payload.signature",
      protocolVersion: PROTOCOL_VERSION,
      robotId: "QH-ZHC-01",
      lastSequence: 0,
    })).toBe(true);
    expect(isClientMessage({ type: "ping", nonce: "1", sentAt: 1 })).toBe(true);
    expect(isClientMessage({ type: "ack", sequence: 9 })).toBe(true);
    expect(isClientMessage({ type: "resend", fromSequence: 4, toSequence: 9 })).toBe(true);
  });

  it("rejects unsupported versions and invalid sequence ranges", () => {
    expect(isClientMessage({
      type: "authenticate",
      accessToken: "header.payload.signature",
      protocolVersion: 99,
      robotId: "QH-ZHC-01",
      lastSequence: 0,
    })).toBe(false);
    expect(isClientMessage({
      type: "authenticate",
      accessToken: "",
      protocolVersion: PROTOCOL_VERSION,
      robotId: "QH-ZHC-01",
      lastSequence: 0,
    })).toBe(false);
    expect(isClientMessage({ type: "resend", fromSequence: 10, toSequence: 2 })).toBe(false);
    expect(isClientMessage({ type: "unknown" })).toBe(false);
  });
});

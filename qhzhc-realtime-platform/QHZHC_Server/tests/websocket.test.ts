import { createServer, type Server } from "node:http";
import { WebSocket } from "ws";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/server/app.js";
import { AuthService } from "../src/server/auth.js";
import { AppDatabase } from "../src/server/database.js";
import { RobotSocketHub } from "../src/server/robot-socket-hub.js";
import { TelemetrySimulator } from "../src/server/simulator.js";
import type { ServerMessage } from "../src/shared/index.js";

describe("RobotSocket WebSocket resume", () => {
  let database: AppDatabase;
  let simulator: TelemetrySimulator;
  let server: Server;
  let hub: RobotSocketHub;
  let port: number;
  let token: string;

  beforeEach(async () => {
    database = new AppDatabase(":memory:", 10_000);
    const auth = new AuthService(database, {
      accessTokenTtlMs: 60_000,
      refreshTokenTtlMs: 7 * 24 * 60 * 60 * 1000,
      jwtSecret: "test-secret-with-at-least-thirty-two-bytes",
    });
    token = (await auth.login("admin", "Admin@123456")).accessToken;
    simulator = new TelemetrySimulator(database);
    const app = createApp({ database, auth, simulator, disconnectClients: () => hub.disconnectAll() });
    server = createServer(app);
    hub = new RobotSocketHub(server, database, auth, simulator);
    simulator.setPublisher((points, status) => hub.publish(points, status));
    simulator.burst(8);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("missing test port");
    port = address.port;
  });

  afterEach(async () => {
    simulator.close();
    hub.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    database.close();
  });

  it("replays every stored point after the acknowledged cursor", async () => {
    const messages: ServerMessage[] = [];
    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws/robots/QH-ZHC-01`);
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("websocket replay timeout")), 2_000);
      socket.on("open", () => {
        socket.send(JSON.stringify({
          type: "authenticate",
          accessToken: token,
          protocolVersion: 1,
          robotId: "QH-ZHC-01",
          lastSequence: 3,
        }));
      });
      socket.on("message", (raw) => {
        messages.push(JSON.parse(raw.toString()) as ServerMessage);
        const replayed = messages
          .filter((message): message is Extract<ServerMessage, { type: "telemetry_batch" }> => message.type === "telemetry_batch")
          .flatMap((message) => message.points);
        if (replayed.length === 5) {
          clearTimeout(timeout);
          resolve();
        }
      });
      socket.on("error", reject);
    });
    const welcome = messages.find((message) => message.type === "welcome");
    const sequences = messages
      .filter((message): message is Extract<ServerMessage, { type: "telemetry_batch" }> => message.type === "telemetry_batch")
      .flatMap((message) => message.points.map((point) => point.sequence));
    expect(welcome).toMatchObject({ latestSequence: 8, resumedFrom: 3 });
    expect(sequences).toEqual([4, 5, 6, 7, 8]);
    socket.terminate();
  });

  it("broadcasts a newly committed simulator batch to an initialized client", async () => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws/robots/QH-ZHC-01`);
    const liveSequences = await new Promise<number[]>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("live broadcast timeout")), 2_000);
      socket.on("open", () => {
        socket.send(JSON.stringify({
          type: "authenticate",
          accessToken: token,
          protocolVersion: 1,
          robotId: "QH-ZHC-01",
          lastSequence: 8,
        }));
      });
      socket.on("message", (raw) => {
        const message = JSON.parse(raw.toString()) as ServerMessage;
        if (message.type === "welcome") simulator.burst(3);
        if (message.type === "telemetry_batch" && !message.replay) {
          clearTimeout(timeout);
          resolve(message.points.map((point) => point.sequence));
        }
      });
      socket.on("error", reject);
    });
    expect(liveSequences).toEqual([9, 10, 11]);
    socket.terminate();
  });

  it("accepts the upgrade but rejects a non-authentication first message", async () => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws/robots/QH-ZHC-01`);
    const code = await new Promise<number>((resolve, reject) => {
      socket.on("open", () => {
        socket.send(JSON.stringify({ type: "ping", nonce: "early", sentAt: Date.now() }));
      });
      socket.on("close", resolve);
      socket.on("error", reject);
    });
    expect(code).toBe(4100);
  });

  it("closes with 4001 when the first message carries an invalid access token", async () => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws/robots/QH-ZHC-01`);
    const code = await new Promise<number>((resolve, reject) => {
      socket.on("open", () => {
        socket.send(JSON.stringify({
          type: "authenticate",
          accessToken: "invalid.jwt.token",
          protocolVersion: 1,
          robotId: "QH-ZHC-01",
          lastSequence: 0,
        }));
      });
      socket.on("close", resolve);
      socket.on("error", reject);
    });
    expect(code).toBe(4001);
  });
});

import { randomUUID } from "node:crypto";
import type { IncomingMessage, Server } from "node:http";
import { WebSocket, WebSocketServer, type RawData } from "ws";
import {
  PROTOCOL_VERSION,
  WS_CLOSE,
  isClientMessage,
  serializeServerMessage,
  type ClientMessage,
  type ServerMessage,
  type SimulatorStatus,
  type TelemetryPoint,
  type UserSession,
} from "../shared/index.js";
import { AuthService } from "./auth.js";
import { AppDatabase } from "./database.js";
import { createReplayPlan } from "./replay-plan.js";
import { TelemetrySimulator } from "./simulator.js";

const HEARTBEAT_INTERVAL_MS = 8_000;
const CLIENT_STALE_AFTER_MS = 30_000;
const MAX_REPLAY_POINTS = 5_000;
const REPLAY_BATCH_SIZE = 250;

interface ClientContext {
  id: string;
  socket: WebSocket;
  user: UserSession;
  robotId: string;
  initialized: boolean;
  acknowledgedSequence: number;
  lastSeenAt: number;
  protocolAlive: boolean;
  cookieHeader: string | undefined;
  authTimer: NodeJS.Timeout;
}

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

export class RobotSocketHub {
  private readonly webSocketServer = new WebSocketServer({ noServer: true });
  private readonly clients = new Map<WebSocket, ClientContext>();
  private readonly heartbeatTimer: NodeJS.Timeout;

  constructor(
    server: Server,
    private readonly database: AppDatabase,
    private readonly auth: AuthService,
    private readonly simulator: TelemetrySimulator,
  ) {
    server.on("upgrade", (request, socket, head) => {
      const url = new URL(request.url ?? "/", "http://localhost");
      const match = /^\/ws\/robots\/([a-zA-Z0-9_-]+)$/.exec(url.pathname);
      if (!match) {
        socket.destroy();
        return;
      }
      const user = this.auth.sessionFromRequest(request);
      if (!user) {
        socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
        socket.destroy();
        return;
      }
      const robotId = match[1];
      if (!robotId) {
        socket.destroy();
        return;
      }
      this.webSocketServer.handleUpgrade(request, socket, head, (webSocket) => {
        this.accept(webSocket, request, user, robotId);
      });
    });
    this.heartbeatTimer = setInterval(() => this.checkHeartbeats(), HEARTBEAT_INTERVAL_MS);
  }

  connectionCount(): number {
    return this.clients.size;
  }

  publish(points: TelemetryPoint[], status: SimulatorStatus): void {
    for (const context of this.clients.values()) {
      if (!context.initialized) continue;
      if (points.length > 0) {
        const matching = points.filter((point) => point.robotId === context.robotId);
        const delivered = this.applyDeliveryConditions(matching, status);
        if (delivered.length > 0) this.sendTelemetry(context, delivered, false);
      }
      this.send(context, { type: "simulator_status", status });
    }
  }

  disconnectAll(reason = "模拟网络中断"): number {
    const count = this.clients.size;
    for (const context of this.clients.values()) {
      context.socket.close(1012, reason);
    }
    return count;
  }

  close(): void {
    clearInterval(this.heartbeatTimer);
    for (const context of this.clients.values()) {
      context.socket.close(WS_CLOSE.NORMAL, "服务关闭");
    }
    this.webSocketServer.close();
  }

  private accept(
    socket: WebSocket,
    _request: IncomingMessage,
    user: UserSession,
    robotId: string,
  ): void {
    const context: ClientContext = {
      id: randomUUID(),
      socket,
      user,
      robotId,
      initialized: false,
      acknowledgedSequence: 0,
      lastSeenAt: Date.now(),
      protocolAlive: true,
      cookieHeader: _request.headers.cookie,
      authTimer: setTimeout(() => {
        if (!context.initialized) socket.close(WS_CLOSE.PROTOCOL_ERROR, "hello timeout");
      }, 5_000),
    };
    this.clients.set(socket, context);
    socket.on("message", (raw) => this.onMessage(context, raw));
    socket.on("pong", () => {
      context.protocolAlive = true;
      context.lastSeenAt = Date.now();
    });
    socket.on("close", () => {
      clearTimeout(context.authTimer);
      this.clients.delete(socket);
    });
    socket.on("error", () => {
      // close 是统一清理入口；error 在浏览器和 Node 中都不携带稳定的业务语义。
    });
  }

  private onMessage(context: ClientContext, raw: RawData): void {
    context.lastSeenAt = Date.now();
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw.toString());
    } catch {
      context.socket.close(WS_CLOSE.PROTOCOL_ERROR, "invalid json");
      return;
    }
    if (!isClientMessage(parsed)) {
      context.socket.close(WS_CLOSE.PROTOCOL_ERROR, "invalid message");
      return;
    }
    if (!context.initialized && parsed.type !== "hello") {
      context.socket.close(WS_CLOSE.PROTOCOL_ERROR, "hello required");
      return;
    }
    this.routeMessage(context, parsed);
  }

  private routeMessage(context: ClientContext, message: ClientMessage): void {
    switch (message.type) {
      case "hello":
        this.handleHello(context, message);
        break;
      case "ping":
        this.send(context, {
          type: "pong",
          nonce: message.nonce,
          serverTime: Date.now(),
          latestSequence: this.database.latestSequence(context.robotId),
        });
        break;
      case "ack":
        context.acknowledgedSequence = Math.max(context.acknowledgedSequence, message.sequence);
        break;
      case "resend":
        this.handleResend(context, message.fromSequence, message.toSequence);
        break;
    }
  }

  private handleHello(
    context: ClientContext,
    message: Extract<ClientMessage, { type: "hello" }>,
  ): void {
    if (context.initialized || message.robotId !== context.robotId) {
      context.socket.close(WS_CLOSE.PROTOCOL_ERROR, "invalid hello");
      return;
    }
    clearTimeout(context.authTimer);
    const replayPlan = createReplayPlan(
      this.database,
      context.robotId,
      message.lastSequence,
      MAX_REPLAY_POINTS,
    );
    const latest = replayPlan.latestSequence;
    this.send(context, {
      type: "welcome",
      protocolVersion: PROTOCOL_VERSION,
      connectionId: context.id,
      robotId: context.robotId,
      heartbeatIntervalMs: HEARTBEAT_INTERVAL_MS,
      latestSequence: latest,
      resumedFrom: message.lastSequence,
    });

    if (replayPlan.kind === "gap") {
      this.sendGap(
        context,
        replayPlan.requestedFrom,
        replayPlan.earliestAvailable,
        replayPlan.latestSequence,
      );
    }
    if (replayPlan.kind === "replay") {
      for (const batch of chunk(replayPlan.points, REPLAY_BATCH_SIZE)) {
        this.sendTelemetry(context, batch, true);
      }
    }
    context.initialized = true;
    this.send(context, { type: "simulator_status", status: this.simulator.getStatus() });
  }

  private handleResend(context: ClientContext, from: number, to: number): void {
    const boundedTo = Math.min(to, from + MAX_REPLAY_POINTS - 1);
    const earliest = this.database.earliestSequence(context.robotId);
    const latest = this.database.latestSequence(context.robotId);
    if (from < earliest || from > latest) {
      this.sendGap(context, from, earliest, latest);
      return;
    }
    const points = this.database.telemetryBySequence(context.robotId, from, boundedTo);
    if (points.length === 0 || points[0]?.sequence !== from) {
      this.sendGap(context, from, earliest, latest);
      return;
    }
    for (const batch of chunk(points, REPLAY_BATCH_SIZE)) {
      this.sendTelemetry(context, batch, true);
    }
  }

  private sendGap(
    context: ClientContext,
    requestedFrom: number,
    earliestAvailable: number,
    latestSequence: number,
  ): void {
    this.send(context, {
      type: "gap",
      requestedFrom,
      earliestAvailable,
      latestSequence,
      action: "http-resync",
    });
  }

  private sendTelemetry(context: ClientContext, points: TelemetryPoint[], replay: boolean): void {
    const sequences = points.map((point) => point.sequence);
    this.send(context, {
      type: "telemetry_batch",
      batchId: randomUUID(),
      firstSequence: Math.min(...sequences),
      lastSequence: Math.max(...sequences),
      points,
      sentAt: Date.now(),
      replay,
    });
  }

  private applyDeliveryConditions(
    points: TelemetryPoint[],
    status: SimulatorStatus,
  ): TelemetryPoint[] {
    let delivered = points.filter(() => Math.random() >= status.config.deliveryDropRate);
    if (status.config.disorder === "reverse-batch") delivered = delivered.toReversed();
    if (status.config.disorder === "jitter") {
      delivered = delivered.toSorted(() => Math.random() - 0.5);
    }
    if (delivered.length > 0 && Math.random() < status.config.duplicateRate) {
      const duplicate = delivered[Math.floor(Math.random() * delivered.length)];
      if (duplicate) delivered = [...delivered, duplicate];
    }
    return delivered;
  }

  private send(context: ClientContext, message: ServerMessage): void {
    if (context.socket.readyState !== WebSocket.OPEN) return;
    if (context.socket.bufferedAmount > 2 * 1024 * 1024) {
      context.socket.close(1013, "client backpressure");
      return;
    }
    context.socket.send(serializeServerMessage(message));
  }

  private checkHeartbeats(): void {
    const now = Date.now();
    for (const context of this.clients.values()) {
      if (
        !this.auth.sessionFromRequest({
          headers: { cookie: context.cookieHeader },
        } as IncomingMessage)
      ) {
        context.socket.close(WS_CLOSE.SESSION_EXPIRED, "session expired");
        continue;
      }
      if (!context.protocolAlive || now - context.lastSeenAt > CLIENT_STALE_AFTER_MS) {
        context.socket.terminate();
        continue;
      }
      context.protocolAlive = false;
      context.socket.ping();
    }
  }
}

import { resolveApiBaseUrl } from "@/utils/apiBaseUrl";
import { FrameTelemetryQueue } from "./FrameTelemetryQueue";
import { OrderedTelemetryBuffer } from "./OrderedTelemetryBuffer";
import {
  toLegacyPoint,
  type ServerMessage,
  type TelemetryPoint,
} from "./realtimeTypes";

type RealtimeStatus = "connected" | "disconnected" | "error" | "invalid-packet";

interface RealtimeClientOptions {
  url: string;
  onPacket: (packet: { code: number; message: string; data: unknown[] }) => void;
  onStatus: (status: RealtimeStatus) => void;
  initialSequence?: number;
  WebSocketImpl?: typeof WebSocket;
  random?: () => number;
}

const PROTOCOL_VERSION = 1;
const ROBOT_ID = "QH-ZHC-01";

export default class RealtimeClient {
  private socket: WebSocket | null = null;
  private stopped = true;
  private attempt = 0;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private heartbeatIntervalMs = 8_000;
  private lastSeenAt = 0;
  private lastSequence: number;
  private lastResendKey = "";
  private readonly buffer: OrderedTelemetryBuffer;
  private readonly frameQueue: FrameTelemetryQueue;
  private readonly WebSocketImpl: typeof WebSocket;
  private readonly random: () => number;

  constructor(private readonly options: RealtimeClientOptions) {
    this.lastSequence = Math.max(0, Number(options.initialSequence) || 0);
    this.buffer = new OrderedTelemetryBuffer(this.lastSequence + 1);
    this.WebSocketImpl = options.WebSocketImpl || WebSocket;
    this.random = options.random || Math.random;
    this.frameQueue = new FrameTelemetryQueue((points) => this.publishFrame(points));
  }

  start(): void {
    if (!this.stopped) return;
    this.stopped = false;
    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);
    document.addEventListener("visibilitychange", this.handleVisibility);
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    this.clearReconnect();
    this.clearHeartbeat();
    this.frameQueue.stop();
    window.removeEventListener("online", this.handleOnline);
    window.removeEventListener("offline", this.handleOffline);
    document.removeEventListener("visibilitychange", this.handleVisibility);
    const socket = this.socket;
    this.socket = null;
    if (socket && socket.readyState < WebSocket.CLOSING) socket.close(1000, "page leave");
  }

  private connect(): void {
    if (
      this.stopped ||
      this.socket ||
      !navigator.onLine ||
      document.visibilityState === "hidden"
    ) return;
    let socket: WebSocket;
    try {
      socket = new this.WebSocketImpl(this.options.url);
    } catch (_error) {
      this.scheduleReconnect();
      return;
    }
    this.socket = socket;
    socket.onopen = () => {
      if (this.socket !== socket || this.stopped) return;
      this.lastSeenAt = Date.now();
      socket.send(JSON.stringify({
        type: "hello",
        protocolVersion: PROTOCOL_VERSION,
        robotId: ROBOT_ID,
        lastSequence: this.lastSequence,
      }));
    };
    socket.onmessage = (event) => {
      if (this.socket !== socket || this.stopped) return;
      this.lastSeenAt = Date.now();
      this.handleMessage(event.data);
    };
    socket.onerror = () => {
      if (!this.stopped) this.options.onStatus("error");
    };
    socket.onclose = (event) => {
      if (this.socket !== socket) return;
      this.socket = null;
      this.clearHeartbeat();
      if (!this.stopped) {
        if ([4001, 4003, 4100].includes(event.code)) {
          this.stopped = true;
          this.options.onStatus("error");
          return;
        }
        this.options.onStatus("disconnected");
        this.scheduleReconnect();
      }
    };
  }

  private handleMessage(raw: unknown): void {
    if (typeof raw !== "string") return;
    let message: ServerMessage;
    try {
      message = JSON.parse(raw) as ServerMessage;
    } catch (_error) {
      this.options.onStatus("invalid-packet");
      return;
    }
    if (message.type === "welcome") {
      this.attempt = 0;
      this.heartbeatIntervalMs = message.heartbeatIntervalMs;
      this.options.onStatus("connected");
      this.startHeartbeat();
      return;
    }
    if (message.type === "telemetry_batch") {
      const ordered = this.buffer.ingest(message.points);
      this.frameQueue.enqueue(ordered);
      const gap = this.buffer.currentGap();
      if (gap) this.requestResend(gap.fromSequence, gap.toSequence);
      return;
    }
    if (message.type === "pong") return;
    if (message.type === "gap") {
      void this.recoverGap(message.earliestAvailable);
      return;
    }
    if (message.type === "error") this.options.onStatus("error");
  }

  private publishFrame(points: TelemetryPoint[]): void {
    const latest = points[points.length - 1];
    if (!latest) return;
    this.lastSequence = latest.sequence;
    sessionStorage.setItem("qhzhc_last_sequence", String(this.lastSequence));
    this.send({ type: "ack", sequence: this.lastSequence });
    this.options.onPacket({
      code: 200,
      message: "ok",
      data: points.map(toLegacyPoint),
    });
  }

  private requestResend(fromSequence: number, toSequence: number): void {
    const key = `${fromSequence}-${toSequence}`;
    if (key === this.lastResendKey) return;
    this.lastResendKey = key;
    this.send({ type: "resend", fromSequence, toSequence });
    window.setTimeout(() => {
      if (this.lastResendKey === key) this.lastResendKey = "";
    }, 1000);
  }

  private async recoverGap(earliestAvailable: number): Promise<void> {
    try {
      const response = await fetch(
        `${resolveApiBaseUrl()}/api/telemetry/latest?robotId=${ROBOT_ID}&limit=5000`,
        { credentials: "include" },
      );
      if (!response.ok) throw new Error("HTTP resync failed");
      const payload = (await response.json()) as { points?: TelemetryPoint[] };
      const points = Array.isArray(payload.points) ? payload.points : [];
      const first = points[0];
      this.frameQueue.stop();
      this.buffer.reset(first?.sequence || earliestAvailable);
      this.frameQueue.enqueue(this.buffer.ingest(points));
    } catch (_error) {
      this.options.onStatus("error");
    }
  }

  private startHeartbeat(): void {
    this.clearHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
      if (Date.now() - this.lastSeenAt > this.heartbeatIntervalMs * 3) {
        this.socket.close(4000, "heartbeat timeout");
        return;
      }
      const now = Date.now();
      this.send({ type: "ping", nonce: String(now), sentAt: now });
    }, this.heartbeatIntervalMs);
  }

  private scheduleReconnect(): void {
    if (
      this.stopped ||
      this.reconnectTimer !== null ||
      !navigator.onLine ||
      document.visibilityState === "hidden"
    ) return;
    const ceiling = Math.min(15_000, 500 * 2 ** Math.min(this.attempt, 6));
    const delay = Math.max(250, Math.round(ceiling * this.random()));
    this.attempt += 1;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private send(message: object): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  private clearReconnect(): void {
    if (this.reconnectTimer !== null) window.clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private clearHeartbeat(): void {
    if (this.heartbeatTimer !== null) window.clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  private readonly handleOnline = (): void => {
    this.clearReconnect();
    this.connect();
  };

  private readonly handleOffline = (): void => {
    this.clearReconnect();
    this.prepareReplayFromLastRenderedPoint();
    if (this.socket && this.socket.readyState < WebSocket.CLOSING) this.socket.close();
    this.options.onStatus("disconnected");
  };

  private readonly handleVisibility = (): void => {
    if (this.stopped) return;
    if (document.visibilityState === "hidden") {
      this.clearReconnect();
      this.prepareReplayFromLastRenderedPoint();
      if (this.socket && this.socket.readyState < WebSocket.CLOSING) {
        this.socket.close(4002, "page hidden");
      }
      return;
    }
    if (!this.socket) {
      this.clearReconnect();
      this.connect();
    }
  };

  private prepareReplayFromLastRenderedPoint(): void {
    this.frameQueue.stop();
    this.buffer.reset(this.lastSequence + 1);
    this.lastResendKey = "";
  }
}

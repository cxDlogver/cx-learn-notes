import { performanceMonitor } from '@/services/performance/monitor';
import { accessTokenManager } from "@/services/accessToken";
import { handleUnauthenticated } from "@/utils/request";
import { FrameTelemetryQueue } from "./FrameTelemetryQueue";
import { OrderedTelemetryBuffer } from "./OrderedTelemetryBuffer";
import {
  toLegacyPoint,
  type ServerMessage,
  type TelemetryPoint,
} from "./realtimeTypes";

type RealtimeStatus =
  | "connected"
  | "disconnected"
  | "auth-recovering"
  | "error"
  | "invalid-packet";

interface RealtimeClientOptions {
  url: string;
  onPacket: (packet: { code: number; message: string; data: unknown[] }) => void;
  onStatus: (status: RealtimeStatus) => void;
  initialSequence?: number;
  WebSocketImpl?: typeof WebSocket;
  random?: () => number;
  getAccessToken?: () => string | null;
  refreshAccessToken?: () => Promise<string>;
  onAuthenticationFailure?: () => void | Promise<void>;
}

const PROTOCOL_VERSION = 1;
const ROBOT_ID = "QH-ZHC-01";

export default class RealtimeClient {
  private arrivals = new WeakMap<TelemetryPoint, { stamp: ReturnType<typeof performanceMonitor.stamp>; queued: number; replay: boolean }>();
  private pingStamps = new Map<string, ReturnType<typeof performanceMonitor.stamp>>();
  private disconnectedAt: ReturnType<typeof performanceMonitor.stamp> | null = null;
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
  private readonly getAccessToken: () => string | null;
  private readonly refreshAccessToken: () => Promise<string>;
  private readonly onAuthenticationFailure: () => void | Promise<void>;

  constructor(private readonly options: RealtimeClientOptions) {
    this.lastSequence = Math.max(0, Number(options.initialSequence) || 0);
    this.buffer = new OrderedTelemetryBuffer(this.lastSequence + 1);
    this.WebSocketImpl = options.WebSocketImpl || WebSocket;
    this.random = options.random || Math.random;
    this.getAccessToken =
      options.getAccessToken || (() => accessTokenManager.getAccessToken());
    this.refreshAccessToken =
      options.refreshAccessToken ||
      (() => accessTokenManager.refreshAccessToken());
    this.onAuthenticationFailure =
      options.onAuthenticationFailure || handleUnauthenticated;
    this.frameQueue = new FrameTelemetryQueue((points) => this.publishFrame(points), 300, 5, undefined, (stats) => { performanceMonitor.record('queueTake',stats.takeMs); performanceMonitor.record('queueCallback',stats.callbackMs); performanceMonitor.record('queueLength',stats.pending); performanceMonitor.record('queueOldest',stats.oldestWaitMs); });
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
    this.pingStamps.clear();
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
      const accessToken = this.getAccessToken();
      if (!accessToken) {
        socket.close(4001, "access token missing");
        return;
      }
      socket.send(JSON.stringify({
        type: "authenticate",
        accessToken,
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
      void this.handleClose(socket, event);
    };
  }

  private handleMessage(raw: unknown): void {
    const receivedStamp = performanceMonitor.stamp();
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
      performanceMonitor.event('connected');
      if(this.disconnectedAt){const elapsed=performanceMonitor.elapsed(this.disconnectedAt);if(elapsed!==null)performanceMonitor.record('reconnect',elapsed);this.disconnectedAt=null;}
      this.startHeartbeat();
      return;
    }
    if (message.type === "telemetry_batch") {
      performanceMonitor.record('received',message.points.length,'',message.replay?'replay':'realtime');
      for(const point of message.points)if(!this.arrivals.has(point))this.arrivals.set(point,{stamp:receivedStamp,queued:performance.now(),replay:message.replay});
      const ordered = this.buffer.ingest(message.points);
      const parseElapsed=performanceMonitor.elapsed(receivedStamp);if(parseElapsed!==null)performanceMonitor.record('parse',parseElapsed);
      for(const point of ordered){const timing=this.arrivals.get(point);if(timing)timing.queued=performance.now();}
      this.frameQueue.enqueue(ordered);
      const gap = this.buffer.currentGap();
      if (gap) this.requestResend(gap.fromSequence, gap.toSequence);
      return;
    }
    if (message.type === 'pong') { const stamp=this.pingStamps.get(message.nonce); if(stamp){const elapsed=performanceMonitor.elapsed(stamp);if(elapsed!==null)performanceMonitor.record('wsRtt',elapsed);this.pingStamps.delete(message.nonce);}return; }
    if (message.type === "gap") {
      performanceMonitor.record('gap',1);
      this.skipGap(message.latestSequence);
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
    const timing=this.arrivals.get(latest);
    if(timing)performanceMonitor.setContext({mode:timing.replay?'replay':'realtime'});
    const wait=timing&&performanceMonitor.elapsed(timing.stamp)!==null?performance.now()-timing.queued:null;
    if(wait!==null)performanceMonitor.record('queueWait',wait);
    performanceMonitor.record('consumed',points.length);
    this.options.onPacket({
      code: 200,
      message: "ok",
      data: points.map(toLegacyPoint),
    });
    if(timing){const elapsed=performanceMonitor.elapsed(timing.stamp);if(elapsed!==null)performanceMonitor.record("receiveApply",elapsed);}
    for(const point of points)this.arrivals.delete(point);
  }

  private requestResend(fromSequence: number, toSequence: number): void {
    const key = `${fromSequence}-${toSequence}`;
    if (key === this.lastResendKey) return;
    this.lastResendKey = key;
    performanceMonitor.record('resend',1);
    this.send({ type: "resend", fromSequence, toSequence });
    window.setTimeout(() => {
      if (this.lastResendKey === key) this.lastResendKey = "";
    }, 1000);
  }

  private skipGap(latestSequence: number): void {
    const resumeSequence = Number.isSafeInteger(latestSequence)
      ? Math.max(this.lastSequence, latestSequence)
      : this.lastSequence;
    this.frameQueue.stop();
    this.lastResendKey = "";
    this.lastSequence = resumeSequence;
    sessionStorage.setItem("qhzhc_last_sequence", String(this.lastSequence));
    this.buffer.reset(this.lastSequence + 1);
    this.send({ type: "ack", sequence: this.lastSequence });
  }

  private async handleClose(socket: WebSocket, event: CloseEvent): Promise<void> {
    if (this.socket !== socket) return;
    this.socket = null;
    this.clearHeartbeat();
    if (this.stopped) return;

    if (event.code === 4001) {
      this.options.onStatus("auth-recovering");
      try {
        await this.refreshAccessToken();
        if (!this.stopped) {
          this.attempt = 0;
          this.connect();
        }
      } catch (_error) {
        this.stopped = true;
        this.options.onStatus("error");
        await this.onAuthenticationFailure();
      }
      return;
    }

    if (event.code === 4003 || event.code === 4100) {
      this.stopped = true;
      this.options.onStatus("error");
      return;
    }

    this.options.onStatus("disconnected");
    performanceMonitor.record('disconnect',1);performanceMonitor.event('disconnect');if(!this.disconnectedAt)this.disconnectedAt=performanceMonitor.stamp();
    this.scheduleReconnect();
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
      if(this.pingStamps.size>=4)this.pingStamps.clear();
      this.pingStamps.set(String(now),performanceMonitor.stamp());
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

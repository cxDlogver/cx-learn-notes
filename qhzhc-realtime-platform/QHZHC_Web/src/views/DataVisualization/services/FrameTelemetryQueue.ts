import type { TelemetryPoint } from "./realtimeTypes";

export interface FrameScheduler {
  request(callback: FrameRequestCallback): number;
  cancel(handle: number): void;
  now(): number;
}

const browserFrameScheduler: FrameScheduler = {
  request: (callback) => window.requestAnimationFrame(callback),
  cancel: (handle) => window.cancelAnimationFrame(handle),
  now: () => performance.now(),
};

export class FrameTelemetryQueue {
  private queue: TelemetryPoint[] = [];
  private cursor = 0;
  private queuedAt: number[] = [];
  private frameHandle: number | null = null;

  constructor(
    private readonly onFrame: (points: TelemetryPoint[]) => void,
    private readonly maxPerFrame = 300,
    private readonly budgetMs = 5,
    private readonly scheduler: FrameScheduler = browserFrameScheduler,
    private readonly onDrain?: (stats: { takeMs: number; callbackMs: number; pending: number; oldestWaitMs: number }) => void,
  ) {}

  enqueue(points: TelemetryPoint[]): void {
    if (!points.length) return;
    this.queue.push(...points);
    if (this.onDrain) { const at = this.scheduler.now(); for (let i=0;i<points.length;i++) this.queuedAt.push(at); }
    if (this.frameHandle === null) {
      this.frameHandle = this.scheduler.request(() => this.flush());
    }
  }

  stop(): void {
    if (this.frameHandle !== null) this.scheduler.cancel(this.frameHandle);
    this.frameHandle = null;
    this.queue = [];
    this.queuedAt = [];
    this.cursor = 0;
  }

  private flush(): void {
    this.frameHandle = null;
    const startedAt = this.scheduler.now();
    const batch: TelemetryPoint[] = [];
    while (
      this.cursor < this.queue.length &&
      batch.length < this.maxPerFrame &&
      this.scheduler.now() - startedAt < this.budgetMs
    ) {
      const point = this.queue[this.cursor++];
      if (point) batch.push(point);
    }
    const takenAt = this.onDrain ? this.scheduler.now() : 0;
    if (batch.length) this.onFrame(batch);
    if (this.onDrain) this.onDrain({ takeMs: takenAt-startedAt, callbackMs: this.scheduler.now()-takenAt, pending: this.queue.length-this.cursor, oldestWaitMs: this.queue.length > this.cursor ? this.scheduler.now()-(this.queuedAt[this.cursor] || takenAt) : 0 });
    if (this.cursor > 2_000 && this.cursor * 2 > this.queue.length) {
      this.queue = this.queue.slice(this.cursor);
      if (this.onDrain) this.queuedAt = this.queuedAt.slice(this.cursor);
      this.cursor = 0;
    }
    if (this.cursor < this.queue.length) {
      this.frameHandle = this.scheduler.request(() => this.flush());
    } else {
      this.queue = [];
    this.queuedAt = [];
      this.cursor = 0;
    }
  }
}

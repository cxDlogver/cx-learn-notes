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
  private frameHandle: number | null = null;
  private paused = false;

  constructor(
    private readonly onFrame: (points: TelemetryPoint[]) => void,
    private readonly maxPerFrame = 1,
    private readonly budgetMs = 5,
    private readonly scheduler: FrameScheduler = browserFrameScheduler,
  ) {}

  enqueue(points: TelemetryPoint[]): void {
    if (!points.length) return;
    this.queue.push(...points);
    this.schedule();
  }

  peekNext(): TelemetryPoint | null {
    return this.queue[this.cursor] ?? null;
  }

  pause(): void {
    this.paused = true;
    if (this.frameHandle !== null) this.scheduler.cancel(this.frameHandle);
    this.frameHandle = null;
  }

  resume(): void {
    this.paused = false;
    this.schedule();
  }

  stop(): void {
    if (this.frameHandle !== null) this.scheduler.cancel(this.frameHandle);
    this.frameHandle = null;
    this.queue = [];
    this.cursor = 0;
    this.paused = false;
  }

  private schedule(): void {
    if (this.paused || this.frameHandle !== null || this.cursor >= this.queue.length) return;
    this.frameHandle = this.scheduler.request(() => this.flush());
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
    if (batch.length) this.onFrame(batch);
    if (this.cursor > 2_000 && this.cursor * 2 > this.queue.length) {
      this.queue = this.queue.slice(this.cursor);
      this.cursor = 0;
    }
    if (this.cursor < this.queue.length) {
      this.schedule();
    } else {
      this.queue = [];
      this.cursor = 0;
    }
  }
}

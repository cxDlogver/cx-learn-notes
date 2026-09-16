import type { FPSPerformanceMetric } from '../../protocol/payloads/performance';

export interface FPSCollectorOptions {
  sampleWindowMs: number;
  sampleIntervalMs: number;
  emit: (metric: FPSPerformanceMetric) => void;
}

function getTimeOrigin(): number {
  return typeof performance !== 'undefined' && Number.isFinite(performance.timeOrigin)
    ? performance.timeOrigin
    : Date.now();
}

export class FPSCollector {
  private active = false;
  private sampling = false;
  private animationFrameId: number | undefined;
  private intervalTimer: ReturnType<typeof setTimeout> | undefined;
  private firstFrameTime: number | undefined;
  private frameCount = 0;

  constructor(private readonly options: FPSCollectorOptions) {}

  start(visible: boolean): void {
    if (this.active) return;

    this.active = true;
    if (visible) this.startWindow();
  }

  pause(): void {
    this.cancelPendingWork();
  }

  resume(): void {
    if (!this.active) return;

    this.cancelPendingWork();
    this.startWindow();
  }

  stop(): void {
    this.active = false;
    this.cancelPendingWork();
  }

  private startWindow(): void {
    if (!this.active || this.sampling || typeof requestAnimationFrame !== 'function') return;

    this.sampling = true;
    this.firstFrameTime = undefined;
    this.frameCount = 0;
    this.animationFrameId = requestAnimationFrame(this.collectFrame);
  }

  private readonly collectFrame: FrameRequestCallback = (now) => {
    if (!this.active || !this.sampling) return;

    if (this.firstFrameTime === undefined) {
      this.firstFrameTime = now;
    } else {
      this.frameCount += 1;
    }

    const sampleDurationMs = now - this.firstFrameTime;
    if (sampleDurationMs >= this.options.sampleWindowMs) {
      this.sampling = false;
      this.animationFrameId = undefined;

      if (sampleDurationMs > 0 && this.frameCount > 0) {
        const timeOrigin = getTimeOrigin();
        this.options.emit({
          type: 'performance',
          name: 'FPS',
          id: `fps-${timeOrigin}-${now}`,
          value: (this.frameCount * 1000) / sampleDurationMs,
          unit: 'fps',
          kind: 'runtime',
          source: 'request-animation-frame',
          timestamp: timeOrigin + now,
          detail: {
            frameCount: this.frameCount,
            sampleDurationMs,
          },
        });
      }

      this.resetWindow();
      this.intervalTimer = setTimeout(() => {
        this.intervalTimer = undefined;
        this.startWindow();
      }, this.options.sampleIntervalMs);
      return;
    }

    this.animationFrameId = requestAnimationFrame(this.collectFrame);
  };

  private cancelPendingWork(): void {
    if (this.animationFrameId !== undefined && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.intervalTimer !== undefined) clearTimeout(this.intervalTimer);

    this.animationFrameId = undefined;
    this.intervalTimer = undefined;
    this.sampling = false;
    this.resetWindow();
  }

  private resetWindow(): void {
    this.firstFrameTime = undefined;
    this.frameCount = 0;
  }
}

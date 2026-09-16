import { observePerformanceEntries } from '../../instrumentation/performance-observer';
import type { LoAFPerformanceMetric } from '../../protocol/payloads/performance';

interface LongAnimationFrameEntry extends PerformanceEntry {
  readonly blockingDuration?: number;
  readonly renderStart?: number;
  readonly styleAndLayoutStart?: number;
  readonly scripts?: readonly unknown[];
}

export interface LoAFCollectorOptions {
  minDurationMs: number;
  maxEntriesPerVisit: number;
  emit: (metric: LoAFPerformanceMetric) => void;
}

function safeTiming(value: number | undefined): number {
  return value !== undefined && Number.isFinite(value) && value >= 0 ? value : 0;
}

function getTimeOrigin(): number {
  return typeof performance !== 'undefined' && Number.isFinite(performance.timeOrigin)
    ? performance.timeOrigin
    : Date.now();
}

export class LoAFCollector {
  private disconnect: (() => void) | undefined;
  private emittedEntries = 0;

  constructor(private readonly options: LoAFCollectorOptions) {}

  start(buffered: boolean): void {
    this.disconnect?.();
    this.disconnect = observePerformanceEntries(
      'long-animation-frame',
      (entry) => this.handleEntry(entry as LongAnimationFrameEntry),
      buffered,
    );
  }

  stop(): void {
    this.disconnect?.();
    this.disconnect = undefined;
  }

  resetVisit(): void {
    this.emittedEntries = 0;
  }

  private handleEntry(entry: LongAnimationFrameEntry): void {
    if (
      this.emittedEntries >= this.options.maxEntriesPerVisit ||
      !Number.isFinite(entry.duration) ||
      entry.duration < this.options.minDurationMs
    ) {
      return;
    }

    const startTime = safeTiming(entry.startTime);
    const timeOrigin = getTimeOrigin();
    this.emittedEntries += 1;
    this.options.emit({
      type: 'performance',
      name: 'LoAF',
      id: `loaf-${timeOrigin}-${startTime}`,
      value: entry.duration,
      unit: 'ms',
      kind: 'diagnostic',
      source: 'performance-observer',
      timestamp: timeOrigin + startTime,
      detail: {
        startTime,
        blockingDuration: safeTiming(entry.blockingDuration),
        renderStart: safeTiming(entry.renderStart),
        styleAndLayoutStart: safeTiming(entry.styleAndLayoutStart),
        scriptCount: Array.isArray(entry.scripts) ? entry.scripts.length : 0,
      },
    });
  }
}

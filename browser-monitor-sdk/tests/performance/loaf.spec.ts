import { afterEach, describe, expect, it, vi } from 'vitest';

import { LoAFCollector } from '../../src/collectors/performance/loaf';
import type { LoAFPerformanceMetric } from '../../src/protocol/payloads/performance';

class MockPerformanceObserver {
  static supportedEntryTypes = ['long-animation-frame'];
  static instances: MockPerformanceObserver[] = [];

  readonly observe = vi.fn();
  readonly disconnect = vi.fn();

  constructor(private readonly callback: PerformanceObserverCallback) {
    MockPerformanceObserver.instances.push(this);
  }

  emit(entries: PerformanceEntry[]): void {
    const list = {
      getEntries: () => entries,
    } as PerformanceObserverEntryList;
    this.callback(list, this as unknown as PerformanceObserver);
  }
}

function loafEntry(
  startTime: number,
  duration: number,
  scripts: readonly unknown[] = [],
): PerformanceEntry {
  return {
    name: 'long-animation-frame',
    entryType: 'long-animation-frame',
    startTime,
    duration,
    blockingDuration: Math.max(0, duration - 50),
    renderStart: startTime + 10,
    styleAndLayoutStart: startTime + 20,
    scripts,
  } as unknown as PerformanceEntry;
}

describe('LoAFCollector', () => {
  afterEach(() => {
    MockPerformanceObserver.instances = [];
    vi.unstubAllGlobals();
  });

  it('observes buffered entries, emits safe summaries, and enforces the visit limit', () => {
    vi.stubGlobal('PerformanceObserver', MockPerformanceObserver);
    const emitted: LoAFPerformanceMetric[] = [];
    const collector = new LoAFCollector({
      minDurationMs: 50,
      maxEntriesPerVisit: 2,
      emit: (metric) => emitted.push(metric),
    });

    collector.start(true);
    const observer = MockPerformanceObserver.instances[0];
    expect(observer?.observe).toHaveBeenCalledWith({
      type: 'long-animation-frame',
      buffered: true,
    });

    observer?.emit([
      loafEntry(10, 40),
      loafEntry(20, 60, [{ sourceURL: '/private?token=secret' }]),
      loafEntry(30, 80),
      loafEntry(40, 100),
    ]);

    expect(emitted).toHaveLength(2);
    expect(emitted[0]).toMatchObject({
      name: 'LoAF',
      value: 60,
      unit: 'ms',
      source: 'performance-observer',
      detail: {
        startTime: 20,
        blockingDuration: 10,
        renderStart: 30,
        styleAndLayoutStart: 40,
        scriptCount: 1,
      },
    });
    expect(JSON.stringify(emitted)).not.toContain('sourceURL');
    expect(JSON.stringify(emitted)).not.toContain('secret');

    collector.stop();
    expect(observer?.disconnect).toHaveBeenCalledOnce();
  });

  it('resets the entry limit for a bfcache visit and disables buffered replay', () => {
    vi.stubGlobal('PerformanceObserver', MockPerformanceObserver);
    const emitted: LoAFPerformanceMetric[] = [];
    const collector = new LoAFCollector({
      minDurationMs: 50,
      maxEntriesPerVisit: 1,
      emit: (metric) => emitted.push(metric),
    });

    collector.start(true);
    MockPerformanceObserver.instances[0]?.emit([loafEntry(10, 60), loafEntry(20, 70)]);
    collector.stop();
    collector.resetVisit();
    collector.start(false);
    MockPerformanceObserver.instances[1]?.emit([loafEntry(30, 80)]);

    expect(emitted.map((metric) => metric.value)).toEqual([60, 80]);
    expect(MockPerformanceObserver.instances[1]?.observe).toHaveBeenCalledWith({
      type: 'long-animation-frame',
      buffered: false,
    });
  });
});

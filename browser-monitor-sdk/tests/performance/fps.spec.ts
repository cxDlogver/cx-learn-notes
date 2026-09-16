import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FPSCollector } from '../../src/collectors/performance/fps';
import type { FPSPerformanceMetric } from '../../src/protocol/payloads/performance';

describe('FPSCollector', () => {
  let callbacks: Map<number, FrameRequestCallback>;
  let nextAnimationFrameId: number;

  const runFrame = (timestamp: number): void => {
    const pending = Array.from(callbacks.values());
    callbacks.clear();
    for (const callback of pending) callback(timestamp);
  };

  beforeEach(() => {
    vi.useFakeTimers();
    callbacks = new Map();
    nextAnimationFrameId = 0;
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        const id = ++nextAnimationFrameId;
        callbacks.set(id, callback);
        return id;
      }),
    );
    vi.stubGlobal(
      'cancelAnimationFrame',
      vi.fn((id: number) => {
        callbacks.delete(id);
      }),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it.each([60, 120])('measures an approximately %i Hz frame stream', (refreshRate) => {
    const emitted: FPSPerformanceMetric[] = [];
    const collector = new FPSCollector({
      sampleWindowMs: 5_000,
      sampleIntervalMs: 30_000,
      emit: (metric) => emitted.push(metric),
    });

    collector.start(true);
    const frameDuration = 1_000 / refreshRate;
    for (let frame = 0; frame <= refreshRate * 5; frame += 1) {
      runFrame(frame * frameDuration);
    }

    expect(emitted).toHaveLength(1);
    expect(emitted[0]?.value).toBeCloseTo(refreshRate, 4);
    expect(emitted[0]?.detail.frameCount).toBe(refreshRate * 5);
    expect(emitted[0]?.detail.sampleDurationMs).toBeCloseTo(5_000, 4);
    expect(emitted[0]?.unit).toBe('fps');
    expect(callbacks.size).toBe(0);

    vi.advanceTimersByTime(30_000);
    expect(callbacks.size).toBe(1);
  });

  it('includes stalled frame gaps in the measured rate', () => {
    const emitted: FPSPerformanceMetric[] = [];
    const collector = new FPSCollector({
      sampleWindowMs: 1_000,
      sampleIntervalMs: 30_000,
      emit: (metric) => emitted.push(metric),
    });

    collector.start(true);
    for (const timestamp of [0, 100, 200, 300, 400, 900, 1_000]) {
      runFrame(timestamp);
    }

    expect(emitted).toHaveLength(1);
    expect(emitted[0]?.value).toBe(6);
    expect(emitted[0]?.detail).toEqual({
      frameCount: 6,
      sampleDurationMs: 1_000,
    });
  });

  it('discards a partial window when paused and starts a fresh window when resumed', () => {
    const emitted: FPSPerformanceMetric[] = [];
    const collector = new FPSCollector({
      sampleWindowMs: 1_000,
      sampleIntervalMs: 30_000,
      emit: (metric) => emitted.push(metric),
    });

    collector.start(true);
    runFrame(0);
    runFrame(100);
    collector.pause();

    expect(callbacks.size).toBe(0);
    expect(emitted).toHaveLength(0);

    collector.resume();
    for (let timestamp = 2_000; timestamp <= 3_000; timestamp += 100) {
      runFrame(timestamp);
    }

    expect(emitted).toHaveLength(1);
    expect(emitted[0]?.value).toBe(10);
    expect(emitted[0]?.detail.frameCount).toBe(10);

    collector.stop();
    vi.advanceTimersByTime(30_000);
    expect(callbacks.size).toBe(0);
  });
});

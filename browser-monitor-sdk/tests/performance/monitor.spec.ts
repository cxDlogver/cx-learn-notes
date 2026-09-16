import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const webVitalsMock = vi.hoisted(() => {
  type Callback = (metric: unknown) => void;

  return {
    callbacks: new Map<string, Callback>(),
    onCLS: vi.fn((callback: Callback, options?: unknown) => {
      void options;
      webVitalsMock.callbacks.set('CLS', callback);
    }),
    onFCP: vi.fn((callback: Callback, options?: unknown) => {
      void options;
      webVitalsMock.callbacks.set('FCP', callback);
    }),
    onINP: vi.fn((callback: Callback, options?: unknown) => {
      void options;
      webVitalsMock.callbacks.set('INP', callback);
    }),
    onLCP: vi.fn((callback: Callback, options?: unknown) => {
      void options;
      webVitalsMock.callbacks.set('LCP', callback);
    }),
  };
});

vi.mock('web-vitals', () => ({
  onCLS: webVitalsMock.onCLS,
  onFCP: webVitalsMock.onFCP,
  onINP: webVitalsMock.onINP,
  onLCP: webVitalsMock.onLCP,
}));

import { createPerformanceMonitor } from '../../src';
import type { PerformanceMetric } from '../../src';

class MockPerformanceObserver {
  static supportedEntryTypes: string[] = [];
  static instances: MockPerformanceObserver[] = [];

  readonly observe = vi.fn();
  readonly disconnect = vi.fn();

  constructor(readonly callback: PerformanceObserverCallback) {
    MockPerformanceObserver.instances.push(this);
  }

  emit(entries: PerformanceEntry[]): void {
    const list = {
      getEntries: () => entries,
    } as PerformanceObserverEntryList;
    this.callback(list, this as unknown as PerformanceObserver);
  }
}

function vital(name: 'LCP' | 'FCP' | 'INP' | 'CLS', value: number): object {
  return {
    name,
    value,
    rating: 'good',
    delta: value,
    id: `v6-${name}`,
    entries: [],
    navigationType: 'navigate',
    navigationId: 0,
    navigationURL: 'https://example.test/private?token=secret',
  };
}

function loafEntry(startTime: number, duration: number): PerformanceEntry {
  return {
    name: 'long-animation-frame',
    entryType: 'long-animation-frame',
    startTime,
    duration,
    blockingDuration: Math.max(0, duration - 50),
    renderStart: startTime + 10,
    styleAndLayoutStart: startTime + 20,
    scripts: [],
  } as unknown as PerformanceEntry;
}

describe('createPerformanceMonitor', () => {
  beforeEach(() => {
    webVitalsMock.callbacks.clear();
    webVitalsMock.onCLS.mockClear();
    webVitalsMock.onFCP.mockClear();
    webVitalsMock.onINP.mockClear();
    webVitalsMock.onLCP.mockClear();
    MockPerformanceObserver.instances = [];
    MockPerformanceObserver.supportedEntryTypes = [
      'largest-contentful-paint',
      'paint',
      'event',
      'layout-shift',
      'long-animation-frame',
    ];
    vi.stubGlobal('PerformanceObserver', MockPerformanceObserver);
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1),
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('starts each enabled Web Vital once with stable-value reporting by default', () => {
    const monitor = createPerformanceMonitor();
    monitor.start();
    monitor.start();

    for (const registration of [
      webVitalsMock.onLCP,
      webVitalsMock.onFCP,
      webVitalsMock.onINP,
      webVitalsMock.onCLS,
    ]) {
      expect(registration).toHaveBeenCalledOnce();
      expect(registration.mock.calls[0]?.[1]).toEqual({ reportAllChanges: false });
    }

    expect(monitor.getCapabilities()).toEqual({
      LCP: true,
      FCP: true,
      INP: true,
      CLS: true,
      FPS: true,
      LoAF: true,
    });

    monitor.stop();
  });

  it('normalizes Web Vitals without exposing raw entries or navigation URLs', () => {
    const received: PerformanceMetric[] = [];
    const monitor = createPerformanceMonitor({ metrics: { FPS: false, LoAF: false } });
    monitor.subscribe((metric) => received.push(metric));
    monitor.start();

    webVitalsMock.callbacks.get('LCP')?.(vital('LCP', 1_800));
    webVitalsMock.callbacks.get('CLS')?.(vital('CLS', 0.05));

    expect(received).toHaveLength(2);
    expect(received[0]).toMatchObject({
      name: 'LCP',
      id: 'v6-LCP',
      value: 1_800,
      unit: 'ms',
      kind: 'core-web-vital',
      source: 'web-vitals',
      navigationType: 'navigate',
      navigationId: 0,
    });
    expect(received[1]).toMatchObject({ name: 'CLS', unit: 'score' });
    expect(JSON.stringify(received)).not.toContain('entries');
    expect(JSON.stringify(received)).not.toContain('navigationURL');
    expect(JSON.stringify(received)).not.toContain('secret');

    monitor.stop();
  });

  it('supports metric selection, change reporting, unsubscribe, and listener isolation', () => {
    const healthyListener = vi.fn();
    const monitor = createPerformanceMonitor({
      metrics: { FCP: false, FPS: false, LoAF: false },
      webVitals: { reportAllChanges: true },
    });
    monitor.subscribe(() => {
      throw new Error('consumer failure');
    });
    const unsubscribe = monitor.subscribe(healthyListener);
    monitor.start();

    expect(webVitalsMock.onFCP).not.toHaveBeenCalled();
    expect(webVitalsMock.onLCP.mock.calls[0]?.[1]).toEqual({ reportAllChanges: true });

    webVitalsMock.callbacks.get('LCP')?.(vital('LCP', 2_000));
    expect(healthyListener).toHaveBeenCalledOnce();

    unsubscribe();
    webVitalsMock.callbacks.get('LCP')?.(vital('LCP', 2_100));
    expect(healthyListener).toHaveBeenCalledOnce();

    monitor.stop();
  });

  it('stops owned work and suppresses delayed Web Vital callbacks', () => {
    const listener = vi.fn();
    const monitor = createPerformanceMonitor();
    monitor.subscribe(listener);
    monitor.start();

    const loafObserver = MockPerformanceObserver.instances[0];
    window.dispatchEvent(new Event('pagehide'));
    expect(loafObserver?.disconnect).toHaveBeenCalledOnce();

    const pageShow = new Event('pageshow');
    Object.defineProperty(pageShow, 'persisted', { value: true });
    window.dispatchEvent(pageShow);
    expect(MockPerformanceObserver.instances[1]?.observe).toHaveBeenCalledWith({
      type: 'long-animation-frame',
      buffered: false,
    });

    monitor.stop();
    monitor.stop();
    webVitalsMock.callbacks.get('LCP')?.(vital('LCP', 2_200));
    expect(listener).not.toHaveBeenCalled();
  });

  it('reports unsupported capabilities and does not register unavailable metrics', () => {
    MockPerformanceObserver.supportedEntryTypes = [];
    vi.stubGlobal('requestAnimationFrame', undefined);
    vi.stubGlobal('cancelAnimationFrame', undefined);

    const monitor = createPerformanceMonitor();
    monitor.start();

    expect(monitor.getCapabilities()).toEqual({
      LCP: false,
      FCP: false,
      INP: false,
      CLS: false,
      FPS: false,
      LoAF: false,
    });
    expect(webVitalsMock.onLCP).not.toHaveBeenCalled();
    expect(MockPerformanceObserver.instances).toHaveLength(0);

    monitor.stop();
  });

  it('falls back to safe defaults for invalid LoAF numeric options', () => {
    const received: PerformanceMetric[] = [];
    const monitor = createPerformanceMonitor({
      metrics: { LCP: false, FCP: false, INP: false, CLS: false, FPS: false },
      loaf: {
        minDurationMs: Number.NaN,
        maxEntriesPerVisit: -1,
      },
    });
    monitor.subscribe((metric) => received.push(metric));
    monitor.start();

    const entries = [
      loafEntry(1, 49),
      ...Array.from({ length: 21 }, (_, index) => loafEntry(index + 2, 50 + index)),
    ];
    MockPerformanceObserver.instances[0]?.emit(entries);

    expect(received).toHaveLength(20);
    expect(received[0]?.value).toBe(50);
    expect(received.at(-1)?.value).toBe(69);

    monitor.stop();
  });

  it('does not start FPS in a hidden document and samples immediately when visible', () => {
    let visibilityState: DocumentVisibilityState = 'hidden';
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibilityState);
    const monitor = createPerformanceMonitor({
      metrics: { LCP: false, FCP: false, INP: false, CLS: false, LoAF: false },
    });

    monitor.start();
    expect(requestAnimationFrame).not.toHaveBeenCalled();

    visibilityState = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    expect(requestAnimationFrame).toHaveBeenCalledOnce();

    monitor.stop();
  });
});

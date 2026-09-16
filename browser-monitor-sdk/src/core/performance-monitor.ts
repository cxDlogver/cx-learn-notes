import { FPSCollector } from '../collectors/performance/fps';
import { LoAFCollector } from '../collectors/performance/loaf';
import { startWebVitals } from '../collectors/performance/web-vitals';
import { supportsPerformanceEntry } from '../instrumentation/performance-observer';
import type {
  PerformanceCapabilityMap,
  PerformanceMetric,
  PerformanceMetricName,
} from '../protocol/payloads/performance';

const DEFAULT_SAMPLE_WINDOW_MS = 5_000;
const DEFAULT_SAMPLE_INTERVAL_MS = 30_000;
const DEFAULT_LOAF_MIN_DURATION_MS = 50;
const DEFAULT_LOAF_MAX_ENTRIES = 20;

export interface PerformanceMonitorOptions {
  metrics?: Partial<Record<PerformanceMetricName, boolean>>;
  webVitals?: {
    reportAllChanges?: boolean;
  };
  fps?: {
    sampleWindowMs?: number;
    sampleIntervalMs?: number;
  };
  loaf?: {
    minDurationMs?: number;
    maxEntriesPerVisit?: number;
  };
}

export interface PerformanceMonitor {
  start(): void;
  stop(): void;
  subscribe(listener: PerformanceMetricListener): () => void;
  getCapabilities(): PerformanceCapabilityMap;
}

export type PerformanceMetricListener = (metric: PerformanceMetric) => void;

interface NormalizedPerformanceMonitorOptions {
  metrics: Record<PerformanceMetricName, boolean>;
  reportAllChanges: boolean;
  fps: {
    sampleWindowMs: number;
    sampleIntervalMs: number;
  };
  loaf: {
    minDurationMs: number;
    maxEntriesPerVisit: number;
  };
}

function finitePositive(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) && value > 0 ? value : fallback;
}

function finiteNonNegative(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function normalizeOptions(options: PerformanceMonitorOptions): NormalizedPerformanceMonitorOptions {
  const enabled = (name: PerformanceMetricName): boolean => options.metrics?.[name] !== false;
  const maxEntries = finitePositive(options.loaf?.maxEntriesPerVisit, DEFAULT_LOAF_MAX_ENTRIES);

  return {
    metrics: {
      LCP: enabled('LCP'),
      FCP: enabled('FCP'),
      INP: enabled('INP'),
      CLS: enabled('CLS'),
      FPS: enabled('FPS'),
      LoAF: enabled('LoAF'),
    },
    reportAllChanges: options.webVitals?.reportAllChanges === true,
    fps: {
      sampleWindowMs: finitePositive(options.fps?.sampleWindowMs, DEFAULT_SAMPLE_WINDOW_MS),
      sampleIntervalMs: finiteNonNegative(
        options.fps?.sampleIntervalMs,
        DEFAULT_SAMPLE_INTERVAL_MS,
      ),
    },
    loaf: {
      minDurationMs: finiteNonNegative(options.loaf?.minDurationMs, DEFAULT_LOAF_MIN_DURATION_MS),
      maxEntriesPerVisit: Math.max(1, Math.floor(maxEntries)),
    },
  };
}

function detectCapabilities(): PerformanceCapabilityMap {
  return Object.freeze({
    LCP: supportsPerformanceEntry('largest-contentful-paint'),
    FCP: supportsPerformanceEntry('paint'),
    INP: supportsPerformanceEntry('event'),
    CLS: supportsPerformanceEntry('layout-shift'),
    FPS: typeof requestAnimationFrame === 'function' && typeof cancelAnimationFrame === 'function',
    LoAF: supportsPerformanceEntry('long-animation-frame'),
  });
}

class BrowserPerformanceMonitor implements PerformanceMonitor {
  private readonly options: NormalizedPerformanceMonitorOptions;
  private readonly capabilities = detectCapabilities();
  private readonly listeners = new Set<PerformanceMetricListener>();
  private readonly fpsCollector: FPSCollector | undefined;
  private readonly loafCollector: LoAFCollector | undefined;
  private state: 'idle' | 'running' | 'stopped' = 'idle';

  constructor(options: PerformanceMonitorOptions) {
    this.options = normalizeOptions(options);

    if (this.options.metrics.FPS && this.capabilities.FPS) {
      this.fpsCollector = new FPSCollector({
        ...this.options.fps,
        emit: (metric) => this.emit(metric),
      });
    }

    if (this.options.metrics.LoAF && this.capabilities.LoAF) {
      this.loafCollector = new LoAFCollector({
        ...this.options.loaf,
        emit: (metric) => this.emit(metric),
      });
    }
  }

  start(): void {
    if (this.state !== 'idle') return;

    this.state = 'running';
    startWebVitals({
      enabled: {
        LCP: this.options.metrics.LCP,
        FCP: this.options.metrics.FCP,
        INP: this.options.metrics.INP,
        CLS: this.options.metrics.CLS,
      },
      capabilities: this.capabilities,
      reportAllChanges: this.options.reportAllChanges,
      emit: (metric) => this.emit(metric),
    });

    this.loafCollector?.start(true);
    this.fpsCollector?.start(this.isDocumentVisible());

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', this.handlePageHide);
      window.addEventListener('pageshow', this.handlePageShow);
    }
  }

  stop(): void {
    if (this.state === 'stopped') return;

    this.state = 'stopped';
    this.fpsCollector?.stop();
    this.loafCollector?.stop();

    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('pagehide', this.handlePageHide);
      window.removeEventListener('pageshow', this.handlePageShow);
    }

    this.listeners.clear();
  }

  subscribe(listener: PerformanceMetricListener): () => void {
    if (this.state === 'stopped') return () => undefined;

    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getCapabilities(): PerformanceCapabilityMap {
    return this.capabilities;
  }

  private emit(metric: PerformanceMetric): void {
    if (this.state !== 'running' || !Number.isFinite(metric.value) || metric.value < 0) return;

    for (const listener of this.listeners) {
      try {
        listener(metric);
      } catch {
        // Monitoring consumers are isolated from each other and from the page.
      }
    }
  }

  private isDocumentVisible(): boolean {
    return typeof document === 'undefined' || document.visibilityState !== 'hidden';
  }

  private readonly handleVisibilityChange = (): void => {
    if (this.state !== 'running') return;

    if (this.isDocumentVisible()) this.fpsCollector?.resume();
    else this.fpsCollector?.pause();
  };

  private readonly handlePageHide = (): void => {
    if (this.state !== 'running') return;

    this.fpsCollector?.pause();
    this.loafCollector?.stop();
  };

  private readonly handlePageShow = (event: PageTransitionEvent): void => {
    if (this.state !== 'running' || !event.persisted) return;

    this.loafCollector?.resetVisit();
    this.loafCollector?.start(false);
    if (this.isDocumentVisible()) this.fpsCollector?.resume();
  };
}

export function createPerformanceMonitor(
  options: PerformanceMonitorOptions = {},
): PerformanceMonitor {
  return new BrowserPerformanceMonitor(options);
}

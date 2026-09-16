import { onCLS, onFCP, onINP, onLCP, type Metric } from 'web-vitals';

import type {
  PerformanceCapabilityMap,
  PerformanceMetricName,
  WebVitalPerformanceMetric,
} from '../../protocol/payloads/performance';

type WebVitalName = Extract<PerformanceMetricName, 'LCP' | 'FCP' | 'INP' | 'CLS'>;

interface WebVitalsOptions {
  enabled: Readonly<Record<WebVitalName, boolean>>;
  capabilities: PerformanceCapabilityMap;
  reportAllChanges: boolean;
  emit: (metric: WebVitalPerformanceMetric) => void;
}

function getMetricTimestamp(metric: Metric): number {
  const lastEntry = metric.entries[metric.entries.length - 1];

  if (
    lastEntry &&
    typeof performance !== 'undefined' &&
    Number.isFinite(performance.timeOrigin) &&
    Number.isFinite(lastEntry.startTime)
  ) {
    return performance.timeOrigin + lastEntry.startTime;
  }

  return Date.now();
}

export function normalizeWebVital(metric: Metric): WebVitalPerformanceMetric | undefined {
  if (metric.name === 'TTFB') return undefined;

  const common = {
    type: 'performance' as const,
    id: metric.id,
    value: metric.value,
    delta: metric.delta,
    rating: metric.rating,
    source: 'web-vitals' as const,
    timestamp: getMetricTimestamp(metric),
    navigationType: metric.navigationType,
    navigationId: metric.navigationId,
  };

  switch (metric.name) {
    case 'LCP':
      return { ...common, name: 'LCP', unit: 'ms', kind: 'core-web-vital' };
    case 'FCP':
      return { ...common, name: 'FCP', unit: 'ms', kind: 'diagnostic' };
    case 'INP':
      return { ...common, name: 'INP', unit: 'ms', kind: 'core-web-vital' };
    case 'CLS':
      return { ...common, name: 'CLS', unit: 'score', kind: 'core-web-vital' };
  }
}

export function startWebVitals(options: WebVitalsOptions): void {
  const onReport = (metric: Metric): void => {
    const normalized = normalizeWebVital(metric);
    if (normalized) options.emit(normalized);
  };
  const reportOptions = { reportAllChanges: options.reportAllChanges };

  const register = (name: WebVitalName, callback: () => void): void => {
    if (!options.enabled[name] || !options.capabilities[name]) return;

    try {
      callback();
    } catch {
      // A missing browser API must never affect the monitored application.
    }
  };

  register('LCP', () => onLCP(onReport, reportOptions));
  register('FCP', () => onFCP(onReport, reportOptions));
  register('INP', () => onINP(onReport, reportOptions));
  register('CLS', () => onCLS(onReport, reportOptions));
}

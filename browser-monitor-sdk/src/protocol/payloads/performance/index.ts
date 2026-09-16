export type PerformanceMetricName = 'LCP' | 'FCP' | 'INP' | 'CLS' | 'FPS' | 'LoAF';

export type PerformanceMetricRating = 'good' | 'needs-improvement' | 'poor';

export type PerformanceNavigationType =
  | 'navigate'
  | 'reload'
  | 'back-forward'
  | 'back-forward-cache'
  | 'prerender'
  | 'restore'
  | 'soft-navigation';

interface PerformanceMetricBase {
  type: 'performance';
  name: PerformanceMetricName;
  id: string;
  value: number;
  unit: 'ms' | 'score' | 'fps';
  kind: 'core-web-vital' | 'diagnostic' | 'runtime';
  source: 'web-vitals' | 'performance-observer' | 'request-animation-frame';
  /** Unix epoch time in milliseconds for the measurement represented by this record. */
  timestamp: number;
}

interface WebVitalMetricBase extends PerformanceMetricBase {
  source: 'web-vitals';
  delta: number;
  rating: PerformanceMetricRating;
  navigationType: PerformanceNavigationType;
  navigationId: number;
}

export interface LCPPerformanceMetric extends WebVitalMetricBase {
  name: 'LCP';
  value: number;
  unit: 'ms';
  kind: 'core-web-vital';
}

export interface FCPPerformanceMetric extends WebVitalMetricBase {
  name: 'FCP';
  value: number;
  unit: 'ms';
  kind: 'diagnostic';
}

export interface INPPerformanceMetric extends WebVitalMetricBase {
  name: 'INP';
  value: number;
  unit: 'ms';
  kind: 'core-web-vital';
}

export interface CLSPerformanceMetric extends WebVitalMetricBase {
  name: 'CLS';
  value: number;
  unit: 'score';
  kind: 'core-web-vital';
}

export interface FPSPerformanceMetric extends PerformanceMetricBase {
  name: 'FPS';
  unit: 'fps';
  kind: 'runtime';
  source: 'request-animation-frame';
  detail: {
    frameCount: number;
    sampleDurationMs: number;
  };
}

export interface LoAFPerformanceMetric extends PerformanceMetricBase {
  name: 'LoAF';
  unit: 'ms';
  kind: 'diagnostic';
  source: 'performance-observer';
  detail: {
    startTime: number;
    blockingDuration: number;
    renderStart: number;
    styleAndLayoutStart: number;
    scriptCount: number;
  };
}

export type WebVitalPerformanceMetric =
  | LCPPerformanceMetric
  | FCPPerformanceMetric
  | INPPerformanceMetric
  | CLSPerformanceMetric;

export type PerformanceMetric =
  | WebVitalPerformanceMetric
  | FPSPerformanceMetric
  | LoAFPerformanceMetric;

export type PerformanceCapabilityMap = Readonly<Record<PerformanceMetricName, boolean>>;

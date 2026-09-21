export { createMonitor, type Monitor, type MonitorCapabilities } from './core/monitor';
export type { MonitorOptions, RouteLocation } from './core/config';
export type {
  AppContextData,
  RuntimeContextData,
  TelemetryContext,
  UserContextData,
} from './protocol/context';
export type { CorrelationContext } from './protocol/correlation';
export type { TelemetryEnvelope } from './protocol/envelope';
export type {
  CustomEventPayload,
  PerformanceCapabilityMap,
  PerformanceMetricName,
  PerformanceMetricRating,
  PerformanceNavigationType,
  PerformancePayload,
  TelemetryPayload,
  ViewPayload,
  WebVitalPerformancePayload,
} from './protocol/payloads';

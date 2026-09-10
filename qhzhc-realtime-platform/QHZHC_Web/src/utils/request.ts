import { performanceMonitor } from "@/services/performance/monitor";
import { LogicalRequestMeasurement, type RetriableRequestConfig } from "@/services/httpAuth";
import axios, { type AxiosError, type AxiosRequestConfig } from "axios";
import { Message } from "element-ui";
import { accessTokenManager } from "@/services/accessToken";
import { applyAccessToken, createAuthErrorHandler } from "@/services/httpAuth";
import { resolveApiBaseUrl } from "./apiBaseUrl";

const service = axios.create({
  baseURL: resolveApiBaseUrl(),
  withCredentials: true,
  timeout: 30_000,
});

service.interceptors.request.use((config: AxiosRequestConfig) => {
  const monitored = config as RetriableRequestConfig;
  if (
    performanceMonitor.isActive &&
    !(config.url || "").includes("/api/admin/") &&
    !(config.url || "").includes("/api/performance/")
  ) {
    if (!monitored._performance)
      monitored._performance = new LogicalRequestMeasurement(
        performanceMonitor.stamp(),
        (config.url || "").split(/[?#]/)[0]
      );
    monitored._performance.attempts++;
  }
  return applyAccessToken(monitored, accessTokenManager.getAccessToken());
});

let unauthenticatedHandler: () => void | Promise<void> = () => undefined;

export function setUnauthenticatedHandler(handler: () => void | Promise<void>): void {
  unauthenticatedHandler = handler;
}

export async function handleUnauthenticated(): Promise<void> {
  sessionStorage.removeItem("qhzhc_authenticated");
  localStorage.removeItem("user");
  localStorage.removeItem("userform");
  await unauthenticatedHandler();
}

const handleAuthError = createAuthErrorHandler(
  service,
  accessTokenManager,
  handleUnauthenticated,
  (config) => finishPerformance(config, true)
);

function finishPerformance(
  config: RetriableRequestConfig | undefined,
  failed = false,
  cancelled = false
): void {
  const p = config?._performance;
  if (!p || p.done) return;
  p.done = true;
  const elapsed = performanceMonitor.elapsed(p.stamp);
  if (elapsed === null) return;
  performanceMonitor.record("apiDuration", elapsed, p.component);
  performanceMonitor.record("apiAttempts", p.attempts, p.component);
  performanceMonitor.record("apiFailure", failed && !cancelled ? 1 : 0, p.component);
  performanceMonitor.record("apiCancel", cancelled ? 1 : 0, p.component);
}
service.interceptors.response.use(
  (response) => {
    finishPerformance(response.config);
    return response;
  },
  async (rawError: AxiosError<{ message?: string; detail?: string }>) => {
    if (rawError.response?.status === 401) {
      try {
        const response = await handleAuthError(rawError);
        finishPerformance(rawError.config);
        return response;
      } catch (error) {
        finishPerformance(rawError.config, true);
        throw error;
      }
    } else {
      finishPerformance(rawError.config, true, axios.isCancel(rawError));
      Message.error(
        rawError.response?.data?.message || rawError.response?.data?.detail || rawError.message
      );
    }
    return Promise.reject(rawError);
  }
);

export default service;

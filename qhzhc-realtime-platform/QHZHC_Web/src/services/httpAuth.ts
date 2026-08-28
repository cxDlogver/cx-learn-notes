import type {
  AxiosError,
  AxiosRequestConfig,
  AxiosResponse,
} from "axios";
import type { AccessTokenManager } from "./accessToken";

export interface RetriableRequestConfig extends AxiosRequestConfig {
  _authRetry?: boolean;
}

interface HttpClient {
  request<T = unknown>(config: AxiosRequestConfig): Promise<AxiosResponse<T>>;
}

const NON_REFRESHABLE_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/refresh",
]);

function requestPath(url: string | undefined): string {
  if (!url) return "";
  try {
    return new URL(url, "http://local.test").pathname;
  } catch {
    return url;
  }
}

export function applyAccessToken(
  config: RetriableRequestConfig,
  accessToken: string | null,
): RetriableRequestConfig {
  if (!accessToken) return config;
  return {
    ...config,
    headers: {
      ...(config.headers || {}),
      Authorization: `Bearer ${accessToken}`,
    },
  };
}

export function createAuthErrorHandler(
  client: HttpClient,
  manager: AccessTokenManager,
  onUnauthenticated: () => void | Promise<void>,
): (error: AxiosError) => Promise<AxiosResponse> {
  return async (error) => {
    const config = error.config as RetriableRequestConfig | undefined;
    const path = requestPath(config?.url);
    if (error.response?.status === 401 && config?._authRetry) {
      manager.clearAccessToken();
      await onUnauthenticated();
      return Promise.reject(error);
    }
    if (
      error.response?.status !== 401 ||
      !config ||
      NON_REFRESHABLE_PATHS.has(path)
    ) {
      return Promise.reject(error);
    }

    try {
      const accessToken = await manager.refreshAccessToken();
      const retryConfig = applyAccessToken(
        { ...config, _authRetry: true },
        accessToken,
      );
      return client.request(retryConfig);
    } catch (refreshError) {
      manager.clearAccessToken();
      await onUnauthenticated();
      return Promise.reject(refreshError);
    }
  };
}

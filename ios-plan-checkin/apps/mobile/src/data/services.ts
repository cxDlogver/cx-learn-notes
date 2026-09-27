import { createContext, useContext } from "react";
import { QueryClient } from "@tanstack/react-query";
import {
  ApiClient,
  ApiRequestError,
  HttpRepository,
  type AppRepository,
} from "./repository";
import { MockRepository, MockSessionGateway } from "./mockRepository";
import { SessionManager } from "./session";
import {
  MemorySessionStore,
  secureSessionStore,
} from "../platform/sessionStore";

export interface AppServices {
  repository: AppRepository;
  session: SessionManager;
  queryClient: QueryClient;
  mockMode: boolean;
}

export const AppServicesContext = createContext<AppServices | null>(null);

export function useAppServices(): AppServices {
  const value = useContext(AppServicesContext);
  if (!value) throw new Error("AppServicesProvider 缺失");
  return value;
}

export function createAppServices(): AppServices {
  const mockMode =
    __DEV__ && process.env.EXPO_PUBLIC_USE_MOCK_REPOSITORY === "1";
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1, gcTime: 5 * 60_000 },
      mutations: { retry: false },
    },
  });
  if (mockMode) {
    const session = new SessionManager(
      new MemorySessionStore(),
      new MockSessionGateway(),
      () => false,
    );
    return { repository: new MockRepository(), session, queryClient, mockMode };
  }
  const configured = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!__DEV__ && (!configured || !configured.startsWith("https://")))
    throw new Error("Release 构建必须设置 HTTPS 的 EXPO_PUBLIC_API_BASE_URL");
  const baseUrl = configured ?? "http://127.0.0.1:3000/api/v1";
  const api = new ApiClient(baseUrl.replace(/\/$/, ""));
  const session = new SessionManager(
    secureSessionStore,
    api,
    (error) => error instanceof ApiRequestError && error.status === 401,
  );
  api.attachSession(session);
  return {
    repository: new HttpRepository(api),
    session,
    queryClient,
    mockMode,
  };
}

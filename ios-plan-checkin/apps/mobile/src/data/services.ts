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
import { LocalCache } from "./localCache";
import { localStore, type LocalStore } from "./localStore";
import { TodaySessionStore } from "./todaySession";
import { OutboxRunner } from "./outboxRunner";
import { IncrementalSync } from "./incrementalSync";
import { MediaRunner } from "./mediaRunner";
import { deviceId } from "../platform/deviceId";
import * as Network from "expo-network";
import {
  MemorySessionStore,
  secureSessionStore,
} from "../platform/sessionStore";

export interface AppServices {
  repository: AppRepository;
  session: SessionManager;
  queryClient: QueryClient;
  mockMode: boolean;
  localCache: LocalCache | null;
  localStore: LocalStore | null;
  todaySession: TodaySessionStore;
  outbox: OutboxRunner | null;
  incrementalSync: IncrementalSync | null;
  mediaRunner: MediaRunner | null;
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
  const todaySession = new TodaySessionStore();
  if (mockMode) {
    const session = new SessionManager(
      new MemorySessionStore(),
      new MockSessionGateway(),
      () => false,
    );
    return {
      repository: new MockRepository(),
      session,
      queryClient,
      mockMode,
      localCache: null,
      localStore: null,
      todaySession,
      outbox: null,
      incrementalSync: null,
      mediaRunner: null,
    };
  }
  const configured = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!__DEV__ && (!configured || !configured.startsWith("https://")))
    throw new Error("Release 构建必须设置 HTTPS 的 EXPO_PUBLIC_API_BASE_URL");
  if (
    !__DEV__ &&
    ![
      process.env.EXPO_PUBLIC_TERMS_URL,
      process.env.EXPO_PUBLIC_PRIVACY_URL,
    ].every((url) => url?.startsWith("https://"))
  )
    throw new Error("Release 构建必须配置 HTTPS 服务协议与隐私政策地址");
  const baseUrl = configured ?? "http://127.0.0.1:3000/api/v1";
  const api = new ApiClient(baseUrl.replace(/\/$/, ""));
  const session = new SessionManager(
    secureSessionStore,
    api,
    (error) => error instanceof ApiRequestError && error.status === 401,
    localStore,
  );
  api.attachSession(session);
  const localCache = new LocalCache(localStore);
  const accountId = () => {
    const current = session.getSnapshot();
    return current.phase === "authenticated" ? current.userId : null;
  };
  const mediaRunner = new MediaRunner(api, localCache, accountId, async () => {
    await queryClient.invalidateQueries({ queryKey: ["sync-media"] });
    await queryClient.invalidateQueries({ queryKey: ["checkin"] });
    await queryClient.invalidateQueries({ queryKey: ["plan-detail"] });
  });
  const outbox = new OutboxRunner(
    localCache,
    accountId,
    (operation) =>
      api.put(
        `/plans/${encodeURIComponent(operation.planId)}/checkins/${operation.businessDate}`,
        operation.payload,
        operation.operationId,
      ),
    async () => {
      try {
        const state = await Network.getNetworkStateAsync();
        return (
          state.isConnected !== false && state.isInternetReachable !== false
        );
      } catch {
        return true;
      }
    },
    async () => {
      await queryClient.invalidateQueries({ queryKey: ["sync-feedback"] });
      await queryClient.invalidateQueries({ queryKey: ["today"] });
      await queryClient.invalidateQueries({ queryKey: ["calendar"] });
      await queryClient.invalidateQueries({ queryKey: ["plan-detail"] });
      await queryClient.invalidateQueries({ queryKey: ["checkin"] });
      void mediaRunner.trigger().catch(() => {});
    },
  );
  const incrementalSync = new IncrementalSync(
    api,
    localCache,
    accountId,
    deviceId,
    async (changes) => {
      if (
        changes.some(
          (item) => item.entityType === "share" || item.entityType === "friend",
        )
      ) {
        queryClient.removeQueries({ queryKey: ["friends"] });
        queryClient.removeQueries({ queryKey: ["shared-plan"] });
        queryClient.removeQueries({ queryKey: ["share-preview"] });
        queryClient.removeQueries({ queryKey: ["plan-shares"] });
      }
      if (
        changes.some(
          (item) => item.entityType === "plan" || item.entityType === "checkin",
        )
      ) {
        todaySession.clear();
        await queryClient.invalidateQueries({ queryKey: ["today"] });
        await queryClient.invalidateQueries({ queryKey: ["calendar"] });
        await queryClient.invalidateQueries({ queryKey: ["plan-detail"] });
        await queryClient.invalidateQueries({ queryKey: ["checkin"] });
        await queryClient.invalidateQueries({ queryKey: ["plans"] });
      }
      if (changes.some((item) => item.entityType === "group"))
        await queryClient.invalidateQueries({ queryKey: ["groups"] });
      if (changes.some((item) => item.entityType === "user"))
        await queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  );
  return {
    repository: new HttpRepository(api, localCache, session, outbox),
    session,
    queryClient,
    mockMode,
    localCache,
    localStore,
    todaySession,
    outbox,
    incrementalSync,
    mediaRunner,
  };
}

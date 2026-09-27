import type {
  ApiError,
  ApiSuccess,
  AuthTokens,
  CalendarMonthDto,
  PlanDetailDto,
  PlanDto,
  TodayDto,
} from "@plan-checkin/contracts";
import * as Crypto from "expo-crypto";
import type { SessionGateway } from "./session";
import { SessionManager } from "./session";

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly requestId: string | null,
  ) {
    super(message);
  }
}

export interface AppRepository {
  getToday(): Promise<TodayDto>;
  getCalendar(month: string, groupId?: string): Promise<CalendarMonthDto>;
  listPlans(): Promise<PlanDto[]>;
  getPlan(id: string): Promise<PlanDto>;
  getPlanDetail(id: string): Promise<PlanDetailDto>;
}

export class ApiClient implements SessionGateway {
  private session: SessionManager | null = null;

  constructor(private readonly baseUrl: string) {}

  attachSession(session: SessionManager): void {
    this.session = session;
  }

  private async send<T>(
    path: string,
    options: RequestInit,
    bearer?: string,
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          "X-Client-Request-Id": Crypto.randomUUID(),
          ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
          ...options.headers,
        },
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const failure = body as Partial<ApiError> | null;
        throw new ApiRequestError(
          response.status,
          failure?.code ?? "NETWORK_ERROR",
          failure?.message ?? "请求失败，请稍后重试",
          failure?.requestId ?? null,
        );
      }
      if (!body || typeof body !== "object" || !("data" in body))
        throw new ApiRequestError(
          502,
          "INVALID_RESPONSE",
          "服务响应格式不正确",
          null,
        );
      return (body as ApiSuccess<T>).data;
    } finally {
      clearTimeout(timer);
    }
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const digest = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      refreshToken,
    );
    const idempotencyKey = `${digest.slice(0, 8)}-${digest.slice(8, 12)}-4${digest.slice(13, 16)}-8${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
    return this.send<AuthTokens>("/auth/refresh", {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({ refreshToken }),
    });
  }

  async get<T>(path: string): Promise<T> {
    if (!this.session) throw new Error("SessionManager 尚未接入");
    const accessToken = await this.session.accessToken();
    try {
      return await this.send<T>(path, { method: "GET" }, accessToken);
    } catch (error) {
      if (!(error instanceof ApiRequestError) || error.status !== 401)
        throw error;
      const refreshed = await this.session.accessToken(true);
      try {
        return await this.send<T>(path, { method: "GET" }, refreshed);
      } catch (retryError) {
        if (retryError instanceof ApiRequestError && retryError.status === 401)
          await this.session.clear();
        throw retryError;
      }
    }
  }
}

export class HttpRepository implements AppRepository {
  constructor(private readonly api: ApiClient) {}

  getToday(): Promise<TodayDto> {
    return this.api.get("/today");
  }
  getCalendar(month: string, groupId?: string): Promise<CalendarMonthDto> {
    const query = new URLSearchParams({ month });
    if (groupId) query.set("groupId", groupId);
    return this.api.get(`/calendar?${query.toString()}`);
  }
  listPlans(): Promise<PlanDto[]> {
    return this.api.get("/plans");
  }
  getPlan(id: string): Promise<PlanDto> {
    return this.api.get(`/plans/${encodeURIComponent(id)}`);
  }
  getPlanDetail(id: string): Promise<PlanDetailDto> {
    return this.api.get(`/plans/${encodeURIComponent(id)}/detail`);
  }
}

import type {
  ApiError,
  ApiSuccess,
  AuthTokens,
  CalendarMonthDto,
  CreateGroupRequest,
  CreatePlanRequest,
  GroupDto,
  PlanDetailDto,
  PlanDto,
  SmsChallengeDto,
  UserDto,
  UsernameAvailabilityDto,
  TodayDto,
  UpdateGroupRequest,
  UpdatePlanRequest,
} from "@plan-checkin/contracts";
import * as Crypto from "expo-crypto";
import type { SessionGateway } from "./session";
import { SessionManager } from "./session";
import { deviceId } from "../platform/deviceId";

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
  createSmsChallenge(phone: string): Promise<SmsChallengeDto>;
  verifySms(
    challengeId: string,
    code: string,
    idempotencyKey: string,
  ): Promise<AuthTokens>;
  getMe(): Promise<UserDto>;
  checkUsername(username: string): Promise<UsernameAvailabilityDto>;
  updateMe(input: {
    username: string;
    nickname: string;
    baseRevision: number;
  }): Promise<UserDto>;
  getToday(): Promise<TodayDto>;
  getCalendar(month: string, groupId?: string): Promise<CalendarMonthDto>;
  listPlans(): Promise<PlanDto[]>;
  getPlan(id: string): Promise<PlanDto>;
  getPlanDetail(id: string): Promise<PlanDetailDto>;
  listGroups(): Promise<GroupDto[]>;
  createGroup(input: CreateGroupRequest): Promise<GroupDto>;
  updateGroup(id: string, input: UpdateGroupRequest): Promise<GroupDto>;
  deleteGroup(id: string, baseRevision: number): Promise<void>;
  createPlan(input: CreatePlanRequest): Promise<PlanDto>;
  updatePlan(id: string, input: UpdatePlanRequest): Promise<PlanDto>;
  transitionPlan(
    id: string,
    action: "pause" | "resume" | "archive",
    baseRevision: number,
  ): Promise<PlanDto>;
  deletePlan(id: string, baseRevision: number): Promise<void>;
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
      let response: Response;
      try {
        response = await fetch(`${this.baseUrl}${path}`, {
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
      } catch {
        throw new ApiRequestError(
          0,
          "NETWORK_ERROR",
          "当前无法连接服务器，请联网后重试",
          null,
        );
      }
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

  postWithoutSession<T>(
    path: string,
    body: unknown,
    headers: Record<string, string> = {},
  ): Promise<T> {
    return this.send<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Idempotency-Key": Crypto.randomUUID(), ...headers },
    });
  }

  async patch<T>(path: string, body: unknown): Promise<T> {
    return this.authorized<T>(path, "PATCH", body);
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return this.authorized<T>(path, "POST", body);
  }

  delete<T>(path: string, headers: Record<string, string> = {}): Promise<T> {
    return this.authorized<T>(path, "DELETE", undefined, headers);
  }

  private async authorized<T>(
    path: string,
    method: "PATCH" | "POST" | "DELETE",
    body?: unknown,
    headers: Record<string, string> = {},
  ): Promise<T> {
    if (!this.session) throw new Error("SessionManager 尚未接入");
    const options: RequestInit = {
      method,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      headers: { "Idempotency-Key": Crypto.randomUUID(), ...headers },
    };
    const accessToken = await this.session.accessToken();
    try {
      return await this.send<T>(path, options, accessToken);
    } catch (error) {
      if (!(error instanceof ApiRequestError) || error.status !== 401)
        throw error;
      try {
        return await this.send<T>(
          path,
          options,
          await this.session.accessToken(true),
        );
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

  createSmsChallenge(phone: string): Promise<SmsChallengeDto> {
    return this.api.postWithoutSession("/auth/sms/challenges", {
      countryCode: "+86",
      phone,
      purpose: "login",
    });
  }
  async verifySms(
    challengeId: string,
    code: string,
    idempotencyKey: string,
  ): Promise<AuthTokens> {
    return this.api.postWithoutSession(
      "/auth/sms/verify",
      { challengeId, code },
      {
        "X-Device-Id": await deviceId(),
        "Idempotency-Key": idempotencyKey,
      },
    );
  }
  getMe(): Promise<UserDto> {
    return this.api.get("/me");
  }
  checkUsername(username: string): Promise<UsernameAvailabilityDto> {
    return this.api.get(
      `/usernames/availability?username=${encodeURIComponent(username)}`,
    );
  }
  updateMe(input: {
    username: string;
    nickname: string;
    baseRevision: number;
  }): Promise<UserDto> {
    return this.api.patch("/me", input);
  }

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
  listGroups(): Promise<GroupDto[]> {
    return this.api.get("/groups");
  }
  createGroup(input: CreateGroupRequest): Promise<GroupDto> {
    return this.api.post("/groups", input);
  }
  updateGroup(id: string, input: UpdateGroupRequest): Promise<GroupDto> {
    return this.api.patch(`/groups/${encodeURIComponent(id)}`, input);
  }
  async deleteGroup(id: string, baseRevision: number): Promise<void> {
    await this.api.delete(
      `/groups/${encodeURIComponent(id)}?baseRevision=${baseRevision}`,
    );
  }
  createPlan(input: CreatePlanRequest): Promise<PlanDto> {
    return this.api.post("/plans", input);
  }
  updatePlan(id: string, input: UpdatePlanRequest): Promise<PlanDto> {
    return this.api.patch(`/plans/${encodeURIComponent(id)}`, input);
  }
  transitionPlan(
    id: string,
    action: "pause" | "resume" | "archive",
    baseRevision: number,
  ): Promise<PlanDto> {
    return this.api.post(`/plans/${encodeURIComponent(id)}/${action}`, {
      baseRevision,
    });
  }
  async deletePlan(id: string, baseRevision: number): Promise<void> {
    await this.api.delete(
      `/plans/${encodeURIComponent(id)}?baseRevision=${baseRevision}`,
      { "X-Confirm-Delete": "true" },
    );
  }
}

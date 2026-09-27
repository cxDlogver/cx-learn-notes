import type {
  ApiError,
  ApiSuccess,
  AuthTokens,
  CalendarMonthDto,
  CalendarDayDto,
  CalendarEntryDto,
  CheckinDto,
  CheckinConflictDetails,
  CreateGroupRequest,
  CreatePlanRequest,
  GroupDto,
  PlanDetailDto,
  PlanDto,
  OneTimeResolutionDto,
  OneTimeResolutionRequest,
  PutCheckinRequest,
  SmsChallengeDto,
  UserDto,
  UsernameAvailabilityDto,
  TodayDto,
  TodayItemDto,
  UpdateGroupRequest,
  UpdatePlanRequest,
} from "@plan-checkin/contracts";
import * as Crypto from "expo-crypto";
import * as Network from "expo-network";
import {
  businessDateAt,
  isoWeekday,
  parseBusinessDate,
} from "@plan-checkin/domain";
import type { SessionGateway } from "./session";
import { SessionManager } from "./session";
import { deviceId } from "../platform/deviceId";
import type { CheckinSyncState, LocalCache } from "./localCache";
import type { OutboxRunner } from "./outboxRunner";

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly requestId: string | null,
    readonly retryAfterMs: number | null = null,
    readonly details: Record<string, unknown> | null = null,
  ) {
    super(message);
  }
}

export type RecordSaveResult =
  | { source: "server"; record: CheckinDto }
  | {
      source: "local";
      record: CheckinDto;
      operationId: string;
      syncState: CheckinSyncState;
    };

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
  getToday(): Promise<TodayDto & { source?: "server" | "local" }>;
  getCalendar(
    month: string,
    groupId?: string,
  ): Promise<
    CalendarMonthDto & { source?: "server" | "local"; pendingCount?: number }
  >;
  getPlanCalendar(
    planId: string,
    month: string,
  ): Promise<
    CalendarMonthDto & { source?: "server" | "local"; pendingCount?: number }
  >;
  listPlans(): Promise<PlanDto[]>;
  listPlansWithSource(): Promise<{
    items: PlanDto[];
    source: "server" | "local";
  }>;
  getPlan(id: string): Promise<PlanDto>;
  getPlanDetail(
    id: string,
  ): Promise<
    PlanDetailDto & { source?: "server" | "local"; pendingCount?: number }
  >;
  getCheckin(planId: string, businessDate: string): Promise<CheckinDto>;
  resolveCheckinConflict(
    planId: string,
    businessDate: string,
    choice: "server" | "local",
  ): Promise<CheckinDto>;
  saveCheckin(
    plan: PlanDto,
    businessDate: string,
    input: PutCheckinRequest,
  ): Promise<RecordSaveResult>;
  resolveOneTime(
    planId: string,
    input: OneTimeResolutionRequest,
  ): Promise<OneTimeResolutionDto>;
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
          (() => {
            const value = response.headers.get("Retry-After");
            if (!value) return null;
            const seconds = Number(value);
            return Number.isFinite(seconds) && seconds >= 0
              ? seconds * 1000
              : Math.max(0, Date.parse(value) - Date.now()) || null;
          })(),
          failure?.details ?? null,
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
    method: "PATCH" | "POST" | "PUT" | "DELETE",
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

  put<T>(path: string, body: unknown, idempotencyKey: string): Promise<T> {
    return this.authorized<T>(path, "PUT", body, {
      "Idempotency-Key": idempotencyKey,
    });
  }
}

export class HttpRepository implements AppRepository {
  constructor(
    private readonly api: ApiClient,
    private readonly localCache?: LocalCache,
    private readonly session?: SessionManager,
    private readonly outbox?: OutboxRunner,
  ) {}

  private accountId(): string | null {
    const snapshot = this.session?.getSnapshot();
    return snapshot?.phase === "authenticated" ? snapshot.userId : null;
  }

  private async cachePlans(
    plans: PlanDto[],
    completeList = false,
  ): Promise<void> {
    const accountId = this.accountId();
    if (accountId && this.localCache) {
      try {
        await this.localCache.upsertPlans(accountId, plans, completeList);
      } catch {
        // A successful server write stays successful if the local mirror is unavailable.
      }
    }
  }

  private async invalidateLocalViews(planId: string): Promise<void> {
    const accountId = this.accountId();
    if (accountId && this.localCache) {
      try {
        await this.localCache.invalidateViewSnapshots(accountId, planId);
      } catch {
        /* A completed server write remains successful. */
      }
    }
  }

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

  async getToday(): Promise<TodayDto & { source?: "server" | "local" }> {
    try {
      const today = await this.api.get<TodayDto>("/today");
      await this.cachePlans(today.items.map((item) => item.plan));
      const accountId = this.accountId();
      if (accountId && this.localCache) {
        try {
          await this.localCache.saveTodaySnapshot(accountId, today);
        } catch {
          /* Remote response remains usable. */
        }
      }
      return { ...today, source: "server" };
    } catch (error) {
      const accountId = this.accountId();
      if (!(
        error instanceof ApiRequestError &&
        error.status === 0 &&
        accountId &&
        this.localCache
      ))
        throw error;
      const viewDate = businessDateAt(new Date(), "Asia/Shanghai");
      const snapshot = await this.localCache.todaySnapshot(accountId, viewDate);
      if (snapshot) {
        const items = await Promise.all(
          snapshot.items.map(async (item) => {
            const stored = await this.localCache!.checkin(
              accountId,
              item.plan.id,
              item.planBusinessDate,
            );
            if (!stored) return item;
            const record = stored.record;
            return {
              ...item,
              status: record.result,
              record: {
                id: record.id,
                result: record.result,
                revision: record.revision,
                isBackfilled: record.isBackfilled,
                isRevised: record.isRevised,
              },
            };
          }),
        );
        return { ...snapshot, items, source: "local" };
      }
      if (!(await this.localCache.hasPlanListSnapshot(accountId))) throw error;
      const plans = await this.localCache.listPlans(accountId);
      const eligible = plans.filter((plan) => {
        const day = businessDateAt(new Date(), plan.timezone);
        if (
          plan.lifecycle !== "active" ||
          plan.startDate > day ||
          (plan.endDate && plan.endDate < day)
        )
          return false;
        if (plan.kind === "fixed" && plan.rule && "weekdays" in plan.rule)
          return plan.rule.weekdays.includes(
            isoWeekday(parseBusinessDate(day)),
          );
        return true;
      });
      const items: TodayItemDto[] = await Promise.all(
        eligible.map(async (plan) => {
          const planBusinessDate = businessDateAt(new Date(), plan.timezone);
          const stored = await this.localCache!.checkin(
            accountId,
            plan.id,
            planBusinessDate,
          );
          const record = stored?.record;
          return {
            plan,
            planBusinessDate,
            status:
              record?.result ?? (plan.kind === "one_time" ? "pending" : "due"),
            activeRuleVersion: plan.ruleVersion,
            record: record
              ? {
                  id: record.id,
                  result: record.result,
                  revision: record.revision,
                  isBackfilled: record.isBackfilled,
                  isRevised: record.isRevised,
                }
              : null,
            weeklyProgress: null,
            canCheckIn: plan.kind !== "one_time",
            reminderTimeLocal: null,
          };
        }),
      );
      return {
        viewDate,
        viewTimezone: "Asia/Shanghai",
        items,
        source: "local",
      };
    }
  }
  private async calendarWithLocal(
    calendar: CalendarMonthDto,
    accountId: string,
    month: string,
    groupId?: string,
    planId?: string,
    includeSynced = false,
  ): Promise<CalendarMonthDto & { pendingCount: number }> {
    if (!this.localCache) return { ...calendar, pendingCount: 0 };
    const localRecords = await this.localCache.checkinsForView(
      accountId,
      month,
      planId,
    );
    const days = new Map<string, CalendarDayDto>(
      calendar.days.map((day) => [
        day.businessDate,
        { ...day, entries: [...day.entries] },
      ]),
    );
    let pendingCount = 0;
    for (const local of localRecords) {
      if (!includeSynced && local.state === "synced") continue;
      const record = local.record;
      const plan = await this.localCache.getPlan(accountId, record.planId);
      if (!plan || (groupId && plan.groupId !== groupId)) continue;
      if (local.state !== "synced") pendingCount++;
      const day = days.get(record.businessDate) ?? {
        businessDate: record.businessDate,
        entries: [],
        counts: { success: 0, failure: 0, skip: 0, unrecorded: 0 },
      };
      const entry: CalendarEntryDto = {
        planId: plan.id,
        title: plan.title,
        kind: plan.kind,
        direction: plan.direction,
        timezone: plan.timezone,
        businessDate: record.businessDate,
        status: record.result,
        recordId: record.id,
        ruleVersion: record.ruleVersion,
        isBackfilled: record.isBackfilled,
        isRevised: record.isRevised,
      };
      day.entries = [
        ...day.entries.filter((item) => item.planId !== plan.id),
        entry,
      ];
      day.counts = {
        success: day.entries.filter((item) => item.status === "success").length,
        failure: day.entries.filter((item) => item.status === "failure").length,
        skip: day.entries.filter((item) => item.status === "skip").length,
        unrecorded: day.entries.filter((item) => item.status === "unrecorded")
          .length,
      };
      days.set(record.businessDate, day);
    }
    return {
      ...calendar,
      days: [...days.values()].sort((a, b) =>
        a.businessDate.localeCompare(b.businessDate),
      ),
      pendingCount,
    };
  }

  private async loadCalendar(
    path: string,
    key: string,
    month: string,
    groupId?: string,
    planId?: string,
  ): Promise<
    CalendarMonthDto & { source: "server" | "local"; pendingCount: number }
  > {
    const accountId = this.accountId();
    let calendar: CalendarMonthDto;
    let source: "server" | "local";
    try {
      calendar = await this.api.get<CalendarMonthDto>(path);
      source = "server";
      if (accountId && this.localCache) {
        try {
          await this.localCache.saveCalendarSnapshot(accountId, key, calendar);
        } catch {
          /* Remote read remains usable. */
        }
      }
    } catch (error) {
      if (!(
        error instanceof ApiRequestError &&
        error.status === 0 &&
        accountId &&
        this.localCache
      ))
        throw error;
      const snapshot = await this.localCache.calendarSnapshot(accountId, key);
      if (!snapshot) throw error;
      calendar = snapshot;
      source = "local";
    }
    let merged: CalendarMonthDto & { pendingCount: number } = {
      ...calendar,
      pendingCount: 0,
    };
    if (accountId) {
      try {
        merged = await this.calendarWithLocal(
          calendar,
          accountId,
          month,
          groupId,
          planId,
          source === "local",
        );
      } catch (error) {
        if (source === "local") throw error;
      }
    }
    return { ...merged, source };
  }

  getCalendar(
    month: string,
    groupId?: string,
  ): Promise<
    CalendarMonthDto & { source: "server" | "local"; pendingCount: number }
  > {
    const query = new URLSearchParams({ month });
    if (groupId) query.set("groupId", groupId);
    return this.loadCalendar(
      `/calendar?${query.toString()}`,
      `global:${groupId ?? "all"}:${month}`,
      month,
      groupId,
    );
  }
  getPlanCalendar(
    planId: string,
    month: string,
  ): Promise<
    CalendarMonthDto & { source: "server" | "local"; pendingCount: number }
  > {
    return this.loadCalendar(
      `/plans/${encodeURIComponent(planId)}/calendar?month=${encodeURIComponent(month)}`,
      `plan:${planId}:${month}`,
      month,
      undefined,
      planId,
    );
  }
  async listPlans(): Promise<PlanDto[]> {
    return (await this.listPlansWithSource()).items;
  }
  async listPlansWithSource(): Promise<{
    items: PlanDto[];
    source: "server" | "local";
  }> {
    try {
      const plans = await this.api.get<PlanDto[]>("/plans");
      await this.cachePlans(plans, true);
      return { items: plans, source: "server" };
    } catch (error) {
      const accountId = this.accountId();
      if (
        error instanceof ApiRequestError &&
        error.status === 0 &&
        accountId &&
        this.localCache &&
        (await this.localCache.hasPlanListSnapshot(accountId))
      )
        return {
          items: await this.localCache.listPlans(accountId),
          source: "local",
        };
      throw error;
    }
  }
  async getPlan(id: string): Promise<PlanDto> {
    try {
      const plan = await this.api.get<PlanDto>(
        `/plans/${encodeURIComponent(id)}`,
      );
      await this.cachePlans([plan]);
      return plan;
    } catch (error) {
      const accountId = this.accountId();
      if (
        error instanceof ApiRequestError &&
        error.status === 0 &&
        accountId &&
        this.localCache
      ) {
        const plan = await this.localCache.getPlan(accountId, id);
        if (plan) return plan;
      }
      throw error;
    }
  }
  async getPlanDetail(
    id: string,
  ): Promise<
    PlanDetailDto & { source: "server" | "local"; pendingCount: number }
  > {
    const accountId = this.accountId();
    let detail: PlanDetailDto;
    let source: "server" | "local";
    try {
      detail = await this.api.get<PlanDetailDto>(
        `/plans/${encodeURIComponent(id)}/detail`,
      );
      source = "server";
      if (accountId && this.localCache) {
        try {
          await this.localCache.savePlanDetailSnapshot(accountId, detail);
        } catch {
          /* Remote read remains usable. */
        }
      }
    } catch (error) {
      if (!(
        error instanceof ApiRequestError &&
        error.status === 0 &&
        accountId &&
        this.localCache
      ))
        throw error;
      const snapshot = await this.localCache.planDetailSnapshot(accountId, id);
      if (!snapshot) throw error;
      detail = snapshot;
      source = "local";
    }
    if (!accountId || !this.localCache)
      return { ...detail, source, pendingCount: 0 };
    let localRecords: {
      record: CheckinDto;
      state: "synced" | "local" | "syncing" | "failed" | "conflict";
    }[] = [];
    try {
      localRecords = await this.localCache.checkinsForView(accountId, "", id);
    } catch (error) {
      if (source === "local") throw error;
    }
    const records = new Map(
      detail.recentRecords.map((entry) => [entry.businessDate, entry]),
    );
    for (const local of localRecords) {
      if (source === "server" && local.state === "synced") continue;
      const record = local.record;
      records.set(record.businessDate, {
        planId: id,
        title: detail.plan.title,
        kind: detail.plan.kind,
        direction: detail.plan.direction,
        timezone: detail.plan.timezone,
        businessDate: record.businessDate,
        status: record.result,
        recordId: record.id,
        ruleVersion: record.ruleVersion,
        isBackfilled: record.isBackfilled,
        isRevised: record.isRevised,
      });
    }
    return {
      ...detail,
      recentRecords: [...records.values()]
        .sort((a, b) => b.businessDate.localeCompare(a.businessDate))
        .slice(0, 30),
      source,
      pendingCount: localRecords.filter((item) => item.state !== "synced")
        .length,
    };
  }
  async getCheckin(planId: string, businessDate: string): Promise<CheckinDto> {
    const accountId = this.accountId();
    const local =
      accountId && this.localCache
        ? await this.localCache.checkin(accountId, planId, businessDate)
        : null;
    if (local && local.state !== "synced") return local.record;
    try {
      const record = await this.api.get<CheckinDto>(
        `/plans/${encodeURIComponent(planId)}/checkins/${businessDate}`,
      );
      if (accountId && this.localCache) {
        try {
          await this.localCache.upsertServerCheckins(accountId, [record]);
        } catch {
          /* Remote read remains usable. */
        }
      }
      return record;
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 0 && local)
        return local.record;
      throw error;
    }
  }
  async resolveCheckinConflict(
    planId: string,
    businessDate: string,
    choice: "server" | "local",
  ): Promise<CheckinDto> {
    const accountId = this.accountId();
    if (!accountId || !this.localCache)
      throw new Error("当前账户没有可处理的本机冲突");
    const server = await this.api.get<CheckinDto>(
      `/plans/${encodeURIComponent(planId)}/checkins/${businessDate}`,
    );
    const conflict = await this.localCache.conflict(
      accountId,
      planId,
      businessDate,
    );
    if (!conflict) throw new Error("冲突已处理，请刷新页面");
    if (server.revision !== conflict.details.currentRevision) {
      const probeId = Crypto.randomUUID();
      try {
        await this.api.put<CheckinDto>(
          `/plans/${encodeURIComponent(planId)}/checkins/${businessDate}`,
          {
            result: conflict.localRecord.result,
            note: conflict.localRecord.note,
            failureReason: conflict.localRecord.failureReason,
            numeric: conflict.localRecord.numeric,
            mediaIds: conflict.localRecord.mediaIds,
            baseRevision: conflict.details.currentRevision,
            clientCreatedAt: new Date().toISOString(),
            clientOperationId: probeId,
            ruleVersion: conflict.localRecord.ruleVersion,
          } satisfies PutCheckinRequest,
          probeId,
        );
      } catch (cause) {
        if (
          cause instanceof ApiRequestError &&
          cause.code === "CHECKIN_CONFLICT" &&
          cause.details &&
          typeof cause.details.conflictId === "string" &&
          typeof cause.details.currentRevision === "number" &&
          cause.details.serverRecord
        ) {
          await this.localCache.updateConflictDetails(
            accountId,
            conflict.operationId,
            cause.details as unknown as CheckinConflictDetails,
          );
          throw new Error("云端版本已更新，请重新查看两版内容并选择", {
            cause,
          });
        }
        throw cause;
      }
      throw new Error("云端版本已更新，请重新打开记录");
    }
    await this.localCache.resolveConflict(
      accountId,
      planId,
      businessDate,
      choice,
      server,
      Crypto.randomUUID(),
    );
    if (choice === "local") await this.outbox?.trigger();
    return (
      (await this.localCache.checkin(accountId, planId, businessDate))
        ?.record ?? server
    );
  }
  async saveCheckin(
    plan: PlanDto,
    businessDate: string,
    input: PutCheckinRequest,
  ): Promise<RecordSaveResult> {
    const accountId = this.accountId();
    const saveLocal = async (
      allowUnverifiedRule = false,
    ): Promise<Extract<RecordSaveResult, { source: "local" }>> => {
      if (!accountId || !this.localCache)
        throw new ApiRequestError(0, "NETWORK_ERROR", "离线保存暂不可用", null);
      const { record, operationId } = await this.localCache.savePendingCheckin(
        accountId,
        plan,
        businessDate,
        input,
        allowUnverifiedRule,
      );
      return { source: "local", record, operationId, syncState: "local" };
    };
    if (accountId && this.localCache) {
      const existing = await this.localCache.checkin(
        accountId,
        plan.id,
        businessDate,
      );
      if (existing?.state === "conflict")
        throw new Error("记录存在同步冲突，请先处理冲突");
      if (this.outbox) {
        let connected = false;
        try {
          const state = await Network.getNetworkStateAsync();
          connected =
            state.isConnected === true && state.isInternetReachable !== false;
        } catch {
          /* Unknown reachability does not permit skipping the cached rule check. */
        }
        const local = await saveLocal(connected);
        try {
          if (connected) await this.outbox.trigger();
        } catch {
          /* The local record and operation stay durable for the next retry. */
        }
        const latest = await this.localCache.checkin(
          accountId,
          plan.id,
          businessDate,
        );
        return latest?.state === "synced"
          ? { source: "server", record: latest.record }
          : {
              ...local,
              record: latest?.record ?? local.record,
              syncState: latest?.state ?? "local",
            };
      }
      if (existing?.state === "local") return saveLocal();
    }
    try {
      const state = await Network.getNetworkStateAsync();
      if (state.isConnected === false || state.isInternetReachable === false)
        return saveLocal();
    } catch {
      /* Reachability unknown: try the API, then fall back only on transport failure. */
    }
    try {
      const record = await this.api.put<CheckinDto>(
        `/plans/${encodeURIComponent(plan.id)}/checkins/${businessDate}`,
        input,
        input.clientOperationId,
      );
      if (accountId && this.localCache) {
        try {
          await this.localCache.upsertServerCheckins(accountId, [record]);
        } catch {
          /* Server success must not become a duplicate retry. */
        }
      }
      return { source: "server", record };
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 0)
        return saveLocal();
      throw error;
    }
  }
  resolveOneTime(
    planId: string,
    input: OneTimeResolutionRequest,
  ): Promise<OneTimeResolutionDto> {
    return this.api.post(
      `/plans/${encodeURIComponent(planId)}/one-time-resolution`,
      input,
    );
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
  async createPlan(input: CreatePlanRequest): Promise<PlanDto> {
    const plan = await this.api.post<PlanDto>("/plans", input);
    await this.cachePlans([plan]);
    await this.invalidateLocalViews(plan.id);
    return plan;
  }
  async updatePlan(id: string, input: UpdatePlanRequest): Promise<PlanDto> {
    const plan = await this.api.patch<PlanDto>(
      `/plans/${encodeURIComponent(id)}`,
      input,
    );
    await this.cachePlans([plan]);
    await this.invalidateLocalViews(plan.id);
    return plan;
  }
  async transitionPlan(
    id: string,
    action: "pause" | "resume" | "archive",
    baseRevision: number,
  ): Promise<PlanDto> {
    const plan = await this.api.post<PlanDto>(
      `/plans/${encodeURIComponent(id)}/${action}`,
      {
        baseRevision,
      },
    );
    await this.cachePlans([plan]);
    await this.invalidateLocalViews(plan.id);
    return plan;
  }
  async deletePlan(id: string, baseRevision: number): Promise<void> {
    await this.api.delete(
      `/plans/${encodeURIComponent(id)}?baseRevision=${baseRevision}`,
      { "X-Confirm-Delete": "true" },
    );
    const accountId = this.accountId();
    if (accountId && this.localCache) {
      try {
        await this.localCache.removePlan(accountId, id);
      } catch {
        // The server deletion succeeded; stale local data is hidden after the next full list refresh.
      }
    }
  }
}

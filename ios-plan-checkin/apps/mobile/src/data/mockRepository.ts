import type {
  AuthTokens,
  CalendarDayDto,
  CalendarEntryDto,
  CalendarMonthDto,
  CheckinDto,
  CreateGroupRequest,
  CreatePlanRequest,
  GroupDto,
  PlanDetailDto,
  PlanDto,
  OneTimeResolutionDto,
  OneTimeResolutionRequest,
  PutCheckinRequest,
  SmsChallengeDto,
  TodayDto,
  TodayItemDto,
  UserDto,
  UsernameAvailabilityDto,
  UpdateGroupRequest,
  UpdatePlanRequest,
} from "@plan-checkin/contracts";
import * as Crypto from "expo-crypto";
import {
  businessDateAt,
  fixedStatistics,
  isoWeekday,
  oneTimeState,
  parseBusinessDate,
  weeklyStatistics,
  type PlanTimeline,
} from "@plan-checkin/domain";
import type { AppRepository, RecordSaveResult } from "./repository";
import type { SessionGateway } from "./session";

export class MockSessionGateway implements SessionGateway {
  async refresh(refreshToken: string): Promise<AuthTokens> {
    if (!refreshToken) throw new Error("会话已失效");
    return {
      accessToken: "mock-access",
      refreshToken,
      accessExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      userId: "00000000-0000-4000-8000-000000000001",
      isNewUser: false,
    };
  }
}

export class MockRepository implements AppRepository {
  private groups: GroupDto[] = [];
  private records = new Map<string, CheckinDto>();
  private resolutions = new Map<string, OneTimeResolutionDto>();
  private user: UserDto = {
    id: "00000000-0000-4000-8000-000000000001",
    username: "demo_user",
    nickname: "演示用户",
    avatarMediaId: null,
    accountStatus: "active",
    revision: 1,
  };
  constructor(private readonly plans: PlanDto[] = []) {}

  private timeline(plan: PlanDto): PlanTimeline {
    const startDate = parseBusinessDate(plan.startDate);
    const rule =
      plan.kind === "fixed" && plan.rule && "weekdays" in plan.rule
        ? {
            kind: "fixed" as const,
            direction: plan.direction,
            version: 1,
            effectiveDate: startDate,
            weekdays: plan.rule.weekdays,
          }
        : plan.kind === "weekly" && plan.rule && "weeklyTarget" in plan.rule
          ? {
              kind: "weekly" as const,
              direction: plan.direction,
              version: 1,
              effectiveDate: startDate,
              weeklyTarget: plan.rule.weeklyTarget,
            }
          : {
              kind: "one_time" as const,
              direction: "do" as const,
              version: 1,
              effectiveDate: startDate,
            };
    return {
      timezone: plan.timezone,
      startDate,
      endDate: plan.endDate ? parseBusinessDate(plan.endDate) : null,
      dueDate: plan.dueDate ? parseBusinessDate(plan.dueDate) : null,
      rules: [rule],
      lifecycleEvents: [],
    };
  }

  async createSmsChallenge(_phone: string): Promise<SmsChallengeDto> {
    return {
      challengeId: "00000000-0000-4000-8000-000000000002",
      expiresAt: new Date(Date.now() + 300_000).toISOString(),
      resendAfterSeconds: 60,
    };
  }
  async verifySms(_challengeId: string, code: string): Promise<AuthTokens> {
    if (code !== "123456") throw new Error("验证码不正确");
    return {
      accessToken: "mock-access",
      refreshToken: "mock-refresh",
      accessExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      userId: this.user.id,
      isNewUser: false,
    };
  }
  async getMe(): Promise<UserDto> {
    return this.user;
  }
  async checkUsername(username: string): Promise<UsernameAvailabilityDto> {
    return { available: true, normalized: username.trim() };
  }
  async updateMe(input: {
    username: string;
    nickname: string;
    baseRevision: number;
  }): Promise<UserDto> {
    if (input.baseRevision !== this.user.revision)
      throw new Error("资料已变化");
    this.user = {
      ...this.user,
      username: input.username,
      nickname: input.nickname,
      revision: this.user.revision + 1,
    };
    return this.user;
  }

  async getToday(): Promise<TodayDto> {
    const viewDate = businessDateAt(new Date(), "Asia/Shanghai");
    const items: TodayItemDto[] = this.plans
      .filter(
        (plan) =>
          plan.lifecycle === "active" &&
          plan.startDate <= viewDate &&
          (!plan.endDate || plan.endDate >= viewDate) &&
          (plan.kind !== "fixed" ||
            (plan.rule &&
              "weekdays" in plan.rule &&
              plan.rule.weekdays.includes(
                isoWeekday(parseBusinessDate(viewDate)),
              ))),
      )
      .map((plan) => {
        const record = this.records.get(`${plan.id}:${viewDate}`);
        const resolution = this.resolutions.get(plan.id);
        const weeklyProgress =
          plan.kind === "weekly" && plan.rule && "weeklyTarget" in plan.rule
            ? {
                weekStartDate: viewDate,
                ruleVersion: plan.ruleVersion,
                target: plan.rule.weeklyTarget,
                successes: [...this.records.values()].filter(
                  (item) =>
                    item.planId === plan.id && item.result === "success",
                ).length,
                completeWeek: false,
                attained: null,
                progressRate: null,
              }
            : null;
        return {
          plan,
          planBusinessDate: viewDate,
          status:
            record?.result ??
            (resolution
              ? resolution.resolution === "completed"
                ? "completed"
                : "failed"
              : plan.kind === "one_time"
                ? "pending"
                : "due"),
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
          weeklyProgress,
          canCheckIn: plan.kind !== "one_time",
          reminderTimeLocal: null,
        } as TodayItemDto;
      });
    return {
      viewTimezone: "Asia/Shanghai",
      viewDate,
      items,
    };
  }
  async getCalendar(
    month: string,
    groupId?: string,
  ): Promise<CalendarMonthDto> {
    const today = businessDateAt(new Date(), "Asia/Shanghai");
    const year = Number(month.slice(0, 4));
    const value = Number(month.slice(5, 7));
    const daysInMonth = new Date(Date.UTC(year, value, 0)).getUTCDate();
    const days: CalendarDayDto[] = [];
    for (let number = 1; number <= daysInMonth; number++) {
      const date = `${month}-${String(number).padStart(2, "0")}`;
      const entries: CalendarEntryDto[] = [];
      for (const plan of this.plans) {
        if (groupId && plan.groupId !== groupId) continue;
        if (plan.startDate > date || (plan.endDate && plan.endDate < date))
          continue;
        const record = this.records.get(`${plan.id}:${date}`);
        const due =
          plan.kind === "fixed" &&
          plan.rule &&
          "weekdays" in plan.rule &&
          plan.rule.weekdays.includes(isoWeekday(parseBusinessDate(date)));
        if (!record && !due) continue;
        entries.push({
          planId: plan.id,
          title: plan.title,
          kind: plan.kind,
          direction: plan.direction,
          timezone: plan.timezone,
          businessDate: date,
          status:
            record?.result ??
            (date < today ? "unrecorded" : date === today ? "due" : "future"),
          recordId: record?.id ?? null,
          ruleVersion: record?.ruleVersion ?? plan.ruleVersion,
          isBackfilled: record?.isBackfilled ?? false,
          isRevised: record?.isRevised ?? false,
        });
      }
      if (entries.length)
        days.push({
          businessDate: date,
          entries,
          counts: {
            success: entries.filter((entry) => entry.status === "success")
              .length,
            failure: entries.filter((entry) => entry.status === "failure")
              .length,
            skip: entries.filter((entry) => entry.status === "skip").length,
            unrecorded: entries.filter((entry) => entry.status === "unrecorded")
              .length,
          },
        });
    }
    return {
      month,
      dateSemantics: "plan_business_date",
      groupId: groupId ?? null,
      days,
      weeklySummaries: [],
    };
  }
  async getPlanCalendar(
    planId: string,
    month: string,
  ): Promise<CalendarMonthDto> {
    const calendar = await this.getCalendar(month);
    return {
      ...calendar,
      days: calendar.days
        .map((day) => {
          const entries = day.entries.filter(
            (entry) => entry.planId === planId,
          );
          return {
            ...day,
            entries,
            counts: {
              success: entries.filter((entry) => entry.status === "success")
                .length,
              failure: entries.filter((entry) => entry.status === "failure")
                .length,
              skip: entries.filter((entry) => entry.status === "skip").length,
              unrecorded: entries.filter(
                (entry) => entry.status === "unrecorded",
              ).length,
            },
          };
        })
        .filter((day) => day.entries.length > 0),
    };
  }
  async listPlans(): Promise<PlanDto[]> {
    return this.plans;
  }
  async listPlansWithSource(): Promise<{ items: PlanDto[]; source: "server" }> {
    return { items: await this.listPlans(), source: "server" };
  }
  async getPlan(id: string): Promise<PlanDto> {
    const plan = this.plans.find((item) => item.id === id);
    if (!plan) throw new Error("计划不存在");
    return plan;
  }
  async getPlanDetail(id: string): Promise<PlanDetailDto> {
    const plan = await this.getPlan(id);
    const now = new Date().toISOString();
    const today = businessDateAt(new Date(), plan.timezone);
    const records = [...this.records.values()].filter(
      (item) => item.planId === id,
    );
    const facts = records.map((item) => ({
      businessDate: parseBusinessDate(item.businessDate),
      result: item.result,
      ruleVersion: 1,
    }));
    const timeline = this.timeline(plan);
    const base = {
      planId: id,
      timezone: plan.timezone,
      statisticsThroughBusinessDate: today,
      ruleVersions: [plan.ruleVersion],
    };
    const resolution = this.resolutions.get(id) ?? null;
    const statistics: PlanDetailDto["statistics"] =
      plan.kind === "fixed"
        ? { kind: "fixed", ...base, ...fixedStatistics(timeline, facts, now) }
        : plan.kind === "weekly"
          ? {
              kind: "weekly",
              ...base,
              ...weeklyStatistics(timeline, facts, now),
            }
          : {
              kind: "one_time",
              ...base,
              dueDate: plan.dueDate!,
              state: oneTimeState(
                timeline,
                resolution
                  ? {
                      resolution: resolution.resolution,
                      resolvedAt: resolution.resolvedAt,
                      revision: resolution.revision,
                    }
                  : null,
                now,
              ),
              resolution,
            };
    return {
      plan,
      statistics,
      todayStatus:
        records.find((item) => item.businessDate === today)?.result ??
        "not_due",
      recentRecords: records
        .sort((a, b) => b.businessDate.localeCompare(a.businessDate))
        .slice(0, 30)
        .map((item) => ({
          planId: id,
          title: plan.title,
          kind: plan.kind,
          direction: plan.direction,
          timezone: plan.timezone,
          businessDate: item.businessDate,
          status: item.result,
          recordId: item.id,
          ruleVersion: item.ruleVersion,
          isBackfilled: item.isBackfilled,
          isRevised: item.isRevised,
        })),
    };
  }
  async getCheckin(planId: string, businessDate: string): Promise<CheckinDto> {
    const record = this.records.get(`${planId}:${businessDate}`);
    if (!record) throw new Error("当天没有记录");
    return record;
  }
  async resolveCheckinConflict(
    planId: string,
    businessDate: string,
    _choice: "server" | "local",
  ): Promise<CheckinDto> {
    return this.getCheckin(planId, businessDate);
  }
  async saveCheckin(
    plan: PlanDto,
    businessDate: string,
    input: PutCheckinRequest,
  ): Promise<RecordSaveResult> {
    const previous = this.records.get(`${plan.id}:${businessDate}`);
    if ((previous?.revision ?? 0) !== input.baseRevision)
      throw new Error("记录已变化，请刷新");
    const now = new Date().toISOString();
    const record: CheckinDto = {
      id: previous?.id ?? Crypto.randomUUID(),
      planId: plan.id,
      businessDate,
      result: input.result,
      note: input.note ?? null,
      failureReason: input.failureReason ?? null,
      numeric: input.numeric ?? null,
      mediaIds: input.mediaIds ?? [],
      isBackfilled: businessDate < businessDateAt(new Date(), plan.timezone),
      isRevised: Boolean(previous),
      revision: input.baseRevision + 1,
      ruleVersion: input.ruleVersion,
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
      syncSequence: (previous?.syncSequence ?? 0) + 1,
    };
    this.records.set(`${plan.id}:${businessDate}`, record);
    return { source: "server", record };
  }
  async resolveOneTime(
    planId: string,
    input: OneTimeResolutionRequest,
  ): Promise<OneTimeResolutionDto> {
    const plan = await this.getPlan(planId);
    if (plan.kind !== "one_time") throw new Error("不是一次性任务");
    const now = new Date().toISOString();
    const result: OneTimeResolutionDto = {
      planId,
      resolution: input.resolution,
      resolvedBusinessDate: businessDateAt(new Date(), plan.timezone),
      resolvedAt: now,
      note: input.reason ?? null,
      revision: 1,
      isRevised: false,
      timing:
        input.resolution === "completed"
          ? now.slice(0, 10) <= plan.dueDate!
            ? "on_time"
            : "late"
          : null,
    };
    this.resolutions.set(planId, result);
    return result;
  }
  async listGroups(): Promise<GroupDto[]> {
    return this.groups.slice();
  }
  async createGroup(input: CreateGroupRequest): Promise<GroupDto> {
    const group = {
      id: Crypto.randomUUID(),
      name: input.name.trim(),
      sortOrder: input.sortOrder ?? this.groups.length,
      revision: 1,
    };
    this.groups.push(group);
    return group;
  }
  async updateGroup(id: string, input: UpdateGroupRequest): Promise<GroupDto> {
    const group = this.groups.find((item) => item.id === id);
    if (!group || group.revision !== input.baseRevision)
      throw new Error("分组已变化，请刷新后重试");
    Object.assign(group, {
      name: input.name ?? group.name,
      sortOrder: input.sortOrder ?? group.sortOrder,
      revision: group.revision + 1,
    });
    return group;
  }
  async deleteGroup(id: string, baseRevision: number): Promise<void> {
    const group = this.groups.find((item) => item.id === id);
    if (!group || group.revision !== baseRevision)
      throw new Error("分组已变化，请刷新后重试");
    this.groups = this.groups.filter((item) => item.id !== id);
    for (const plan of this.plans) if (plan.groupId === id) plan.groupId = null;
  }
  async createPlan(input: CreatePlanRequest): Promise<PlanDto> {
    const now = new Date().toISOString();
    const startDate =
      input.startDate ??
      (input.kind === "one_time" ? input.dueDate : now.slice(0, 10));
    const plan: PlanDto = {
      id: Crypto.randomUUID(),
      ownerId: this.user.id,
      kind: input.kind,
      direction: input.direction,
      title: input.title.trim(),
      description: input.description ?? null,
      timezone: input.timezone,
      startDate,
      endDate: input.kind === "one_time" ? null : (input.endDate ?? null),
      dueDate: input.kind === "one_time" ? input.dueDate : null,
      groupId: input.groupId ?? null,
      lifecycle: "active",
      ruleVersion: 1,
      ruleEffectiveDate: startDate,
      rule: input.kind === "one_time" ? null : input.rule,
      revision: 1,
      createdAt: now,
      updatedAt: now,
    };
    this.plans.push(plan);
    return plan;
  }
  async updatePlan(id: string, input: UpdatePlanRequest): Promise<PlanDto> {
    const plan = await this.getPlan(id);
    const { baseRevision, ...changes } = input;
    if (plan.revision !== baseRevision)
      throw new Error("计划已变化，请刷新后重试");
    Object.assign(plan, {
      ...changes,
      revision: plan.revision + 1,
      updatedAt: new Date().toISOString(),
    });
    if (input.rule) plan.ruleVersion += 1;
    return plan;
  }
  async transitionPlan(
    id: string,
    action: "pause" | "resume" | "archive",
    baseRevision: number,
  ): Promise<PlanDto> {
    const plan = await this.getPlan(id);
    if (plan.revision !== baseRevision)
      throw new Error("计划已变化，请刷新后重试");
    plan.lifecycle =
      action === "resume"
        ? "active"
        : action === "pause"
          ? "paused"
          : "archived";
    plan.revision += 1;
    return plan;
  }
  async deletePlan(id: string, baseRevision: number): Promise<void> {
    const plan = await this.getPlan(id);
    if (plan.revision !== baseRevision)
      throw new Error("计划已变化，请刷新后重试");
    this.plans.splice(
      this.plans.findIndex((item) => item.id === id),
      1,
    );
  }
}

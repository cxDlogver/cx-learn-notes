import type {
  AuthTokens,
  CalendarMonthDto,
  CreateGroupRequest,
  CreatePlanRequest,
  GroupDto,
  PlanDetailDto,
  PlanDto,
  SmsChallengeDto,
  TodayDto,
  UserDto,
  UsernameAvailabilityDto,
  UpdateGroupRequest,
  UpdatePlanRequest,
} from "@plan-checkin/contracts";
import * as Crypto from "expo-crypto";
import type { AppRepository } from "./repository";
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
  private user: UserDto = {
    id: "00000000-0000-4000-8000-000000000001",
    username: "demo_user",
    nickname: "演示用户",
    avatarMediaId: null,
    accountStatus: "active",
    revision: 1,
  };
  constructor(private readonly plans: PlanDto[] = []) {}

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
    return {
      viewTimezone: "Asia/Shanghai",
      viewDate: new Date().toISOString().slice(0, 10),
      items: [],
    };
  }
  async getCalendar(
    month: string,
    groupId?: string,
  ): Promise<CalendarMonthDto> {
    return {
      month,
      dateSemantics: "plan_business_date",
      groupId: groupId ?? null,
      days: [],
      weeklySummaries: [],
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
    await this.getPlan(id);
    throw new Error("请为此计划提供详情 fixture");
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

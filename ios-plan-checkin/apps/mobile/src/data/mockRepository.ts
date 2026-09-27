import type {
  AuthTokens,
  CalendarMonthDto,
  PlanDetailDto,
  PlanDto,
  SmsChallengeDto,
  TodayDto,
  UserDto,
  UsernameAvailabilityDto,
} from "@plan-checkin/contracts";
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
  async getPlan(id: string): Promise<PlanDto> {
    const plan = this.plans.find((item) => item.id === id);
    if (!plan) throw new Error("计划不存在");
    return plan;
  }
  async getPlanDetail(id: string): Promise<PlanDetailDto> {
    await this.getPlan(id);
    throw new Error("请为此计划提供详情 fixture");
  }
}

import type {
  AuthTokens,
  CalendarMonthDto,
  PlanDetailDto,
  PlanDto,
  TodayDto,
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
  constructor(private readonly plans: PlanDto[] = []) {}

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

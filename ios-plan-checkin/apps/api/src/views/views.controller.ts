import { Controller, Get, Headers, Param, Query, Req } from "@nestjs/common";
import type {
  ApiSuccess,
  CalendarDayDto,
  CalendarMonthDto,
  PlanDetailDto,
  PlanStatisticsDto,
  TodayDto,
} from "@plan-checkin/contracts";
import { AuthService } from "../auth/auth.service.js";
import { fail, ok } from "../http.js";
import { ViewsService } from "./views.service.js";

interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
}

@Controller()
export class ViewsController {
  constructor(
    private readonly auth: AuthService,
    private readonly views: ViewsService,
  ) {}
  private user(bearer: string): Promise<string> {
    return this.auth.authenticate(bearer ?? "");
  }

  @Get("today")
  async today(
    @Headers("authorization") bearer: string,
    @Query("timezone") timezone: string | undefined,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<TodayDto>> {
    return ok(
      await this.views.today(await this.user(bearer), timezone),
      request,
    );
  }

  @Get("calendar")
  async calendar(
    @Headers("authorization") bearer: string,
    @Query("month") month: string | undefined,
    @Query("groupId") groupId: string | undefined,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<CalendarMonthDto>> {
    if (!month) fail("VALIDATION_ERROR", 400, "请选择月份");
    return ok(
      await this.views.calendar(
        await this.user(bearer),
        month,
        groupId ?? null,
      ),
      request,
    );
  }

  @Get("calendar/:businessDate")
  async calendarDay(
    @Headers("authorization") bearer: string,
    @Param("businessDate") date: string,
    @Query("groupId") groupId: string | undefined,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<CalendarDayDto>> {
    return ok(
      await this.views.calendarDay(
        await this.user(bearer),
        date,
        groupId ?? null,
      ),
      request,
    );
  }

  @Get("plans/:id/detail")
  async detail(
    @Headers("authorization") bearer: string,
    @Param("id") id: string,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<PlanDetailDto>> {
    return ok(await this.views.detail(await this.user(bearer), id), request);
  }

  @Get("plans/:id/statistics")
  async statistics(
    @Headers("authorization") bearer: string,
    @Param("id") id: string,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<PlanStatisticsDto>> {
    return ok(
      await this.views.statisticsForPlan(await this.user(bearer), id),
      request,
    );
  }

  @Get("plans/:id/calendar")
  async planCalendar(
    @Headers("authorization") bearer: string,
    @Param("id") id: string,
    @Query("month") month: string | undefined,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<CalendarMonthDto>> {
    if (!month) fail("VALIDATION_ERROR", 400, "请选择月份");
    return ok(
      await this.views.calendar(await this.user(bearer), month, null, id),
      request,
    );
  }
}

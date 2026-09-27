import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import type {
  ApiSuccess,
  CreateGroupRequest,
  CreatePlanRequest,
  GroupDto,
  PlanDto,
  UpdateGroupRequest,
  UpdatePlanRequest,
} from "@plan-checkin/contracts";
import { AuthService } from "../auth/auth.service.js";
import { fail, ok } from "../http.js";
import { GroupsService } from "./groups.service.js";
import { PlansService } from "./plans.service.js";

interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
}

@Controller("groups")
export class GroupsController {
  constructor(
    private readonly auth: AuthService,
    private readonly groups: GroupsService,
  ) {}
  private user(bearer: string): Promise<string> {
    return this.auth.authenticate(bearer ?? "");
  }

  @Get()
  async list(
    @Headers("authorization") bearer: string,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<GroupDto[]>> {
    return ok(await this.groups.list(await this.user(bearer)), request);
  }
  @Post()
  async create(
    @Headers("authorization") bearer: string,
    @Headers("idempotency-key") key: string,
    @Body() body: CreateGroupRequest,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<GroupDto>> {
    return ok(
      await this.groups.create(await this.user(bearer), body, key),
      request,
    );
  }
  @Patch(":id")
  async update(
    @Headers("authorization") bearer: string,
    @Headers("idempotency-key") key: string,
    @Param("id") id: string,
    @Body() body: UpdateGroupRequest,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<GroupDto>> {
    return ok(
      await this.groups.update(await this.user(bearer), id, body, key),
      request,
    );
  }
  @Delete(":id")
  async remove(
    @Headers("authorization") bearer: string,
    @Headers("idempotency-key") key: string,
    @Param("id") id: string,
    @Query("baseRevision") version: string,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<{ deleted: true }>> {
    return ok(
      await this.groups.remove(
        await this.user(bearer),
        id,
        Number(version),
        key,
      ),
      request,
    );
  }
}

@Controller("plans")
export class PlansController {
  constructor(
    private readonly auth: AuthService,
    private readonly plans: PlansService,
  ) {}
  private user(bearer: string): Promise<string> {
    return this.auth.authenticate(bearer ?? "");
  }

  @Get()
  async list(
    @Headers("authorization") bearer: string,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<PlanDto[]>> {
    return ok(await this.plans.list(await this.user(bearer)), request);
  }
  @Post()
  async create(
    @Headers("authorization") bearer: string,
    @Headers("idempotency-key") key: string,
    @Body() body: CreatePlanRequest,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<PlanDto>> {
    return ok(
      await this.plans.create(await this.user(bearer), body, key),
      request,
    );
  }
  @Get(":id")
  async get(
    @Headers("authorization") bearer: string,
    @Param("id") id: string,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<PlanDto>> {
    return ok(await this.plans.get(await this.user(bearer), id), request);
  }
  @Patch(":id")
  async update(
    @Headers("authorization") bearer: string,
    @Headers("idempotency-key") key: string,
    @Param("id") id: string,
    @Body() body: UpdatePlanRequest,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<PlanDto>> {
    return ok(
      await this.plans.update(await this.user(bearer), id, body, key),
      request,
    );
  }
  private async transition(
    bearer: string,
    key: string,
    id: string,
    body: { baseRevision: number },
    action: "pause" | "resume" | "archive",
    request: RequestLike,
  ): Promise<ApiSuccess<PlanDto>> {
    if (!body || Object.keys(body).some((field) => field !== "baseRevision"))
      fail("VALIDATION_ERROR", 400, "状态操作字段不正确");
    return ok(
      (await this.plans.lifecycle(
        await this.user(bearer),
        id,
        action,
        body.baseRevision,
        key,
      )) as PlanDto,
      request,
    );
  }
  @Post(":id/pause")
  pause(
    @Headers("authorization") bearer: string,
    @Headers("idempotency-key") key: string,
    @Param("id") id: string,
    @Body() body: { baseRevision: number },
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<PlanDto>> {
    return this.transition(bearer, key, id, body, "pause", request);
  }
  @Post(":id/resume")
  resume(
    @Headers("authorization") bearer: string,
    @Headers("idempotency-key") key: string,
    @Param("id") id: string,
    @Body() body: { baseRevision: number },
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<PlanDto>> {
    return this.transition(bearer, key, id, body, "resume", request);
  }
  @Post(":id/archive")
  archive(
    @Headers("authorization") bearer: string,
    @Headers("idempotency-key") key: string,
    @Param("id") id: string,
    @Body() body: { baseRevision: number },
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<PlanDto>> {
    return this.transition(bearer, key, id, body, "archive", request);
  }
  @Delete(":id")
  async remove(
    @Headers("authorization") bearer: string,
    @Headers("idempotency-key") key: string,
    @Headers("x-confirm-delete") confirm: string,
    @Param("id") id: string,
    @Query("baseRevision") version: string,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<{ deleted: true }>> {
    if (confirm !== "true")
      fail("VALIDATION_ERROR", 400, "请确认删除计划及关联记录");
    return ok(
      (await this.plans.lifecycle(
        await this.user(bearer),
        id,
        "delete",
        Number(version),
        key,
      )) as { deleted: true },
      request,
    );
  }
}

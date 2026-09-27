import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Put,
  Query,
  Req,
} from "@nestjs/common";
import type {
  ApiSuccess,
  PlanShareDto,
  ShareGrantRequest,
  SharePreviewDto,
  SharedHistoryDto,
  SharedPlanDto,
} from "@plan-checkin/contracts";
import { AuthService } from "../auth/auth.service.js";
import { fail, ok } from "../http.js";
import { guardFields } from "../plans/write.js";
import { SharesService } from "./shares.service.js";

interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
}

@Controller("plans")
export class PlanSharesController {
  constructor(
    private readonly auth: AuthService,
    private readonly shares: SharesService,
  ) {}

  @Get(":id/share-preview")
  async preview(
    @Headers("authorization") bearer: string,
    @Param("id") planId: string,
    @Query("friendId") friendId: string,
    @Query("month") month: string,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<SharePreviewDto>> {
    return ok(
      await this.shares.preview(
        await this.auth.authenticate(bearer ?? ""),
        planId,
        friendId,
        month,
      ),
      request,
    );
  }

  @Get(":id/shares")
  async list(
    @Headers("authorization") bearer: string,
    @Param("id") planId: string,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<PlanShareDto[]>> {
    return ok(
      await this.shares.listShares(
        await this.auth.authenticate(bearer ?? ""),
        planId,
      ),
      request,
    );
  }

  @Put(":id/shares/:friendId")
  async share(
    @Headers("authorization") bearer: string,
    @Headers("idempotency-key") key: string,
    @Param("id") planId: string,
    @Param("friendId") friendId: string,
    @Body() body: ShareGrantRequest,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<PlanShareDto>> {
    guardFields(body, ["previewToken"]);
    if (!body.previewToken) fail("VALIDATION_ERROR", 400, "请先预览分享内容");
    return ok(
      await this.shares.share(
        await this.auth.authenticate(bearer ?? ""),
        planId,
        friendId,
        body.previewToken,
        key,
      ),
      request,
    );
  }

  @Delete(":id/shares/:friendId")
  async revoke(
    @Headers("authorization") bearer: string,
    @Headers("idempotency-key") key: string,
    @Param("id") planId: string,
    @Param("friendId") friendId: string,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<{ revoked: true }>> {
    return ok(
      await this.shares.revoke(
        await this.auth.authenticate(bearer ?? ""),
        planId,
        friendId,
        key,
      ),
      request,
    );
  }
}

@Controller("friends")
export class FriendSharedPlansController {
  constructor(
    private readonly auth: AuthService,
    private readonly shares: SharesService,
  ) {}

  @Get(":id/shared-plans")
  async list(
    @Headers("authorization") bearer: string,
    @Param("id") friendId: string,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<SharedPlanDto[]>> {
    return ok(
      await this.shares.listFriendPlans(
        await this.auth.authenticate(bearer ?? ""),
        friendId,
      ),
      request,
    );
  }
}

@Controller("shared-plans")
export class SharedPlansController {
  constructor(
    private readonly auth: AuthService,
    private readonly shares: SharesService,
  ) {}

  @Get(":id")
  async get(
    @Headers("authorization") bearer: string,
    @Param("id") planId: string,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<SharedPlanDto>> {
    return ok(
      await this.shares.sharedPlan(
        await this.auth.authenticate(bearer ?? ""),
        planId,
      ),
      request,
    );
  }

  @Get(":id/checkins")
  async history(
    @Headers("authorization") bearer: string,
    @Param("id") planId: string,
    @Query("month") month: string | undefined,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<SharedHistoryDto>> {
    return ok(
      await this.shares.sharedHistory(
        await this.auth.authenticate(bearer ?? ""),
        planId,
        month,
      ),
      request,
    );
  }
}

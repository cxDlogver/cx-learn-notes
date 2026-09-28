import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
} from "@nestjs/common";
import type {
  ApiSuccess,
  CreateEncouragementRequest,
  EncouragementDto,
} from "@plan-checkin/contracts";
import { AuthService } from "../auth/auth.service.js";
import { ok } from "../http.js";
import { EncouragementsService } from "./encouragements.service.js";

interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
}

@Controller("checkins")
export class EncouragementsController {
  constructor(
    private readonly auth: AuthService,
    private readonly encouragements: EncouragementsService,
  ) {}

  @Post(":id/encouragements")
  async create(
    @Headers("authorization") bearer: string,
    @Headers("idempotency-key") key: string,
    @Param("id") checkinId: string,
    @Body() body: CreateEncouragementRequest,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<EncouragementDto>> {
    return ok(
      await this.encouragements.create(
        await this.auth.authenticate(bearer ?? ""),
        checkinId,
        body,
        key,
      ),
      request,
    );
  }

  @Get(":id/encouragements")
  async list(
    @Headers("authorization") bearer: string,
    @Param("id") checkinId: string,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<EncouragementDto[]>> {
    return ok(
      await this.encouragements.list(
        await this.auth.authenticate(bearer ?? ""),
        checkinId,
      ),
      request,
    );
  }
}

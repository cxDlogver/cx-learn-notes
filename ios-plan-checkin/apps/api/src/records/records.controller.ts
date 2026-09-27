import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Put,
  Req,
} from "@nestjs/common";
import type {
  ApiSuccess,
  CheckinDto,
  OneTimeResolutionDto,
  OneTimeResolutionRequest,
  PutCheckinRequest,
} from "@plan-checkin/contracts";
import { AuthService } from "../auth/auth.service.js";
import { ok } from "../http.js";
import { RecordsService } from "./records.service.js";

interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
}

@Controller("plans/:id")
export class RecordsController {
  constructor(
    private readonly auth: AuthService,
    private readonly records: RecordsService,
  ) {}
  private user(bearer: string): Promise<string> {
    return this.auth.authenticate(bearer ?? "");
  }

  @Put("checkins/:businessDate")
  async put(
    @Headers("authorization") bearer: string,
    @Headers("idempotency-key") key: string,
    @Param("id") id: string,
    @Param("businessDate") date: string,
    @Body() body: PutCheckinRequest,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<CheckinDto>> {
    return ok(
      await this.records.put(await this.user(bearer), id, date, body, key),
      request,
    );
  }

  @Get("checkins/:businessDate")
  async get(
    @Headers("authorization") bearer: string,
    @Param("id") id: string,
    @Param("businessDate") date: string,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<CheckinDto>> {
    return ok(
      await this.records.get(await this.user(bearer), id, date),
      request,
    );
  }

  @Post("one-time-resolution")
  async resolve(
    @Headers("authorization") bearer: string,
    @Headers("idempotency-key") key: string,
    @Param("id") id: string,
    @Body() body: OneTimeResolutionRequest,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<OneTimeResolutionDto>> {
    return ok(
      await this.records.resolveOneTime(
        await this.user(bearer),
        id,
        body,
        key,
        false,
      ),
      request,
    );
  }

  @Patch("one-time-resolution")
  async correct(
    @Headers("authorization") bearer: string,
    @Headers("idempotency-key") key: string,
    @Param("id") id: string,
    @Body() body: OneTimeResolutionRequest,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<OneTimeResolutionDto>> {
    return ok(
      await this.records.resolveOneTime(
        await this.user(bearer),
        id,
        body,
        key,
        true,
      ),
      request,
    );
  }
}

import { Body, Controller, Get, Headers, Post, Req } from "@nestjs/common";
import type {
  ApiSuccess,
  AuthTokens,
  SmsVerifyRequest,
} from "@plan-checkin/contracts";
import { randomUUID } from "node:crypto";
import { AuthService } from "../auth/auth.service.js";
import { fail, ok } from "../http.js";
import { DeletionService, type DeletionStatus } from "./deletion.service.js";

interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
}

@Controller("me")
export class DeletionController {
  constructor(
    private readonly auth: AuthService,
    private readonly deletion: DeletionService,
  ) {}

  @Get("deletion-status")
  async status(
    @Headers("authorization") bearer: string,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<DeletionStatus>> {
    return ok(
      await this.deletion.status(await this.auth.authenticate(bearer)),
      request,
    );
  }

  @Post("deletion-request")
  async requestDeletion(
    @Headers("authorization") bearer: string,
    @Body() body: { confirmed?: boolean },
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<DeletionStatus>> {
    return ok(
      await this.deletion.request(
        await this.auth.authenticate(bearer),
        body?.confirmed === true,
      ),
      request,
    );
  }

  @Post("deletion-cancel")
  async cancel(
    @Headers("x-device-id") deviceId: string | undefined,
    @Headers("idempotency-key") key: string,
    @Body() body: SmsVerifyRequest,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<AuthTokens>> {
    if (deviceId && deviceId.length > 100)
      fail("VALIDATION_ERROR", 400, "设备标识过长");
    return ok(
      await this.auth.verify(
        body,
        deviceId || randomUUID(),
        key,
        "cancel_deletion",
      ),
      request,
    );
  }
}

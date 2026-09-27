import {
  Body,
  Controller,
  Get,
  Headers,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import type { ApiSuccess, UserDto } from "@plan-checkin/contracts";
import { AuthService } from "../auth/auth.service.js";
import { fail, ok } from "../http.js";
import { ProfileService } from "./profile.service.js";

interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
}

@Controller()
export class ProfileController {
  constructor(
    private readonly auth: AuthService,
    private readonly profile: ProfileService,
  ) {}

  @Get("me")
  async getMe(
    @Headers("authorization") bearer: string,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<UserDto>> {
    return ok(
      await this.profile.getMe(await this.auth.authenticate(bearer ?? "")),
      request,
    );
  }

  @Patch("me")
  async updateMe(
    @Headers("authorization") bearer: string,
    @Headers("idempotency-key") idempotencyKey: string,
    @Body()
    body: {
      username?: string;
      nickname?: string;
      avatarMediaId?: string | null;
      baseRevision: number;
    },
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<UserDto>> {
    const userId = await this.auth.authenticate(bearer ?? "");
    return ok(
      await this.profile.updateMe(userId, body, idempotencyKey),
      request,
    );
  }

  @Get("usernames/availability")
  async usernameAvailability(
    @Headers("authorization") bearer: string,
    @Query("username") username: string | undefined,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<{ available: boolean; normalized: string }>> {
    if (!username) fail("VALIDATION_ERROR", 400, "请输入用户名");
    const userId = await this.auth.authenticate(bearer ?? "");
    return ok(
      await this.profile.usernameAvailability(username, userId),
      request,
    );
  }

  @Post("me/change-phone/challenge")
  async createPhoneChange(
    @Headers("authorization") bearer: string,
    @Headers("idempotency-key") idempotencyKey: string,
    @Body() body: { countryCode: string; phone: string },
    @Req() request: RequestLike,
  ): Promise<
    ApiSuccess<{
      requestId: string;
      oldMasked: string;
      newMasked: string;
      expiresAt: string;
    }>
  > {
    const userId = await this.auth.authenticate(bearer ?? "");
    return ok(
      await this.auth.createPhoneChange(userId, body, idempotencyKey),
      request,
    );
  }

  @Post("me/change-phone/confirm")
  async confirmPhoneChange(
    @Headers("authorization") bearer: string,
    @Headers("idempotency-key") idempotencyKey: string,
    @Body() body: { requestId: string; oldCode: string; newCode: string },
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<{ changed: true }>> {
    const userId = await this.auth.authenticate(bearer ?? "");
    return ok(
      await this.auth.confirmPhoneChange(userId, body, idempotencyKey),
      request,
    );
  }
}

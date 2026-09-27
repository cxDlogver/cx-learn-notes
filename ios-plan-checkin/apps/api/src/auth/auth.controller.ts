import { Body, Controller, Headers, Ip, Post, Req } from "@nestjs/common";
import type {
  ApiSuccess,
  AuthTokens,
  SmsChallengeRequest,
  SmsVerifyRequest,
} from "@plan-checkin/contracts";
import { fail, ok } from "../http.js";
import { AuthService } from "./auth.service.js";

interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
}

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("sms/challenges")
  async createChallenge(
    @Body() body: SmsChallengeRequest,
    @Ip() ip: string,
    @Headers("idempotency-key") idempotencyKey: string,
    @Req() request: RequestLike,
  ): Promise<
    ApiSuccess<{
      challengeId: string;
      expiresAt: string;
      resendAfterSeconds: number;
    }>
  > {
    return ok(
      await this.auth.createChallenge(body, ip, idempotencyKey),
      request,
    );
  }

  @Post("sms/verify")
  async verify(
    @Body() body: SmsVerifyRequest,
    @Headers("x-device-id") deviceId: string | undefined,
    @Headers("idempotency-key") idempotencyKey: string,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<AuthTokens>> {
    if (!deviceId || deviceId.length > 100)
      fail("VALIDATION_ERROR", 400, "缺少设备标识");
    return ok(await this.auth.verify(body, deviceId, idempotencyKey), request);
  }

  @Post("refresh")
  async refresh(
    @Body() body: { refreshToken?: string },
    @Headers("idempotency-key") idempotencyKey: string,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<AuthTokens>> {
    if (!body?.refreshToken) fail("UNAUTHENTICATED", 401, "请重新登录");
    return ok(
      await this.auth.refresh(body.refreshToken, idempotencyKey),
      request,
    );
  }

  @Post("logout")
  async logout(
    @Body() body: { refreshToken?: string },
    @Headers("idempotency-key") idempotencyKey: string,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<{ loggedOut: true }>> {
    if (body?.refreshToken)
      await this.auth.logout(body.refreshToken, idempotencyKey);
    else await this.auth.logout("", idempotencyKey);
    return ok({ loggedOut: true }, request);
  }
}

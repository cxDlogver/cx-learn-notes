import {
  Body,
  Controller,
  Get,
  Headers,
  Ip,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import type {
  ApiSuccess,
  AuthTokens,
  SmsChallengeRequest,
  SmsVerifyRequest,
} from "@plan-checkin/contracts";
import { fail, ok } from "../http.js";
import { ApiConfig } from "../config.js";
import { AuthService } from "./auth.service.js";
import {
  clearRefreshCookie,
  csrfForRefresh,
  readRefreshCookie,
  refreshCookie,
  requireCsrf,
  requireWebOrigin,
} from "./web-session.js";

interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
}
interface ResponseLike {
  setHeader(name: string, value: string): void;
}
type WebSessionData = Omit<AuthTokens, "refreshToken"> & { csrfToken: string };

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ApiConfig,
  ) {}

  private webResponse(
    tokens: AuthTokens,
    response: ResponseLike,
    request: RequestLike,
  ): ApiSuccess<WebSessionData> {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Set-Cookie", refreshCookie(tokens.refreshToken));
    const { refreshToken, ...publicTokens } = tokens;
    return ok(
      {
        ...publicTokens,
        csrfToken: csrfForRefresh(refreshToken, this.config.authIdempotencyKey),
      },
      request,
    );
  }

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

  @Post("web/verify")
  async verifyWeb(
    @Body() body: SmsVerifyRequest,
    @Headers("origin") origin: string | undefined,
    @Headers("host") host: string | undefined,
    @Headers("x-device-id") deviceId: string | undefined,
    @Headers("idempotency-key") idempotencyKey: string,
    @Req() request: RequestLike,
    @Res({ passthrough: true }) response: ResponseLike,
  ): Promise<ApiSuccess<WebSessionData>> {
    requireWebOrigin(this.config.webOrigin, origin, host, true);
    if (!deviceId || deviceId.length > 100)
      fail("VALIDATION_ERROR", 400, "缺少设备标识");
    const tokens = await this.auth.verify(
      body,
      deviceId,
      idempotencyKey,
      "login",
      "web",
    );
    await this.auth.resumeWebSession(tokens.refreshToken);
    return this.webResponse(tokens, response, request);
  }

  @Get("web/session")
  async webSession(
    @Headers("host") host: string | undefined,
    @Headers("cookie") cookie: string | undefined,
    @Req() request: RequestLike,
    @Res({ passthrough: true }) response: ResponseLike,
  ): Promise<ApiSuccess<WebSessionData>> {
    requireWebOrigin(this.config.webOrigin, undefined, host, false);
    const refreshToken = readRefreshCookie(cookie);
    const tokens = await this.auth.resumeWebSession(refreshToken);
    response.setHeader("Cache-Control", "no-store");
    return ok(
      {
        ...tokens,
        csrfToken: csrfForRefresh(refreshToken, this.config.authIdempotencyKey),
      },
      request,
    );
  }

  @Post("web/refresh")
  async refreshWeb(
    @Headers("origin") origin: string | undefined,
    @Headers("host") host: string | undefined,
    @Headers("cookie") cookie: string | undefined,
    @Headers("x-csrf-token") csrf: string | undefined,
    @Headers("idempotency-key") idempotencyKey: string,
    @Req() request: RequestLike,
    @Res({ passthrough: true }) response: ResponseLike,
  ): Promise<ApiSuccess<WebSessionData>> {
    requireWebOrigin(this.config.webOrigin, origin, host, true);
    const refreshToken = readRefreshCookie(cookie);
    requireCsrf(refreshToken, csrf, this.config.authIdempotencyKey);
    const tokens = await this.auth.refresh(refreshToken, idempotencyKey, "web");
    await this.auth.resumeWebSession(tokens.refreshToken);
    return this.webResponse(tokens, response, request);
  }

  @Post("web/logout")
  async logoutWeb(
    @Headers("origin") origin: string | undefined,
    @Headers("host") host: string | undefined,
    @Headers("cookie") cookie: string | undefined,
    @Headers("x-csrf-token") csrf: string | undefined,
    @Headers("idempotency-key") idempotencyKey: string,
    @Req() request: RequestLike,
    @Res({ passthrough: true }) response: ResponseLike,
  ): Promise<ApiSuccess<{ loggedOut: true }>> {
    requireWebOrigin(this.config.webOrigin, origin, host, true);
    const refreshToken = readRefreshCookie(cookie);
    requireCsrf(refreshToken, csrf, this.config.authIdempotencyKey);
    await this.auth.logout(refreshToken, idempotencyKey, "web");
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Set-Cookie", clearRefreshCookie());
    return ok({ loggedOut: true }, request);
  }
}

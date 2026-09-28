import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Patch,
  Post,
  Req,
} from "@nestjs/common";
import type {
  ApiSuccess,
  NotificationPreferencesDto,
  PushTokenRegistrationDto,
  RegisterWebPushSubscriptionRequest,
  RegisterPushTokenRequest,
  UpdateNotificationPreferencesRequest,
  UpdateWebNotificationPreferencesRequest,
  WebNotificationPreferencesDto,
  WebPushSubscriptionDto,
  WebPushConfigDto,
} from "@plan-checkin/contracts";
import { ApiConfig } from "../config.js";
import { AuthService } from "../auth/auth.service.js";
import { ok } from "../http.js";
import { NotificationsService } from "./notifications.service.js";

interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
}

@Controller("devices")
export class DevicesController {
  constructor(
    private readonly auth: AuthService,
    private readonly notifications: NotificationsService,
  ) {}
  @Post("push-token")
  async register(
    @Headers("authorization") bearer: string,
    @Body() body: RegisterPushTokenRequest,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<PushTokenRegistrationDto>> {
    return ok(
      await this.notifications.register(
        await this.auth.authenticate(bearer ?? ""),
        body,
      ),
      request,
    );
  }
}

@Controller("me")
export class NotificationPreferencesController {
  constructor(
    private readonly auth: AuthService,
    private readonly notifications: NotificationsService,
  ) {}
  @Get("notification-preferences")
  async get(
    @Headers("authorization") bearer: string,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<NotificationPreferencesDto>> {
    return ok(
      await this.notifications.getPreferences(
        await this.auth.authenticate(bearer ?? ""),
      ),
      request,
    );
  }
  @Patch("notification-preferences")
  async update(
    @Headers("authorization") bearer: string,
    @Headers("idempotency-key") key: string,
    @Body() body: UpdateNotificationPreferencesRequest,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<NotificationPreferencesDto>> {
    return ok(
      await this.notifications.updatePreferences(
        await this.auth.authenticate(bearer ?? ""),
        body,
        key,
      ),
      request,
    );
  }

  @Get("notification-channels/web")
  async getWeb(
    @Headers("authorization") bearer: string,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<WebNotificationPreferencesDto>> {
    const session = await this.auth.authenticateContext(bearer ?? "", "web");
    return ok(
      await this.notifications.getWebPreferences(session.userId),
      request,
    );
  }

  @Patch("notification-channels/web")
  async updateWeb(
    @Headers("authorization") bearer: string,
    @Headers("idempotency-key") key: string,
    @Body() body: UpdateWebNotificationPreferencesRequest,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<WebNotificationPreferencesDto>> {
    const session = await this.auth.authenticateContext(bearer ?? "", "web");
    return ok(
      await this.notifications.updateWebPreferences(session.userId, body, key),
      request,
    );
  }
}

@Controller("me/web-push-subscriptions")
export class WebPushSubscriptionsController {
  constructor(
    private readonly auth: AuthService,
    private readonly notifications: NotificationsService,
  ) {}

  @Post()
  async register(
    @Headers("authorization") bearer: string,
    @Headers("idempotency-key") key: string,
    @Body() body: RegisterWebPushSubscriptionRequest,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<WebPushSubscriptionDto>> {
    const session = await this.auth.authenticateContext(bearer ?? "", "web");
    return ok(
      await this.notifications.registerWebPush(
        session.userId,
        session.deviceId,
        body,
        key,
      ),
      request,
    );
  }

  @Delete()
  async unregister(
    @Headers("authorization") bearer: string,
    @Headers("idempotency-key") key: string,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<WebPushSubscriptionDto>> {
    const session = await this.auth.authenticateContext(bearer ?? "", "web");
    return ok(
      await this.notifications.deleteWebPush(
        session.userId,
        session.deviceId,
        key,
      ),
      request,
    );
  }
}

@Controller("web-push")
export class WebPushConfigController {
  constructor(private readonly config: ApiConfig) {}

  @Get("config")
  get(@Req() request: RequestLike): ApiSuccess<WebPushConfigDto> {
    return ok(
      {
        available: Boolean(this.config.vapidPublicKey),
        publicKey: this.config.vapidPublicKey,
      },
      request,
    );
  }
}

import {
  Body,
  Controller,
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
  RegisterPushTokenRequest,
  UpdateNotificationPreferencesRequest,
} from "@plan-checkin/contracts";
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
}

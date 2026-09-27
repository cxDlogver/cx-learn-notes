import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Put,
  Req,
} from "@nestjs/common";
import type {
  ApiSuccess,
  PutReminderRequest,
  ReminderDto,
} from "@plan-checkin/contracts";
import { AuthService } from "../auth/auth.service.js";
import { ok } from "../http.js";
import { RemindersService } from "./reminders.service.js";

interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
}

@Controller("plans")
export class RemindersController {
  constructor(
    private readonly auth: AuthService,
    private readonly reminders: RemindersService,
  ) {}

  @Get(":id/reminder")
  async get(
    @Headers("authorization") bearer: string,
    @Param("id") planId: string,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<ReminderDto>> {
    return ok(
      await this.reminders.get(
        await this.auth.authenticate(bearer ?? ""),
        planId,
      ),
      request,
    );
  }

  @Put(":id/reminder")
  async put(
    @Headers("authorization") bearer: string,
    @Headers("idempotency-key") key: string,
    @Param("id") planId: string,
    @Body() body: PutReminderRequest,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<ReminderDto>> {
    return ok(
      await this.reminders.put(
        await this.auth.authenticate(bearer ?? ""),
        planId,
        body,
        key,
      ),
      request,
    );
  }
}

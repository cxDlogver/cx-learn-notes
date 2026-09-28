import {
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import type {
  ApiSuccess,
  InboxPageDto,
  InboxReadDto,
} from "@plan-checkin/contracts";
import { AuthService } from "../auth/auth.service.js";
import { ok } from "../http.js";
import { InboxService } from "./inbox.service.js";

interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
}

@Controller("me/inbox")
export class InboxController {
  constructor(
    private readonly auth: AuthService,
    private readonly inbox: InboxService,
  ) {}

  @Get()
  async list(
    @Headers("authorization") bearer: string,
    @Query("cursor") cursor: string | undefined,
    @Query("limit") limit: string | undefined,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<InboxPageDto>> {
    return ok(
      await this.inbox.list(
        await this.auth.authenticate(bearer ?? ""),
        cursor,
        limit,
      ),
      request,
    );
  }

  @Post(":id/read")
  async markRead(
    @Headers("authorization") bearer: string,
    @Headers("idempotency-key") key: string,
    @Param("id") id: string,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<InboxReadDto>> {
    return ok(
      await this.inbox.markRead(
        await this.auth.authenticate(bearer ?? ""),
        id,
        key,
      ),
      request,
    );
  }
}

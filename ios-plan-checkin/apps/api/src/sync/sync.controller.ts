import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import type {
  ApiSuccess,
  SyncAckDto,
  SyncAckRequest,
  SyncChangesDto,
} from "@plan-checkin/contracts";
import { AuthService } from "../auth/auth.service.js";
import { ok } from "../http.js";
import { SyncService } from "./sync.service.js";

interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
}

@Controller("sync")
export class SyncController {
  constructor(
    private readonly auth: AuthService,
    private readonly sync: SyncService,
  ) {}

  @Get("changes")
  async changes(
    @Headers("authorization") bearer: string,
    @Query("cursor") cursor: string | undefined,
    @Query("limit") limit: string | undefined,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<SyncChangesDto>> {
    return ok(
      await this.sync.changes(
        await this.auth.authenticate(bearer ?? ""),
        cursor,
        limit,
      ),
      request,
    );
  }

  @Post("ack")
  async acknowledge(
    @Headers("authorization") bearer: string,
    @Body() body: SyncAckRequest,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<SyncAckDto>> {
    return ok(
      await this.sync.acknowledge(
        await this.auth.authenticate(bearer ?? ""),
        body,
      ),
      request,
    );
  }
}

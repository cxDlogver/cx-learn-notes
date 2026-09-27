import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import type {
  ApiSuccess,
  CreateBlockRequest,
  CreateFriendRequestRequest,
  FriendRequestDto,
  FriendRequestsDto,
  SocialUserDto,
} from "@plan-checkin/contracts";
import { AuthService } from "../auth/auth.service.js";
import { fail, ok } from "../http.js";
import { guardFields } from "../plans/write.js";
import { SocialService } from "./social.service.js";

interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
}

@Controller("users")
export class UserSearchController {
  constructor(
    private readonly auth: AuthService,
    private readonly social: SocialService,
  ) {}

  @Get("search")
  async search(
    @Headers("authorization") bearer: string,
    @Query("username") username: string,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<SocialUserDto[]>> {
    return ok(
      await this.social.search(
        await this.auth.authenticate(bearer ?? ""),
        username,
      ),
      request,
    );
  }
}

@Controller("friend-requests")
export class FriendRequestsController {
  constructor(
    private readonly auth: AuthService,
    private readonly social: SocialService,
  ) {}

  @Get()
  async list(
    @Headers("authorization") bearer: string,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<FriendRequestsDto>> {
    return ok(
      await this.social.requests(await this.auth.authenticate(bearer ?? "")),
      request,
    );
  }

  @Post()
  async create(
    @Headers("authorization") bearer: string,
    @Headers("idempotency-key") key: string,
    @Body() body: CreateFriendRequestRequest,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<FriendRequestDto>> {
    guardFields(body, ["receiverId"]);
    return ok(
      await this.social.request(
        await this.auth.authenticate(bearer ?? ""),
        body.receiverId,
        key,
      ),
      request,
    );
  }

  @Post(":id/accept")
  async accept(
    @Headers("authorization") bearer: string,
    @Headers("idempotency-key") key: string,
    @Param("id") id: string,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<FriendRequestDto>> {
    return ok(
      await this.social.accept(
        await this.auth.authenticate(bearer ?? ""),
        id,
        key,
      ),
      request,
    );
  }

  @Post(":id/reject")
  async reject(
    @Headers("authorization") bearer: string,
    @Headers("idempotency-key") key: string,
    @Param("id") id: string,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<FriendRequestDto>> {
    return ok(
      await this.social.reject(
        await this.auth.authenticate(bearer ?? ""),
        id,
        key,
      ),
      request,
    );
  }
}

@Controller("friends")
export class FriendsController {
  constructor(
    private readonly auth: AuthService,
    private readonly social: SocialService,
  ) {}

  @Get()
  async list(
    @Headers("authorization") bearer: string,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<SocialUserDto[]>> {
    return ok(
      await this.social.friends(await this.auth.authenticate(bearer ?? "")),
      request,
    );
  }

  @Delete(":id")
  async remove(
    @Headers("authorization") bearer: string,
    @Headers("idempotency-key") key: string,
    @Param("id") id: string,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<{ deleted: true }>> {
    return ok(
      await this.social.remove(
        await this.auth.authenticate(bearer ?? ""),
        id,
        key,
      ),
      request,
    );
  }
}

@Controller("blocks")
export class BlocksController {
  constructor(
    private readonly auth: AuthService,
    private readonly social: SocialService,
  ) {}

  @Post()
  async create(
    @Headers("authorization") bearer: string,
    @Headers("idempotency-key") key: string,
    @Body() body: CreateBlockRequest,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<{ blocked: true }>> {
    guardFields(body, ["blockedId"]);
    if (!body.blockedId) fail("VALIDATION_ERROR", 400, "请选择屏蔽用户");
    return ok(
      await this.social.block(
        await this.auth.authenticate(bearer ?? ""),
        body.blockedId,
        key,
      ),
      request,
    );
  }

  @Delete(":id")
  async remove(
    @Headers("authorization") bearer: string,
    @Headers("idempotency-key") key: string,
    @Param("id") id: string,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<{ unblocked: true }>> {
    return ok(
      await this.social.unblock(
        await this.auth.authenticate(bearer ?? ""),
        id,
        key,
      ),
      request,
    );
  }
}

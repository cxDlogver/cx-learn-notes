import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Req,
} from "@nestjs/common";
import type {
  ApiSuccess,
  CompleteMediaRequest,
  CreateUploadIntentRequest,
  MediaDownloadDto,
  MediaDto,
  UploadIntentDto,
} from "@plan-checkin/contracts";
import { AuthService } from "../auth/auth.service.js";
import { ok } from "../http.js";
import { MediaService } from "./media.service.js";

interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
}

@Controller("media")
export class MediaController {
  constructor(
    private readonly auth: AuthService,
    private readonly media: MediaService,
  ) {}

  @Post("upload-intents")
  async createIntent(
    @Headers("authorization") bearer: string,
    @Body() body: CreateUploadIntentRequest,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<UploadIntentDto>> {
    return ok(
      await this.media.createIntent(
        await this.auth.authenticate(bearer ?? ""),
        body,
      ),
      request,
    );
  }

  @Post(":id/complete")
  async complete(
    @Headers("authorization") bearer: string,
    @Param("id") id: string,
    @Body() body: CompleteMediaRequest,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<MediaDto>> {
    return ok(
      await this.media.complete(
        await this.auth.authenticate(bearer ?? ""),
        id,
        body,
      ),
      request,
    );
  }

  @Delete(":id")
  async remove(
    @Headers("authorization") bearer: string,
    @Param("id") id: string,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<{ deleted: true }>> {
    return ok(
      await this.media.remove(await this.auth.authenticate(bearer ?? ""), id),
      request,
    );
  }

  @Get(":id/download-url")
  async download(
    @Headers("authorization") bearer: string,
    @Param("id") id: string,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<MediaDownloadDto>> {
    return ok(
      await this.media.download(await this.auth.authenticate(bearer ?? ""), id),
      request,
    );
  }
}

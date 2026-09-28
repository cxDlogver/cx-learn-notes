import { Controller, Get, Headers, Param, Post, Req } from "@nestjs/common";
import type {
  ApiSuccess,
  DataExportDto,
  DataExportDownloadDto,
} from "@plan-checkin/contracts";
import { AuthService } from "../auth/auth.service.js";
import { ok, requestId } from "../http.js";
import { ExportsService } from "./exports.service.js";

interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
}
@Controller("exports")
export class ExportsController {
  constructor(
    private readonly auth: AuthService,
    private readonly exports: ExportsService,
  ) {}
  @Post()
  async create(
    @Headers("authorization") bearer: string,
    @Headers("idempotency-key") key: string,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<DataExportDto>> {
    return ok(
      await this.exports.create(
        await this.auth.authenticate(bearer ?? ""),
        key,
      ),
      request,
    );
  }
  @Get()
  async list(
    @Headers("authorization") bearer: string,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<DataExportDto[]>> {
    return ok(
      await this.exports.list(await this.auth.authenticate(bearer ?? "")),
      request,
    );
  }
  @Get(":id")
  async get(
    @Headers("authorization") bearer: string,
    @Param("id") id: string,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<DataExportDto>> {
    return ok(
      await this.exports.get(await this.auth.authenticate(bearer ?? ""), id),
      request,
    );
  }
  @Get(":id/download-url")
  async download(
    @Headers("authorization") bearer: string,
    @Param("id") id: string,
    @Req() request: RequestLike,
  ): Promise<ApiSuccess<DataExportDownloadDto>> {
    return ok(
      await this.exports.download(
        await this.auth.authenticate(bearer ?? ""),
        id,
        requestId(request),
      ),
      request,
    );
  }
}

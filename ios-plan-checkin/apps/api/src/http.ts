import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { ApiErrorCode, ApiSuccess } from "@plan-checkin/contracts";

interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
}
interface ResponseLike {
  status(code: number): ResponseLike;
  json(body: unknown): void;
}

export function requestId(request: RequestLike): string {
  const header = request.headers["x-client-request-id"];
  return typeof header === "string" && header.length <= 100
    ? header
    : randomUUID();
}

export function ok<T>(data: T, request: RequestLike): ApiSuccess<T> {
  return {
    data,
    requestId: requestId(request),
    serverTime: new Date().toISOString(),
  };
}

export function fail(
  code: ApiErrorCode,
  status: number,
  message: string,
): never {
  throw new HttpException({ code, message }, status);
}

@Injectable()
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const request = host.switchToHttp().getRequest<RequestLike>();
    const response = host.switchToHttp().getResponse<ResponseLike>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const body =
      exception instanceof HttpException ? exception.getResponse() : null;
    const details =
      body && typeof body === "object" ? (body as Record<string, unknown>) : {};
    const code =
      typeof details.code === "string"
        ? details.code
        : status === 500
          ? "INTERNAL_ERROR"
          : "VALIDATION_ERROR";
    const message =
      typeof details.message === "string"
        ? details.message
        : "请求处理失败，请稍后再试";
    response.status(status).json({
      code,
      message,
      requestId: requestId(request),
      ...(details.details && typeof details.details === "object"
        ? { details: details.details }
        : {}),
    });
  }
}

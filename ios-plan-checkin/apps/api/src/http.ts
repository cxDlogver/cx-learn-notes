import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { createHmac, randomUUID } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import type { ApiErrorCode, ApiSuccess } from "@plan-checkin/contracts";

interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
  assignedRequestId?: string;
}
interface ResponseLike {
  status(code: number): ResponseLike;
  json(body: unknown): void;
}

export function requestId(request: RequestLike): string {
  if (request.assignedRequestId) return request.assignedRequestId;
  const header = request.headers["x-client-request-id"];
  request.assignedRequestId =
    typeof header === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      header,
    )
      ? header
      : randomUUID();
  return request.assignedRequestId;
}

export interface RequestTrace {
  requestId: string;
  actorHash?: string;
  operation?: string;
  resourceHash?: string;
  baseRevision?: number;
  errorCode?: string;
}
export const requestTrace = new AsyncLocalStorage<RequestTrace>();
const digest = (secret: Uint8Array, kind: string, value: string) =>
  createHmac("sha256", secret)
    .update(`${kind}:${value}`)
    .digest("hex")
    .slice(0, 20);

export function observeActor(userId: string, secret: Uint8Array): void {
  const trace = requestTrace.getStore();
  if (trace) trace.actorHash = digest(secret, "actor", userId);
}

export function observeWrite(
  operation: string,
  input: unknown,
  secret: Uint8Array,
): void {
  const trace = requestTrace.getStore();
  if (!trace) return;
  trace.operation = /^[a-z][a-z0-9_.-]{0,63}$/.test(operation)
    ? operation
    : "other";
  if (!input || typeof input !== "object") return;
  const fields = input as Record<string, unknown>;
  if (typeof fields.id === "string")
    trace.resourceHash = digest(secret, "resource", fields.id);
  if (typeof fields.baseRevision === "number")
    trace.baseRevision = fields.baseRevision;
}

export function opaqueHash(
  secret: Uint8Array,
  kind: string,
  value: string,
): string {
  return digest(secret, kind, value);
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
    const trace = requestTrace.getStore();
    if (trace) trace.errorCode = code;
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

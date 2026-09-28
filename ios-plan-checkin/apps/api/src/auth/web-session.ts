import { createHmac, timingSafeEqual } from "node:crypto";
import { fail } from "../http.js";

export const WEB_REFRESH_COOKIE = "__Host-plan-refresh";
const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;

export function requireWebOrigin(
  configuredOrigin: string | undefined,
  requestOrigin: string | undefined,
  requestHost: string | undefined,
  mutation: boolean,
): void {
  if (!configuredOrigin) fail("SERVICE_UNAVAILABLE", 503, "Web 登录尚未启用");
  const configuredHost = new URL(configuredOrigin).host;
  if (
    requestHost !== configuredHost ||
    (mutation && requestOrigin !== configuredOrigin)
  )
    fail("FORBIDDEN", 403, "请求来源不受信任");
}

export function readRefreshCookie(header: string | undefined): string {
  const matches = (header ?? "")
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${WEB_REFRESH_COOKIE}=`));
  const cookie = matches[0];
  if (matches.length !== 1 || !cookie)
    fail("UNAUTHENTICATED", 401, "会话已失效，请重新登录");
  const token = cookie.slice(WEB_REFRESH_COOKIE.length + 1);
  if (!/^([0-9a-f-]{36})\.[A-Za-z0-9_-]{43}$/i.test(token))
    fail("UNAUTHENTICATED", 401, "会话已失效，请重新登录");
  return token;
}

export function csrfForRefresh(refreshToken: string, key: Uint8Array): string {
  return createHmac("sha256", key)
    .update(`web-csrf:${refreshToken}`)
    .digest("base64url");
}

export function requireCsrf(
  refreshToken: string,
  supplied: string | undefined,
  key: Uint8Array,
): void {
  const expected = Buffer.from(csrfForRefresh(refreshToken, key));
  const actual = Buffer.from(supplied ?? "");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    fail("FORBIDDEN", 403, "会话校验失败");
}

export function refreshCookie(refreshToken: string): string {
  return `${WEB_REFRESH_COOKIE}=${refreshToken}; Max-Age=${THIRTY_DAYS_SECONDS}; Path=/; Secure; HttpOnly; SameSite=Lax`;
}

export function clearRefreshCookie(): string {
  return `${WEB_REFRESH_COOKIE}=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=Lax`;
}

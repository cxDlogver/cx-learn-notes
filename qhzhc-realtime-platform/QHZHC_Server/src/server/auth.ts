import { randomBytes } from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { UserSession } from "../shared/index.js";
import { AppDatabase } from "./database.js";
import { hashPassword, verifyPassword } from "./password.js";

export const SESSION_COOKIE = "qhzhc_session";

export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
  }
}

export function parseCookies(rawCookie: string | undefined): Record<string, string> {
  if (!rawCookie) return {};
  return Object.fromEntries(
    rawCookie.split(";").flatMap((entry) => {
      const separator = entry.indexOf("=");
      if (separator < 0) return [];
      const key = entry.slice(0, separator).trim();
      const value = entry.slice(separator + 1).trim();
      try {
        return [[key, decodeURIComponent(value)]];
      } catch {
        return [];
      }
    }),
  );
}

export class AuthService {
  constructor(
    private readonly database: AppDatabase,
    private readonly sessionTtlMs: number,
  ) {}

  register(username: string, displayName: string, password: string): UserSession {
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
      throw new AuthError("账号需为 3-24 位字母、数字或下划线", 400, "INVALID_USERNAME");
    }
    if (displayName.trim().length < 2 || displayName.trim().length > 30) {
      throw new AuthError("显示名称需为 2-30 个字符", 400, "INVALID_DISPLAY_NAME");
    }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      throw new AuthError("密码至少 8 位，且同时包含字母和数字", 400, "WEAK_PASSWORD");
    }
    if (this.database.findUserByUsername(username)) {
      throw new AuthError("该账号已存在", 409, "USERNAME_EXISTS");
    }
    const { hash, salt } = hashPassword(password);
    return this.database.createUser(username, displayName.trim(), hash, salt);
  }

  login(username: string, password: string): { user: UserSession; token: string; expiresAt: number } {
    const user = this.database.findUserByUsername(username);
    if (!user || !verifyPassword(password, user.password_salt, user.password_hash)) {
      throw new AuthError("账号或密码错误", 401, "INVALID_CREDENTIALS");
    }
    const token = randomBytes(32).toString("base64url");
    const expiresAt = Date.now() + this.sessionTtlMs;
    this.database.createSession(token, user.id, expiresAt);
    return {
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role: user.role,
      },
      token,
      expiresAt,
    };
  }

  sessionFromRequest(request: Pick<IncomingMessage, "headers">): UserSession | null {
    const token = parseCookies(request.headers.cookie)[SESSION_COOKIE];
    return token ? this.database.findSession(token) : null;
  }

  logout(request: Pick<IncomingMessage, "headers">): void {
    const token = parseCookies(request.headers.cookie)[SESSION_COOKIE];
    if (token) this.database.deleteSession(token);
  }
}

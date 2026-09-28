import type { AuthTokens } from "@plan-checkin/contracts";

export interface RefreshTokenStore {
  read(): Promise<string | null>;
  write(value: string): Promise<void>;
  clear(): Promise<void>;
}

export interface SessionGateway {
  refresh(refreshToken: string): Promise<AuthTokens>;
  logout(refreshToken: string): Promise<void>;
}
export interface SessionLocalData {
  activate(userId: string): Promise<void>;
  clearCurrent(): Promise<void>;
}

export type SessionSnapshot =
  | { phase: "loading"; userId: null }
  | { phase: "unauthenticated"; userId: null }
  | { phase: "unavailable"; userId: null }
  | { phase: "authenticated"; userId: string };

export class SessionError extends Error {}

export class SessionManager {
  private snapshot: SessionSnapshot = { phase: "loading", userId: null };
  private tokens: AuthTokens | null = null;
  private listeners = new Set<() => void>();
  private inFlight: Promise<AuthTokens> | null = null;

  constructor(
    private readonly store: RefreshTokenStore,
    private readonly gateway: SessionGateway,
    private readonly isInvalidRefresh: (error: unknown) => boolean,
    private readonly localData?: SessionLocalData,
  ) {}

  getSnapshot = (): SessionSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private setSnapshot(snapshot: SessionSnapshot): void {
    this.snapshot = snapshot;
    for (const listener of this.listeners) listener();
  }

  async restore(): Promise<void> {
    this.setSnapshot({ phase: "loading", userId: null });
    try {
      const stored = await this.store.read();
      if (!stored) {
        await this.localData?.clearCurrent();
        this.setSnapshot({ phase: "unauthenticated", userId: null });
        return;
      }
      await this.refresh(stored);
    } catch (error) {
      if (this.isInvalidRefresh(error)) {
        try {
          await this.clear();
        } catch {
          this.setSnapshot({ phase: "unavailable", userId: null });
        }
      } else {
        this.setSnapshot({ phase: "unavailable", userId: null });
      }
    }
  }

  async adopt(tokens: AuthTokens): Promise<void> {
    await this.localData?.activate(tokens.userId);
    await this.store.write(tokens.refreshToken);
    this.tokens = tokens;
    this.setSnapshot({ phase: "authenticated", userId: tokens.userId });
  }

  async clear(): Promise<void> {
    this.tokens = null;
    try {
      await this.store.clear();
      await this.localData?.clearCurrent();
      this.setSnapshot({ phase: "unauthenticated", userId: null });
    } catch (error) {
      this.setSnapshot({ phase: "unavailable", userId: null });
      throw error;
    }
  }

  async logout(): Promise<void> {
    const refreshToken = this.tokens?.refreshToken ?? (await this.store.read());
    if (refreshToken) await this.gateway.logout(refreshToken);
    await this.clear();
  }

  private async refresh(stored?: string): Promise<AuthTokens> {
    if (this.inFlight) return this.inFlight;
    this.inFlight = (async () => {
      const refreshToken =
        stored ?? this.tokens?.refreshToken ?? (await this.store.read());
      if (!refreshToken) throw new SessionError("请先登录");
      const next = await this.gateway.refresh(refreshToken);
      await this.adopt(next);
      return next;
    })();
    try {
      return await this.inFlight;
    } finally {
      this.inFlight = null;
    }
  }

  async accessToken(forceRefresh = false): Promise<string> {
    const tokens = this.tokens;
    if (
      !forceRefresh &&
      tokens &&
      Date.parse(tokens.accessExpiresAt) > Date.now() + 30_000
    )
      return tokens.accessToken;
    try {
      return (await this.refresh()).accessToken;
    } catch (error) {
      if (this.isInvalidRefresh(error)) await this.clear();
      throw error;
    }
  }
}

import type { CheckinDto } from "@plan-checkin/contracts";
import type { LocalCache, OutboxOperation } from "./localCache";

interface TransportError {
  status: number;
  code: string;
  message: string;
  retryAfterMs?: number | null;
}
function transportError(error: unknown): TransportError {
  if (
    error &&
    typeof error === "object" &&
    "status" in error &&
    "code" in error
  ) {
    const candidate = error as TransportError;
    return {
      status: candidate.status,
      code: candidate.code,
      message: candidate.message,
      retryAfterMs: candidate.retryAfterMs,
    };
  }
  return { status: 0, code: "NETWORK_ERROR", message: "同步暂时不可用" };
}

/** The queue is durable in LocalCache; this runner only coordinates attempts while the app is active. */
export class OutboxRunner {
  private inFlight: Promise<void> | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;
  private rerunRequested = false;
  private canSchedule = true;

  constructor(
    private readonly cache: LocalCache,
    private readonly accountId: () => string | null,
    private readonly send: (operation: OutboxOperation) => Promise<CheckinDto>,
    private readonly reachable: () => Promise<boolean>,
    private readonly onApplied: () => Promise<void> = async () => {},
    private readonly random: () => number = Math.random,
  ) {}

  private clearTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  stop(): void {
    this.stopped = true;
    this.clearTimer();
  }

  start(): void {
    this.stopped = false;
  }

  trigger(): Promise<void> {
    if (this.stopped) return Promise.resolve();
    this.clearTimer();
    if (this.inFlight) {
      this.rerunRequested = true;
      return this.inFlight;
    }
    this.inFlight = (async () => {
      do {
        this.rerunRequested = false;
        await this.run();
      } while (this.rerunRequested && !this.stopped);
    })().finally(() => {
      this.inFlight = null;
      void this.schedule().catch(() => {});
    });
    return this.inFlight;
  }

  private retryDelay(
    retryCount: number,
    after: number | null | undefined,
  ): number {
    const exponential = Math.min(
      30_000 * 2 ** Math.min(retryCount, 7),
      3_600_000,
    );
    const jittered = Math.round(exponential * (0.8 + this.random() * 0.4));
    return Math.max(jittered, after ?? 0);
  }

  private async run(): Promise<void> {
    const accountId = this.accountId();
    if (!accountId) return;
    this.canSchedule = await this.reachable();
    if (!this.canSchedule) return;
    for (let count = 0; count < 100 && !this.stopped; count++) {
      if (this.accountId() !== accountId) return;
      const operation = await this.cache.claimNextOperation(accountId);
      if (!operation) return;
      try {
        const record = await this.send(operation);
        if (this.accountId() !== accountId) return;
        await this.cache.acknowledgeOperation(accountId, operation, record);
        try {
          await this.onApplied();
        } catch {
          /* An invalidation failure must never resend an acknowledged write. */
        }
      } catch (error) {
        if (this.accountId() !== accountId) return;
        const failure = transportError(error);
        if (failure.status === 409 && failure.code === "CHECKIN_CONFLICT") {
          await this.cache.failOperation(
            accountId,
            operation,
            "conflict",
            failure.code,
            failure.message,
          );
        } else if (
          failure.status === 0 ||
          failure.status === 429 ||
          failure.status >= 500
        ) {
          const delay = this.retryDelay(
            operation.retryCount,
            failure.retryAfterMs,
          );
          await this.cache.failOperation(
            accountId,
            operation,
            "retry",
            failure.code,
            failure.message,
            new Date(Date.now() + delay),
          );
          if (failure.status === 0) return;
        } else {
          await this.cache.failOperation(
            accountId,
            operation,
            "failed",
            failure.code,
            failure.message,
          );
        }
      }
    }
    this.rerunRequested = true;
  }

  private async schedule(): Promise<void> {
    const accountId = this.accountId();
    if (this.stopped || !accountId || !this.canSchedule) return;
    const next = await this.cache.nextWakeAt(accountId);
    if (!next || this.stopped || this.accountId() !== accountId) return;
    this.clearTimer();
    this.timer = setTimeout(
      () => void this.trigger(),
      Math.max(1000, next.getTime() - Date.now()),
    );
  }
}

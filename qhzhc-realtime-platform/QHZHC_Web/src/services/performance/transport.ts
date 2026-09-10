import type { PerformanceBatch } from "../../../../QHZHC_Server/src/shared/performance";
export interface TransportOptions {
  url: () => string;
  token: () => string | null;
  refresh: () => Promise<string>;
  fetch?: typeof fetch;
}
export class PerformanceTransport {
  private queue: {
    batch: PerformanceBatch;
    attempts: number;
    refreshed: boolean;
    terminal: boolean;
  }[] = [];
  private busy = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  dropped = 0;
  constructor(private options: TransportOptions) {}
  enqueue(batch: PerformanceBatch, terminal = false): void {
    const size = new TextEncoder().encode(JSON.stringify(batch)).byteLength;
    if (size > 32768) {
      this.dropped++;
      return;
    }
    if (this.queue.length >= 20) {
      this.queue.splice(this.busy ? 1 : 0, 1);
      this.dropped++;
    }
    this.queue.push({ batch, attempts: 0, refreshed: false, terminal });
    if (terminal) for (const item of this.queue) item.terminal = true;
    void this.send();
  }
  get buffered(): number {
    return this.queue.length;
  }
  private async send(): Promise<void> {
    if (this.busy || this.timer || !this.queue.length) return;
    const item = this.queue[0],
      token = this.options.token();
    if (!token) {
      this.dropped += this.queue.length;
      this.queue = [];
      return;
    }
    this.busy = true;
    let wait = 0,
      remove = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const result = await (this.options.fetch || fetch)(this.options.url(), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify(item.batch),
        keepalive: item.terminal,
        signal: controller.signal,
      });
      if (result.status === 401 && !item.terminal && !item.refreshed) {
        item.refreshed = true;
        await this.options.refresh();
        remove = false;
      } else if (result.status === 429 && item.attempts < 2) {
        const retry = result.headers.get("Retry-After") || "60";
        const seconds = Number(retry);
        wait = Number.isFinite(seconds)
          ? Math.max(1000, seconds * 1000)
          : Math.max(1000, Date.parse(retry) - Date.now());
        if (!Number.isFinite(wait)) wait = 60000;
        item.attempts++;
        remove = false;
      } else if (result.status >= 500 && item.attempts < 2 && !item.terminal) {
        wait = [2000, 5000][item.attempts++];
        remove = false;
      } else if (!result.ok) this.dropped++;
    } catch {
      if (item.attempts < 2 && !item.terminal) {
        wait = [2000, 5000][item.attempts++];
        remove = false;
      } else this.dropped++;
    } finally {
      clearTimeout(timeout);
      if (remove) this.queue.shift();
      this.busy = false;
      if (wait) {
        this.timer = setTimeout(() => {
          this.timer = null;
          void this.send();
        }, wait);
      } else void this.send();
    }
  }
}

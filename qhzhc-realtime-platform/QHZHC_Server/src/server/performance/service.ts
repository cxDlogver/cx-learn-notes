import { Worker } from "node:worker_threads";
import type { PerformanceBatch, PerformanceQuery } from "../../shared/performance.js";
export interface PerformanceService {
  ingest(userId: number, batch: PerformanceBatch): Promise<unknown>;
  query(kind: string, query: PerformanceQuery, viewId?: string): Promise<unknown>;
}
export class PerformanceWorkerService implements PerformanceService {
  private worker: Worker;
  private sequence = 0;
  private failed = false;
  private pending = new Map<
    number,
    {
      resolve: (v: unknown) => void;
      reject: (e: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  constructor(filename: string) {
    this.worker = import.meta.url.endsWith(".ts")
      ? new Worker(
          "const {workerData}=require('node:worker_threads'); import('tsx/esm/api').then(({register})=>{register();return import(workerData.url)});",
          {
            eval: true,
            workerData: { filename, url: new URL("./worker.ts", import.meta.url).href },
          }
        )
      : new Worker(new URL("./worker.js", import.meta.url), { workerData: { filename } });
    this.worker.on("message", ({ id, result, error }) => {
      const p = this.pending.get(id);
      if (!p) return;
      clearTimeout(p.timer);
      this.pending.delete(id);
      if (error) p.reject(new Error(error));
      else p.resolve(result);
    });
    const fail = () => {
      this.failed = true;
      for (const p of this.pending.values()) {
        clearTimeout(p.timer);
        p.reject(new Error("Performance storage unavailable"));
      }
      this.pending.clear();
    };
    this.worker.on("error", fail);
    this.worker.on("exit", fail);
  }
  private call(method: string, args: unknown[]): Promise<unknown> {
    if (this.failed || this.pending.size >= 100)
      return Promise.reject(new Error("Performance storage unavailable or busy"));
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        this.failed = true;
        void this.worker.terminate();
        reject(new Error("Performance storage timeout"));
      }, 10000);
      this.pending.set(id, { resolve, reject, timer });
      this.worker.postMessage({ id, method, args });
    });
  }
  ingest(userId: number, batch: PerformanceBatch): Promise<unknown> {
    return this.call("ingest", [userId, batch]);
  }
  query(kind: string, query: PerformanceQuery, viewId?: string): Promise<unknown> {
    return this.call("query", [kind, query, viewId]);
  }
  async close(): Promise<void> {
    try {
      await this.call("close", []);
    } finally {
      await this.worker.terminate();
    }
  }
}

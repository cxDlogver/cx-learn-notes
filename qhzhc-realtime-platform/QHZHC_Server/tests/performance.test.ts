import { afterEach, describe, expect, it } from "vitest";
import { PerformanceStore } from "../src/server/performance/store.js";
import { PerformanceWorkerService } from "../src/server/performance/service.js";
import { validBatch, parseQuery } from "../src/server/performance/routes.js";
import {
  emptyDistribution,
  observe,
  merge,
  quantile,
  rating,
  THRESHOLD_VERSION,
  type PerformanceBatch,
} from "../src/shared/performance.js";
const now = Date.now();
function sample(value: number) {
  const d = emptyDistribution();
  observe(d, value);
  return d;
}
export function batch(value = 10, at = now): PerformanceBatch {
  return {
    schemaVersion: 1,
    batchId: "b-" + at,
    sessionId: "session",
    documentId: "doc",
    viewId: "view",
    release: "test",
    environment: "production",
    thresholdVersion: THRESHOLD_VERSION,
    context: {
      mapType: "2d",
      mode: "realtime",
      dataSize: "small",
      browser: "Chrome/151",
      device: "desktop",
      viewport: "large",
      referenceHz: 60,
    },
    startedAt: at - 10000,
    endedAt: at,
    activeMs: 10000,
    complete: true,
    eligible: true,
    mixed: false,
    visible: true,
    dropped: 0,
    capabilities: { loaf: true, longTask: true, memory: false, vitals: true },
    missing: { INP: "no-interaction" },
    metrics: [{ name: "chartUpdate", component: "CH4", distribution: sample(value) }],
    events: [],
  };
}
let store: PerformanceStore;
afterEach(() => {
  if (store) {
    store.close();
    store = undefined as unknown as PerformanceStore;
  }
});
const q = () => parseQuery({ from: now - 60000, to: now + 120000 });
describe("performance statistics and storage", () => {
  it("merges distributions rather than averaging percentiles", () => {
    const a = emptyDistribution(),
      b = emptyDistribution();
    for (let i = 0; i < 100; i++) observe(a, 1);
    observe(b, 1000);
    merge(a, b);
    expect(quantile(a, 0.95)).toBeLessThan(1.06);
    expect(a.max).toBe(1000);
    expect(rating("LCP", 2500)).toBe("good");
    expect(rating("fps", 100, "3d", 120)).toBe("needs-improvement");
  });
  it("validates sizes, numbers, keys, histogram integrity and query range", () => {
    expect(validBatch(batch())).toBe(true);
    expect(validBatch({ ...batch(), token: "secret" })).toBe(false);
    const invalid = batch();
    invalid.metrics[0]!.distribution.count = 20;
    expect(validBatch(invalid)).toBe(false);
    expect(validBatch({ ...batch(), activeMs: NaN })).toBe(false);
    expect(() => parseQuery({ from: 0, to: now })).toThrow();
  });
  it("deduplicates uploads and reports bounded groups", () => {
    store = new PerformanceStore(":memory:");
    store.ingest(1, batch());
    store.ingest(1, batch());
    const result = store.query("overview", q()) as any;
    expect(result.metrics[0].count).toBe(1);
    expect(result.metrics[0].sufficient).toBe(false);
    expect((store.query("detail", q(), "1:view") as any).windows).toHaveLength(1);
  });
  it("updates vital versions and excludes mixed documents", () => {
    store = new PerformanceStore(":memory:");
    const b = batch();
    b.metrics = [
      {
        name: "LCP",
        component: "",
        distribution: sample(2500),
        metricId: "lcp-id",
        version: 2,
        value: 2500,
      },
    ];
    store.ingest(1, b);
    store.ingest(1, {
      ...b,
      batchId: "older",
      metrics: [{ ...b.metrics[0]!, version: 1, value: 5000 }],
    });
    let result = store.query("overview", q()) as any;
    expect(result.metrics.find((m: any) => m.name === "LCP").value).toBe(2500);
    store.ingest(1, { ...b, batchId: "mixed", mixed: true, metrics: [] });
    result = store.query("overview", q()) as any;
    expect(result.metrics.find((m: any) => m.name === "LCP")).toBeUndefined();
  });
  it("opens after 3 bad windows and recovers after 2 good windows", () => {
    store = new PerformanceStore(":memory:");
    for (let i = 0; i < 3; i++) store.ingest(1, batch(100, now + i * 10000));
    let a = store.query("anomalies", q()) as any;
    expect(a.items).toHaveLength(1);
    expect(a.items[0].ended).toBeNull();
    for (let i = 3; i < 5; i++) store.ingest(1, batch(2, now + i * 10000));
    a = store.query("anomalies", q()) as any;
    expect(a.items[0].ended).not.toBeNull();
  });
  it("does not blend 2D/3D or device groups", () => {
    store = new PerformanceStore(":memory:");
    store.ingest(1, batch(2));
    const b = batch(100, now + 10000);
    b.context.mapType = "3d";
    store.ingest(1, b);
    const result = store.query("overview", q()) as any;
    expect(result.metrics).toHaveLength(2);
    expect(
      (store.query("overview", { ...q(), filters: { mapType: "2d" } }) as any).metrics
    ).toHaveLength(1);
  });
  it("keeps minute data after detailed retention expires", () => {
    store = new PerformanceStore(":memory:");
    store.ingest(1, batch());
    store.cleanup(now + 8 * 86400000);
    expect((store.query("detail", q(), "1:view") as any).windows).toHaveLength(0);
    expect((store.query("overview", q()) as any).metrics).toHaveLength(1);
  });
  it("weights LoAF observations by actual duration even inside a minute", () => {
    store = new PerformanceStore(":memory:");
    const first = batch(10, now);
    first.metrics = [
      { name: "loafBlocking", component: "", distribution: sample(10), durationMs: 10000 },
    ];
    const second = batch(90, now + 1000);
    second.startedAt = now;
    second.activeMs = 1000;
    second.complete = false;
    second.metrics = [
      { name: "loafBlocking", component: "", distribution: sample(90), durationMs: 1000 },
    ];
    store.ingest(1, first);
    store.ingest(1, second);
    const result = store.query("overview", q()) as any;
    expect(result.metrics[0].value).toBeCloseTo(190000 / 11000, 5);
  });
  it("reports throughput per second and HTTP failure percentage", () => {
    store = new PerformanceStore(":memory:");
    const b = batch();
    const failures = sample(0);
    observe(failures, 1);
    observe(failures, 0);
    observe(failures, 0);
    b.metrics = [
      { name: "received", component: "", distribution: sample(200) },
      { name: "apiFailure", component: "/api/history", distribution: failures },
    ];
    store.ingest(1, b);
    const result = store.query("overview", q()) as any;
    expect(result.metrics.find((m: any) => m.name === "received").value).toBe(20);
    expect(result.metrics.find((m: any) => m.name === "apiFailure").value).toBe(25);
    expect(validBatch({ ...b, dropped: 0.5 })).toBe(false);
  });
  it("executes ingestion and reads in a real worker", async () => {
    const worker = new PerformanceWorkerService(":memory:");
    try {
      await worker.ingest(1, batch());
      expect(((await worker.query("overview", q())) as any).metrics).toHaveLength(1);
    } finally {
      await worker.close();
    }
  }, 15000);
});

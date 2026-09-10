import { TextEncoder } from "util";
import { PerformanceMonitor, sanitizePerformancePath } from "@/services/performance/monitor";
import { PerformanceTransport } from "@/services/performance/transport";
jest.mock("web-vitals", () => ({
  onLCP: jest.fn(),
  onINP: jest.fn(),
  onCLS: jest.fn(),
  onFCP: jest.fn(),
  onTTFB: jest.fn(),
}));
describe("performance monitor lifecycle", () => {
  let monitor, fetchMock;
  beforeEach(() => {
    global.TextEncoder = TextEncoder;
    jest.useFakeTimers("modern");
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 204 });
    monitor = new PerformanceMonitor();
    monitor.configure({
      url: () => "/api/performance/batches",
      token: () => "test-token",
      refresh: async () => "test-token",
      fetch: fetchMock,
    });
  });
  afterEach(() => {
    monitor.endView(false);
    jest.clearAllTimers();
    jest.useRealTimers();
  });
  test("redacts coordinates hidden in resource paths", () => {
    expect(sanitizePerformancePath("/vt/lyrs=m&x=12962&y=6856&z=14")).toBe("/vt/:parameters");
    expect(sanitizePerformancePath("/tiles/14/123/456.png?token=secret")).toBe(
      "/tiles/:id/:id/:id"
    );
  });
  test("only samples active views; disabled measure preserves return and throw", () => {
    monitor.record("chartUpdate", 200);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(monitor.measure("chartUpdate", "test", () => 7)).toBe(7);
    expect(() =>
      monitor.measure("chartUpdate", "test", () => {
        throw new Error("business");
      })
    ).toThrow("business");
  });
  test("batches distributions and marks SPA LCP inapplicable", async () => {
    monitor.startView();
    monitor.record("chartUpdate", 20, "CH4");
    monitor.record("chartUpdate", 40, "CH4");
    monitor.flush();
    const b = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(b.metrics.find((m) => m.name === "chartUpdate").distribution.count).toBe(2);
    expect(b.missing.LCP).toBe("not-applicable");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer test-token");
  });
  test("stops timers and invalidates spans when hidden; resumes cleanly", () => {
    monitor.startView();
    const stamp = monitor.stamp();
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(monitor.elapsed(stamp)).toBeNull();
    expect(monitor.timers.size).toBe(0);
    expect(monitor.fpsHandle).toBeNull();
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(monitor.timers.size).toBe(2);
    monitor.endView();
    expect(monitor.timers.size).toBe(0);
  });
  test("ready requires data and every visible component; ignores stale versions", () => {
    monitor.startView();
    const version = monitor.renderVersion;
    monitor.dataAvailable(5);
    for (const c of ["CH4", "CO2", "windspeed", "realTime", "iCH4"]) monitor.rendered(c, version);
    monitor.rendered("map:2d", version - 1);
    expect(monitor.ready).not.toBeNull();
    monitor.rendered("map:2d", version);
    expect(monitor.ready).toBeNull();
    monitor.flush();
    expect(
      JSON.parse(fetchMock.mock.calls[0][1].body).metrics.some((m) => m.name === "ready")
    ).toBe(true);
  });
  test("distinguishes no business data from a render timeout", () => {
    monitor.startView();
    monitor.dataAvailable(0);
    jest.advanceTimersByTime(15000);
    expect(monitor.missing.ready).toBe("no-data");
    monitor.endView(false);
    monitor.startView();
    monitor.dataAvailable(1);
    jest.advanceTimersByTime(15000);
    expect(monitor.missing.ready).toBe("timeout");
  });
  test("bounded queue does not create concurrent requests", () => {
    const send = jest.fn(() => new Promise(() => {}));
    const transport = new PerformanceTransport({
      url: () => "/test",
      token: () => "token",
      refresh: async () => "token",
      fetch: send,
    });
    for (let i = 0; i < 30; i++) transport.enqueue({ batchId: String(i) });
    expect(send).toHaveBeenCalledTimes(1);
    expect(transport.buffered).toBe(20);
    expect(transport.dropped).toBe(10);
  });
});

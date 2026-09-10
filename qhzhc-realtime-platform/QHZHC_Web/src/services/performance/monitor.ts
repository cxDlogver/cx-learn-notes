import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from "web-vitals";
import {
  DEFINITION_MAP,
  THRESHOLD_VERSION,
  emptyDistribution,
  observe,
  type Context,
  type MetricSample,
  type PerformanceBatch,
  type TimelineEvent,
} from "../../../../QHZHC_Server/src/shared/performance";
import { PerformanceTransport, type TransportOptions } from "./transport";

export const metricNow = (): number => performance.now();
/** Some tile providers put query-like coordinates in path segments, not URL.search. */
export function sanitizePerformancePath(value: string): string {
  return value
    .split(/[?#]/)[0]
    .split("/")
    .map((segment) =>
      /[=&]/.test(segment) ? ":parameters" : /^-?\d+(\.[a-z]+)?$/i.test(segment) ? ":id" : segment
    )
    .join("/")
    .slice(0, 120);
}
function id(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}
type Stamp = { at: number; epoch: number; view: string };
type Ready = {
  version: number;
  start: number;
  pending: Set<string>;
  data: boolean;
  dataStatus: "pending" | "empty" | "failed";
  timer: ReturnType<typeof setTimeout>;
};
export class PerformanceMonitor {
  private transport: PerformanceTransport | null = null;
  private enabled = false;
  private active = false;
  private view = "";
  private session = id();
  private documentId = id();
  private initialRoute = typeof location === "undefined" ? "" : location.hash.split("?")[0];
  private eligible = false;
  private mixed = false;
  private booted = false;
  private epoch = 0;
  private windowAt = 0;
  private windowWall = 0;
  private viewAt = 0;
  private viewWall = 0;
  private metrics = new Map<string, MetricSample>();
  private events: TimelineEvent[] = [];
  private vitals = new Map<string, MetricSample>();
  private lastVitals = new Map<string, number>();
  private observers: PerformanceObserver[] = [];
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private sampling = false;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private fpsHandle: number | null = null;
  private ready: Ready | null = null;
  private readyVersion = 0;
  private loafBlocking = 0;
  private frameStarted = 0;
  private frameLast = 0;
  private frames = 0;
  private capabilities: Record<string, boolean> = {};
  private unsupportedVitals = new Set<string>();
  private missing: Record<string, string> = { ready: "pending" };
  context: Context = {
    mapType: "2d",
    mode: "initial",
    dataSize: "small",
    browser: "unknown",
    device: "desktop",
    viewport: "large",
    referenceHz: 60,
  };
  configure(options: TransportOptions, enabled = true): void {
    try {
      if (sessionStorage.getItem("qhzhc_performance_enabled") === "false") enabled = false;
    } catch {
      /* storage unavailable */
    }
    this.enabled = enabled;
    this.transport = new PerformanceTransport(options);
    if (!enabled || this.booted) return;
    this.booted = true;
    const types =
      typeof PerformanceObserver !== "undefined"
        ? PerformanceObserver.supportedEntryTypes || []
        : [];
    for (const [name, type] of [
      ["LCP", "largest-contentful-paint"],
      ["INP", "event"],
      ["CLS", "layout-shift"],
      ["FCP", "paint"],
      ["TTFB", "navigation"],
    ]) {
      if (!types.includes(type)) this.unsupportedVitals.add(name);
    }
    this.capabilities = {
      loaf: types.includes("long-animation-frame"),
      longTask: types.includes("longtask"),
      memory: "memory" in performance,
      vitals: types.includes("largest-contentful-paint"),
    };
    const match =
      navigator.userAgent.match(/(Edg)\/(\d+)/) ||
      navigator.userAgent.match(/(Firefox)\/(\d+)/) ||
      navigator.userAgent.match(/(Chrome)\/(\d+)/) ||
      navigator.userAgent.match(/(Version)\/(\d+)/);
    this.context.browser = match
      ? (match[1] === "Version" ? "Safari" : match[1]) + "/" + match[2]
      : "unknown";
    this.context.device = /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "desktop";
    this.context.viewport = innerWidth < 768 ? "small" : innerWidth < 1440 ? "medium" : "large";
    try {
      const savedSession = sessionStorage.getItem("qhzhc_performance_session");
      if (savedSession) this.session = savedSession;
      else sessionStorage.setItem("qhzhc_performance_session", this.session);
      const hz = Number(sessionStorage.getItem("qhzhc_performance_hz"));
      if ([60, 90, 120, 144, 165, 240].includes(hz)) this.context.referenceHz = hz;
    } catch {
      /* optional preference */
    }
    const callback = (m: Metric) => this.onVital(m);
    try {
      onLCP(callback, { reportAllChanges: true });
      onINP(callback, { reportAllChanges: true });
      onCLS(callback, { reportAllChanges: true });
      onFCP(callback);
      onTTFB(callback);
    } catch {
      /* unsupported browser */
    }
    document.addEventListener("visibilitychange", this.visibility);
    window.addEventListener("pagehide", this.pagehide);
    window.addEventListener("pageshow", this.pageshow);
  }
  private onVital(m: Metric): void {
    if (!this.enabled) return;
    // Discard non-visualization document entries; keep early buffered values for auth bootstrap.
    if (this.initialRoute !== "#/dataVisualization") return;
    if (this.vitals.size > 10) this.vitals.clear();
    const previous = this.vitals.get(m.id),
      d = emptyDistribution();
    observe(d, m.value);
    this.vitals.set(m.id, {
      name: m.name,
      component: "",
      metricId: m.id,
      version: (previous?.version || 0) + 1,
      value: m.value,
      distribution: d,
    });
    if (this.active) {
      delete this.missing[m.name];
    }
  }
  noteRoute(path: string): void {
    if (path !== "/dataVisualization") this.mixed = true;
  }
  startView(start = metricNow()): void {
    if (!this.enabled || this.active) return;
    this.active = true;
    this.view = id();
    this.epoch++;
    this.viewAt = start;
    this.viewWall = Date.now() - (metricNow() - start);
    this.eligible = this.initialRoute === "#/dataVisualization" && !this.mixed;
    this.context = { ...this.context, mapType: "2d", mode: "initial", dataSize: "small" };
    this.missing = { ready: "pending" };
    for (const name of ["LCP", "INP", "CLS", "FCP", "TTFB"])
      this.missing[name] = this.eligible
        ? name === "INP"
          ? "no-interaction"
          : "pending"
        : "not-applicable";
    if (this.eligible)
      for (const name of this.unsupportedVitals) this.missing[name] = "unsupported";
    if (!this.capabilities.loaf) this.missing.loafBlocking = "unsupported";
    if (!this.capabilities.memory) this.missing.heap = "unsupported";
    this.windowAt = metricNow();
    this.windowWall = Date.now();
    this.event("view-enter");
    this.beginReady(start);
    if (document.visibilityState !== "hidden") this.startSampling();
  }
  endView(mixed = true): void {
    if (!this.active) return;
    if (mixed) {
      this.mixed = true;
      this.event("view-leave");
    }
    this.cancelReady("cancelled");
    this.flush(true);
    this.stopSampling();
    this.active = false;
    this.epoch++;
    this.metrics.clear();
    this.events = [];
    this.view = "";
  }
  get isActive(): boolean {
    return this.enabled && this.active && document.visibilityState !== "hidden";
  }
  get currentView(): string {
    return this.view;
  }
  stamp(): Stamp {
    return { at: metricNow(), epoch: this.epoch, view: this.view };
  }
  elapsed(stamp: Stamp): number | null {
    return this.isActive && stamp.view === this.view && stamp.epoch === this.epoch
      ? metricNow() - stamp.at
      : null;
  }
  measure<T>(name: string, component: string, fn: () => T): T {
    if (!this.isActive) return fn();
    const stamp = this.stamp();
    try {
      return fn();
    } finally {
      const value = this.elapsed(stamp);
      if (value !== null) this.record(name, value, component);
    }
  }
  record(name: string, value: number, component = "", mode?: Context["mode"]): void {
    if (!this.isActive || !Number.isFinite(value) || value < 0 || !DEFINITION_MAP.has(name)) return;
    // Separate replay/initial metrics at a window boundary, never blend with live flow.
    if (mode && mode !== this.context.mode) this.setContext({ mode });
    const safe = sanitizePerformancePath(component),
      key = name + "|" + safe;
    let m = this.metrics.get(key);
    if (!m) {
      if (this.metrics.size >= 80) return;
      m = { name, component: safe, distribution: emptyDistribution() };
      this.metrics.set(key, m);
    }
    observe(m.distribution, value);
    delete this.missing[name];
    const def = DEFINITION_MAP.get(name);
    if (
      def?.poor !== undefined &&
      def.unit === "ms" &&
      value > def.poor &&
      this.events.filter((e) => e.name === "slow-call").length < 10
    )
      this.event("slow-call", safe, "slow", value);
  }
  event(name: string, component = "", status = "ok", value?: number): void {
    if (!this.active || this.events.length >= 30) return;
    const e: TimelineEvent = {
      name,
      at: Date.now(),
      component: sanitizePerformancePath(component),
      status,
    };
    if (value !== undefined && Number.isFinite(value) && value >= 0) e.value = value;
    this.events.push(e);
  }
  setContext(patch: Partial<Context>): void {
    if (!this.active) {
      this.context = { ...this.context, ...patch };
      return;
    }
    if (!Object.entries(patch).some(([k, v]) => this.context[k as keyof Context] !== v)) return;
    this.flush(false);
    const sceneChange = patch.mapType !== undefined || patch.mode === "history";
    if (sceneChange) {
      this.cancelReady("scene-change");
      this.event("scene-change", patch.mapType || patch.mode || "");
    }
    this.context = { ...this.context, ...patch };
    if (patch.mapType) this.sampleFps();
  }
  dataSize(points: number): void {
    this.setContext({ dataSize: points < 1000 ? "small" : points < 5000 ? "medium" : "full" });
  }
  dataAvailable(count: number): void {
    if (!this.ready) return;
    if (count > 0) this.ready.data = true;
    else {
      this.ready.dataStatus = "empty";
      this.event("ready-data", "", "empty");
    }
  }
  dataFailed(): void {
    if (this.ready) {
      this.ready.dataStatus = "failed";
      this.event("ready-data", "", "failed");
    }
  }
  private beginReady(start: number): void {
    const version = ++this.readyVersion;
    const timer = setTimeout(() => {
      if (this.ready?.version !== version) return;
      this.event("ready", "", "timeout:" + Array.from(this.ready.pending).join(","));
      this.missing.ready = this.ready.data
        ? "timeout"
        : this.ready.dataStatus === "empty"
        ? "no-data"
        : this.ready.dataStatus === "failed"
        ? "failed"
        : "timeout";
      this.ready = null;
    }, 15000);
    this.ready = {
      version,
      start,
      pending: new Set(["CH4", "CO2", "windspeed", "realTime", "iCH4", "map:2d"]),
      data: false,
      dataStatus: "pending",
      timer,
    };
  }
  get renderVersion(): number {
    return this.isActive ? this.ready?.version || 0 : 0;
  }
  rendered(component: string, version: number, visible = true): void {
    const ready = this.ready;
    if (!this.isActive || !ready || !ready.data || ready.version !== version || !visible) return;
    ready.pending.delete(component);
    if (!ready.pending.size) {
      clearTimeout(ready.timer);
      this.record("ready", metricNow() - ready.start);
      this.event("ready", "", "complete", metricNow() - ready.start);
      this.ready = null;
      delete this.missing.ready;
    }
  }
  skipHidden(component: string, version: number): void {
    if (this.ready?.version === version) this.ready.pending.delete(component);
  }
  private cancelReady(status: string): void {
    if (this.ready) {
      clearTimeout(this.ready.timer);
      this.event("ready", "", status);
      this.missing.ready = status === "failed" ? "failed" : "cancelled";
      this.ready = null;
    }
  }
  flush(terminal = false): void {
    if (!this.active || !this.transport) return;
    const endedAt = Date.now(),
      activeMs = this.sampling ? Math.max(0, metricNow() - this.windowAt) : 0;
    const samples = Array.from(this.metrics.values());
    if (this.capabilities.loaf && activeMs > 0) {
      const distribution = emptyDistribution();
      observe(distribution, Math.min(100, (this.loafBlocking / activeMs) * 100));
      samples.push({ name: "loafBlocking", component: "", distribution, durationMs: activeMs });
    }
    if (this.eligible)
      for (const m of this.vitals.values())
        if ((this.lastVitals.get(m.metricId!) || 0) < m.version!) {
          samples.push(m);
          this.lastVitals.set(m.metricId!, m.version!);
          delete this.missing[m.name];
        }
    const batch: PerformanceBatch = {
      schemaVersion: 1,
      batchId: id(),
      sessionId: this.session,
      documentId: this.documentId,
      viewId: this.view,
      release: process.env.VUE_APP_RELEASE || "local",
      environment: process.env.NODE_ENV === "production" ? "production" : "development",
      thresholdVersion: THRESHOLD_VERSION,
      context: { ...this.context },
      startedAt: this.windowWall,
      endedAt,
      activeMs,
      complete: activeMs >= 9500,
      eligible: this.eligible,
      mixed: this.mixed,
      visible: true,
      dropped: this.transport.dropped,
      capabilities: { ...this.capabilities },
      missing: { ...this.missing },
      metrics: samples,
      events: this.events.slice(),
    };
    this.transport.enqueue(batch, terminal);
    this.metrics.clear();
    this.events = [];
    this.loafBlocking = 0;
    this.windowAt = metricNow();
    this.windowWall = endedAt;
  }
  private observe(type: string, callback: (entry: PerformanceEntry) => void): void {
    try {
      const observer = new PerformanceObserver((list) => {
        if (this.isActive) for (const e of list.getEntries()) callback(e);
      });
      observer.observe({ type, buffered: false });
      this.observers.push(observer);
    } catch {
      /* capability unavailable */
    }
  }
  private later(fn: () => void, ms: number): void {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      fn();
    }, ms);
    this.timers.add(timer);
  }
  private startSampling(): void {
    this.stopSampling();
    this.sampling = true;
    this.windowAt = metricNow();
    this.windowWall = Date.now();
    this.flushTimer = setInterval(() => this.flush(), 10000);
    const tick = () => {
      const start = metricNow();
      this.later(() => {
        if (!this.isActive) return;
        this.record("eventLoop", Math.max(0, metricNow() - start - 100));
        tick();
      }, 100);
    };
    tick();
    if (this.capabilities.loaf)
      this.observe("long-animation-frame", (e) => {
        const overlap = Math.max(
          0,
          Math.min(e.startTime + e.duration, metricNow()) - Math.max(e.startTime, this.windowAt)
        );
        this.loafBlocking +=
          e.duration > 0
            ? (Math.min(
                e.duration,
                Number((e as PerformanceEntry & { blockingDuration: number }).blockingDuration) || 0
              ) *
                overlap) /
              e.duration
            : 0;
        if (this.events.filter((x) => x.name === "loaf").length < 10)
          this.event("loaf", "", "long-frame", e.duration);
      });
    if (this.capabilities.longTask)
      this.observe("longtask", (e) => this.record("longTask", e.duration));
    this.observe("resource", (e) => {
      if (e.name.includes("/api/performance/") || e.name.includes("/api/admin/")) return;
      if (e.duration > 300) {
        let component = "resource";
        try {
          component = new URL(e.name).pathname;
        } catch {
          /* omit */
        }
        this.record("resource", e.duration, component);
      }
    });
    const periodic = () => {
      if (!this.isActive) return;
      this.sampleFps();
      const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
      if (memory) this.record("heap", memory.usedJSHeapSize);
      this.later(periodic, 30000);
    };
    periodic();
  }
  private sampleFps(): void {
    if (!this.isActive) return;
    if (this.fpsHandle !== null) cancelAnimationFrame(this.fpsHandle);
    this.frameStarted = 0;
    this.frameLast = 0;
    this.frames = 0;
    const epoch = this.epoch;
    const frame = (now: number) => {
      if (!this.isActive || epoch !== this.epoch) {
        this.fpsHandle = null;
        return;
      }
      if (!this.frameStarted) this.frameStarted = now;
      else this.frames++;
      this.frameLast = now;
      if (now - this.frameStarted >= 5000) {
        const duration = now - this.frameStarted;
        this.record("fps", (this.frames / duration) * 1000);
        const m = this.metrics.get("fps|");
        if (m) {
          m.durationMs = duration;
          m.complete = true;
        }
        this.fpsHandle = null;
        return;
      }
      this.fpsHandle = requestAnimationFrame(frame);
    };
    this.fpsHandle = requestAnimationFrame(frame);
  }
  private stopSampling(): void {
    if (this.flushTimer !== null) clearInterval(this.flushTimer);
    this.flushTimer = null;
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
    this.sampling = false;
    if (this.fpsHandle !== null) cancelAnimationFrame(this.fpsHandle);
    this.fpsHandle = null;
    for (const o of this.observers) o.disconnect();
    this.observers = [];
  }
  private visibility = (): void => {
    if (!this.active) return;
    if (document.visibilityState === "hidden") {
      this.flush(true);
      this.stopSampling();
      this.epoch++;
      this.cancelReady("hidden");
    } else {
      this.epoch++;
      this.startSampling();
    }
  };
  private pagehide = (): void => {
    if (this.active) {
      this.flush(true);
      this.stopSampling();
      this.epoch++;
    }
  };
  private pageshow = (event: PageTransitionEvent): void => {
    if (!event.persisted || !this.active) return;
    this.cancelReady("bfcache");
    this.documentId = id();
    this.view = id();
    this.vitals.clear();
    this.lastVitals.clear();
    this.epoch++;
    this.event("bfcache-restore");
    this.startSampling();
  };
}
export const performanceMonitor = new PerformanceMonitor();

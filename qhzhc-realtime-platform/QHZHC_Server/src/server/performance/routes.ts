import { Router, type RequestHandler } from "express";
import {
  DEFINITION_MAP,
  THRESHOLD_VERSION,
  type PerformanceBatch,
  type PerformanceQuery,
} from "../../shared/performance.js";
import type { PerformanceService } from "./service.js";
function object(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}
function text(v: unknown, max = 120): v is string {
  return typeof v === "string" && v.length <= max && !/[?&#\r\n]/.test(v);
}
function number(v: unknown, max = 1e15): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max;
}
function keys(v: Record<string, unknown>, allowed: string[]): boolean {
  return Object.keys(v).every((k) => allowed.includes(k));
}
export function validBatch(v: unknown): v is PerformanceBatch {
  if (
    !object(v) ||
    Buffer.byteLength(JSON.stringify(v)) > 32768 ||
    v.schemaVersion !== 1 ||
    v.thresholdVersion !== THRESHOLD_VERSION
  )
    return false;
  if (
    !keys(v, [
      "schemaVersion",
      "batchId",
      "sessionId",
      "documentId",
      "viewId",
      "release",
      "environment",
      "thresholdVersion",
      "context",
      "startedAt",
      "endedAt",
      "activeMs",
      "complete",
      "eligible",
      "mixed",
      "visible",
      "dropped",
      "capabilities",
      "missing",
      "metrics",
      "events",
    ])
  )
    return false;
  for (const k of ["batchId", "sessionId", "documentId", "viewId", "release"])
    if (!text(v[k]) || !v[k]) return false;
  if (!["production", "development"].includes(String(v.environment))) return false;
  for (const k of ["startedAt", "endedAt", "activeMs", "dropped"]) if (!number(v[k])) return false;
  if (
    !Number.isSafeInteger(v.dropped) ||
    Number(v.endedAt) < Number(v.startedAt) ||
    Number(v.activeMs) > Number(v.endedAt) - Number(v.startedAt) + 1000 ||
    Math.abs(Date.now() - Number(v.endedAt)) > 86400000
  )
    return false;
  for (const k of ["complete", "eligible", "mixed", "visible"])
    if (typeof v[k] !== "boolean") return false;
  const c = v.context;
  if (
    !object(c) ||
    !keys(c, ["mapType", "mode", "dataSize", "browser", "device", "viewport", "referenceHz"]) ||
    !["2d", "3d"].includes(String(c.mapType)) ||
    !["realtime", "history", "initial", "replay"].includes(String(c.mode)) ||
    !["small", "medium", "full"].includes(String(c.dataSize)) ||
    !["desktop", "mobile"].includes(String(c.device)) ||
    !["small", "medium", "large"].includes(String(c.viewport)) ||
    !text(c.browser, 40) ||
    ![60, 90, 120, 144, 165, 240].includes(Number(c.referenceHz))
  )
    return false;
  if (
    !object(v.capabilities) ||
    !keys(v.capabilities, ["loaf", "longTask", "memory", "vitals"]) ||
    !Object.values(v.capabilities).every((x) => typeof x === "boolean")
  )
    return false;
  if (
    !object(v.missing) ||
    Object.keys(v.missing).some((k) => !DEFINITION_MAP.has(k)) ||
    Object.values(v.missing).some(
      (x) =>
        ![
          "unsupported",
          "no-interaction",
          "not-applicable",
          "pending",
          "lost",
          "timeout",
          "no-data",
          "failed",
          "cancelled",
          "mixed-route",
        ].includes(String(x))
    )
  )
    return false;
  if (
    !Array.isArray(v.metrics) ||
    v.metrics.length > 100 ||
    !Array.isArray(v.events) ||
    v.events.length > 30
  )
    return false;
  for (const m of v.metrics) {
    if (
      !object(m) ||
      !keys(m, [
        "name",
        "component",
        "distribution",
        "metricId",
        "version",
        "value",
        "durationMs",
        "complete",
      ]) ||
      !DEFINITION_MAP.has(String(m.name)) ||
      !text(m.component) ||
      (m.metricId !== undefined && !text(m.metricId)) ||
      (m.version !== undefined && (!Number.isSafeInteger(m.version) || Number(m.version) < 1))
    )
      return false;
    for (const k of ["value", "durationMs"]) if (m[k] !== undefined && !number(m[k])) return false;
    if (m.complete !== undefined && typeof m.complete !== "boolean") return false;
    if (
      DEFINITION_MAP.get(String(m.name))?.standard &&
      (!text(m.metricId) || !Number.isSafeInteger(m.version) || !number(m.value))
    )
      return false;
    const d = m.distribution;
    if (
      !object(d) ||
      !keys(d, ["count", "sum", "max", "bins"]) ||
      !Number.isSafeInteger(d.count) ||
      !number(d.count, 1e8) ||
      !number(d.sum, 1e18) ||
      !number(d.max) ||
      !object(d.bins) ||
      Object.keys(d.bins).length > 1200
    )
      return false;
    let count = 0;
    for (const [k, n] of Object.entries(d.bins)) {
      if (
        (k !== "zero" && (!/^-?\d+$/.test(k) || Math.abs(Number(k)) > 750)) ||
        !Number.isSafeInteger(n) ||
        !number(n, 1e8)
      )
        return false;
      count += n;
    }
    if (count !== d.count || Number(d.sum) > Number(d.max) * count + 0.001) return false;
  }
  return v.events.every(
    (e) =>
      object(e) &&
      keys(e, ["name", "at", "component", "value", "status"]) &&
      text(e.name, 50) &&
      text(e.component) &&
      text(e.status, 80) &&
      number(e.at) &&
      (e.value === undefined || number(e.value))
  );
}
export function parseQuery(raw: Record<string, unknown>): PerformanceQuery {
  const to = raw.to === undefined ? Date.now() : Number(raw.to),
    from = raw.from === undefined ? to - 3600000 : Number(raw.from);
  if (!number(from) || !number(to) || to <= from || to - from > 30 * 86400000)
    throw new Error("invalid time range");
  const filters: Record<string, string> = {};
  for (const k of [
    "release",
    "environment",
    "mapType",
    "mode",
    "browser",
    "device",
    "dataSize",
    "referenceHz",
  ])
    if (raw[k] !== undefined) {
      if (!text(raw[k])) throw new Error("invalid filter");
      filters[k] = raw[k];
    }
  return {
    from,
    to,
    page: Math.max(1, Math.min(10000, Math.floor(Number(raw.page) || 1))),
    limit: Math.max(1, Math.min(100, Math.floor(Number(raw.limit) || 20))),
    filters,
  };
}
export function performanceRouter(
  service: PerformanceService | undefined,
  auth: RequestHandler,
  admin: RequestHandler,
  userId: (request: unknown) => number
): Router {
  const router = Router(),
    limits = new Map<number, { at: number; count: number }>();
  router.post("/performance/batches", auth, async (req, res) => {
    if (!validBatch(req.body)) {
      res.status(400).json({ message: "性能批次格式无效或超限" });
      return;
    }
    const id = userId(req),
      now = Date.now();
    if (limits.size > 1000)
      for (const [key, item] of limits) if (now - item.at >= 60000) limits.delete(key);
    const entry = limits.get(id),
      window = entry && now - entry.at < 60000 ? entry : { at: now, count: 0 };
    limits.set(id, window);
    if (++window.count > 60) {
      res.setHeader("Retry-After", "60");
      res.status(429).end();
      return;
    }
    try {
      if (!service) throw new Error("disabled");
      await service.ingest(id, req.body);
      res.status(204).end();
    } catch {
      res.status(503).json({ message: "性能存储暂不可用" });
    }
  });
  router.use("/admin/performance", auth, admin);
  router.get(
    ["/admin/performance/:kind", "/admin/performance/visits/:viewId"],
    async (req, res) => {
      const kind = req.params.viewId ? "detail" : String(req.params.kind);
      if (!["overview", "trends", "visits", "detail", "anomalies", "definitions"].includes(kind)) {
        res.status(404).end();
        return;
      }
      let query: PerformanceQuery;
      try {
        query = parseQuery(req.query);
      } catch {
        res.status(400).json({ message: "查询范围应在 30 天以内" });
        return;
      }
      try {
        if (!service) throw new Error("disabled");
        const result = await service.query(kind, query, req.params.viewId as string | undefined);
        if (result === null) res.status(404).end();
        else res.json(result);
      } catch {
        res.status(503).json({ message: "性能存储暂不可用" });
      }
    }
  );
  return router;
}

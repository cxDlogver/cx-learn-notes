import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import {
  DEFINITION_MAP,
  DEFINITIONS,
  THRESHOLD_VERSION,
  emptyDistribution,
  merge,
  quantile,
  rating,
  type Distribution,
  type PerformanceBatch,
  type PerformanceQuery,
} from "../../shared/performance.js";

export class PerformanceStore {
  private db: DatabaseSync;
  constructor(filename: string) {
    if (filename !== ":memory:") fs.mkdirSync(path.dirname(filename), { recursive: true });
    this.db = new DatabaseSync(filename);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;
      CREATE TABLE IF NOT EXISTS visits (id TEXT PRIMARY KEY, user_id INTEGER NOT NULL, document_id TEXT NOT NULL, started INTEGER NOT NULL, ended INTEGER NOT NULL, mixed INTEGER NOT NULL, metadata TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS batches (id TEXT PRIMARY KEY, visit TEXT NOT NULL, at INTEGER NOT NULL, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS minutes (key TEXT PRIMARY KEY, visit TEXT NOT NULL, at INTEGER NOT NULL, name TEXT NOT NULL, component TEXT NOT NULL, context TEXT NOT NULL, distribution TEXT NOT NULL, duration REAL NOT NULL, weighted REAL NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS vitals (key TEXT PRIMARY KEY, visit TEXT NOT NULL, at INTEGER NOT NULL, name TEXT NOT NULL, version INTEGER NOT NULL, value REAL NOT NULL, context TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS anomalies (id INTEGER PRIMARY KEY, key TEXT NOT NULL, visit TEXT NOT NULL, name TEXT NOT NULL, component TEXT NOT NULL, started INTEGER NOT NULL, ended INTEGER, value REAL NOT NULL, samples INTEGER NOT NULL, context TEXT NOT NULL, threshold_version TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS streaks (key TEXT PRIMARY KEY, visit TEXT NOT NULL, at INTEGER NOT NULL, bad INTEGER NOT NULL, recovered INTEGER NOT NULL, active INTEGER);
      CREATE INDEX IF NOT EXISTS visits_time ON visits(ended);
      CREATE INDEX IF NOT EXISTS visits_document ON visits(document_id,user_id);
      CREATE INDEX IF NOT EXISTS batches_time ON batches(at);
      CREATE INDEX IF NOT EXISTS batches_visit ON batches(visit,at);
      CREATE INDEX IF NOT EXISTS minutes_time ON minutes(at);
      CREATE INDEX IF NOT EXISTS minutes_visit ON minutes(visit,at);
      CREATE INDEX IF NOT EXISTS vitals_time ON vitals(at);
      CREATE INDEX IF NOT EXISTS anomalies_time ON anomalies(started);
      CREATE INDEX IF NOT EXISTS anomalies_visit ON anomalies(visit);
    `);
    if (
      !this.db
        .prepare("PRAGMA table_info(minutes)")
        .all()
        .some((column) => column.name === "weighted")
    ) {
      this.db.exec(
        "ALTER TABLE minutes ADD COLUMN weighted REAL NOT NULL DEFAULT 0; UPDATE minutes SET weighted=CASE WHEN json_extract(distribution,'$.count')>0 THEN json_extract(distribution,'$.sum')/json_extract(distribution,'$.count')*duration ELSE 0 END"
      );
    }
  }
  close(): void {
    this.db.close();
  }
  ingest(userId: number, b: PerformanceBatch): void {
    const id = `${userId}:${b.batchId}`,
      visit = `${userId}:${b.viewId}`;
    this.db.exec("BEGIN");
    try {
      if (this.db.prepare("SELECT id FROM batches WHERE id=?").get(id)) {
        this.db.exec("COMMIT");
        return;
      }
      const existing = this.db.prepare("SELECT user_id FROM visits WHERE id=?").get(visit);
      if (existing && existing.user_id !== userId) throw new Error("visit ownership");
      this.db
        .prepare(
          `INSERT INTO visits VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET ended=MAX(ended,excluded.ended),mixed=MAX(mixed,excluded.mixed),metadata=CASE WHEN excluded.ended>=ended THEN excluded.metadata ELSE metadata END`
        )
        .run(
          visit,
          userId,
          b.documentId,
          b.startedAt,
          b.endedAt,
          Number(b.mixed),
          JSON.stringify({ ...b, metrics: [], events: [] })
        );
      if (b.mixed)
        this.db
          .prepare("UPDATE visits SET mixed=1 WHERE document_id=? AND user_id=?")
          .run(b.documentId, userId);
      this.db
        .prepare("INSERT INTO batches VALUES (?,?,?,?)")
        .run(id, visit, b.endedAt, JSON.stringify(b));
      for (const m of b.metrics) {
        const context = JSON.stringify(b.context);
        if (DEFINITION_MAP.get(m.name)?.standard) {
          if (!b.eligible || m.value === undefined || !m.metricId || !m.version) continue;
          const key = `${userId}:${m.metricId}`;
          const old = this.db.prepare("SELECT version FROM vitals WHERE key=?").get(key);
          if (old && Number(old.version) >= m.version) continue;
          this.db
            .prepare(
              `INSERT INTO vitals VALUES (?,?,?,?,?,?,?) ON CONFLICT(key) DO UPDATE SET version=excluded.version,value=excluded.value,at=excluded.at`
            )
            .run(key, visit, b.endedAt, m.name, m.version, m.value, context);
          if (rating(m.name, m.value) === "poor" && !b.mixed)
            this.anomaly(visit, m.name, m.component, m.value, 1, b, key, true);
          continue;
        }
        const at = Math.floor(b.endedAt / 60000) * 60000;
        const key = JSON.stringify([visit, at, m.name, m.component, b.context]);
        const prior = this.db
          .prepare("SELECT distribution,duration,weighted FROM minutes WHERE key=?")
          .get(key);
        const dist = prior
          ? merge(JSON.parse(String(prior.distribution)) as Distribution, m.distribution)
          : m.distribution;
        const duration = Number(prior?.duration || 0) + (m.durationMs ?? b.activeMs);
        const weighted =
          Number(prior?.weighted || 0) +
          (m.distribution.count ? m.distribution.sum / m.distribution.count : 0) *
            (m.durationMs ?? b.activeMs);
        this.db
          .prepare(
            `INSERT INTO minutes VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(key) DO UPDATE SET distribution=excluded.distribution,duration=excluded.duration,weighted=excluded.weighted`
          )
          .run(
            key,
            visit,
            at,
            m.name,
            m.component,
            context,
            JSON.stringify(dist),
            duration,
            weighted
          );
        const value = this.metricValue(m.name, m.distribution);
        if (value !== null && (m.complete ?? b.complete))
          this.anomaly(
            visit,
            m.name,
            m.component,
            value,
            m.distribution.count,
            b,
            JSON.stringify([visit, m.name, m.component, b.context]),
            false
          );
      }
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  private metricValue(name: string, d: Distribution): number | null {
    return name === "fps" || name === "loafBlocking"
      ? d.count
        ? d.sum / d.count
        : null
      : quantile(d, DEFINITION_MAP.get(name)?.percentile ?? 0.95);
  }
  private anomaly(
    visit: string,
    name: string,
    component: string,
    value: number,
    samples: number,
    b: PerformanceBatch,
    key: string,
    immediate: boolean
  ): void {
    const level = rating(name, value, b.context.mapType, b.context.referenceHz);
    if (level === "diagnostic") return;
    const old = this.db.prepare("SELECT * FROM streaks WHERE key=?").get(key);
    // Missing observations are not recovery; a long gap starts a new streak.
    const contiguous = old && b.endedAt - Number(old.at) < (name === "fps" ? 90000 : 35000);
    const bad = level === "poor" ? (contiguous ? Number(old.bad) : 0) + 1 : 0;
    const recovered = level !== "poor" ? (contiguous ? Number(old.recovered) : 0) + 1 : 0;
    let active = old?.active == null ? null : Number(old.active);
    if ((immediate || bad >= 3) && level === "poor" && active === null) {
      const result = this.db
        .prepare(
          "INSERT INTO anomalies (key,visit,name,component,started,value,samples,context,threshold_version) VALUES (?,?,?,?,?,?,?,?,?)"
        )
        .run(
          key,
          visit,
          name,
          component,
          b.endedAt,
          value,
          samples,
          JSON.stringify(b.context),
          THRESHOLD_VERSION
        );
      active = Number(result.lastInsertRowid);
    } else if (active !== null && level === "poor") {
      this.db
        .prepare("UPDATE anomalies SET value=?,samples=samples+? WHERE id=?")
        .run(value, samples, active);
    }
    if (active !== null && recovered >= 2) {
      this.db.prepare("UPDATE anomalies SET ended=? WHERE id=?").run(b.endedAt, active);
      active = null;
    }
    this.db
      .prepare(
        "INSERT INTO streaks VALUES (?,?,?,?,?,?) ON CONFLICT(key) DO UPDATE SET at=excluded.at,bad=excluded.bad,recovered=excluded.recovered,active=excluded.active"
      )
      .run(key, visit, b.endedAt, bad, recovered, active);
  }
  query(kind: string, q: PerformanceQuery, viewId?: string): unknown {
    if (kind === "definitions") return { version: THRESHOLD_VERSION, definitions: DEFINITIONS };
    if (kind === "detail") {
      const visit = this.db.prepare("SELECT * FROM visits WHERE id=?").get(viewId || "");
      if (!visit) return null;
      const rows = this.db
        .prepare("SELECT payload FROM batches WHERE visit=? ORDER BY at DESC LIMIT 500")
        .all(viewId!);
      return {
        visit: this.decodeVisit(visit),
        windows: rows.map((r) => JSON.parse(String(r.payload))).reverse(),
        anomalies: this.db
          .prepare("SELECT * FROM anomalies WHERE visit=? ORDER BY started DESC LIMIT 100")
          .all(viewId!),
        detailLimit: 500,
      };
    }
    const visits = this.db
      .prepare("SELECT * FROM visits WHERE ended>=? AND started<=? ORDER BY ended DESC LIMIT 10001")
      .all(q.from, q.to);
    let selected = visits.filter((v) =>
      this.matches(JSON.parse(String(v.metadata)) as PerformanceBatch, q.filters)
    );
    if (
      Object.entries(q.filters).some(
        ([key, value]) => value && !["release", "environment"].includes(key)
      )
    ) {
      const contexts = this.db
        .prepare("SELECT visit,context FROM minutes WHERE at>=? AND at<=? LIMIT 100001")
        .all(Math.floor(q.from / 60000) * 60000, q.to);
      const matching = new Set(
        contexts
          .filter((row) => this.contextMatches(JSON.parse(String(row.context)), q.filters))
          .map((row) => String(row.visit))
      );
      selected = selected.filter(
        (v) =>
          matching.has(String(v.id)) ||
          this.contextMatches(
            (JSON.parse(String(v.metadata)) as PerformanceBatch).context as unknown as Record<
              string,
              unknown
            >,
            q.filters
          )
      );
    }
    const ids = new Set(selected.map((v) => String(v.id)));
    if (kind === "visits")
      return {
        total: selected.length,
        items: selected
          .slice((q.page - 1) * q.limit, q.page * q.limit)
          .map((v) => this.decodeVisit(v)),
        truncated: visits.length > 10000,
      };
    if (kind === "anomalies") {
      const rows = this.db
        .prepare(
          "SELECT * FROM anomalies WHERE started>=? AND started<=? ORDER BY started DESC LIMIT 10001"
        )
        .all(q.from, q.to)
        .filter(
          (r) =>
            ids.has(String(r.visit)) &&
            this.contextMatches(JSON.parse(String(r.context)), q.filters) &&
            !(
              DEFINITION_MAP.get(String(r.name))?.standard &&
              selected.find((v) => v.id === r.visit)?.mixed
            )
        );
      return {
        total: rows.length,
        items: rows
          .slice((q.page - 1) * q.limit, q.page * q.limit)
          .map((r) => ({ ...r, context: JSON.parse(String(r.context)) })),
        truncated: rows.length > 10000,
      };
    }
    const metadata = new Map(selected.map((v) => [String(v.id), v]));
    const raw = this.db
      .prepare("SELECT * FROM minutes WHERE at>=? AND at<=? ORDER BY at LIMIT 100001")
      .all(Math.floor(q.from / 60000) * 60000, q.to);
    const rows = raw.filter(
      (r) =>
        ids.has(String(r.visit)) && this.contextMatches(JSON.parse(String(r.context)), q.filters)
    );
    const vitals = this.db
      .prepare("SELECT * FROM vitals WHERE at>=? AND at<=? LIMIT 100001")
      .all(q.from, q.to)
      .filter(
        (r) =>
          ids.has(String(r.visit)) &&
          !metadata.get(String(r.visit))?.mixed &&
          this.contextMatches(JSON.parse(String(r.context)), q.filters)
      );
    const groups = new Map<
      string,
      {
        name: string;
        component: string;
        context: Record<string, unknown>;
        distribution: Distribution;
        durationMs: number;
        visits: Set<string>;
        at: number;
        exact: number[];
        weighted: number;
      }
    >();
    const width = Math.max(60000, Math.ceil((q.to - q.from) / 359 / 60000) * 60000);
    for (const r of [...rows, ...vitals]) {
      const context = JSON.parse(String(r.context));
      const at = kind === "trends" ? Math.floor(Number(r.at) / width) * width : 0;
      // Never mix device, map, mode, data-size or refresh-rate reference in a rating.
      const key = JSON.stringify([r.name, r.component || "", context, at]);
      let group = groups.get(key);
      if (!group) {
        group = {
          name: String(r.name),
          component: String(r.component || ""),
          context,
          distribution: emptyDistribution(),
          durationMs: 0,
          visits: new Set(),
          at,
          exact: [],
          weighted: 0,
        };
        groups.set(key, group);
      }
      if (r.distribution) {
        const d = JSON.parse(String(r.distribution)) as Distribution;
        merge(group.distribution, d);
        group.weighted += Number(r.weighted || 0);
      } else {
        const d = emptyDistribution();
        const value = Number(r.value);
        group.exact.push(value);
        d.count = 1;
        d.sum = value;
        d.max = value;
        d.bins[
          value === 0
            ? "zero"
            : String(Math.ceil(Math.log(Math.max(0.000001, value)) / Math.log(1.05)))
        ] = 1;
        merge(group.distribution, d);
      }
      group.durationMs += Number(r.duration || 0);
      group.visits.add(String(r.visit));
    }
    const metrics = [...groups.values()].map((g) => {
      g.exact.sort((a, b) => a - b);
      const percentile = (p: number) =>
        g.exact.length
          ? g.exact[Math.max(0, Math.ceil(g.exact.length * p) - 1)]!
          : quantile(g.distribution, p);
      const value = ["apiFailure", "apiCancel"].includes(g.name)
        ? g.distribution.count
          ? (g.distribution.sum / g.distribution.count) * 100
          : null
        : ["received", "consumed", "chartCount"].includes(g.name)
        ? g.durationMs
          ? (g.distribution.sum / g.durationMs) * 1000
          : null
        : DEFINITION_MAP.get(g.name)?.standard
        ? percentile(0.75)
        : ["fps", "loafBlocking"].includes(g.name) && g.durationMs
        ? g.weighted / g.durationMs
        : this.metricValue(g.name, g.distribution);
      const level =
        value === null
          ? "unavailable"
          : rating(g.name, value, String(g.context.mapType), Number(g.context.referenceHz));
      return {
        ...g,
        exact: undefined,
        weighted: undefined,
        distribution: undefined,
        visits: g.visits.size,
        count: g.distribution.count,
        total: g.distribution.sum,
        mean: g.distribution.count ? g.distribution.sum / g.distribution.count : null,
        max: g.distribution.max,
        p75: percentile(0.75),
        p95: percentile(0.95),
        value,
        rating: level,
        sufficient: g.visits.size >= 20,
        approximate: !DEFINITION_MAP.get(g.name)?.standard,
        lowWindowRatio:
          g.name === "fps" && g.distribution.count
            ? Object.entries(g.distribution.bins).reduce(
                (sum, [key, count]) =>
                  sum +
                  ((key === "zero" ? 0 : Math.pow(1.05, Number(key))) <
                  Number(g.context.referenceHz) * 0.5
                    ? count
                    : 0),
                0
              ) / g.distribution.count
            : null,
        rate: g.durationMs ? (g.distribution.sum / g.durationMs) * 1000 : null,
      };
    });
    const missing: Record<string, number> = {};
    for (const v of selected)
      for (const [name, reason] of Object.entries(
        (JSON.parse(String(v.metadata)) as PerformanceBatch).missing
      )) {
        const key = `${name}:${reason}`;
        missing[key] = (missing[key] || 0) + 1;
      }
    return {
      metrics,
      visits: selected.length,
      visitsWithDroppedBatches: selected.filter(
        (v) => (JSON.parse(String(v.metadata)) as PerformanceBatch).dropped > 0
      ).length,
      missing,
      thresholdVersion: THRESHOLD_VERSION,
      bucketMs: width,
      truncated: raw.length > 100000 || visits.length > 10000,
      from: q.from,
      to: q.to,
    };
  }
  private decodeVisit(v: Record<string, unknown>): unknown {
    return { ...v, metadata: JSON.parse(String(v.metadata)) };
  }
  private contextMatches(
    context: Record<string, unknown>,
    filters: Record<string, string>
  ): boolean {
    return Object.entries(filters).every(
      ([k, v]) => !v || k === "release" || k === "environment" || String(context[k]) === v
    );
  }
  private matches(b: PerformanceBatch, filters: Record<string, string>): boolean {
    return (
      (!filters.release || b.release === filters.release) &&
      (!filters.environment || b.environment === filters.environment)
    );
  }
  cleanup(now = Date.now()): void {
    for (const [table, column, age] of [
      ["batches", "at", 7],
      ["minutes", "at", 30],
      ["vitals", "at", 30],
      ["anomalies", "started", 30],
      ["streaks", "at", 7],
      ["visits", "ended", 30],
    ] as const) {
      this.db
        .prepare(
          `DELETE FROM ${table} WHERE rowid IN (SELECT rowid FROM ${table} WHERE ${column}<? LIMIT 5000)`
        )
        .run(now - age * 86400000);
    }
  }
}

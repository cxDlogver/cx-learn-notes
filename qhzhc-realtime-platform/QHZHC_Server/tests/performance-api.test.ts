import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/server/app.js";
import { AuthService } from "../src/server/auth.js";
import { AppDatabase } from "../src/server/database.js";
import { TelemetrySimulator } from "../src/server/simulator.js";
import { PerformanceStore } from "../src/server/performance/store.js";
import { emptyDistribution, observe, THRESHOLD_VERSION } from "../src/shared/performance.js";
describe("performance HTTP authorization and limits", () => {
  let database: AppDatabase,
    simulator: TelemetrySimulator,
    store: PerformanceStore,
    app: ReturnType<typeof createApp>;
  beforeEach(() => {
    database = new AppDatabase(":memory:");
    store = new PerformanceStore(":memory:");
    const auth = new AuthService(database, {
      accessTokenTtlMs: 60000,
      refreshTokenTtlMs: 600000,
      jwtSecret: "performance-test-secret-at-least-32-bytes",
    });
    simulator = new TelemetrySimulator(database);
    app = createApp({
      database,
      auth,
      simulator,
      disconnectClients: () => 0,
      performance: {
        ingest: async (id, b) => store.ingest(id, b),
        query: async (k, q, id) => store.query(k, q, id),
      },
    });
  });
  afterEach(() => {
    simulator.close();
    database.close();
    store.close();
  });
  async function login() {
    return (
      await request(app)
        .post("/api/auth/login")
        .send({ username: "admin", password: "Admin@123456" })
    ).body.accessToken;
  }
  function payload() {
    const at = Date.now(),
      d = emptyDistribution();
    observe(d, 10);
    return {
      schemaVersion: 1,
      batchId: "batch",
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
      eligible: false,
      mixed: false,
      visible: true,
      dropped: 0,
      capabilities: { loaf: true },
      missing: { LCP: "not-applicable" },
      metrics: [{ name: "chartUpdate", component: "CH4", distribution: d }],
      events: [],
    };
  }
  it("requires authentication for uploads and administrator role for reads", async () => {
    await request(app).post("/api/performance/batches").send(payload()).expect(401);
    const user = await request(app)
      .post("/api/auth/register")
      .send({ username: "operator", displayName: "测试", password: "TestPass123!" });
    expect(user.status).toBe(201);
    await request(app)
      .get("/api/admin/performance/overview")
      .auth(user.body.accessToken, { type: "bearer" })
      .expect(403);
    await request(app)
      .post("/api/performance/batches")
      .auth(user.body.accessToken, { type: "bearer" })
      .send(payload())
      .expect(204);
  });
  it("persists uploads and serves summaries, details and definitions", async () => {
    const token = await login();
    await request(app)
      .post("/api/performance/batches")
      .auth(token, { type: "bearer" })
      .send(payload())
      .expect(204);
    const o = await request(app)
      .get("/api/admin/performance/overview")
      .auth(token, { type: "bearer" })
      .expect(200);
    expect(o.body.metrics[0].value).toBe(10);
    const visits = await request(app)
      .get("/api/admin/performance/visits")
      .auth(token, { type: "bearer" })
      .expect(200);
    await request(app)
      .get("/api/admin/performance/visits/" + encodeURIComponent(visits.body.items[0].id))
      .auth(token, { type: "bearer" })
      .expect(200);
    await request(app)
      .get("/api/admin/performance/definitions")
      .auth(token, { type: "bearer" })
      .expect(200);
  });
  it("rejects malformed payloads and rate limits per authenticated user", async () => {
    const token = await login();
    await request(app)
      .post("/api/performance/batches")
      .auth(token, { type: "bearer" })
      .send({ ...payload(), secret: "not-allowed" })
      .expect(400);
    for (let i = 0; i < 60; i++)
      await request(app)
        .post("/api/performance/batches")
        .auth(token, { type: "bearer" })
        .send(payload())
        .expect(204);
    const r = await request(app)
      .post("/api/performance/batches")
      .auth(token, { type: "bearer" })
      .send(payload())
      .expect(429);
    expect(r.headers["retry-after"]).toBe("60");
  });
});

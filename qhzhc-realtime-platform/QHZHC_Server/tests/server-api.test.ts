import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/server/app.js";
import { AuthService } from "../src/server/auth.js";
import { AppDatabase } from "../src/server/database.js";
import { TelemetrySimulator } from "../src/server/simulator.js";

describe("HTTP API", () => {
  let database: AppDatabase;
  let simulator: TelemetrySimulator;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    database = new AppDatabase(":memory:", 10_000);
    const auth = new AuthService(database, 60_000);
    simulator = new TelemetrySimulator(database);
    app = createApp({ database, auth, simulator, disconnectClients: () => 3 });
  });

  afterEach(() => {
    simulator.close();
    database.close();
  });

  it("keeps protected telemetry endpoints behind a session", async () => {
    await request(app).get("/api/telemetry/latest").expect(401);
    const login = await request(app)
      .post("/api/auth/login")
      .send({ username: "admin", password: "Admin@123456" })
      .expect(200);
    const cookie = login.headers["set-cookie"];
    simulator.burst(12);
    const latest = await request(app)
      .get("/api/telemetry/latest?limit=5")
      .set("Cookie", cookie)
      .expect(200);
    expect(latest.body.points).toHaveLength(5);
    expect(latest.body.points.at(-1).sequence).toBe(12);
  });

  it("registers an account and creates a session cookie", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ username: "operator_1", displayName: "测试操作员", password: "Passw0rd!" })
      .expect(201);
    expect(response.body.user).toMatchObject({ username: "operator_1", role: "operator" });
    expect(response.headers["set-cookie"]?.[0]).toContain("qhzhc_session=");
  });

  it("updates simulator failure conditions and supports pause/burst/disconnect", async () => {
    const login = await request(app)
      .post("/api/auth/login")
      .send({ username: "admin", password: "Admin@123456" });
    const cookie = login.headers["set-cookie"];
    const configured = await request(app)
      .patch("/api/admin/simulator/config")
      .set("Cookie", cookie)
      .send({ pointsPerSecond: 9999, disorder: "jitter", deliveryDropRate: 0.25 })
      .expect(200);
    expect(configured.body.status.config).toMatchObject({
      pointsPerSecond: 2000,
      disorder: "jitter",
      deliveryDropRate: 0.25,
    });
    await request(app).post("/api/admin/simulator/action").set("Cookie", cookie).send({ action: "burst", count: 40 }).expect(200);
    const disconnected = await request(app).post("/api/admin/simulator/action").set("Cookie", cookie).send({ action: "disconnect" }).expect(200);
    expect(disconnected.body.disconnected).toBe(3);
  });
});

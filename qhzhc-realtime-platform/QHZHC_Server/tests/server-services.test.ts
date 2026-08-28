import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AuthError, AuthService } from "../src/server/auth.js";
import { AppDatabase } from "../src/server/database.js";
import { createTelemetryPoint } from "../src/server/point-factory.js";
import { createReplayPlan } from "../src/server/replay-plan.js";
import { TelemetrySimulator } from "../src/server/simulator.js";

const ROUTE_OUTBOUND_POINT_COUNT = 1_050;
const CIRCLE_POINT_COUNT = 600;

function coordinates(index: number, pattern: "route" | "circle" | "burst") {
  const point = createTelemetryPoint(index, 0, "QH-ZHC-01", pattern);
  return [point.longitude, point.latitude];
}

describe("server services", () => {
  let database: AppDatabase;
  let auth: AuthService;
  let simulator: TelemetrySimulator;

  beforeEach(() => {
    database = new AppDatabase(":memory:", 10_000);
    auth = new AuthService(database, {
      accessTokenTtlMs: 60_000,
      refreshTokenTtlMs: 7 * 24 * 60 * 60 * 1000,
      jwtSecret: "test-secret-with-at-least-thirty-two-bytes",
    });
    simulator = new TelemetrySimulator(database);
  });

  afterEach(() => {
    simulator.close();
    database.close();
  });

  it("seeds the demo account and issues verifiable access credentials", async () => {
    const tokens = await auth.login("admin", "Admin@123456");
    await expect(auth.verifyAccessToken(tokens.accessToken)).resolves.toMatchObject({
      username: "admin",
      role: "admin",
      familyId: tokens.familyId,
    });
    await expect(auth.login("admin", "wrong-password")).rejects.toBeInstanceOf(AuthError);
  });

  it("registers validated accounts and rejects duplicates", () => {
    const user = auth.register("operator_1", "测试操作员", "Passw0rd!");
    expect(user).toMatchObject({ username: "operator_1", displayName: "测试操作员" });
    expect(() => auth.register("operator_1", "重复账号", "Passw0rd!")).toThrowError("该账号已存在");
  });

  it("writes a burst atomically and produces a contiguous replay plan", () => {
    simulator.burst(80);
    expect(database.latestSequence()).toBe(80);
    const replay = createReplayPlan(database, "QH-ZHC-01", 73);
    expect(replay.kind).toBe("replay");
    if (replay.kind === "replay") {
      expect(replay.points.map((point) => point.sequence)).toEqual([74, 75, 76, 77, 78, 79, 80]);
    }
  });

  it("returns a gap plan when the requested range exceeds the replay budget", () => {
    simulator.burst(120);
    expect(createReplayPlan(database, "QH-ZHC-01", 1, 50)).toMatchObject({
      kind: "gap",
      requestedFrom: 2,
      latestSequence: 120,
    });
  });

  it("samples an entire high-volume history range while preserving both ends", () => {
    simulator.burst(20);
    const history = database.queryHistory("QH-ZHC-01", null, null, 5);
    expect(history).toMatchObject({ total: 20, truncated: true });
    expect(history.points.map((point) => point.sequence)).toEqual([1, 6, 11, 16, 20]);
  });

  it("clamps unsafe simulator configuration values", () => {
    const status = simulator.updateConfig({
      pointsPerSecond: 99_999,
      batchIntervalMs: 1,
      duplicateRate: 1,
      deliveryDropRate: -1,
      disorder: "jitter",
    });
    expect(status.config).toMatchObject({
      pointsPerSecond: 2_000,
      batchIntervalMs: 50,
      duplicateRate: 0.5,
      deliveryDropRate: 0,
      disorder: "jitter",
    });
  });

  it("follows the sampled real route and keeps moving forward after its endpoint", () => {
    const route = Array.from(
      { length: ROUTE_OUTBOUND_POINT_COUNT + 1 },
      (_, index) => coordinates(index, "route"),
    );
    const longitudes = route.map(([longitude]) => longitude);
    const latitudes = route.map(([, latitude]) => latitude);

    expect(route[0]).toEqual([104.8106553, 28.1693623]);
    expect(route.at(-1)).toEqual([104.8144763, 28.1589373]);
    expect(Math.max(...longitudes) - Math.min(...longitudes)).toBeGreaterThan(0.018);
    expect(Math.max(...latitudes) - Math.min(...latitudes)).toBeGreaterThan(0.023);

    const routeEnd = route.at(-1)!;
    const previous = route.at(-2)!;
    const forward = [routeEnd[0] - previous[0], routeEnd[1] - previous[1]];
    const continuation = Array.from({ length: 2_000 }, (_, offset) =>
      coordinates(ROUTE_OUTBOUND_POINT_COUNT + 1 + offset, "route"),
    );
    let previousProjection = 0;

    for (const point of continuation) {
      const projection =
        (point[0] - routeEnd[0]) * forward[0] +
        (point[1] - routeEnd[1]) * forward[1];
      expect(projection).toBeGreaterThan(previousProjection);
      previousProjection = projection;
    }

    expect(continuation).not.toContainEqual(route[0]);
    expect(continuation).not.toContainEqual(previous);
  });

  it("keeps circle sampling on a closed loop", () => {
    expect(coordinates(CIRCLE_POINT_COUNT, "circle")).toEqual(
      coordinates(0, "circle"),
    );
  });

  it("keeps burst sampling concentrated near one hotspot", () => {
    const burst = Array.from({ length: 1_000 }, (_, index) =>
      coordinates(index, "burst"),
    );
    const longitudes = burst.map(([longitude]) => longitude);
    const latitudes = burst.map(([, latitude]) => latitude);

    expect(Math.max(...longitudes) - Math.min(...longitudes)).toBeLessThan(
      0.0005,
    );
    expect(Math.max(...latitudes) - Math.min(...latitudes)).toBeLessThan(
      0.0005,
    );
  });
});

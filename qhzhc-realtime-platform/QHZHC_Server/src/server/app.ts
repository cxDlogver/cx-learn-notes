import fs from "node:fs";
import path from "node:path";
import express, { type NextFunction, type Request, type Response } from "express";
import type {
  SimulatorConfig,
  TelemetryPoint,
  UserSession,
} from "../shared/index.js";
import { AuthError, AuthService, SESSION_COOKIE } from "./auth.js";
import { AppDatabase } from "./database.js";
import { TelemetrySimulator } from "./simulator.js";
import { WeatherProviderError, WeatherService } from "./weather.js";

interface AuthenticatedRequest extends Request {
  user: UserSession;
}

export interface AppServices {
  database: AppDatabase;
  auth: AuthService;
  simulator: TelemetrySimulator;
  weather?: WeatherService;
  disconnectClients: () => number;
}

function asyncSafe(
  handler: (request: Request, response: Response) => void | Promise<void>,
): express.RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response)).catch(next);
  };
}

function validDate(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function publicProfile(user: UserSession): Record<string, unknown> {
  return {
    id: user.id,
    username: user.username,
    first_name: user.displayName,
    displayName: user.displayName,
    is_superuser: user.role === "admin",
    role: user.role,
    can_visit_realtime: true,
    can_visit_history: true,
  };
}

function legacyPoint(point: TelemetryPoint): Record<string, unknown> {
  return {
    sequence: point.sequence,
    robot_id: point.robotId,
    time: point.sampledAt,
    longitude: point.longitude,
    latitude: point.latitude,
    geo_location: [point.longitude, point.latitude],
    altitude: point.altitude,
    speed: point.speed,
    heading: point.heading,
    speed_direction: point.windDirection,
    pri_co2: point.priCo2,
    pri_ch4: point.priCh4,
    pri_c2h6: point.priC2h6,
    pri_co: point.priCo,
    pri_n2o: point.priN2o,
    pri_h2o: point.priH2o,
    picarro_hp_12ch4_dry: point.picarroCh4,
    picarro_hr_12ch4_dry: point.picarroCh4,
    picarro_12co2_dry: point.picarroCo2,
    picarro_delta_ich4_raw: (point.picarroCh4 - point.priCh4) * 100,
    picarro_h2o: point.picarroH2o,
    wind_speed: point.windSpeed,
    wind_direction: point.windDirection,
    weather_data: {
      temp: point.temperature,
      humidity: point.humidity,
      pressure: point.pressure,
      windSpeed: point.windSpeed,
      windDirection: point.windDirection,
    },
  };
}

export function createApp(services: AppServices): express.Express {
  const app = express();
  const weather = services.weather ?? new WeatherService();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "64kb" }));
  app.use((request, response, next) => {
    const origin = request.headers.origin;
    if (
      origin &&
      /^http:\/\/(127\.0\.0\.1|localhost):9527$/.test(origin)
    ) {
      response.setHeader("Access-Control-Allow-Origin", origin);
      response.setHeader("Access-Control-Allow-Credentials", "true");
      response.setHeader("Access-Control-Allow-Headers", "Content-Type");
      response.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
      response.setHeader("Vary", "Origin");
    }
    if (request.method === "OPTIONS") {
      response.status(204).end();
      return;
    }
    next();
  });
  app.use((_request, response, next) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "same-origin");
    response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    next();
  });

  app.get("/health", (_request, response) => {
    response.json({ ok: true, now: new Date().toISOString() });
  });

  app.post(
    "/api/auth/register",
    asyncSafe((request, response) => {
      const { username, displayName, password } = request.body as Record<string, unknown>;
      services.auth.register(String(username ?? ""), String(displayName ?? ""), String(password ?? ""));
      const session = services.auth.login(String(username), String(password));
      response.cookie(SESSION_COOKIE, session.token, {
        httpOnly: true,
        sameSite: "lax",
        secure: request.secure,
        expires: new Date(session.expiresAt),
        path: "/",
      });
      const profile = publicProfile(session.user);
      response.status(201).json({ ...profile, user: profile, message: "注册成功" });
    }),
  );

  app.post(
    "/api/auth/login",
    asyncSafe((request, response) => {
      const { username, password } = request.body as Record<string, unknown>;
      const session = services.auth.login(String(username ?? ""), String(password ?? ""));
      response.cookie(SESSION_COOKIE, session.token, {
        httpOnly: true,
        sameSite: "lax",
        secure: request.secure,
        expires: new Date(session.expiresAt),
        path: "/",
      });
      const profile = publicProfile(session.user);
      response.json({ ...profile, user: profile });
    }),
  );

  const requireAuth = (request: Request, response: Response, next: NextFunction): void => {
    const user = services.auth.sessionFromRequest(request);
    if (!user) {
      response.status(401).json({ code: "UNAUTHENTICATED", message: "请先登录" });
      return;
    }
    (request as AuthenticatedRequest).user = user;
    next();
  };

  app.get("/api/auth/session", requireAuth, (request, response) => {
    response.json(publicProfile((request as AuthenticatedRequest).user));
  });

  app.post("/api/auth/logout", requireAuth, (request, response) => {
    services.auth.logout(request);
    response.clearCookie(SESSION_COOKIE, { path: "/" });
    response.status(204).end();
  });

  const requireAdmin = (request: Request, response: Response, next: NextFunction): void => {
    if ((request as AuthenticatedRequest).user.role !== "admin") {
      response.status(403).json({ code: "FORBIDDEN", message: "仅管理员可操作模拟后台" });
      return;
    }
    next();
  };

  app.use("/api/telemetry", requireAuth);
  app.get("/api/telemetry/latest", (request, response) => {
    const robotId = String(request.query.robotId ?? "QH-ZHC-01");
    const limit = Math.min(5_000, Math.max(1, Number(request.query.limit) || 500));
    response.json({
      points: services.database.latestTelemetry(robotId, limit),
      latestSequence: services.database.latestSequence(robotId),
    });
  });
  app.get("/api/telemetry/history", (request, response) => {
    const robotId = String(request.query.robotId ?? "QH-ZHC-01");
    const rawFrom = request.query.from;
    const rawTo = request.query.to;
    const from = validDate(rawFrom);
    const to = validDate(rawTo);
    if ((rawFrom && !from) || (rawTo && !to)) {
      response.status(400).json({ code: "INVALID_RANGE", message: "历史时间格式无效" });
      return;
    }
    if (from && to && Date.parse(from) >= Date.parse(to)) {
      response.status(400).json({ code: "INVALID_RANGE", message: "结束时间必须晚于开始时间" });
      return;
    }
    const limit = Math.min(20_000, Math.max(1, Number(request.query.limit) || 5_000));
    response.json(services.database.queryHistory(robotId, from, to, limit));
  });

  app.use("/api/chart", requireAuth);
  app.get(
    "/api/chart/weather",
    asyncSafe(async (request, response) => {
      const longitude = Number(request.query.longitude);
      const latitude = Number(request.query.latitude);
      if (
        !Number.isFinite(longitude) ||
        !Number.isFinite(latitude) ||
        longitude < -180 ||
        longitude > 180 ||
        latitude < -90 ||
        latitude > 90
      ) {
        response.status(400).json({ code: 400, message: "经纬度参数无效", data: [] });
        return;
      }
      if (!weather.isConfigured()) {
        response.status(503).json({ code: 503, message: "天气服务暂不可用", data: [] });
        return;
      }
      try {
        const forecast = await weather.forecast(longitude, latitude);
        response.json({ code: 200, message: "ok", data: forecast });
      } catch (error) {
        if (error instanceof WeatherProviderError) {
          response.status(502).json({ code: 502, message: "天气服务请求失败", data: [] });
          return;
        }
        throw error;
      }
    }),
  );
  app.get("/api/chart/dataTrans/between", (request, response) => {
    const start = validDate(request.query.start_time);
    const end = validDate(request.query.end_time);
    if (!start || !end || Date.parse(start) >= Date.parse(end)) {
      response.status(400).json({ code: 400, message: "历史时间范围无效", data: [] });
      return;
    }
    const result = services.database.queryHistory("QH-ZHC-01", start, end, 3_000);
    response.json({
      code: 200,
      message: "查询成功",
      data: result.points.map(legacyPoint),
      total: result.total,
      sampled: result.truncated,
    });
  });
  app.get("/api/chart/dataTrans/5min", (request, response) => {
    const to = validDate(request.query.time) ?? new Date().toISOString();
    const from = new Date(Date.parse(to) - 5 * 60_000).toISOString();
    const result = services.database.queryHistory("QH-ZHC-01", from, to, 300);
    response.json({
      code: 200,
      message: "查询成功",
      data: result.points.map(legacyPoint),
      total: result.total,
      sampled: result.truncated,
    });
  });

  app.use("/api/admin/simulator", requireAuth, requireAdmin);
  app.get("/api/admin/simulator", (_request, response) => {
    response.json({ status: services.simulator.getStatus() });
  });
  app.patch(
    "/api/admin/simulator/config",
    asyncSafe((request, response) => {
      const patch = request.body as Partial<SimulatorConfig>;
      response.json({ status: services.simulator.updateConfig(patch) });
    }),
  );
  app.post(
    "/api/admin/simulator/action",
    asyncSafe((request, response) => {
      const { action, count } = request.body as { action?: unknown; count?: unknown };
      if (action === "start") {
        response.json({ status: services.simulator.start() });
        return;
      }
      if (action === "pause") {
        response.json({ status: services.simulator.pause() });
        return;
      }
      if (action === "burst") {
        response.json({ status: services.simulator.burst(Number(count) || 100) });
        return;
      }
      if (action === "disconnect") {
        const disconnected = services.disconnectClients();
        response.json({ status: services.simulator.getStatus(), disconnected });
        return;
      }
      response.status(400).json({ code: "INVALID_ACTION", message: "不支持的模拟器操作" });
    }),
  );

  const webRoot = path.resolve(import.meta.dirname, "../../../QHZHC_Web/dist");
  if (fs.existsSync(webRoot)) {
    app.use(express.static(webRoot, { index: false, maxAge: "1h" }));
    app.use((request, response, next) => {
      if (request.method === "GET" && request.accepts("html")) {
        response.sendFile(path.join(webRoot, "index.html"));
      } else {
        next();
      }
    });
  }

  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    if (error instanceof AuthError) {
      response.status(error.status).json({ code: error.code, message: error.message });
      return;
    }
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
      response.status(409).json({ code: "CONFLICT", message: "数据已存在" });
      return;
    }
    console.error(error);
    response.status(500).json({ code: "INTERNAL_ERROR", message: "服务端处理失败" });
  });
  return app;
}

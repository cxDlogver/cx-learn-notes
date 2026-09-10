import path from 'node:path';
import { PerformanceWorkerService } from './performance/service.js';
import { createServer } from "node:http";
import { createApp } from "./app.js";
import { AuthService } from "./auth.js";
import { loadConfig } from "./config.js";
import { AppDatabase } from "./database.js";
import { RobotSocketHub } from "./robot-socket-hub.js";
import { TelemetrySimulator } from "./simulator.js";
import { WeatherService } from "./weather.js";

const config = loadConfig();
const performanceService = new PerformanceWorkerService(process.env.PERFORMANCE_DATABASE_PATH || path.join(path.dirname(config.databasePath), 'performance.sqlite'));
const database = new AppDatabase(config.databasePath, config.telemetryRetention);
const auth = new AuthService(database, {
  accessTokenTtlMs: config.accessTokenTtlMs,
  refreshTokenTtlMs: config.refreshTokenTtlMs,
  jwtSecret: config.jwtSecret,
});
const simulator = new TelemetrySimulator(database);
const weather = new WeatherService();
let socketHub: RobotSocketHub | null = null;

const app = createApp({
  performance: performanceService,
  database,
  auth,
  simulator,
  weather,
  disconnectClients: () => socketHub?.disconnectAll() ?? 0,
});
const server = createServer(app);
socketHub = new RobotSocketHub(server, database, auth, simulator);
simulator.setConnectionCounter(() => socketHub?.connectionCount() ?? 0);
simulator.setPublisher((points, status) => socketHub?.publish(points, status));

server.listen(config.port, config.host, () => {
  simulator.start();
  console.log(`QHZHC server listening on http://${config.host}:${config.port}`);
  console.log("Demo account: admin / Admin@123456");
});

const tokenCleanup = setInterval(() => {
  database.cleanupExpiredSessions();
  database.cleanupExpiredRefreshTokens();
}, 60 * 60 * 1000);

function shutdown(signal: string): void {
  console.log(`Received ${signal}, shutting down...`);
  clearInterval(tokenCleanup);
  simulator.close();
  socketHub?.close();
  server.close(() => {
    database.close();
    void performanceService.close().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 5_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

import { createServer } from "node:http";
import { createApp } from "./app.js";
import { AuthService } from "./auth.js";
import { loadConfig } from "./config.js";
import { AppDatabase } from "./database.js";
import { RobotSocketHub } from "./robot-socket-hub.js";
import { TelemetrySimulator } from "./simulator.js";
import { WeatherService } from "./weather.js";

const config = loadConfig();
const database = new AppDatabase(config.databasePath, config.telemetryRetention);
const auth = new AuthService(database, config.sessionTtlMs);
const simulator = new TelemetrySimulator(database);
const weather = new WeatherService();
let socketHub: RobotSocketHub | null = null;

const app = createApp({
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

const sessionCleanup = setInterval(() => database.cleanupExpiredSessions(), 60 * 60 * 1000);

function shutdown(signal: string): void {
  console.log(`Received ${signal}, shutting down...`);
  clearInterval(sessionCleanup);
  simulator.close();
  socketHub?.close();
  server.close(() => {
    database.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

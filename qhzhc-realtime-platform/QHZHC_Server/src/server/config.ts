import path from "node:path";

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export interface AppConfig {
  host: string;
  port: number;
  databasePath: string;
  sessionTtlMs: number;
  telemetryRetention: number;
}

export function loadConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    host: overrides.host ?? process.env.HOST ?? "127.0.0.1",
    port: overrides.port ?? positiveInteger(process.env.PORT, 18080),
    databasePath:
      overrides.databasePath ??
      path.resolve(process.cwd(), process.env.DATABASE_PATH ?? ".data/qhzhc.sqlite"),
    sessionTtlMs:
      overrides.sessionTtlMs ??
      positiveInteger(process.env.SESSION_TTL_HOURS, 24) * 60 * 60 * 1000,
    telemetryRetention:
      overrides.telemetryRetention ?? positiveInteger(process.env.TELEMETRY_RETENTION, 100_000),
  };
}

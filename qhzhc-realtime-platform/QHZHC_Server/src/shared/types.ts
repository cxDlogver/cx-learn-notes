export const GAS_KEYS = [
  "priCo2",
  "priCh4",
  "priC2h6",
  "priCo",
  "priN2o",
  "picarroCh4",
] as const;

export type GasKey = (typeof GAS_KEYS)[number];

export const GAS_LABELS: Record<GasKey, string> = {
  priCo2: "PRI CO₂",
  priCh4: "PRI CH₄",
  priC2h6: "PRI C₂H₆",
  priCo: "PRI CO",
  priN2o: "PRI N₂O",
  picarroCh4: "Picarro CH₄",
};

export interface TelemetryPoint {
  sequence: number;
  robotId: string;
  sampledAt: string;
  longitude: number;
  latitude: number;
  altitude: number;
  speed: number;
  heading: number;
  priCo2: number;
  priCh4: number;
  priC2h6: number;
  priCo: number;
  priN2o: number;
  priH2o: number;
  picarroCh4: number;
  picarroCo2: number;
  picarroH2o: number;
  windSpeed: number;
  windDirection: number;
  temperature: number;
  humidity: number;
  pressure: number;
}

export type SimulatorPattern = "route" | "circle" | "burst";
export type DeliveryDisorder = "none" | "reverse-batch" | "jitter";

export interface SimulatorConfig {
  robotId: string;
  pointsPerSecond: number;
  batchIntervalMs: number;
  pattern: SimulatorPattern;
  disorder: DeliveryDisorder;
  duplicateRate: number;
  deliveryDropRate: number;
}

export interface SimulatorStatus {
  running: boolean;
  config: SimulatorConfig;
  committedSequence: number;
  generatedPoints: number;
  lastGeneratedAt: string | null;
  updatedAt: string;
  connectedClients: number;
}

export interface UserSession {
  id: number;
  username: string;
  displayName: string;
  role: "admin" | "operator";
}

export interface HistoryResponse {
  points: TelemetryPoint[];
  total: number;
  truncated: boolean;
  range: { from: string | null; to: string | null };
}

import type {
  DeliveryDisorder,
  SimulatorConfig,
  SimulatorPattern,
  SimulatorStatus,
  TelemetryPoint,
} from "../shared/index.js";
import { AppDatabase } from "./database.js";
import { createTelemetryPoint } from "./point-factory.js";

export type TelemetryPublisher = (
  points: TelemetryPoint[],
  status: SimulatorStatus,
) => void;

const DEFAULT_CONFIG: SimulatorConfig = {
  robotId: "QH-ZHC-01",
  pointsPerSecond: 20,
  batchIntervalMs: 250,
  pattern: "route",
  disorder: "none",
  duplicateRate: 0,
  deliveryDropRate: 0,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isPattern(value: unknown): value is SimulatorPattern {
  return value === "route" || value === "circle" || value === "burst";
}

function isDisorder(value: unknown): value is DeliveryDisorder {
  return value === "none" || value === "reverse-batch" || value === "jitter";
}

export class TelemetrySimulator {
  private config: SimulatorConfig = { ...DEFAULT_CONFIG };
  private timer: NodeJS.Timeout | null = null;
  private pointAccumulator = 0;
  private generatedPoints = 0;
  private lastGeneratedAt: string | null = null;
  private publisher: TelemetryPublisher = () => undefined;
  private connectionCount: () => number = () => 0;

  constructor(private readonly database: AppDatabase) {}

  setPublisher(publisher: TelemetryPublisher): void {
    this.publisher = publisher;
  }

  setConnectionCounter(counter: () => number): void {
    this.connectionCount = counter;
  }

  getStatus(): SimulatorStatus {
    return {
      running: this.timer !== null,
      config: { ...this.config },
      committedSequence: this.database.latestSequence(this.config.robotId),
      generatedPoints: this.generatedPoints,
      lastGeneratedAt: this.lastGeneratedAt,
      updatedAt: new Date().toISOString(),
      connectedClients: this.connectionCount(),
    };
  }

  updateConfig(patch: Partial<SimulatorConfig>): SimulatorStatus {
    const next = { ...this.config };
    if (typeof patch.pointsPerSecond === "number") {
      next.pointsPerSecond = Math.round(clamp(patch.pointsPerSecond, 1, 2_000));
    }
    if (typeof patch.batchIntervalMs === "number") {
      next.batchIntervalMs = Math.round(clamp(patch.batchIntervalMs, 50, 2_000));
    }
    if (isPattern(patch.pattern)) next.pattern = patch.pattern;
    if (isDisorder(patch.disorder)) next.disorder = patch.disorder;
    if (typeof patch.duplicateRate === "number") {
      next.duplicateRate = clamp(patch.duplicateRate, 0, 0.5);
    }
    if (typeof patch.deliveryDropRate === "number") {
      next.deliveryDropRate = clamp(patch.deliveryDropRate, 0, 0.5);
    }
    this.config = next;
    if (this.timer) this.restartTimer();
    this.publisher([], this.getStatus());
    return this.getStatus();
  }

  start(): SimulatorStatus {
    if (!this.timer) this.restartTimer();
    this.publisher([], this.getStatus());
    return this.getStatus();
  }

  pause(): SimulatorStatus {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.pointAccumulator = 0;
    this.publisher([], this.getStatus());
    return this.getStatus();
  }

  burst(count: number): SimulatorStatus {
    this.generate(Math.round(clamp(count, 1, 2_000)));
    return this.getStatus();
  }

  close(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private restartTimer(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.tick(), this.config.batchIntervalMs);
  }

  private tick(): void {
    this.pointAccumulator +=
      (this.config.pointsPerSecond * this.config.batchIntervalMs) / 1_000;
    let count = Math.floor(this.pointAccumulator);
    this.pointAccumulator -= count;
    if (this.config.pattern === "burst" && this.generatedPoints % 400 < count) {
      count = Math.min(count * 8, 1_000);
    }
    if (count > 0) this.generate(count);
  }

  private generate(count: number): void {
    const now = Date.now();
    const spacing = 1_000 / this.config.pointsPerSecond;
    const pending = Array.from({ length: count }, (_, offset) =>
      createTelemetryPoint(
        this.generatedPoints + offset,
        now - Math.max(0, count - 1 - offset) * spacing,
        this.config.robotId,
        this.config.pattern,
      ),
    );
    const inserted = this.database.insertTelemetry(pending);
    this.generatedPoints += inserted.length;
    this.lastGeneratedAt = inserted.at(-1)?.sampledAt ?? this.lastGeneratedAt;
    this.publisher(inserted, this.getStatus());
  }
}

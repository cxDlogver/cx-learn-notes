import type { TelemetryPoint } from "./realtimeTypes";

export class OrderedTelemetryBuffer {
  private expectedSequence: number;
  private readonly pending = new Map<number, TelemetryPoint>();

  constructor(startSequence = 1, private readonly maxPending = 20_000) {
    this.expectedSequence = Math.max(1, startSequence);
  }

  ingest(points: TelemetryPoint[]): TelemetryPoint[] {
    for (const point of points) {
      if (!Number.isSafeInteger(point.sequence) || point.sequence < this.expectedSequence) continue;
      if (this.pending.size >= this.maxPending || this.pending.has(point.sequence)) continue;
      this.pending.set(point.sequence, point);
    }
    const ordered: TelemetryPoint[] = [];
    while (this.pending.has(this.expectedSequence)) {
      const point = this.pending.get(this.expectedSequence);
      this.pending.delete(this.expectedSequence);
      if (point) ordered.push(point);
      this.expectedSequence += 1;
    }
    return ordered;
  }

  currentGap(): { fromSequence: number; toSequence: number } | null {
    if (this.pending.size === 0) return null;
    let minimum = Number.POSITIVE_INFINITY;
    for (const sequence of this.pending.keys()) minimum = Math.min(minimum, sequence);
    return minimum > this.expectedSequence
      ? { fromSequence: this.expectedSequence, toSequence: minimum - 1 }
      : null;
  }

  reset(nextExpectedSequence: number): void {
    this.expectedSequence = Math.max(1, nextExpectedSequence);
    this.pending.clear();
  }
}

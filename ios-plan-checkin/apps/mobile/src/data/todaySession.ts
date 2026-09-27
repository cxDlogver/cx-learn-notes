import type {
  CheckinDto,
  TodayDto,
  TodayItemDto,
} from "@plan-checkin/contracts";

/** Keeps a completed card visible for the rest of the current view session. */
export class TodaySessionStore {
  private held = new Map<string, TodayItemDto>();
  private listeners = new Set<() => void>();
  private version = 0;

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  readonly getSnapshot = (): number => this.version;

  hold(item: TodayItemDto, record: CheckinDto): void {
    this.held.set(`${item.plan.id}:${item.planBusinessDate}`, {
      ...item,
      status: record.result,
      record: {
        id: record.id,
        result: record.result,
        revision: record.revision,
        isBackfilled: record.isBackfilled,
        isRevised: record.isRevised,
      },
    });
    this.changed();
  }

  merge(today: TodayDto): TodayDto {
    const items = new Map(today.items.map((item) => [item.plan.id, item]));
    for (const held of this.held.values()) {
      if (held.planBusinessDate !== today.viewDate) continue;
      const current = items.get(held.plan.id);
      items.set(held.plan.id, current?.record ? current : held);
    }
    return { ...today, items: [...items.values()] };
  }

  clear(): void {
    if (!this.held.size) return;
    this.held.clear();
    this.changed();
  }

  private changed(): void {
    this.version += 1;
    for (const listener of this.listeners) listener();
  }
}

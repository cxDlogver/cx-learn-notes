import type {
  CheckinDto,
  PlanDto,
  SyncAckDto,
  SyncChange,
  SyncChangesDto,
} from "@plan-checkin/contracts";
import type { LocalCache } from "./localCache";

interface SyncApi {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
}
function expired(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "CURSOR_EXPIRED",
  );
}
function recordLocator(change: SyncChange): {
  planId: string;
  businessDate: string;
} {
  const planId = change.payload?.planId;
  const businessDate = change.payload?.businessDate;
  if (
    typeof planId !== "string" ||
    typeof businessDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(businessDate)
  )
    throw new Error("同步记录缺少计划或业务日期，游标未推进");
  return { planId, businessDate };
}

/** Every page is applied before its cursor is saved. Repeating a page cannot replace an unsent local draft. */
export class IncrementalSync {
  private inFlight: Promise<void> | null = null;
  private rerunRequested = false;

  constructor(
    private readonly api: SyncApi,
    private readonly cache: LocalCache,
    private readonly accountId: () => string | null,
    private readonly deviceId: () => Promise<string>,
    private readonly onChanges: (
      changes: SyncChange[],
    ) => Promise<void> = async () => {},
  ) {}

  trigger(): Promise<void> {
    if (this.inFlight) {
      this.rerunRequested = true;
      return this.inFlight;
    }
    this.inFlight = (async () => {
      do {
        this.rerunRequested = false;
        await this.run();
      } while (this.rerunRequested);
    })().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async acknowledge(cursor: string): Promise<void> {
    try {
      await this.api.post<SyncAckDto>("/sync/ack", {
        cursor,
        deviceId: await this.deviceId(),
      });
    } catch {
      /* The local cursor is already durable. The next run retries acknowledgement. */
    }
  }

  private async run(): Promise<void> {
    const accountId = this.accountId();
    if (!accountId) return;
    let cursor = await this.cache.cursor(accountId);
    if (cursor) await this.acknowledge(cursor);
    let bootstrap = cursor === null;
    for (let pageNumber = 0; pageNumber < 100; pageNumber++) {
      if (this.accountId() !== accountId) return;
      let page: SyncChangesDto;
      try {
        const query = new URLSearchParams({ limit: "100" });
        if (cursor) query.set("cursor", cursor);
        page = await this.api.get<SyncChangesDto>(
          `/sync/changes?${query.toString()}`,
        );
      } catch (error) {
        if (!expired(error)) throw error;
        await this.cache.setCursor(accountId, null);
        cursor = null;
        bootstrap = true;
        continue;
      }
      const ownChanges = page.changes.filter(
        (change) =>
          change.entityType === "plan" ||
          change.entityType === "group" ||
          change.entityType === "checkin",
      );
      const plans =
        bootstrap || ownChanges.length
          ? await this.api.get<PlanDto[]>("/plans")
          : null;
      const locators = new Map<
        string,
        { planId: string; businessDate: string }
      >();
      for (const change of page.changes) {
        if (change.entityType !== "checkin" || change.operation !== "upsert")
          continue;
        const item = recordLocator(change);
        locators.set(`${item.planId}:${item.businessDate}`, item);
      }
      const records: CheckinDto[] = [];
      for (const item of locators.values()) {
        try {
          records.push(
            await this.api.get<CheckinDto>(
              `/plans/${encodeURIComponent(item.planId)}/checkins/${item.businessDate}`,
            ),
          );
        } catch (error) {
          if (!(
            error &&
            typeof error === "object" &&
            "status" in error &&
            error.status === 404
          ))
            throw error;
        }
      }
      if (this.accountId() !== accountId) return;
      await this.cache.applyRemoteSyncPage(accountId, page, plans, records);
      cursor = page.nextCursor;
      bootstrap = false;
      try {
        await this.onChanges(page.changes);
      } catch {
        /* Data is durable; UI refresh can retry. */
      }
      await this.acknowledge(cursor);
      if (!page.hasMore) return;
    }
    this.rerunRequested = true;
  }
}

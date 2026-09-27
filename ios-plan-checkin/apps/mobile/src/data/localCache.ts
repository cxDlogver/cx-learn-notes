import type { CheckinDto, PlanDto, Weekday } from "@plan-checkin/contracts";
import { LocalStore } from "./localStore";

export type CheckinSyncState =
  "synced" | "local" | "syncing" | "failed" | "conflict";
export interface RuleSnapshot {
  planId: string;
  version: number;
  effectiveDate: string;
  rule: { weekdays: Weekday[] } | { weeklyTarget: number } | null;
}
export interface LocalMediaMetadata {
  id: string;
  operationId: string | null;
  fileUri: string;
  mimeType: string;
  byteSize: number;
  sha256: string;
  status: "staged" | "uploading" | "uploaded" | "failed";
  remoteId: string | null;
  createdAt: string;
}
interface PayloadRow {
  payload: string;
}
interface CursorRow {
  cursor: string | null;
}

export class LocalCache {
  constructor(private readonly store: LocalStore) {}

  async upsertPlans(
    accountId: string,
    plans: PlanDto[],
    completeList = false,
  ): Promise<void> {
    await this.store.transaction(accountId, async (database) => {
      for (const plan of plans) {
        await database.runAsync(
          `INSERT INTO local_plans(id,revision,lifecycle,payload,updated_at) VALUES(?,?,?,?,?)
           ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,lifecycle=excluded.lifecycle,payload=excluded.payload,updated_at=excluded.updated_at
           WHERE excluded.revision >= local_plans.revision`,
          plan.id,
          plan.revision,
          plan.lifecycle,
          JSON.stringify(plan),
          plan.updatedAt,
        );
        await database.runAsync(
          `INSERT INTO local_rule_versions(plan_id,version,effective_date,payload) VALUES(?,?,?,?)
           ON CONFLICT(plan_id,version) DO UPDATE SET effective_date=excluded.effective_date,payload=excluded.payload`,
          plan.id,
          plan.ruleVersion,
          plan.ruleEffectiveDate,
          JSON.stringify(plan.rule),
        );
      }
      if (completeList) {
        if (plans.length) {
          const placeholders = plans.map(() => "?").join(",");
          await database.runAsync(
            `UPDATE local_plans SET lifecycle='deleted' WHERE id NOT IN (${placeholders})`,
            ...plans.map((plan) => plan.id),
          );
        } else {
          await database.runAsync("UPDATE local_plans SET lifecycle='deleted'");
        }
        await database.runAsync(
          `INSERT INTO local_sync_cursor(scope,cursor,updated_at) VALUES('plans:list-fetched',?,?)
         ON CONFLICT(scope) DO UPDATE SET cursor=excluded.cursor,updated_at=excluded.updated_at`,
          new Date().toISOString(),
          new Date().toISOString(),
        );
      }
    });
  }

  async hasPlanListSnapshot(accountId: string): Promise<boolean> {
    return this.store.read(accountId, async (database) =>
      Boolean(
        await database.getFirstAsync<CursorRow>(
          "SELECT cursor FROM local_sync_cursor WHERE scope='plans:list-fetched'",
        ),
      ),
    );
  }

  async listPlans(accountId: string): Promise<PlanDto[]> {
    return this.store.read(accountId, async (database) => {
      const rows = await database.getAllAsync<PayloadRow>(
        "SELECT payload FROM local_plans WHERE lifecycle <> 'deleted' ORDER BY updated_at DESC, id",
      );
      return rows.map((row) => JSON.parse(row.payload) as PlanDto);
    });
  }

  async getPlan(accountId: string, planId: string): Promise<PlanDto | null> {
    return this.store.read(accountId, async (database) => {
      const row = await database.getFirstAsync<PayloadRow>(
        "SELECT payload FROM local_plans WHERE id = ? AND lifecycle <> 'deleted'",
        planId,
      );
      return row ? (JSON.parse(row.payload) as PlanDto) : null;
    });
  }

  async removePlan(accountId: string, planId: string): Promise<void> {
    await this.store.transaction(accountId, async (database) => {
      await database.runAsync(
        "DELETE FROM local_media WHERE operation_id IN (SELECT operation_id FROM local_outbox WHERE plan_id=?)",
        planId,
      );
      await database.runAsync(
        "DELETE FROM local_outbox WHERE plan_id=?",
        planId,
      );
      await database.runAsync("DELETE FROM local_plans WHERE id=?", planId);
    });
  }

  async ruleVersions(
    accountId: string,
    planId: string,
  ): Promise<RuleSnapshot[]> {
    return this.store.read(accountId, async (database) => {
      const rows = await database.getAllAsync<{
        version: number;
        effective_date: string;
        payload: string;
      }>(
        "SELECT version,effective_date,payload FROM local_rule_versions WHERE plan_id = ? ORDER BY version",
        planId,
      );
      return rows.map((row) => ({
        planId,
        version: row.version,
        effectiveDate: row.effective_date,
        rule: JSON.parse(row.payload) as RuleSnapshot["rule"],
      }));
    });
  }

  /** Server data cannot overwrite a local or conflicted draft awaiting synchronization. */
  async upsertServerCheckins(
    accountId: string,
    records: CheckinDto[],
  ): Promise<void> {
    await this.store.transaction(accountId, async (database) => {
      for (const record of records) {
        await database.runAsync(
          `INSERT INTO local_checkins(plan_id,business_date,revision,sync_state,payload,operation_id,updated_at)
           VALUES(?,?,?,'synced',?,NULL,?)
           ON CONFLICT(plan_id,business_date) DO UPDATE SET
             revision=excluded.revision,sync_state='synced',payload=excluded.payload,operation_id=NULL,updated_at=excluded.updated_at
           WHERE local_checkins.sync_state='synced' AND excluded.revision >= local_checkins.revision`,
          record.planId,
          record.businessDate,
          record.revision,
          JSON.stringify(record),
          record.updatedAt,
        );
      }
    });
  }

  async checkin(
    accountId: string,
    planId: string,
    businessDate: string,
  ): Promise<{ record: CheckinDto; state: CheckinSyncState } | null> {
    return this.store.read(accountId, async (database) => {
      const row = await database.getFirstAsync<
        PayloadRow & { sync_state: CheckinSyncState }
      >(
        "SELECT payload,sync_state FROM local_checkins WHERE plan_id=? AND business_date=?",
        planId,
        businessDate,
      );
      return row
        ? {
            record: JSON.parse(row.payload) as CheckinDto,
            state: row.sync_state,
          }
        : null;
    });
  }

  async putMedia(accountId: string, media: LocalMediaMetadata): Promise<void> {
    const root = await this.store.mediaRoot(accountId);
    if (!media.fileUri.startsWith(`${root.replace(/\/$/, "")}/`))
      throw new Error("媒体文件必须位于当前账户私有目录");
    await this.store.transaction(accountId, async (database) => {
      await database.runAsync(
        `INSERT INTO local_media(id,operation_id,file_uri,mime_type,byte_size,sha256,status,remote_id,created_at)
         VALUES(?,?,?,?,?,?,?,?,?)
         ON CONFLICT(id) DO UPDATE SET operation_id=excluded.operation_id,file_uri=excluded.file_uri,
           mime_type=excluded.mime_type,byte_size=excluded.byte_size,sha256=excluded.sha256,
           status=excluded.status,remote_id=excluded.remote_id`,
        media.id,
        media.operationId,
        media.fileUri,
        media.mimeType,
        media.byteSize,
        media.sha256,
        media.status,
        media.remoteId,
        media.createdAt,
      );
    });
  }

  async mediaForOperation(
    accountId: string,
    operationId: string,
  ): Promise<LocalMediaMetadata[]> {
    return this.store.read(accountId, async (database) => {
      const rows = await database.getAllAsync<{
        id: string;
        operation_id: string | null;
        file_uri: string;
        mime_type: string;
        byte_size: number;
        sha256: string;
        status: LocalMediaMetadata["status"];
        remote_id: string | null;
        created_at: string;
      }>(
        "SELECT * FROM local_media WHERE operation_id=? ORDER BY created_at,id",
        operationId,
      );
      return rows.map((row) => ({
        id: row.id,
        operationId: row.operation_id,
        fileUri: row.file_uri,
        mimeType: row.mime_type,
        byteSize: row.byte_size,
        sha256: row.sha256,
        status: row.status,
        remoteId: row.remote_id,
        createdAt: row.created_at,
      }));
    });
  }

  async cursor(accountId: string, scope = "self"): Promise<string | null> {
    return this.store.read(
      accountId,
      async (database) =>
        (
          await database.getFirstAsync<CursorRow>(
            "SELECT cursor FROM local_sync_cursor WHERE scope=?",
            scope,
          )
        )?.cursor ?? null,
    );
  }

  async setCursor(
    accountId: string,
    cursor: string | null,
    scope = "self",
  ): Promise<void> {
    await this.store.transaction(accountId, async (database) => {
      await database.runAsync(
        `INSERT INTO local_sync_cursor(scope,cursor,updated_at) VALUES(?,?,?)
         ON CONFLICT(scope) DO UPDATE SET cursor=excluded.cursor,updated_at=excluded.updated_at`,
        scope,
        cursor,
        new Date().toISOString(),
      );
    });
  }

  async applyPermissionTombstone(
    accountId: string,
    planId: string,
    sequence: number,
  ): Promise<void> {
    await this.store.transaction(accountId, async (database) => {
      await database.runAsync(
        `INSERT INTO local_permission_tombstones(plan_id,sequence,updated_at) VALUES(?,?,?)
         ON CONFLICT(plan_id) DO UPDATE SET sequence=excluded.sequence,updated_at=excluded.updated_at
         WHERE excluded.sequence > local_permission_tombstones.sequence`,
        planId,
        sequence,
        new Date().toISOString(),
      );
    });
  }
}

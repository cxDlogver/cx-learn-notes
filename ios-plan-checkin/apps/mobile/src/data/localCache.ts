import type {
  CalendarMonthDto,
  CheckinDto,
  PlanDetailDto,
  PlanDto,
  PutCheckinRequest,
  TodayDto,
  Weekday,
} from "@plan-checkin/contracts";
import {
  businessDateAt,
  isoWeekday,
  parseBusinessDate,
} from "@plan-checkin/domain";
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

  async saveTodaySnapshot(accountId: string, today: TodayDto): Promise<void> {
    await this.store.transaction(accountId, async (database) => {
      await database.runAsync(
        `INSERT INTO local_sync_cursor(scope,cursor,updated_at) VALUES('today:snapshot',?,?)
         ON CONFLICT(scope) DO UPDATE SET cursor=excluded.cursor,updated_at=excluded.updated_at`,
        JSON.stringify(today),
        new Date().toISOString(),
      );
    });
  }

  async todaySnapshot(
    accountId: string,
    viewDate: string,
  ): Promise<TodayDto | null> {
    return this.store.read(accountId, async (database) => {
      const row = await database.getFirstAsync<CursorRow>(
        "SELECT cursor FROM local_sync_cursor WHERE scope='today:snapshot'",
      );
      if (!row?.cursor) return null;
      const today = JSON.parse(row.cursor) as TodayDto;
      return today.viewDate === viewDate ? today : null;
    });
  }

  private async writeSnapshot(
    accountId: string,
    scope: string,
    value: unknown,
  ): Promise<void> {
    await this.store.transaction(accountId, async (database) => {
      await database.runAsync(
        `INSERT INTO local_sync_cursor(scope,cursor,updated_at) VALUES(?,?,?)
         ON CONFLICT(scope) DO UPDATE SET cursor=excluded.cursor,updated_at=excluded.updated_at`,
        scope,
        JSON.stringify(value),
        new Date().toISOString(),
      );
    });
  }

  private async readSnapshot<T>(
    accountId: string,
    scope: string,
  ): Promise<T | null> {
    return this.store.read(accountId, async (database) => {
      const row = await database.getFirstAsync<CursorRow>(
        "SELECT cursor FROM local_sync_cursor WHERE scope=?",
        scope,
      );
      return row?.cursor ? (JSON.parse(row.cursor) as T) : null;
    });
  }

  saveCalendarSnapshot(
    accountId: string,
    key: string,
    calendar: CalendarMonthDto,
  ): Promise<void> {
    return this.writeSnapshot(accountId, `calendar:${key}`, calendar);
  }
  calendarSnapshot(
    accountId: string,
    key: string,
  ): Promise<CalendarMonthDto | null> {
    return this.readSnapshot<CalendarMonthDto>(accountId, `calendar:${key}`);
  }
  savePlanDetailSnapshot(
    accountId: string,
    detail: PlanDetailDto,
  ): Promise<void> {
    return this.writeSnapshot(accountId, `detail:${detail.plan.id}`, detail);
  }
  planDetailSnapshot(
    accountId: string,
    planId: string,
  ): Promise<PlanDetailDto | null> {
    return this.readSnapshot<PlanDetailDto>(accountId, `detail:${planId}`);
  }
  async checkinsForView(
    accountId: string,
    datePrefix: string,
    planId?: string,
  ): Promise<{ record: CheckinDto; state: CheckinSyncState }[]> {
    return this.store.read(accountId, async (database) => {
      const rows = planId
        ? await database.getAllAsync<
            PayloadRow & { sync_state: CheckinSyncState }
          >(
            "SELECT payload,sync_state FROM local_checkins WHERE plan_id=? AND business_date LIKE ?",
            planId,
            `${datePrefix}%`,
          )
        : await database.getAllAsync<
            PayloadRow & { sync_state: CheckinSyncState }
          >(
            "SELECT payload,sync_state FROM local_checkins WHERE business_date LIKE ?",
            `${datePrefix}%`,
          );
      return rows.map((row) => ({
        record: JSON.parse(row.payload) as CheckinDto,
        state: row.sync_state,
      }));
    });
  }

  async invalidateViewSnapshots(
    accountId: string,
    planId: string,
  ): Promise<void> {
    await this.store.transaction(accountId, async (database) => {
      await database.runAsync(
        "DELETE FROM local_sync_cursor WHERE scope LIKE 'calendar:%' OR scope='today:snapshot' OR scope=?",
        `detail:${planId}`,
      );
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
      await database.runAsync(
        "DELETE FROM local_sync_cursor WHERE scope LIKE 'calendar:%' OR scope='today:snapshot' OR scope=?",
        `detail:${planId}`,
      );
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

  /** Record and outbox are committed together; a failed transaction leaves neither visible. */
  async savePendingCheckin(
    accountId: string,
    plan: PlanDto,
    businessDate: string,
    input: PutCheckinRequest,
  ): Promise<{ record: CheckinDto; operationId: string }> {
    if (plan.kind === "one_time")
      throw new Error("一次性任务请使用完成状态操作");
    if (plan.lifecycle !== "active")
      throw new Error("当前计划已暂停或归档，不能离线记录");
    if (
      businessDate > businessDateAt(new Date(), plan.timezone) ||
      businessDate < plan.startDate ||
      (plan.endDate && businessDate > plan.endDate)
    )
      throw new Error("该日期不在可记录范围");
    await this.upsertPlans(accountId, [plan]);
    return this.store.transaction(accountId, async (database) => {
      const rule = await database.getFirstAsync<{
        version: number;
        payload: string;
      }>(
        "SELECT version,payload FROM local_rule_versions WHERE plan_id=? AND effective_date<=? ORDER BY effective_date DESC,version DESC LIMIT 1",
        plan.id,
        businessDate,
      );
      if (!rule || rule.version !== input.ruleVersion)
        throw new Error("缺少此日期的规则版本，请联网后再补记");
      const ruleData = JSON.parse(rule.payload) as RuleSnapshot["rule"];
      if (
        ruleData &&
        "weekdays" in ruleData &&
        !ruleData.weekdays.includes(isoWeekday(parseBusinessDate(businessDate)))
      )
        throw new Error("固定日期计划在该星期不能打卡");
      const prior = await database.getFirstAsync<
        PayloadRow & {
          operation_id: string | null;
          sync_state: CheckinSyncState;
        }
      >(
        "SELECT payload,operation_id,sync_state FROM local_checkins WHERE plan_id=? AND business_date=?",
        plan.id,
        businessDate,
      );
      const existing = prior ? (JSON.parse(prior.payload) as CheckinDto) : null;
      const pending =
        prior?.operation_id && prior.sync_state === "local"
          ? await database.getFirstAsync<{ payload: string }>(
              "SELECT payload FROM local_outbox WHERE operation_id=? AND status='pending'",
              prior.operation_id,
            )
          : null;
      const operationId =
        pending && prior?.operation_id
          ? prior.operation_id
          : input.clientOperationId;
      const queuedInput: PutCheckinRequest = pending
        ? {
            ...input,
            baseRevision: (JSON.parse(pending.payload) as PutCheckinRequest)
              .baseRevision,
            clientOperationId: operationId,
          }
        : input;
      const record: CheckinDto = {
        id: existing?.id ?? operationId,
        planId: plan.id,
        businessDate,
        result: input.result,
        note: input.note?.trim() || null,
        failureReason: input.failureReason?.trim() || null,
        numeric: input.numeric ?? null,
        mediaIds: input.mediaIds ?? [],
        isBackfilled: businessDate < businessDateAt(new Date(), plan.timezone),
        isRevised: Boolean(existing),
        revision: queuedInput.baseRevision,
        ruleVersion: input.ruleVersion,
        createdAt: existing?.createdAt ?? input.clientCreatedAt,
        updatedAt: input.clientCreatedAt,
        syncSequence: existing?.syncSequence ?? 0,
      };
      await database.runAsync(
        `INSERT INTO local_checkins(plan_id,business_date,revision,sync_state,payload,operation_id,updated_at)
         VALUES(?,?,?,'local',?,?,?) ON CONFLICT(plan_id,business_date) DO UPDATE SET
           revision=excluded.revision,sync_state='local',payload=excluded.payload,
           operation_id=excluded.operation_id,updated_at=excluded.updated_at`,
        plan.id,
        businessDate,
        queuedInput.baseRevision,
        JSON.stringify(record),
        operationId,
        input.clientCreatedAt,
      );
      if (pending) {
        await database.runAsync(
          "UPDATE local_outbox SET payload=? WHERE operation_id=? AND status='pending'",
          JSON.stringify(queuedInput),
          operationId,
        );
      } else
        await database.runAsync(
          `INSERT INTO local_outbox(operation_id,plan_id,business_date,kind,status,payload,created_at)
         VALUES(?,?,?,?,'pending',?,?)`,
          operationId,
          plan.id,
          businessDate,
          existing
            ? "update"
            : businessDate < businessDateAt(new Date(), plan.timezone)
              ? "backfill"
              : "create",
          JSON.stringify(queuedInput),
          input.clientCreatedAt,
        );
      return { record, operationId };
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

import type {
  CalendarMonthDto,
  CheckinDto,
  CheckinConflictDetails,
  PlanDetailDto,
  PlanDto,
  PutCheckinRequest,
  SyncChangesDto,
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
export interface LocalMediaUpload extends LocalMediaMetadata {
  checkinId: string | null;
  oneTimePlanId: string | null;
  retryCount: number;
}
export interface OutboxOperation {
  operationId: string;
  planId: string;
  businessDate: string;
  kind: "create" | "update" | "backfill" | "resolve_conflict";
  payload: PutCheckinRequest;
  retryCount: number;
}
export interface LocalCheckinConflict {
  operationId: string;
  planId: string;
  businessDate: string;
  localRecord: CheckinDto;
  details: CheckinConflictDetails;
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
    allowUnverifiedRule = false,
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
      if ((!rule || rule.version !== input.ruleVersion) && !allowUnverifiedRule)
        throw new Error("缺少此日期的规则版本，请联网后再补记");
      const ruleData =
        rule?.version === input.ruleVersion
          ? (JSON.parse(rule.payload) as RuleSnapshot["rule"])
          : null;
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
        prior?.operation_id &&
        (prior.sync_state === "local" || prior.sync_state === "failed")
          ? await database.getFirstAsync<{ payload: string }>(
              "SELECT payload FROM local_outbox WHERE operation_id=? AND status='pending'",
              prior.operation_id,
            )
          : null;
      if (prior?.sync_state === "failed" && !pending)
        await database.runAsync(
          "DELETE FROM local_outbox WHERE plan_id=? AND business_date=? AND status='failed'",
          plan.id,
          businessDate,
        );
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

  /** Claim one operation in insertion order; older unresolved writes for the same date block newer ones. */
  async claimNextOperation(
    accountId: string,
    now = new Date(),
  ): Promise<OutboxOperation | null> {
    return this.store.transaction(accountId, async (database) => {
      const stamp = now.toISOString();
      await database.runAsync(
        `UPDATE local_outbox SET status='retry', next_attempt_at=NULL,
           last_error_code='INTERRUPTED', last_error_message='上次同步中断，准备重试'
         WHERE status='sending' AND next_attempt_at<=?`,
        stamp,
      );
      const row = await database.getFirstAsync<{
        operation_id: string;
        plan_id: string;
        business_date: string;
        kind: OutboxOperation["kind"];
        payload: string;
        retry_count: number;
      }>(
        `SELECT o.operation_id,o.plan_id,o.business_date,o.kind,o.payload,o.retry_count
         FROM local_outbox o WHERE o.status IN ('pending','retry')
         AND (o.next_attempt_at IS NULL OR o.next_attempt_at<=?)
         AND NOT EXISTS (SELECT 1 FROM local_outbox prior
           WHERE prior.plan_id=o.plan_id AND prior.business_date=o.business_date
           AND prior.rowid<o.rowid AND prior.status IN ('pending','sending','retry','conflict','failed'))
         ORDER BY o.rowid LIMIT 1`,
        stamp,
      );
      if (!row) return null;
      await database.runAsync(
        `UPDATE local_outbox SET status='sending', next_attempt_at=?,
           last_error_code=NULL,last_error_message=NULL WHERE operation_id=?`,
        new Date(now.getTime() + 120_000).toISOString(),
        row.operation_id,
      );
      await database.runAsync(
        "UPDATE local_checkins SET sync_state='syncing' WHERE plan_id=? AND business_date=? AND operation_id=?",
        row.plan_id,
        row.business_date,
        row.operation_id,
      );
      return {
        operationId: row.operation_id,
        planId: row.plan_id,
        businessDate: row.business_date,
        kind: row.kind,
        payload: JSON.parse(row.payload) as PutCheckinRequest,
        retryCount: row.retry_count,
      };
    });
  }

  /** A lost HTTP response can be acknowledged by retrying the same operation ID. */
  async acknowledgeOperation(
    accountId: string,
    operation: OutboxOperation,
    server: CheckinDto,
  ): Promise<void> {
    await this.store.transaction(accountId, async (database) => {
      const current = await database.getFirstAsync<{ operation_id: string }>(
        "SELECT operation_id FROM local_outbox WHERE operation_id=?",
        operation.operationId,
      );
      if (!current) return;
      await database.runAsync(
        "DELETE FROM local_outbox WHERE operation_id=?",
        operation.operationId,
      );
      await database.runAsync(
        "UPDATE local_media SET checkin_id=? WHERE operation_id=? AND checkin_id IS NULL",
        server.id,
        operation.operationId,
      );
      const next = await database.getFirstAsync<{
        operation_id: string;
        payload: string;
      }>(
        "SELECT operation_id,payload FROM local_outbox WHERE plan_id=? AND business_date=? ORDER BY rowid LIMIT 1",
        operation.planId,
        operation.businessDate,
      );
      if (next) {
        const payload = JSON.parse(next.payload) as PutCheckinRequest;
        await database.runAsync(
          "UPDATE local_outbox SET payload=? WHERE operation_id=?",
          JSON.stringify({ ...payload, baseRevision: server.revision }),
          next.operation_id,
        );
        const draft = await database.getFirstAsync<{ payload: string }>(
          "SELECT payload FROM local_checkins WHERE plan_id=? AND business_date=? AND operation_id=?",
          operation.planId,
          operation.businessDate,
          next.operation_id,
        );
        if (draft) {
          await database.runAsync(
            "UPDATE local_checkins SET revision=?,payload=?,sync_state='local' WHERE plan_id=? AND business_date=? AND operation_id=?",
            server.revision,
            JSON.stringify({
              ...JSON.parse(draft.payload),
              revision: server.revision,
              id: server.id,
            }),
            operation.planId,
            operation.businessDate,
            next.operation_id,
          );
        }
      } else {
        await database.runAsync(
          `UPDATE local_checkins SET revision=?,sync_state='synced',payload=?,operation_id=NULL,updated_at=?
           WHERE plan_id=? AND business_date=? AND operation_id=?`,
          server.revision,
          JSON.stringify(server),
          server.updatedAt,
          operation.planId,
          operation.businessDate,
          operation.operationId,
        );
      }
      await database.runAsync(
        "DELETE FROM local_sync_cursor WHERE scope LIKE 'calendar:%' OR scope='today:snapshot' OR scope=?",
        `detail:${operation.planId}`,
      );
    });
  }

  async failOperation(
    accountId: string,
    operation: OutboxOperation,
    status: "retry" | "conflict" | "failed",
    code: string,
    message: string,
    retryAt: Date | null = null,
    details: CheckinConflictDetails | null = null,
  ): Promise<void> {
    await this.store.transaction(accountId, async (database) => {
      await database.runAsync(
        `UPDATE local_outbox SET status=?,retry_count=retry_count+1,
           next_attempt_at=?,last_error_code=?,last_error_message=?
         WHERE operation_id=? AND status='sending'`,
        status,
        retryAt?.toISOString() ?? null,
        code,
        message,
        operation.operationId,
      );
      await database.runAsync(
        "UPDATE local_checkins SET sync_state=? WHERE plan_id=? AND business_date=?",
        status === "conflict" ? "conflict" : "failed",
        operation.planId,
        operation.businessDate,
      );
      if (status === "conflict" && details)
        await database.runAsync(
          `INSERT INTO local_checkin_conflicts(operation_id,plan_id,business_date,details_json,created_at)
           VALUES(?,?,?,?,?) ON CONFLICT(operation_id) DO UPDATE SET
             details_json=excluded.details_json,created_at=excluded.created_at`,
          operation.operationId,
          operation.planId,
          operation.businessDate,
          JSON.stringify(details),
          new Date().toISOString(),
        );
    });
  }

  async nextWakeAt(accountId: string): Promise<Date | null> {
    return this.store.read(accountId, async (database) => {
      const row = await database.getFirstAsync<{ wake_at: string | null }>(
        "SELECT min(next_attempt_at) AS wake_at FROM local_outbox WHERE status IN ('retry','sending') AND next_attempt_at IS NOT NULL",
      );
      return row?.wake_at ? new Date(row.wake_at) : null;
    });
  }

  async retryFailedOperation(
    accountId: string,
    operationId: string,
  ): Promise<void> {
    await this.store.transaction(accountId, async (database) => {
      const row = await database.getFirstAsync<{
        plan_id: string;
        business_date: string;
      }>(
        "SELECT plan_id,business_date FROM local_outbox WHERE operation_id=? AND status='failed'",
        operationId,
      );
      if (!row) throw new Error("该操作不可直接重试");
      await database.runAsync(
        "UPDATE local_outbox SET status='pending',next_attempt_at=NULL WHERE operation_id=?",
        operationId,
      );
      await database.runAsync(
        "UPDATE local_checkins SET sync_state='local' WHERE plan_id=? AND business_date=? AND operation_id=?",
        row.plan_id,
        row.business_date,
        operationId,
      );
    });
  }

  async discardFailedRecord(
    accountId: string,
    planId: string,
    businessDate: string,
  ): Promise<void> {
    await this.store.transaction(accountId, async (database) => {
      const failed = await database.getFirstAsync<{ operation_id: string }>(
        `SELECT operation_id FROM local_outbox
         WHERE plan_id=? AND business_date=? AND status='failed' LIMIT 1`,
        planId,
        businessDate,
      );
      if (!failed) throw new Error("该记录没有可放弃的失败操作");
      await database.runAsync(
        "DELETE FROM local_outbox WHERE plan_id=? AND business_date=?",
        planId,
        businessDate,
      );
      await database.runAsync(
        "DELETE FROM local_checkins WHERE plan_id=? AND business_date=? AND sync_state<>'synced'",
        planId,
        businessDate,
      );
      await database.runAsync(
        "DELETE FROM local_sync_cursor WHERE scope LIKE 'calendar:%' OR scope='today:snapshot' OR scope=?",
        `detail:${planId}`,
      );
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

  async conflict(
    accountId: string,
    planId: string,
    businessDate: string,
  ): Promise<LocalCheckinConflict | null> {
    return this.store.read(accountId, async (database) => {
      const row = await database.getFirstAsync<{
        operation_id: string;
        details_json: string;
        payload: string;
      }>(
        `SELECT c.operation_id,c.details_json,r.payload FROM local_checkin_conflicts c
         JOIN local_checkins r ON r.plan_id=c.plan_id AND r.business_date=c.business_date
         WHERE c.plan_id=? AND c.business_date=? ORDER BY c.created_at DESC LIMIT 1`,
        planId,
        businessDate,
      );
      return row
        ? {
            operationId: row.operation_id,
            planId,
            businessDate,
            localRecord: JSON.parse(row.payload) as CheckinDto,
            details: JSON.parse(row.details_json) as CheckinConflictDetails,
          }
        : null;
    });
  }

  async pendingOperations(accountId: string): Promise<
    {
      operationId: string;
      planId: string;
      businessDate: string;
      status: "pending" | "sending" | "retry" | "conflict" | "failed";
      errorCode: string | null;
    }[]
  > {
    return this.store.read(accountId, async (database) => {
      const rows = await database.getAllAsync<{
        operation_id: string;
        plan_id: string;
        business_date: string;
        status: "pending" | "sending" | "retry" | "conflict" | "failed";
        last_error_code: string | null;
      }>(
        `SELECT operation_id,plan_id,business_date,status,last_error_code
         FROM local_outbox ORDER BY rowid`,
      );
      const firstByRecord = new Map<string, (typeof rows)[number]>();
      for (const row of rows) {
        const key = `${row.plan_id}:${row.business_date}`;
        if (!firstByRecord.has(key)) firstByRecord.set(key, row);
      }
      return [...firstByRecord.values()].map((row) => ({
        operationId: row.operation_id,
        planId: row.plan_id,
        businessDate: row.business_date,
        status: row.status,
        errorCode: row.last_error_code,
      }));
    });
  }

  async updateConflictDetails(
    accountId: string,
    operationId: string,
    details: CheckinConflictDetails,
  ): Promise<void> {
    await this.store.transaction(accountId, async (database) => {
      await database.runAsync(
        `UPDATE local_checkin_conflicts SET details_json=?,created_at=?
         WHERE operation_id=?`,
        JSON.stringify(details),
        new Date().toISOString(),
        operationId,
      );
    });
  }

  async resolveConflict(
    accountId: string,
    planId: string,
    businessDate: string,
    choice: "server" | "local",
    currentServer: CheckinDto,
    newOperationId: string,
  ): Promise<void> {
    await this.store.transaction(accountId, async (database) => {
      const conflict = await database.getFirstAsync<{
        details_json: string;
        operation_id: string;
      }>(
        `SELECT details_json,operation_id FROM local_checkin_conflicts
         WHERE plan_id=? AND business_date=? ORDER BY created_at DESC LIMIT 1`,
        planId,
        businessDate,
      );
      const draft = await database.getFirstAsync<{ payload: string }>(
        "SELECT payload FROM local_checkins WHERE plan_id=? AND business_date=?",
        planId,
        businessDate,
      );
      if (!conflict || !draft) throw new Error("冲突内容已变化，请重新打开");
      const details = JSON.parse(
        conflict.details_json,
      ) as CheckinConflictDetails;
      if (currentServer.revision !== details.currentRevision)
        throw new Error("云端记录已再次修改，请重新比较两个版本");
      const local = JSON.parse(draft.payload) as CheckinDto;
      if (choice === "local")
        await database.runAsync(
          "UPDATE local_media SET operation_id=? WHERE operation_id=? AND status<>'uploaded'",
          newOperationId,
          conflict.operation_id,
        );
      await database.runAsync(
        "DELETE FROM local_outbox WHERE plan_id=? AND business_date=?",
        planId,
        businessDate,
      );
      if (choice === "server") {
        await database.runAsync(
          `UPDATE local_checkins SET revision=?,sync_state='synced',payload=?,operation_id=NULL,updated_at=?
           WHERE plan_id=? AND business_date=?`,
          currentServer.revision,
          JSON.stringify(currentServer),
          currentServer.updatedAt,
          planId,
          businessDate,
        );
      } else {
        const now = new Date().toISOString();
        const input: PutCheckinRequest = {
          result: local.result,
          note: local.note,
          failureReason: local.failureReason,
          numeric: local.numeric,
          mediaIds: local.mediaIds,
          baseRevision: currentServer.revision,
          clientCreatedAt: now,
          clientOperationId: newOperationId,
          ruleVersion: local.ruleVersion,
          resolutionOfConflictId: details.conflictId,
        };
        await database.runAsync(
          `INSERT INTO local_outbox(operation_id,plan_id,business_date,kind,status,payload,created_at)
           VALUES(?,?,?,'resolve_conflict','pending',?,?)`,
          newOperationId,
          planId,
          businessDate,
          JSON.stringify(input),
          now,
        );
        await database.runAsync(
          `UPDATE local_checkins SET revision=?,sync_state='local',payload=?,operation_id=?,updated_at=?
           WHERE plan_id=? AND business_date=?`,
          currentServer.revision,
          JSON.stringify({
            ...local,
            id: currentServer.id,
            revision: currentServer.revision,
            updatedAt: now,
          }),
          newOperationId,
          now,
          planId,
          businessDate,
        );
      }
      await database.runAsync(
        "DELETE FROM local_sync_cursor WHERE scope LIKE 'calendar:%' OR scope='today:snapshot' OR scope=?",
        `detail:${planId}`,
      );
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

  async removeStagedMedia(accountId: string, id: string): Promise<void> {
    await this.store.transaction(accountId, async (database) => {
      await database.runAsync(
        "DELETE FROM local_media WHERE id=? AND status='staged' AND checkin_id IS NULL AND one_time_plan_id IS NULL",
        id,
      );
    });
  }

  async linkOneTimeMedia(
    accountId: string,
    operationId: string,
    planId: string,
  ): Promise<void> {
    await this.store.transaction(accountId, async (database) => {
      await database.runAsync(
        "UPDATE local_media SET one_time_plan_id=? WHERE operation_id=?",
        planId,
        operationId,
      );
    });
  }

  async claimMediaUpload(
    accountId: string,
    now = new Date(),
  ): Promise<LocalMediaUpload | null> {
    return this.store.transaction(accountId, async (database) => {
      const stamp = now.toISOString();
      await database.runAsync(
        `UPDATE local_media SET status='failed',next_attempt_at=?,
           last_error_code='INTERRUPTED'
         WHERE status='uploading' AND next_attempt_at<=?`,
        stamp,
        stamp,
      );
      const row = await database.getFirstAsync<{
        id: string;
        operation_id: string | null;
        file_uri: string;
        mime_type: string;
        byte_size: number;
        sha256: string;
        status: LocalMediaMetadata["status"];
        remote_id: string | null;
        created_at: string;
        checkin_id: string | null;
        one_time_plan_id: string | null;
        retry_count: number;
      }>(
        `SELECT * FROM local_media
         WHERE (checkin_id IS NOT NULL OR one_time_plan_id IS NOT NULL)
           AND (status='staged' OR
             (status='failed' AND next_attempt_at<=?))
         ORDER BY created_at,id LIMIT 1`,
        stamp,
      );
      if (!row) return null;
      await database.runAsync(
        "UPDATE local_media SET status='uploading',next_attempt_at=?,last_error_code=NULL WHERE id=?",
        new Date(now.getTime() + 120_000).toISOString(),
        row.id,
      );
      return {
        id: row.id,
        operationId: row.operation_id,
        fileUri: row.file_uri,
        mimeType: row.mime_type,
        byteSize: row.byte_size,
        sha256: row.sha256,
        status: "uploading",
        remoteId: row.remote_id,
        createdAt: row.created_at,
        checkinId: row.checkin_id,
        oneTimePlanId: row.one_time_plan_id,
        retryCount: row.retry_count,
      };
    });
  }

  async uploadedMedia(
    accountId: string,
    localId: string,
    remoteId: string,
  ): Promise<void> {
    await this.store.transaction(accountId, async (database) => {
      await database.runAsync(
        `UPDATE local_media SET status='uploaded',remote_id=?,next_attempt_at=NULL,
           last_error_code=NULL WHERE id=?`,
        remoteId,
        localId,
      );
    });
  }

  async failedMedia(
    accountId: string,
    localId: string,
    code: string,
    retryAt: Date | null,
  ): Promise<void> {
    await this.store.transaction(accountId, async (database) => {
      await database.runAsync(
        `UPDATE local_media SET status='failed',retry_count=retry_count+1,
           next_attempt_at=?,last_error_code=? WHERE id=?`,
        retryAt?.toISOString() ?? null,
        code,
        localId,
      );
    });
  }

  async retryMedia(accountId: string, localId: string): Promise<void> {
    await this.store.transaction(accountId, async (database) => {
      await database.runAsync(
        `UPDATE local_media SET status='staged',next_attempt_at=NULL,last_error_code=NULL
         WHERE id=? AND status='failed'`,
        localId,
      );
    });
  }

  async pendingMedia(accountId: string): Promise<
    {
      id: string;
      status: LocalMediaMetadata["status"];
      errorCode: string | null;
    }[]
  > {
    return this.store.read(accountId, async (database) => {
      const rows = await database.getAllAsync<{
        id: string;
        status: LocalMediaMetadata["status"];
        last_error_code: string | null;
      }>(
        "SELECT id,status,last_error_code FROM local_media WHERE status<>'uploaded' ORDER BY created_at",
      );
      return rows.map((row) => ({
        id: row.id,
        status: row.status,
        errorCode: row.last_error_code,
      }));
    });
  }

  async nextMediaWakeAt(accountId: string): Promise<Date | null> {
    return this.store.read(accountId, async (database) => {
      const row = await database.getFirstAsync<{ next_at: string | null }>(
        "SELECT min(next_attempt_at) AS next_at FROM local_media WHERE status IN ('failed','uploading') AND next_attempt_at IS NOT NULL",
      );
      return row?.next_at ? new Date(row.next_at) : null;
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

  /** Apply a complete page before advancing its opaque cursor; replay is safe after a crash. */
  async applyRemoteSyncPage(
    accountId: string,
    page: SyncChangesDto,
    plans: PlanDto[] | null,
    records: CheckinDto[],
  ): Promise<void> {
    await this.store.transaction(accountId, async (database) => {
      if (plans) {
        for (const plan of plans) {
          await database.runAsync(
            `INSERT INTO local_plans(id,revision,lifecycle,payload,updated_at) VALUES(?,?,?,?,?)
             ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,lifecycle=excluded.lifecycle,
               payload=excluded.payload,updated_at=excluded.updated_at
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
        if (plans.length) {
          await database.runAsync(
            `UPDATE local_plans SET lifecycle='deleted' WHERE id NOT IN (${plans.map(() => "?").join(",")})`,
            ...plans.map((plan) => plan.id),
          );
        } else
          await database.runAsync("UPDATE local_plans SET lifecycle='deleted'");
        await database.runAsync(
          `INSERT INTO local_sync_cursor(scope,cursor,updated_at) VALUES('plans:list-fetched',?,?)
           ON CONFLICT(scope) DO UPDATE SET cursor=excluded.cursor,updated_at=excluded.updated_at`,
          new Date().toISOString(),
          new Date().toISOString(),
        );
      }
      for (const record of records) {
        await database.runAsync(
          `INSERT INTO local_checkins(plan_id,business_date,revision,sync_state,payload,operation_id,updated_at)
           VALUES(?,?,?,'synced',?,NULL,?)
           ON CONFLICT(plan_id,business_date) DO UPDATE SET
             revision=excluded.revision,sync_state='synced',payload=excluded.payload,
             operation_id=NULL,updated_at=excluded.updated_at
           WHERE local_checkins.sync_state='synced' AND excluded.revision >= local_checkins.revision`,
          record.planId,
          record.businessDate,
          record.revision,
          JSON.stringify(record),
          record.updatedAt,
        );
      }
      for (const change of page.changes) {
        if (change.entityType === "plan" && change.operation === "delete")
          await database.runAsync(
            "UPDATE local_plans SET lifecycle='deleted' WHERE id=?",
            change.entityId,
          );
        if (change.entityType === "share" && change.operation === "revoke")
          await database.runAsync(
            `INSERT INTO local_permission_tombstones(plan_id,sequence,updated_at) VALUES(?,?,?)
             ON CONFLICT(plan_id) DO UPDATE SET sequence=excluded.sequence,updated_at=excluded.updated_at
             WHERE excluded.sequence > local_permission_tombstones.sequence`,
            change.entityId,
            change.seq,
            new Date().toISOString(),
          );
        if (change.entityType === "share" && change.operation === "upsert")
          await database.runAsync(
            "DELETE FROM local_permission_tombstones WHERE plan_id=? AND sequence<?",
            change.entityId,
            change.seq,
          );
      }
      if (
        plans ||
        records.length ||
        page.changes.some((change) => change.operation !== "upsert")
      )
        await database.runAsync(
          "DELETE FROM local_sync_cursor WHERE scope LIKE 'calendar:%' OR scope='today:snapshot' OR scope LIKE 'detail:%'",
        );
      await database.runAsync(
        `INSERT INTO local_sync_cursor(scope,cursor,updated_at) VALUES('self',?,?)
         ON CONFLICT(scope) DO UPDATE SET cursor=excluded.cursor,updated_at=excluded.updated_at`,
        page.nextCursor,
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

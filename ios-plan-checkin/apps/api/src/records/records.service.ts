import { HttpException, Injectable } from "@nestjs/common";
import type {
  CheckinDto,
  OneTimeResolutionDto,
  OneTimeResolutionRequest,
  PutCheckinRequest,
} from "@plan-checkin/contracts";
import {
  businessDateAt,
  canRecordOnDate,
  parseBusinessDate,
  ruleForDate,
  validatePlanTimeline,
  type BusinessDate,
  type IsoWeekday,
  type LifecycleEvent,
  type PlanTimeline,
  type RuleVersion,
} from "@plan-checkin/domain";
import type { PoolClient } from "pg";
import { ApiConfig } from "../config.js";
import { Database } from "../database.js";
import { fail } from "../http.js";
import {
  cleanText,
  guardFields,
  PlanWrite,
  requireUuid,
} from "../plans/write.js";

interface PlanRow {
  id: string;
  kind: "fixed" | "weekly" | "one_time";
  direction: "do" | "avoid";
  timezone: string;
  start_date: string;
  end_date: string | null;
  due_date: string | null;
  status: "active" | "paused" | "archived" | "deleted";
}
interface CheckinRow {
  id: string;
  plan_id: string;
  business_date: string;
  result: "success" | "failure" | "skip";
  note: string | null;
  failure_reason: string | null;
  numeric_value: string | null;
  numeric_unit: string | null;
  is_backfilled: boolean;
  is_revised: boolean;
  revision: number;
  rule_version: number;
  created_at: Date | string;
  updated_at: Date | string;
}
interface ResolutionRow {
  plan_id: string;
  resolution: "completed" | "failed" | "cancelled";
  resolved_business_date: string;
  resolved_at: Date | string;
  note: string | null;
  revision: number;
  created_at: Date | string;
}
type Conflict = {
  conflict: true;
  details: {
    conflictId: string;
    currentRevision: number;
    serverRecord: CheckinDto;
    submittedSummary: {
      result: PutCheckinRequest["result"];
      clientCreatedAt: string;
    };
  };
};
const instant = (value: Date | string) => new Date(value).toISOString();
const checkinColumns = `c.id, c.plan_id, c.business_date::text, c.result, c.note, c.failure_reason,
  c.numeric_value::text, c.numeric_unit, c.is_backfilled, c.is_revised,
  c.revision, r.version AS rule_version, c.created_at, c.updated_at`;

async function sequence(
  client: PoolClient,
  userId: string,
  entityType: "checkin" | "plan",
  entityId: string,
  payload: object,
): Promise<number> {
  await client.query(
    "INSERT INTO user_sync_counters (user_id) VALUES ($1) ON CONFLICT DO NOTHING",
    [userId],
  );
  const next = await client.query<{ seq: string | number }>(
    "UPDATE user_sync_counters SET next_seq = next_seq + 1 WHERE user_id = $1 RETURNING next_seq - 1 AS seq",
    [userId],
  );
  const seq = Number(next.rows[0]!.seq);
  await client.query(
    `INSERT INTO change_log (user_id, seq, entity_type, entity_id, operation, payload_min)
     VALUES ($1,$2,$3,$4,'upsert',$5)`,
    [userId, seq, entityType, entityId, payload],
  );
  return seq;
}

function numeric(
  value: PutCheckinRequest["numeric"],
): { value: string; unit: string } | null {
  if (value == null) return null;
  guardFields(value as unknown, ["value", "unit"]);
  if (
    typeof value.value !== "string" ||
    !/^-?(?:0|[1-9]\d{0,11})(?:\.\d{1,6})?$/.test(value.value)
  )
    fail("VALIDATION_ERROR", 400, "数值需为最多 12 位整数、6 位小数");
  return { value: value.value, unit: cleanText(value.unit, 30)! };
}

@Injectable()
export class RecordsService {
  private readonly write: PlanWrite;
  constructor(
    private readonly database: Database,
    config: ApiConfig,
  ) {
    this.write = new PlanWrite(database, config);
  }

  private async plan(
    client: PoolClient,
    userId: string,
    planId: string,
    lock: boolean,
  ): Promise<{
    row: PlanRow;
    timeline: PlanTimeline;
    ruleIds: Map<number, string>;
  }> {
    const found = await client.query<PlanRow>(
      `SELECT id, kind, direction, timezone, start_date::text, end_date::text, due_date::text, status
       FROM plans WHERE id = $1 AND owner_id = $2 AND status <> 'deleted' ${lock ? "FOR UPDATE" : ""}`,
      [planId, userId],
    );
    const row = found.rows[0];
    if (!row) fail("NOT_FOUND", 404, "计划不存在");
    const rules = await client.query<{
      id: string;
      version: number;
      effective_date: string;
      weekdays: number[] | null;
      weekly_target: number | null;
    }>(
      "SELECT id, version, effective_date::text, weekdays, weekly_target FROM plan_rule_versions WHERE plan_id = $1 ORDER BY version",
      [planId],
    );
    const mapped: RuleVersion[] = rules.rows.map((rule) =>
      row.kind === "fixed"
        ? {
            kind: "fixed",
            direction: row.direction,
            version: rule.version,
            effectiveDate: rule.effective_date as BusinessDate,
            weekdays: rule.weekdays as IsoWeekday[],
          }
        : row.kind === "weekly"
          ? {
              kind: "weekly",
              direction: row.direction,
              version: rule.version,
              effectiveDate: rule.effective_date as BusinessDate,
              weeklyTarget: rule.weekly_target!,
            }
          : {
              kind: "one_time",
              direction: "do",
              version: rule.version,
              effectiveDate: rule.effective_date as BusinessDate,
            },
    );
    const events = await client.query<{
      seq: number;
      action: LifecycleEvent["action"];
      business_date: string;
      effective_at: Date | string;
    }>(
      "SELECT seq, action, business_date::text, effective_at FROM plan_lifecycle_events WHERE plan_id = $1 ORDER BY seq",
      [planId],
    );
    const timeline: PlanTimeline = {
      timezone: row.timezone,
      startDate: row.start_date as BusinessDate,
      endDate: row.end_date as BusinessDate | null,
      dueDate: row.due_date as BusinessDate | null,
      rules: mapped,
      lifecycleEvents: events.rows.map((event) => ({
        sequence: event.seq,
        action: event.action,
        businessDate: event.business_date as BusinessDate,
        occurredAt: instant(event.effective_at),
      })),
    };
    validatePlanTimeline(timeline);
    return {
      row,
      timeline,
      ruleIds: new Map(rules.rows.map((rule) => [rule.version, rule.id])),
    };
  }

  private async current(
    client: PoolClient,
    planId: string,
    date: BusinessDate,
    lock = false,
  ): Promise<CheckinRow | null> {
    const found = await client.query<CheckinRow>(
      `SELECT ${checkinColumns} FROM checkins c JOIN plan_rule_versions r ON r.id = c.rule_version_id
       WHERE c.plan_id = $1 AND c.business_date = $2 ${lock ? "FOR UPDATE OF c" : ""}`,
      [planId, date],
    );
    return found.rows[0] ?? null;
  }

  private async dto(
    client: PoolClient,
    row: CheckinRow,
    ownerId: string,
    syncSequence: number,
    mediaAttachFailed = false,
  ): Promise<CheckinDto> {
    const media = await client.query<{ id: string }>(
      "SELECT id FROM media WHERE checkin_id = $1 AND owner_id = $2 AND status <> 'deleted' ORDER BY created_at, id",
      [row.id, ownerId],
    );
    return {
      id: row.id,
      planId: row.plan_id,
      businessDate: row.business_date,
      result: row.result,
      note: row.note,
      failureReason: row.failure_reason,
      numeric:
        row.numeric_value === null
          ? null
          : { value: row.numeric_value, unit: row.numeric_unit! },
      mediaIds: media.rows.map((item) => item.id),
      isBackfilled: row.is_backfilled,
      isRevised: row.is_revised,
      revision: row.revision,
      ruleVersion: row.rule_version,
      createdAt: instant(row.created_at),
      updatedAt: instant(row.updated_at),
      syncSequence,
      ...(mediaAttachFailed ? { mediaAttachFailed: true } : {}),
    };
  }

  async get(
    userId: string,
    planId: string,
    rawDate: string,
  ): Promise<CheckinDto> {
    requireUuid(planId);
    const date = this.date(rawDate);
    return this.database.transaction(async (client) => {
      await this.plan(client, userId, planId, false);
      const row = await this.current(client, planId, date);
      if (!row) fail("NOT_FOUND", 404, "当天没有打卡记录");
      const changed = await client.query<{ seq: string | number }>(
        `SELECT seq FROM change_log WHERE user_id = $1 AND entity_type = 'checkin'
         AND entity_id = $2 ORDER BY seq DESC LIMIT 1`,
        [userId, row.id],
      );
      return this.dto(client, row, userId, Number(changed.rows[0]?.seq ?? 0));
    });
  }

  private date(value: string): BusinessDate {
    try {
      return parseBusinessDate(value);
    } catch {
      fail("PLAN_DATE_INVALID", 400, "业务日期不正确");
    }
  }

  async put(
    userId: string,
    planId: string,
    rawDate: string,
    input: PutCheckinRequest,
    key: string,
  ): Promise<CheckinDto> {
    requireUuid(planId);
    const date = this.date(rawDate);
    guardFields(input as unknown, [
      "result",
      "note",
      "failureReason",
      "numeric",
      "mediaIds",
      "baseRevision",
      "clientCreatedAt",
      "clientOperationId",
      "ruleVersion",
      "resolutionOfConflictId",
    ]);
    if (
      !["success", "failure", "skip"].includes(input?.result) ||
      !Number.isInteger(input.baseRevision) ||
      input.baseRevision < 0 ||
      !Number.isInteger(input.ruleVersion) ||
      input.ruleVersion < 1
    )
      fail("VALIDATION_ERROR", 400, "打卡结果或版本不正确");
    requireUuid(input.clientOperationId);
    if (input.resolutionOfConflictId) requireUuid(input.resolutionOfConflictId);
    const clientTime = new Date(input.clientCreatedAt);
    if (
      Number.isNaN(clientTime.getTime()) ||
      clientTime.getTime() > Date.now() + 300000
    )
      fail("VALIDATION_ERROR", 400, "客户端提交时间不正确");
    const note =
      input.note === undefined ? null : cleanText(input.note, 2000, false);
    const failureReason =
      input.failureReason === undefined
        ? null
        : cleanText(input.failureReason, 1000, false);
    if (input.result !== "failure" && failureReason)
      fail("VALIDATION_ERROR", 400, "仅失败记录可填写失败原因");
    const number = numeric(input.numeric);
    const mediaIds = input.mediaIds ?? [];
    if (
      !Array.isArray(mediaIds) ||
      mediaIds.length > 9 ||
      mediaIds.some((id) => typeof id !== "string" || !requireUuid(id)) ||
      new Set(mediaIds).size !== mediaIds.length
    )
      fail("VALIDATION_ERROR", 400, "照片标识不正确");
    const result = await this.write.run<CheckinDto | Conflict>(
      userId,
      key,
      "checkin.put",
      { planId, date, input },
      async (client) => {
        const plan = await this.plan(client, userId, planId, true);
        if (plan.row.kind === "one_time")
          fail("VALIDATION_ERROR", 400, "一次性任务需使用终态接口");
        const today = businessDateAt(new Date(), plan.row.timezone);
        if (date > today) fail("PLAN_DATE_INVALID", 400, "不能记录未来日期");
        const activeRule = ruleForDate(plan.timeline, date);
        if (!activeRule || activeRule.version !== input.ruleVersion)
          fail("RULE_CHANGED", 409, "计划规则已变化，请刷新后重试");
        const existing = await this.current(client, planId, date, true);
        if (
          !existing &&
          !canRecordOnDate(plan.timeline, date, new Date().toISOString())
        )
          fail("PLAN_NOT_ACTIVE", 409, "此日期不在可记录范围");
        if (existing && existing.rule_version !== activeRule.version)
          fail("RULE_CHANGED", 409, "原记录规则版本不一致");
        if ((existing?.revision ?? 0) !== input.baseRevision) {
          if (!existing) fail("CHECKIN_CONFLICT", 409, "记录已不存在");
          const serverRecord = await this.dto(client, existing, userId, 0);
          const summary = {
            result: input.result,
            clientCreatedAt: input.clientCreatedAt,
          };
          const conflict = await client.query<{ id: string }>(
            `INSERT INTO checkin_conflicts (owner_id, plan_id, business_date, current_revision, submitted_summary, client_operation_id)
             VALUES ($1,$2,$3,$4,$5,$6)
             ON CONFLICT (owner_id, client_operation_id) DO NOTHING RETURNING id`,
            [
              userId,
              planId,
              date,
              existing.revision,
              summary,
              input.clientOperationId,
            ],
          );
          let conflictId = conflict.rows[0]?.id;
          if (!conflictId) {
            const prior = await client.query<{
              id: string;
              plan_id: string;
              business_date: string;
            }>(
              `SELECT id, plan_id, business_date::text FROM checkin_conflicts
               WHERE owner_id = $1 AND client_operation_id = $2`,
              [userId, input.clientOperationId],
            );
            if (
              !prior.rows[0] ||
              prior.rows[0].plan_id !== planId ||
              prior.rows[0].business_date !== date
            )
              fail(
                "IDEMPOTENCY_KEY_REUSED",
                409,
                "客户端操作标识已用于另一记录",
              );
            conflictId = prior.rows[0].id;
          }
          return {
            conflict: true as const,
            details: {
              conflictId,
              currentRevision: existing.revision,
              serverRecord,
              submittedSummary: summary,
            },
          };
        }
        if (input.resolutionOfConflictId) {
          const conflict = await client.query(
            `SELECT id FROM checkin_conflicts WHERE id = $1 AND owner_id = $2 AND plan_id = $3
             AND business_date = $4 AND current_revision = $5 AND resolved_at IS NULL AND expires_at > now() FOR UPDATE`,
            [
              input.resolutionOfConflictId,
              userId,
              planId,
              date,
              input.baseRevision,
            ],
          );
          if (!conflict.rowCount)
            fail("CHECKIN_CONFLICT", 409, "冲突已过期，请刷新记录");
        }
        const before = existing
          ? await this.dto(client, existing, userId, 0)
          : null;
        let row: CheckinRow;
        if (!existing) {
          const inserted = await client.query<{ id: string }>(
            `INSERT INTO checkins (plan_id, owner_id, business_date, result, note, failure_reason,
              numeric_value, numeric_unit, rule_version_id, is_backfilled)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
            [
              planId,
              userId,
              date,
              input.result,
              note,
              failureReason,
              number?.value ?? null,
              number?.unit ?? null,
              plan.ruleIds.get(activeRule.version),
              date < today,
            ],
          );
          row = (await this.current(client, planId, date))!;
          if (row.id !== inserted.rows[0]!.id)
            throw new Error("Inserted record not visible");
        } else {
          const changed = await client.query(
            `UPDATE checkins SET result = $3, note = $4, failure_reason = $5,
             numeric_value = $6, numeric_unit = $7, is_revised = true,
             revision = revision + 1, updated_at = now()
             WHERE id = $1 AND revision = $2`,
            [
              existing.id,
              input.baseRevision,
              input.result,
              note,
              failureReason,
              number?.value ?? null,
              number?.unit ?? null,
            ],
          );
          if (!changed.rowCount)
            fail("CHECKIN_CONFLICT", 409, "记录已在其他设备修改");
          row = (await this.current(client, planId, date))!;
        }
        const mediaAttachFailed = await this.attachMedia(
          client,
          userId,
          row.id,
          mediaIds,
        );
        const seq = await sequence(client, userId, "checkin", row.id, {
          planId,
          businessDate: date,
          result: row.result,
          revision: row.revision,
        });
        const after = await this.dto(
          client,
          row,
          userId,
          seq,
          mediaAttachFailed,
        );
        await client.query(
          `INSERT INTO checkin_revisions (checkin_id, revision, before_snapshot, after_snapshot, actor_id, reason, resolution_of_conflict_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            row.id,
            row.revision,
            before,
            after,
            userId,
            input.resolutionOfConflictId
              ? "conflict_resolution"
              : existing
                ? "edit"
                : "create",
            input.resolutionOfConflictId ?? null,
          ],
        );
        if (input.resolutionOfConflictId)
          await client.query(
            "UPDATE checkin_conflicts SET resolved_at = now() WHERE id = $1",
            [input.resolutionOfConflictId],
          );
        return after;
      },
    );
    if ("conflict" in result)
      throw new HttpException(
        {
          code: "CHECKIN_CONFLICT",
          message: "记录已在其他设备修改，请选择保留版本",
          details: result.details,
        },
        409,
      );
    return result;
  }

  private async attachMedia(
    client: PoolClient,
    userId: string,
    checkinId: string,
    mediaIds: string[],
  ): Promise<boolean> {
    if (!mediaIds.length) return false;
    await client.query("SAVEPOINT media_attach");
    try {
      const updated = await client.query(
        `UPDATE media SET checkin_id = $1 WHERE id = ANY($2::uuid[]) AND owner_id = $3
         AND (checkin_id IS NULL OR checkin_id = $1) AND one_time_plan_id IS NULL AND status <> 'deleted'`,
        [checkinId, mediaIds, userId],
      );
      if (updated.rowCount !== mediaIds.length) {
        await client.query("ROLLBACK TO SAVEPOINT media_attach");
        await client.query("RELEASE SAVEPOINT media_attach");
        return true;
      }
      await client.query("RELEASE SAVEPOINT media_attach");
      return false;
    } catch {
      await client.query("ROLLBACK TO SAVEPOINT media_attach");
      await client.query("RELEASE SAVEPOINT media_attach");
      return true;
    }
  }

  private resolutionDto(
    row: ResolutionRow,
    dueDate: string,
  ): OneTimeResolutionDto {
    const resolvedAt = instant(row.resolved_at);
    return {
      planId: row.plan_id,
      resolution: row.resolution,
      resolvedBusinessDate: row.resolved_business_date,
      resolvedAt,
      note: row.note,
      revision: row.revision,
      isRevised: row.revision > 1,
      timing:
        row.resolution === "completed"
          ? row.resolved_business_date <= dueDate
            ? "on_time"
            : "late"
          : null,
    };
  }

  async resolveOneTime(
    userId: string,
    planId: string,
    input: OneTimeResolutionRequest,
    key: string,
    correction: boolean,
  ): Promise<OneTimeResolutionDto> {
    requireUuid(planId);
    guardFields(input as unknown, [
      "resolution",
      "baseRevision",
      "completedAt",
      "reason",
    ]);
    if (
      !["completed", "failed", "cancelled"].includes(input?.resolution) ||
      !Number.isInteger(input.baseRevision) ||
      input.baseRevision < 0
    )
      fail("VALIDATION_ERROR", 400, "终态或修订号不正确");
    if (input.completedAt && input.resolution !== "completed")
      fail("VALIDATION_ERROR", 400, "只有完成结果可指定完成时间");
    const note =
      input.reason === undefined ? null : cleanText(input.reason, 1000, false);
    return this.write.run(
      userId,
      key,
      correction ? "one_time.correct" : "one_time.resolve",
      { planId, input },
      async (client) => {
        const plan = await this.plan(client, userId, planId, true);
        if (plan.row.kind !== "one_time")
          fail("VALIDATION_ERROR", 400, "此计划不是一次性任务");
        const existing = await client.query<ResolutionRow>(
          `SELECT plan_id, resolution, resolved_business_date::text, resolved_at, note, revision, created_at
           FROM one_time_resolutions WHERE plan_id = $1 FOR UPDATE`,
          [planId],
        );
        const current = existing.rows[0];
        if (
          correction === !current ||
          (current?.revision ?? 0) !== input.baseRevision
        )
          fail("RULE_CHANGED", 409, "终态记录已变化，请刷新后重试");
        if (!current && plan.row.status !== "active")
          fail("PLAN_NOT_ACTIVE", 409, "计划当前不可提交终态");
        const now = new Date();
        const completedAt = input.completedAt
          ? new Date(input.completedAt)
          : now;
        if (
          Number.isNaN(completedAt.getTime()) ||
          completedAt > now ||
          businessDateAt(completedAt, plan.row.timezone) < plan.row.start_date
        )
          fail("PLAN_DATE_INVALID", 400, "实际完成时间不正确");
        const resolvedAt = input.resolution === "completed" ? completedAt : now;
        const date = businessDateAt(resolvedAt, plan.row.timezone);
        if (!current) {
          await client.query(
            `INSERT INTO one_time_resolutions (plan_id, resolution, resolved_business_date, resolved_at, note)
             VALUES ($1,$2,$3,$4,$5)`,
            [planId, input.resolution, date, resolvedAt, note],
          );
        } else {
          await client.query(
            `UPDATE one_time_resolutions SET resolution = $2, resolved_business_date = $3,
             resolved_at = $4, note = $5, revision = revision + 1, updated_at = now()
             WHERE plan_id = $1 AND revision = $6`,
            [
              planId,
              input.resolution,
              date,
              resolvedAt,
              note,
              input.baseRevision,
            ],
          );
        }
        const updated = await client.query<ResolutionRow>(
          `SELECT plan_id, resolution, resolved_business_date::text, resolved_at, note, revision, created_at
           FROM one_time_resolutions WHERE plan_id = $1`,
          [planId],
        );
        const after = this.resolutionDto(updated.rows[0]!, plan.row.due_date!);
        await client.query(
          `INSERT INTO one_time_resolution_revisions (plan_id, revision, before_snapshot, after_snapshot, reason)
           VALUES ($1,$2,$3,$4,$5)`,
          [
            planId,
            after.revision,
            current ? this.resolutionDto(current, plan.row.due_date!) : null,
            after,
            correction ? "correction" : "create",
          ],
        );
        await sequence(client, userId, "plan", planId, {
          oneTimeResolution: after.resolution,
          revision: after.revision,
        });
        return after;
      },
    );
  }
}

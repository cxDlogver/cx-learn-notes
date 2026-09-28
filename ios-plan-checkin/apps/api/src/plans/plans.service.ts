import { Injectable } from "@nestjs/common";
import type {
  CreatePlanRequest,
  NumericConfigRequest,
  NumericItemInput,
  PlanDto,
  UpdatePlanRequest,
  Weekday,
} from "@plan-checkin/contracts";
import {
  assertTimezone,
  businessDateAt,
  nextRuleEffectiveDate,
  parseBusinessDate,
  validateOneTimeDueDate,
  validatePlanTimeline,
  type BusinessDate,
  type RuleVersion,
} from "@plan-checkin/domain";
import type { PoolClient } from "pg";
import { ApiConfig } from "../config.js";
import { Database } from "../database.js";
import { fail } from "../http.js";
import { appendUserChange } from "../sync/change-log.js";
import {
  cleanText,
  guardFields,
  PlanWrite,
  requireUuid,
  revision,
} from "./write.js";

export interface PlanRow {
  id: string;
  owner_id: string;
  group_id: string | null;
  kind: "fixed" | "weekly" | "one_time";
  direction: "do" | "avoid";
  title: string;
  description: string | null;
  timezone: string;
  start_date: string;
  end_date: string | null;
  due_date: string | null;
  status: "active" | "paused" | "archived" | "deleted";
  revision: number;
  current_rule_version: number;
  created_at: Date | string;
  updated_at: Date | string;
  weekdays: number[] | null;
  weekly_target: number | null;
  effective_date: string;
  numeric_version: number | null;
  numeric_label: string | null;
  numeric_unit: string | null;
  numeric_effective_from: string | null;
}
export const planColumns = `p.id, p.owner_id, p.group_id, p.kind, p.direction, p.title, p.description,
  p.timezone, p.start_date::text, p.end_date::text, p.due_date::text, p.status,
  p.revision, p.current_rule_version, p.created_at, p.updated_at,
  r.weekdays, r.weekly_target, r.effective_date::text,
  n.version AS numeric_version, n.label AS numeric_label, n.unit AS numeric_unit,
  n.effective_from::text AS numeric_effective_from`;
export const fromPlan = `FROM plans p JOIN plan_rule_versions r
  ON r.plan_id = p.id AND r.version = p.current_rule_version
  LEFT JOIN LATERAL (
    SELECT version, label, unit, effective_from
    FROM plan_numeric_config_versions WHERE plan_id = p.id
    ORDER BY version DESC LIMIT 1
  ) n ON true`;
const instant = (value: Date | string): string => new Date(value).toISOString();
export function toDto(row: PlanRow): PlanDto {
  return {
    id: row.id,
    ownerId: row.owner_id,
    groupId: row.group_id,
    kind: row.kind,
    direction: row.direction,
    title: row.title,
    description: row.description,
    timezone: row.timezone,
    startDate: row.start_date,
    endDate: row.end_date,
    dueDate: row.due_date,
    lifecycle: row.status,
    ruleVersion: row.current_rule_version,
    ruleEffectiveDate: row.effective_date,
    rule:
      row.kind === "fixed"
        ? { weekdays: row.weekdays as Weekday[] }
        : row.kind === "weekly"
          ? { weeklyTarget: row.weekly_target! }
          : null,
    numericItem:
      row.numeric_version === null
        ? null
        : {
            label: row.numeric_label!,
            unit: row.numeric_unit!,
            version: row.numeric_version,
            effectiveFrom: row.numeric_effective_from!,
          },
    revision: row.revision,
    createdAt: instant(row.created_at),
    updatedAt: instant(row.updated_at),
  };
}
function validDate(value: unknown): BusinessDate {
  if (typeof value !== "string")
    fail("PLAN_DATE_INVALID", 400, "日期格式不正确");
  try {
    return parseBusinessDate(value);
  } catch {
    fail("PLAN_DATE_INVALID", 400, "日期不存在或格式不正确");
  }
}
function timezone(value: unknown): string {
  if (typeof value !== "string")
    fail("VALIDATION_ERROR", 400, "计划时区不正确");
  try {
    return assertTimezone(value);
  } catch {
    fail("VALIDATION_ERROR", 400, "计划时区不正确");
  }
}
function ruleOf(
  kind: PlanRow["kind"],
  direction: PlanRow["direction"],
  value: unknown,
  version: number,
  effectiveDate: BusinessDate,
): RuleVersion {
  if (kind === "one_time") {
    if (value !== undefined)
      fail("VALIDATION_ERROR", 400, "一次性任务不能设置循环规则");
    return { kind, direction: "do", version, effectiveDate };
  }
  guardFields(value, kind === "fixed" ? ["weekdays"] : ["weeklyTarget"]);
  if (kind === "fixed") {
    const weekdays = value.weekdays;
    if (
      !Array.isArray(weekdays) ||
      !weekdays.length ||
      weekdays.length > 7 ||
      weekdays.some((day) => !Number.isInteger(day) || day < 1 || day > 7) ||
      new Set(weekdays).size !== weekdays.length
    )
      fail("VALIDATION_ERROR", 400, "固定计划需选择不重复的星期一至星期日");
    return {
      kind,
      direction,
      version,
      effectiveDate,
      weekdays: [...weekdays].sort() as Weekday[],
    };
  }
  const weeklyTarget = value.weeklyTarget;
  if (
    !Number.isInteger(weeklyTarget) ||
    Number(weeklyTarget) < 1 ||
    Number(weeklyTarget) > 7
  )
    fail("VALIDATION_ERROR", 400, "每周目标需为 1–7 天");
  return {
    kind,
    direction,
    version,
    effectiveDate,
    weeklyTarget: Number(weeklyTarget),
  };
}
function assertTimeline(input: {
  kind: PlanRow["kind"];
  direction: PlanRow["direction"];
  timezone: string;
  startDate: BusinessDate;
  endDate: BusinessDate | null;
  dueDate: BusinessDate | null;
  rule: unknown;
}): RuleVersion {
  if (input.kind === "one_time" && input.direction !== "do")
    fail("VALIDATION_ERROR", 400, "一次性任务只支持要做方向");
  const rule = ruleOf(
    input.kind,
    input.direction,
    input.rule,
    1,
    input.startDate,
  );
  try {
    validatePlanTimeline({
      timezone: input.timezone,
      startDate: input.startDate,
      endDate: input.endDate,
      dueDate: input.dueDate,
      rules: [rule],
      lifecycleEvents: [],
    });
  } catch {
    fail("PLAN_DATE_INVALID", 400, "计划日期或规则不正确");
  }
  return rule;
}
function ruleFields(rule: RuleVersion): [number[] | null, number | null] {
  return rule.kind === "fixed"
    ? [[...rule.weekdays], null]
    : rule.kind === "weekly"
      ? [null, rule.weeklyTarget]
      : [null, null];
}
function numericItem(value: unknown): NumericItemInput {
  guardFields(value, ["label", "unit"]);
  return {
    label: cleanText(value.label, 40)!,
    unit: cleanText(value.unit, 20)!,
  };
}

@Injectable()
export class PlansService {
  private readonly write: PlanWrite;
  constructor(
    private readonly database: Database,
    config: ApiConfig,
  ) {
    this.write = new PlanWrite(database, config);
  }

  async list(userId: string): Promise<PlanDto[]> {
    const rows = await this.database.query<PlanRow>(
      `SELECT ${planColumns} ${fromPlan} WHERE p.owner_id = $1 AND p.status <> 'deleted'
       ORDER BY p.updated_at DESC, p.id`,
      [userId],
    );
    return rows.rows.map(toDto);
  }

  async get(userId: string, id: string): Promise<PlanDto> {
    requireUuid(id);
    const rows = await this.database.query<PlanRow>(
      `SELECT ${planColumns} ${fromPlan} WHERE p.id = $1 AND p.owner_id = $2 AND p.status <> 'deleted'`,
      [id, userId],
    );
    if (!rows.rows[0]) fail("NOT_FOUND", 404, "计划不存在");
    return toDto(rows.rows[0]);
  }

  private async locked(
    client: PoolClient,
    userId: string,
    id: string,
  ): Promise<PlanRow> {
    const rows = await client.query<PlanRow>(
      `SELECT ${planColumns} ${fromPlan} WHERE p.id = $1 AND p.owner_id = $2 AND p.status <> 'deleted' FOR UPDATE OF p`,
      [id, userId],
    );
    if (!rows.rows[0]) fail("NOT_FOUND", 404, "计划不存在");
    return rows.rows[0];
  }

  private async ownedGroup(
    client: PoolClient,
    userId: string,
    groupId: string | null,
  ): Promise<void> {
    if (groupId === null) return;
    requireUuid(groupId);
    const found = await client.query(
      "SELECT id FROM groups WHERE id = $1 AND owner_id = $2",
      [groupId, userId],
    );
    if (!found.rowCount) fail("FORBIDDEN", 403, "分组不可使用");
  }

  async create(
    userId: string,
    input: CreatePlanRequest,
    key: string,
  ): Promise<PlanDto> {
    guardFields(input as unknown, [
      "kind",
      "direction",
      "title",
      "description",
      "timezone",
      "startDate",
      "endDate",
      "dueDate",
      "groupId",
      "reminder",
      "rule",
      "numericItem",
    ]);
    if (
      !["fixed", "weekly", "one_time"].includes(input.kind) ||
      !["do", "avoid"].includes(input.direction)
    )
      fail("VALIDATION_ERROR", 400, "计划类型或方向不正确");
    if (
      (input.kind === "one_time" && ("rule" in input || "endDate" in input)) ||
      (input.kind !== "one_time" && "dueDate" in input)
    )
      fail("VALIDATION_ERROR", 400, "时间规则与计划类型不匹配");
    const title = cleanText(input.title, 80)!;
    const description =
      input.description === undefined
        ? null
        : cleanText(input.description, 1000, false);
    const zone = timezone(input.timezone);
    const today = businessDateAt(new Date(), zone);
    const startDate =
      input.startDate === undefined && input.kind === "one_time"
        ? today
        : validDate(input.startDate);
    const endDate = input.endDate == null ? null : validDate(input.endDate);
    const dueDate = input.kind === "one_time" ? validDate(input.dueDate) : null;
    if (input.kind === "one_time") {
      try {
        validateOneTimeDueDate(dueDate!, zone, new Date().toISOString());
      } catch {
        fail("PLAN_DATE_INVALID", 400, "截止日期不能早于计划时区的今天");
      }
    }
    const rule = assertTimeline({
      kind: input.kind,
      direction: input.direction,
      timezone: zone,
      startDate,
      endDate,
      dueDate,
      rule: input.kind === "one_time" ? undefined : input.rule,
    });
    const groupId = input.groupId ?? null;
    const reminder = input.reminder;
    if (reminder !== undefined) validateReminder(reminder, input.kind);
    const numeric =
      input.numericItem === undefined ? null : numericItem(input.numericItem);
    return this.write.run(
      userId,
      key,
      "plan.create",
      { ...input, startDate },
      async (client) => {
        await this.ownedGroup(client, userId, groupId);
        const created = await client.query<{ id: string }>(
          `INSERT INTO plans (owner_id, group_id, kind, direction, title, description, timezone, start_date, end_date, due_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
          [
            userId,
            groupId,
            input.kind,
            input.direction,
            title,
            description,
            zone,
            startDate,
            endDate,
            dueDate,
          ],
        );
        const id = created.rows[0]!.id;
        const [weekdays, weeklyTarget] = ruleFields(rule);
        await client.query(
          `INSERT INTO plan_rule_versions (plan_id, version, effective_date, weekdays, weekly_target)
         VALUES ($1, 1, $2, $3, $4)`,
          [id, startDate, weekdays, weeklyTarget],
        );
        if (numeric)
          await client.query(
            `INSERT INTO plan_numeric_config_versions (plan_id, version, effective_from, label, unit)
             VALUES ($1,1,$2,$3,$4)`,
            [id, startDate, numeric.label, numeric.unit],
          );
        if (reminder) await saveReminder(client, id, reminder);
        const result = toDto(await this.locked(client, userId, id));
        await appendUserChange(client, userId, "plan", id, "upsert", {
          revision: result.revision,
        });
        return result;
      },
    );
  }

  async update(
    userId: string,
    id: string,
    input: UpdatePlanRequest,
    key: string,
  ): Promise<PlanDto> {
    requireUuid(id);
    guardFields(input, [
      "title",
      "description",
      "groupId",
      "endDate",
      "dueDate",
      "rule",
      "baseRevision",
    ]);
    const baseRevision = revision(input.baseRevision);
    if (Object.keys(input).every((field) => field === "baseRevision"))
      fail("VALIDATION_ERROR", 400, "至少修改一个字段");
    const title =
      input.title === undefined ? undefined : cleanText(input.title, 80);
    const description =
      input.description === undefined
        ? undefined
        : cleanText(input.description, 1000, false);
    const groupId = input.groupId;
    const endDate =
      input.endDate === undefined
        ? undefined
        : input.endDate === null
          ? null
          : validDate(input.endDate);
    const dueDate =
      input.dueDate === undefined ? undefined : validDate(input.dueDate);
    return this.write.run(
      userId,
      key,
      "plan.update",
      { id, input },
      async (client) => {
        const old = await this.locked(client, userId, id);
        if (old.revision !== baseRevision)
          fail("RULE_CHANGED", 409, "计划已在其他设备修改");
        if (old.status === "archived")
          fail("PLAN_NOT_ACTIVE", 409, "归档计划不可修改");
        if (groupId !== undefined)
          await this.ownedGroup(client, userId, groupId);
        if (
          old.kind === "one_time" &&
          (input.rule !== undefined || endDate !== undefined)
        )
          fail("VALIDATION_ERROR", 400, "一次性任务不支持循环规则或结束日期");
        if (old.kind !== "one_time" && dueDate !== undefined)
          fail("VALIDATION_ERROR", 400, "循环计划不支持截止日期");
        const today = businessDateAt(new Date(), old.timezone);
        if (endDate && (endDate < old.start_date || endDate < today))
          fail("PLAN_DATE_INVALID", 400, "结束日期不能早于今天或开始日期");
        if (dueDate) {
          try {
            validateOneTimeDueDate(
              dueDate,
              old.timezone,
              new Date().toISOString(),
            );
          } catch {
            fail("PLAN_DATE_INVALID", 400, "截止日期不能早于今天");
          }
          if (dueDate < old.start_date)
            fail("PLAN_DATE_INVALID", 400, "截止日期不能早于开始日期");
          const resolved = await client.query(
            "SELECT plan_id FROM one_time_resolutions WHERE plan_id = $1",
            [id],
          );
          if (resolved.rowCount)
            fail("PLAN_NOT_ACTIVE", 409, "已结束的一次性任务不能修改截止日期");
        }
        if (input.rule !== undefined) {
          const effectiveDate = [
            nextRuleEffectiveDate(old.timezone, new Date().toISOString()),
            old.start_date,
            old.effective_date,
          ]
            .sort()
            .at(-1) as BusinessDate;
          const nextRule = ruleOf(
            old.kind,
            old.direction,
            input.rule,
            old.current_rule_version + 1,
            effectiveDate,
          );
          const [weekdays, weeklyTarget] = ruleFields(nextRule);
          await client.query(
            `INSERT INTO plan_rule_versions (plan_id, version, effective_date, weekdays, weekly_target)
           VALUES ($1,$2,$3,$4,$5)`,
            [id, nextRule.version, effectiveDate, weekdays, weeklyTarget],
          );
        }
        await client.query(
          `UPDATE plans SET title = $3, description = $4, group_id = $5, end_date = $6, due_date = $7,
         current_rule_version = current_rule_version + $8, revision = revision + 1, updated_at = now()
         WHERE id = $1 AND owner_id = $2`,
          [
            id,
            userId,
            title ?? old.title,
            description === undefined ? old.description : description,
            groupId === undefined ? old.group_id : groupId,
            endDate === undefined ? old.end_date : endDate,
            dueDate === undefined ? old.due_date : dueDate,
            input.rule === undefined ? 0 : 1,
          ],
        );
        const result = toDto(await this.locked(client, userId, id));
        await appendUserChange(client, userId, "plan", id, "upsert", {
          revision: result.revision,
        });
        return result;
      },
    );
  }

  async setNumericItem(
    userId: string,
    id: string,
    input: NumericConfigRequest,
    key: string,
    mode: "create" | "edit",
  ): Promise<PlanDto> {
    requireUuid(id);
    guardFields(input, ["label", "unit", "baseRevision"]);
    const baseRevision = revision(input.baseRevision);
    const numeric = numericItem({ label: input.label, unit: input.unit });
    return this.write.run(
      userId,
      key,
      `plan.numeric.${mode}`,
      { id, input },
      async (client) => {
        const old = await this.locked(client, userId, id);
        if (old.revision !== baseRevision)
          fail("RULE_CHANGED", 409, "计划已在其他设备修改");
        if (old.status === "archived")
          fail("PLAN_NOT_ACTIVE", 409, "归档计划不可修改");
        if (mode === "create" && old.numeric_version !== null)
          fail("RULE_CHANGED", 409, "数值项已存在，请使用修改操作");
        if (mode === "edit" && old.numeric_version === null)
          fail("VALIDATION_ERROR", 400, "数值项尚未配置");
        if (
          old.numeric_label === numeric.label &&
          old.numeric_unit === numeric.unit
        )
          return toDto(old);
        const effectiveFrom = [
          nextRuleEffectiveDate(old.timezone, new Date().toISOString()),
          old.start_date,
        ]
          .sort()
          .at(-1) as BusinessDate;
        if (
          old.numeric_effective_from &&
          old.numeric_effective_from >= effectiveFrom
        )
          fail("RULE_CHANGED", 409, "已有待生效的数值项配置，请在生效后修改");
        await client.query(
          `INSERT INTO plan_numeric_config_versions (plan_id, version, effective_from, label, unit)
         VALUES ($1,$2,$3,$4,$5)`,
          [
            id,
            (old.numeric_version ?? 0) + 1,
            effectiveFrom,
            numeric.label,
            numeric.unit,
          ],
        );
        await client.query(
          "UPDATE plans SET revision=revision+1,updated_at=now() WHERE id=$1 AND owner_id=$2",
          [id, userId],
        );
        const result = toDto(await this.locked(client, userId, id));
        await appendUserChange(client, userId, "plan", id, "upsert", {
          revision: result.revision,
        });
        return result;
      },
    );
  }

  async lifecycle(
    userId: string,
    id: string,
    action: "pause" | "resume" | "archive" | "delete",
    baseRevision: number,
    key: string,
  ): Promise<PlanDto | { deleted: true }> {
    requireUuid(id);
    revision(baseRevision);
    return this.write.run(
      userId,
      key,
      `plan.${action}`,
      { id, baseRevision },
      async (client) => {
        const old = await this.locked(client, userId, id);
        if (old.revision !== baseRevision)
          fail("RULE_CHANGED", 409, "计划已在其他设备修改");
        const valid =
          action === "pause"
            ? old.status === "active"
            : action === "resume"
              ? old.status === "paused"
              : action === "archive"
                ? old.status === "active" || old.status === "paused"
                : true;
        if (!valid) fail("PLAN_NOT_ACTIVE", 409, "当前计划状态不支持此操作");
        const now = new Date();
        const businessDate = businessDateAt(now, old.timezone);
        const seq = await client.query<{ next: number }>(
          "SELECT COALESCE(MAX(seq), 0) + 1 AS next FROM plan_lifecycle_events WHERE plan_id = $1",
          [id],
        );
        await client.query(
          `INSERT INTO plan_lifecycle_events (plan_id, seq, action, effective_at, business_date)
         VALUES ($1,$2,$3,$4,$5)`,
          [id, seq.rows[0]!.next, action, now, businessDate],
        );
        await client.query(
          `UPDATE plans SET status = $3, deleted_at = CASE WHEN $3 = 'deleted' THEN $4::timestamptz ELSE NULL END,
         revision = revision + 1, updated_at = $4 WHERE id = $1 AND owner_id = $2`,
          [
            id,
            userId,
            action === "resume"
              ? "active"
              : action === "pause"
                ? "paused"
                : action === "archive"
                  ? "archived"
                  : "deleted",
            now,
          ],
        );
        if (action === "delete") {
          await client.query(
            "INSERT INTO plan_deletion_jobs(plan_id,owner_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
            [id, userId],
          );
          const revoked = await client.query<{ friend_id: string }>(
            "UPDATE plan_shares SET revoked_at=now(),revision=revision+1 WHERE plan_id=$1 AND revoked_at IS NULL RETURNING friend_id",
            [id],
          );
          for (const share of revoked.rows)
            await appendUserChange(
              client,
              share.friend_id,
              "share",
              id,
              "revoke",
            );
          await appendUserChange(client, userId, "plan", id, "delete");
          return { deleted: true as const };
        }
        const result = toDto(await this.locked(client, userId, id));
        await appendUserChange(client, userId, "plan", id, "upsert", {
          revision: result.revision,
        });
        return result;
      },
    );
  }
}

function validateReminder(value: unknown, kind: PlanRow["kind"]): void {
  guardFields(value, ["enabled", "timeLocal", "weekdays", "daysBeforeDue"]);
  if (typeof value.enabled !== "boolean")
    fail("VALIDATION_ERROR", 400, "提醒开关不正确");
  if (value.enabled && value.timeLocal === undefined)
    fail("VALIDATION_ERROR", 400, "启用提醒时需设置时间");
  if (
    value.timeLocal !== undefined &&
    (typeof value.timeLocal !== "string" ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(value.timeLocal))
  )
    fail("VALIDATION_ERROR", 400, "提醒时间格式不正确");
  if (
    value.weekdays !== undefined &&
    (!Array.isArray(value.weekdays) ||
      value.weekdays.some(
        (day) => !Number.isInteger(day) || day < 1 || day > 7,
      ) ||
      new Set(value.weekdays).size !== value.weekdays.length)
  )
    fail("VALIDATION_ERROR", 400, "提醒星期不正确");
  if (
    kind === "weekly" &&
    value.enabled &&
    (!Array.isArray(value.weekdays) || value.weekdays.length === 0)
  )
    fail("VALIDATION_ERROR", 400, "请选择提醒星期");
  if (
    kind === "one_time" &&
    value.enabled &&
    ![0, 1, 3].includes(Number(value.daysBeforeDue))
  )
    fail("VALIDATION_ERROR", 400, "请选择一次性任务提醒时机");
  if (
    (kind === "one_time" && value.weekdays !== undefined) ||
    (kind !== "one_time" && value.daysBeforeDue !== undefined) ||
    (value.daysBeforeDue !== undefined &&
      ![0, 1, 3].includes(Number(value.daysBeforeDue)))
  )
    fail("VALIDATION_ERROR", 400, "提醒规则与计划类型不匹配");
}
async function saveReminder(
  client: PoolClient,
  id: string,
  value: NonNullable<CreatePlanRequest["reminder"]>,
): Promise<void> {
  await client.query(
    `INSERT INTO reminder_settings (plan_id, enabled, weekdays, time_local, lead_days)
     VALUES ($1,$2,$3,$4,$5)`,
    [
      id,
      value.enabled,
      value.weekdays ?? null,
      value.timeLocal ?? null,
      value.daysBeforeDue ?? null,
    ],
  );
}

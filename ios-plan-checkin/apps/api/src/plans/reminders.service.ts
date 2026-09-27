import { Injectable } from "@nestjs/common";
import type { PoolClient } from "pg";
import type {
  PutReminderRequest,
  ReminderDto,
  Weekday,
} from "@plan-checkin/contracts";
import { ApiConfig } from "../config.js";
import { Database } from "../database.js";
import { fail } from "../http.js";
import { appendUserChange } from "../sync/change-log.js";
import { guardFields, PlanWrite, requireUuid } from "./write.js";

interface ReminderRow {
  plan_id: string;
  enabled: boolean | null;
  weekdays: number[] | null;
  time_local: string | null;
  lead_days: number | null;
  revision: number | null;
  updated_at: Date | string | null;
  kind: "fixed" | "weekly" | "one_time";
  status: "active" | "paused" | "archived" | "deleted";
  rule_weekdays: number[] | null;
}
const select = `SELECT p.id AS plan_id,p.kind,p.status,r.weekdays AS rule_weekdays,
  s.enabled,s.weekdays,s.time_local::text,s.lead_days,s.revision,s.updated_at
  FROM plans p LEFT JOIN plan_rule_versions r
    ON r.plan_id=p.id AND r.version=p.current_rule_version
  LEFT JOIN reminder_settings s ON s.plan_id=p.id
  WHERE p.id=$1 AND p.owner_id=$2 AND p.status<>'deleted'`;
function dto(row: ReminderRow): ReminderDto {
  return {
    planId: row.plan_id,
    enabled: row.enabled ?? false,
    timeLocal: row.time_local?.slice(0, 5) ?? null,
    weekdays: (row.kind === "fixed"
      ? row.rule_weekdays
      : (row.weekdays ?? [])) as Weekday[],
    daysBeforeDue: row.lead_days as 0 | 1 | 3 | null,
    revision: row.revision ?? 0,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
  };
}
function validate(input: PutReminderRequest, row: ReminderRow): void {
  guardFields(input as unknown, [
    "enabled",
    "timeLocal",
    "weekdays",
    "daysBeforeDue",
    "baseRevision",
  ]);
  if (
    typeof input.enabled !== "boolean" ||
    !Number.isInteger(input.baseRevision) ||
    input.baseRevision < 0
  )
    fail("VALIDATION_ERROR", 400, "提醒开关或修订号不正确");
  if (
    input.timeLocal !== undefined &&
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.timeLocal)
  )
    fail("VALIDATION_ERROR", 400, "提醒时间格式不正确");
  if (input.enabled && !input.timeLocal)
    fail("VALIDATION_ERROR", 400, "开启提醒需设置时间");
  if (row.kind === "fixed") {
    if (input.weekdays !== undefined || input.daysBeforeDue !== undefined)
      fail("VALIDATION_ERROR", 400, "固定日期提醒跟随计划选中的星期");
  } else if (row.kind === "weekly") {
    if (input.daysBeforeDue !== undefined)
      fail("VALIDATION_ERROR", 400, "每周目标不使用截止日提醒");
    if (
      input.enabled &&
      (!Array.isArray(input.weekdays) ||
        input.weekdays.length < 1 ||
        input.weekdays.length > 7)
    )
      fail("VALIDATION_ERROR", 400, "请选择提醒星期");
    if (
      input.weekdays !== undefined &&
      (!Array.isArray(input.weekdays) ||
        input.weekdays.some(
          (day) => !Number.isInteger(day) || day < 1 || day > 7,
        ) ||
        new Set(input.weekdays).size !== input.weekdays.length)
    )
      fail("VALIDATION_ERROR", 400, "提醒星期不正确");
  } else {
    if (
      input.weekdays !== undefined ||
      (input.enabled && ![0, 1, 3].includes(Number(input.daysBeforeDue))) ||
      (input.daysBeforeDue !== undefined &&
        ![0, 1, 3].includes(Number(input.daysBeforeDue)))
    )
      fail("VALIDATION_ERROR", 400, "一次性任务提醒时机不正确");
  }
}

@Injectable()
export class RemindersService {
  private readonly write: PlanWrite;
  constructor(
    private readonly database: Database,
    config: ApiConfig,
  ) {
    this.write = new PlanWrite(database, config);
  }
  async get(userId: string, planId: string): Promise<ReminderDto> {
    requireUuid(planId);
    const found = await this.database.query<ReminderRow>(select, [
      planId,
      userId,
    ]);
    const row = found.rows[0];
    if (!row) fail("NOT_FOUND", 404, "计划不存在");
    return dto(row);
  }
  async put(
    userId: string,
    planId: string,
    input: PutReminderRequest,
    key: string,
  ): Promise<ReminderDto> {
    requireUuid(planId);
    return this.write.run(
      userId,
      key,
      "reminder-put",
      { planId, input },
      async (client: PoolClient) => {
        const found = await client.query<ReminderRow>(
          `${select} FOR UPDATE OF p`,
          [planId, userId],
        );
        const row = found.rows[0];
        if (!row) fail("NOT_FOUND", 404, "计划不存在");
        validate(input, row);
        if (input.baseRevision !== (row.revision ?? 0))
          fail("RULE_CHANGED", 409, "提醒设置已变化，请刷新后重试");
        if (row.revision === null) {
          await client.query(
            `INSERT INTO reminder_settings(plan_id,enabled,weekdays,time_local,lead_days)
           VALUES($1,$2,$3,$4,$5)`,
            [
              planId,
              input.enabled,
              row.kind === "weekly" ? (input.weekdays ?? null) : null,
              input.timeLocal ?? null,
              row.kind === "one_time" ? (input.daysBeforeDue ?? null) : null,
            ],
          );
        } else {
          await client.query(
            `UPDATE reminder_settings SET enabled=$2,weekdays=$3,time_local=$4,lead_days=$5,
            revision=revision+1,updated_at=now() WHERE plan_id=$1`,
            [
              planId,
              input.enabled,
              row.kind === "weekly" ? (input.weekdays ?? row.weekdays) : null,
              input.timeLocal ?? row.time_local,
              row.kind === "one_time"
                ? (input.daysBeforeDue ?? row.lead_days)
                : null,
            ],
          );
        }
        await appendUserChange(client, userId, "plan", planId, "upsert", {
          reminderChanged: true,
        });
        const updated = await client.query<ReminderRow>(select, [
          planId,
          userId,
        ]);
        return dto(updated.rows[0]!);
      },
    );
  }
}

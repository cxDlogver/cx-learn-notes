import { createHmac, timingSafeEqual } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type { PoolClient } from "pg";
import type {
  PlanShareDto,
  SharePreviewDto,
  SharedHistoryDto,
  SharedHistoryEntryDto,
  SharedPlanDto,
  SocialUserDto,
  Weekday,
} from "@plan-checkin/contracts";
import {
  addCalendarDays,
  businessDateAt,
  fixedDateStatus,
  fixedStatistics,
  mondayOfWeek,
  oneTimeState,
  parseBusinessDate,
  ruleForDate,
  validatePlanTimeline,
  weeklySummary,
  type BusinessDate,
  type IsoWeekday,
  type LifecycleEvent,
  type OneTimeFact,
  type PlanTimeline,
  type RecordFact,
  type RuleVersion,
} from "@plan-checkin/domain";
import { ApiConfig } from "../config.js";
import { Database } from "../database.js";
import { fail } from "../http.js";
import { fromPlan, planColumns, type PlanRow } from "../plans/plans.service.js";
import { PlanWrite, requireUuid } from "../plans/write.js";
import { enqueueSocialNotification } from "./notification-jobs.js";

interface UserRow {
  id: string;
  username: string;
  nickname: string | null;
  avatar_media_id: string | null;
}
interface CheckinRow {
  id: string;
  business_date: string;
  result: "success" | "failure" | "skip";
  note: string | null;
  failure_reason: string | null;
  is_backfilled: boolean;
  is_revised: boolean;
  rule_version: number;
}
interface ResolutionRow {
  resolution: "completed" | "failed" | "cancelled";
  resolved_business_date: string;
  resolved_at: Date | string;
  note: string | null;
  revision: number;
}
interface Snapshot {
  plan: PlanRow;
  owner: SocialUserDto;
  timeline: PlanTimeline;
  records: CheckinRow[];
  resolution: ResolutionRow | null;
}
const disclosure =
  "对方将能查看该计划已有的全部打卡状态和文字备注，包括历史失败原因。照片、数值记录及其他计划不会分享。";
const instant = (value: Date | string): string => new Date(value).toISOString();
const userDto = (row: UserRow): SocialUserDto => ({
  id: row.id,
  username: row.username,
  nickname: row.nickname,
  avatarMediaId: row.avatar_media_id,
});
function monthValue(value: string): string {
  if (typeof value !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value))
    fail("PLAN_DATE_INVALID", 400, "月份格式应为 YYYY-MM");
  try {
    parseBusinessDate(`${value}-01`);
  } catch {
    fail("PLAN_DATE_INVALID", 400, "月份不在支持范围内");
  }
  return value;
}
function dateValue(value: string): BusinessDate {
  return parseBusinessDate(value);
}

@Injectable()
export class SharesService {
  private readonly write: PlanWrite;
  constructor(
    private readonly database: Database,
    private readonly config: ApiConfig,
  ) {
    this.write = new PlanWrite(database, config);
  }

  private async pairLock(
    client: PoolClient,
    a: string,
    b: string,
  ): Promise<void> {
    const [low, high] = a < b ? [a, b] : [b, a];
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `friend:${low}:${high}`,
    ]);
  }

  private async plan(client: PoolClient, planId: string): Promise<PlanRow> {
    const found = await client.query<PlanRow>(
      `SELECT ${planColumns} ${fromPlan} WHERE p.id = $1 AND p.status <> 'deleted' FOR SHARE OF p`,
      [planId],
    );
    if (!found.rows[0]) fail("NOT_FOUND", 404, "计划不存在");
    return found.rows[0];
  }

  private async owner(
    client: PoolClient,
    userId: string,
  ): Promise<SocialUserDto> {
    const found = await client.query<UserRow>(
      `SELECT id, username, nickname, avatar_media_id FROM users
       WHERE id = $1 AND status = 'active' AND username IS NOT NULL`,
      [userId],
    );
    if (!found.rows[0]) fail("NOT_FOUND", 404, "用户不存在");
    return userDto(found.rows[0]);
  }

  private async friend(
    client: PoolClient,
    ownerId: string,
    friendId: string,
  ): Promise<SocialUserDto> {
    if (ownerId === friendId) fail("VALIDATION_ERROR", 400, "不能分享给自己");
    const [low, high] =
      ownerId < friendId ? [ownerId, friendId] : [friendId, ownerId];
    const relation = await client.query(
      `SELECT 1 FROM friendships WHERE user_low = $1 AND user_high = $2
       AND NOT EXISTS (SELECT 1 FROM blocks WHERE
         (blocker_id = $3 AND blocked_id = $4)
         OR (blocker_id = $4 AND blocked_id = $3))`,
      [low, high, ownerId, friendId],
    );
    if (!relation.rowCount) fail("FORBIDDEN", 403, "双方不是可分享的好友");
    return this.owner(client, friendId);
  }

  private async authorized(
    client: PoolClient,
    viewerId: string,
    planId: string,
  ): Promise<PlanRow> {
    const plan = await this.plan(client, planId);
    if (plan.owner_id === viewerId)
      fail("FORBIDDEN", 403, "请使用自己的计划入口");
    await this.pairLock(client, plan.owner_id, viewerId);
    await this.friend(client, plan.owner_id, viewerId);
    await this.owner(client, plan.owner_id);
    const share = await client.query(
      `SELECT 1 FROM plan_shares WHERE plan_id = $1 AND friend_id = $2
       AND revoked_at IS NULL`,
      [planId, viewerId],
    );
    if (!share.rowCount) fail("SHARE_REVOKED", 403, "计划分享已撤销");
    return this.plan(client, planId);
  }

  private async snapshot(client: PoolClient, plan: PlanRow): Promise<Snapshot> {
    const rules = await client.query<{
      version: number;
      effective_date: string;
      weekdays: number[] | null;
      weekly_target: number | null;
    }>(
      `SELECT version, effective_date::text, weekdays, weekly_target
         FROM plan_rule_versions WHERE plan_id = $1 ORDER BY version`,
      [plan.id],
    );
    const events = await client.query<{
      seq: number;
      action: LifecycleEvent["action"];
      business_date: string;
      effective_at: Date | string;
    }>(
      `SELECT seq, action, business_date::text, effective_at
         FROM plan_lifecycle_events WHERE plan_id = $1 ORDER BY seq`,
      [plan.id],
    );
    const records = await client.query<CheckinRow>(
      `SELECT c.id, c.business_date::text, c.result, c.note, c.failure_reason,
          c.is_backfilled, c.is_revised, r.version AS rule_version
         FROM checkins c JOIN plan_rule_versions r ON r.id = c.rule_version_id
         WHERE c.plan_id = $1 ORDER BY c.business_date`,
      [plan.id],
    );
    const resolutions = await client.query<ResolutionRow>(
      `SELECT resolution, resolved_business_date::text, resolved_at, note, revision
         FROM one_time_resolutions WHERE plan_id = $1`,
      [plan.id],
    );
    const versions: RuleVersion[] = rules.rows.map((rule) =>
      plan.kind === "fixed"
        ? {
            kind: "fixed",
            direction: plan.direction,
            version: rule.version,
            effectiveDate: dateValue(rule.effective_date),
            weekdays: rule.weekdays as IsoWeekday[],
          }
        : plan.kind === "weekly"
          ? {
              kind: "weekly",
              direction: plan.direction,
              version: rule.version,
              effectiveDate: dateValue(rule.effective_date),
              weeklyTarget: rule.weekly_target!,
            }
          : {
              kind: "one_time",
              direction: "do",
              version: rule.version,
              effectiveDate: dateValue(rule.effective_date),
            },
    );
    const timeline: PlanTimeline = {
      timezone: plan.timezone,
      startDate: dateValue(plan.start_date),
      endDate: plan.end_date ? dateValue(plan.end_date) : null,
      dueDate: plan.due_date ? dateValue(plan.due_date) : null,
      rules: versions,
      lifecycleEvents: events.rows.map((event) => ({
        sequence: event.seq,
        action: event.action,
        businessDate: dateValue(event.business_date),
        occurredAt: instant(event.effective_at),
      })),
    };
    validatePlanTimeline(timeline);
    return {
      plan,
      owner: await this.owner(client, plan.owner_id),
      timeline,
      records: records.rows,
      resolution: resolutions.rows[0] ?? null,
    };
  }

  private project(snapshot: Snapshot): SharedPlanDto {
    const { plan, timeline, records, resolution } = snapshot;
    const now = new Date().toISOString();
    const facts: RecordFact[] = records.map((record) => ({
      businessDate: dateValue(record.business_date),
      result: record.result,
      ruleVersion: record.rule_version,
    }));
    const progress: SharedPlanDto["progress"] =
      plan.kind === "fixed"
        ? ((metrics) => ({
            kind: "fixed" as const,
            successCount: metrics.successCount,
            denominator: metrics.denominator,
            completionRate: metrics.completionRate,
          }))(fixedStatistics(timeline, facts, now))
        : plan.kind === "weekly"
          ? ((metrics) => ({
              kind: "weekly" as const,
              weekStartDate: metrics.weekStartDate,
              successes: metrics.successes,
              target: metrics.target,
            }))(
              weeklySummary(
                timeline,
                facts,
                mondayOfWeek(businessDateAt(now, plan.timezone)),
                now,
              ),
            )
          : {
              kind: "one_time",
              state: oneTimeState(
                timeline,
                resolution && {
                  resolution: resolution.resolution,
                  resolvedAt: instant(resolution.resolved_at),
                  revision: resolution.revision,
                },
                now,
              ),
            };
    return {
      id: plan.id,
      owner: snapshot.owner,
      kind: plan.kind,
      direction: plan.direction,
      title: plan.title,
      timezone: plan.timezone,
      startDate: plan.start_date,
      endDate: plan.end_date,
      dueDate: plan.due_date,
      lifecycle: plan.status as SharedPlanDto["lifecycle"],
      ruleVersion: plan.current_rule_version,
      rule:
        plan.kind === "fixed"
          ? { weekdays: plan.weekdays as Weekday[] }
          : plan.kind === "weekly"
            ? { weeklyTarget: plan.weekly_target! }
            : null,
      progress,
    };
  }

  private history(snapshot: Snapshot, month: string): SharedHistoryDto {
    const { plan, timeline, records, resolution } = snapshot;
    const start = dateValue(`${month}-01`);
    const [year, part] = month.split("-").map(Number) as [number, number];
    const next = dateValue(
      `${part === 12 ? year + 1 : year}-${String(part === 12 ? 1 : part + 1).padStart(2, "0")}-01`,
    );
    const today = businessDateAt(new Date(), plan.timezone);
    const recordMap = new Map(records.map((row) => [row.business_date, row]));
    const entries: SharedHistoryEntryDto[] = [];
    for (
      let date = start;
      date < next && date <= today;
      date = addCalendarDays(date, 1)
    ) {
      const record = recordMap.get(date);
      if (plan.kind === "fixed") {
        const status = fixedDateStatus(
          timeline,
          date,
          new Date().toISOString(),
          record && {
            businessDate: date,
            result: record.result,
            ruleVersion: record.rule_version,
          },
        );
        if (status === "not_due" && !record) continue;
        entries.push({
          checkinId: record?.id ?? null,
          businessDate: date,
          status,
          note: record?.note ?? null,
          failureReason: record?.failure_reason ?? null,
          isBackfilled: record?.is_backfilled ?? false,
          isRevised: record?.is_revised ?? false,
          ruleVersion:
            record?.rule_version ?? ruleForDate(timeline, date)?.version ?? 1,
        });
      } else if (plan.kind === "weekly" && record) {
        entries.push({
          checkinId: record.id,
          businessDate: date,
          status: record.result,
          note: record.note,
          failureReason: record.failure_reason,
          isBackfilled: record.is_backfilled,
          isRevised: record.is_revised,
          ruleVersion: record.rule_version,
        });
      } else if (plan.kind === "one_time") {
        const isDue = plan.due_date === date;
        const isResolved = resolution?.resolved_business_date === date;
        if (
          (!isDue && !isResolved) ||
          (isDue && resolution && resolution.resolved_business_date < date)
        )
          continue;
        const fact: OneTimeFact | null = resolution && {
          resolution: resolution.resolution,
          resolvedAt: instant(resolution.resolved_at),
          revision: resolution.revision,
        };
        entries.push({
          checkinId: null,
          businessDate: date,
          status: isResolved
            ? oneTimeState(timeline, fact, new Date().toISOString())
            : isDue && date < today
              ? "overdue"
              : "pending",
          note: isResolved ? (resolution?.note ?? null) : null,
          failureReason: null,
          isBackfilled: false,
          isRevised: isResolved && (resolution?.revision ?? 1) > 1,
          ruleVersion: 1,
        });
      }
    }
    const facts: RecordFact[] = records.map((record) => ({
      businessDate: dateValue(record.business_date),
      result: record.result,
      ruleVersion: record.rule_version,
    }));
    const weeklySummaries = [];
    if (plan.kind === "weekly") {
      for (
        let week = mondayOfWeek(start);
        week < next;
        week = addCalendarDays(week, 7)
      )
        weeklySummaries.push(
          weeklySummary(timeline, facts, week, new Date().toISOString()),
        );
    }
    return {
      plan: this.project(snapshot),
      month,
      entries,
      weeklySummaries,
      earliestMonth: plan.start_date.slice(0, 7),
      latestMonth: today.slice(0, 7),
    };
  }

  private historyDigest(snapshot: Snapshot): string {
    return createHmac("sha256", this.config.authIdempotencyKey)
      .update(
        JSON.stringify({
          planRevision: snapshot.plan.revision,
          records: snapshot.records,
          resolution: snapshot.resolution,
        }),
      )
      .digest("base64url");
  }

  private token(
    ownerId: string,
    planId: string,
    friendId: string,
    digest: string,
  ): string {
    const payload = Buffer.from(
      JSON.stringify({
        ownerId,
        planId,
        friendId,
        digest,
        expires: Date.now() + 600_000,
      }),
    ).toString("base64url");
    const signature = createHmac("sha256", this.config.authIdempotencyKey)
      .update(payload)
      .digest("base64url");
    return `${payload}.${signature}`;
  }

  private verifyToken(
    token: string,
    ownerId: string,
    planId: string,
    friendId: string,
    digest: string,
  ): void {
    if (typeof token !== "string" || token.length > 2048)
      fail("VALIDATION_ERROR", 400, "请先预览分享内容");
    const [payload, signature, extra] = token.split(".");
    if (!payload || !signature || extra)
      fail("VALIDATION_ERROR", 400, "分享预览凭证无效");
    const expected = createHmac("sha256", this.config.authIdempotencyKey)
      .update(payload)
      .digest();
    let actual: Buffer;
    try {
      actual = Buffer.from(signature, "base64url");
    } catch {
      fail("VALIDATION_ERROR", 400, "分享预览凭证无效");
    }
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
      fail("VALIDATION_ERROR", 400, "分享预览凭证无效");
    let data: {
      ownerId: string;
      planId: string;
      friendId: string;
      digest: string;
      expires: number;
    };
    try {
      data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    } catch {
      fail("VALIDATION_ERROR", 400, "分享预览凭证无效");
    }
    if (
      data.ownerId !== ownerId ||
      data.planId !== planId ||
      data.friendId !== friendId ||
      data.expires < Date.now()
    )
      fail("VALIDATION_ERROR", 400, "分享预览已失效，请重新查看");
    if (data.digest !== digest)
      fail("RULE_CHANGED", 409, "计划或历史记录已变化，请重新预览");
  }

  private async change(
    client: PoolClient,
    userId: string,
    planId: string,
    operation: "upsert" | "revoke",
  ): Promise<void> {
    await client.query(
      "INSERT INTO user_sync_counters (user_id) VALUES ($1) ON CONFLICT DO NOTHING",
      [userId],
    );
    const next = await client.query<{ seq: string | number }>(
      "UPDATE user_sync_counters SET next_seq = next_seq + 1 WHERE user_id = $1 RETURNING next_seq - 1 AS seq",
      [userId],
    );
    await client.query(
      "INSERT INTO change_log (user_id, seq, entity_type, entity_id, operation) VALUES ($1, $2, 'share', $3, $4)",
      [userId, next.rows[0]!.seq, planId, operation],
    );
  }

  async preview(
    ownerId: string,
    planId: string,
    friendId: string,
    month: string,
  ): Promise<SharePreviewDto> {
    requireUuid(planId);
    requireUuid(friendId);
    monthValue(month);
    return this.database.transaction(async (client) => {
      const plan = await this.plan(client, planId);
      if (plan.owner_id !== ownerId) fail("NOT_FOUND", 404, "计划不存在");
      await this.pairLock(client, ownerId, friendId);
      const friend = await this.friend(client, ownerId, friendId);
      const snapshot = await this.snapshot(client, plan);
      return {
        ...this.history(snapshot, month),
        friend,
        disclosure,
        previewToken: this.token(
          ownerId,
          planId,
          friendId,
          this.historyDigest(snapshot),
        ),
      };
    });
  }

  async share(
    ownerId: string,
    planId: string,
    friendId: string,
    previewToken: string,
    key: string,
  ): Promise<PlanShareDto> {
    requireUuid(planId);
    requireUuid(friendId);
    return this.write.run(
      ownerId,
      key,
      "share-plan",
      { planId, friendId, previewToken },
      async (client) => {
        const plan = await this.plan(client, planId);
        if (plan.owner_id !== ownerId) fail("NOT_FOUND", 404, "计划不存在");
        await this.pairLock(client, ownerId, friendId);
        const friend = await this.friend(client, ownerId, friendId);
        const snapshot = await this.snapshot(client, plan);
        this.verifyToken(
          previewToken,
          ownerId,
          planId,
          friendId,
          this.historyDigest(snapshot),
        );
        const existing = await client.query<{
          revoked_at: Date | null;
          granted_at: Date | string;
          revision: number;
        }>(
          "SELECT revoked_at, granted_at, revision FROM plan_shares WHERE plan_id = $1 AND friend_id = $2 FOR UPDATE",
          [planId, friendId],
        );
        if (existing.rows[0] && !existing.rows[0].revoked_at)
          return {
            planId,
            friend,
            grantedAt: instant(existing.rows[0].granted_at),
            revision: existing.rows[0].revision,
          };
        const granted = await client.query<{
          granted_at: Date | string;
          revision: number;
        }>(
          `INSERT INTO plan_shares (plan_id, friend_id) VALUES ($1, $2)
         ON CONFLICT (plan_id, friend_id) DO UPDATE SET revoked_at = NULL,
           granted_at = now(), revision = plan_shares.revision + 1
         RETURNING granted_at, revision`,
          [planId, friendId],
        );
        await this.change(client, friendId, planId, "upsert");
        await enqueueSocialNotification(client, {
          kind: "plan_share",
          planId,
          recipientId: friendId,
          revision: granted.rows[0]!.revision,
        });
        return {
          planId,
          friend,
          grantedAt: instant(granted.rows[0]!.granted_at),
          revision: granted.rows[0]!.revision,
        };
      },
    );
  }

  async revoke(
    ownerId: string,
    planId: string,
    friendId: string,
    key: string,
  ): Promise<{ revoked: true }> {
    requireUuid(planId);
    requireUuid(friendId);
    return this.write.run(
      ownerId,
      key,
      "revoke-share",
      { planId, friendId },
      async (client) => {
        const plan = await this.plan(client, planId);
        if (plan.owner_id !== ownerId) fail("NOT_FOUND", 404, "计划不存在");
        await this.pairLock(client, ownerId, friendId);
        const revoked = await client.query(
          `UPDATE plan_shares SET revoked_at = now(), revision = revision + 1
         WHERE plan_id = $1 AND friend_id = $2 AND revoked_at IS NULL`,
          [planId, friendId],
        );
        if (!revoked.rowCount) fail("NOT_FOUND", 404, "分享授权不存在");
        await this.change(client, friendId, planId, "revoke");
        return { revoked: true };
      },
    );
  }

  async listShares(ownerId: string, planId: string): Promise<PlanShareDto[]> {
    requireUuid(planId);
    const found = await this.database.query<PlanRow>(
      `SELECT ${planColumns} ${fromPlan} WHERE p.id = $1 AND p.owner_id = $2 AND p.status <> 'deleted'`,
      [planId, ownerId],
    );
    if (!found.rows[0]) fail("NOT_FOUND", 404, "计划不存在");
    const shares = await this.database.query<
      UserRow & { granted_at: Date | string; revision: number }
    >(
      `SELECT u.id, u.username, u.nickname, u.avatar_media_id, s.granted_at, s.revision
       FROM plan_shares s JOIN users u ON u.id = s.friend_id
       JOIN friendships f ON f.user_low = least($2::uuid, u.id) AND f.user_high = greatest($2::uuid, u.id)
       WHERE s.plan_id = $1 AND s.revoked_at IS NULL AND u.status = 'active'
       AND NOT EXISTS (SELECT 1 FROM blocks b WHERE
         (b.blocker_id = $2 AND b.blocked_id = u.id) OR
         (b.blocker_id = u.id AND b.blocked_id = $2))
       ORDER BY u.username_normalized`,
      [planId, ownerId],
    );
    return shares.rows.map((row) => ({
      planId,
      friend: userDto(row),
      grantedAt: instant(row.granted_at),
      revision: row.revision,
    }));
  }

  async listFriendPlans(
    viewerId: string,
    friendId: string,
  ): Promise<SharedPlanDto[]> {
    requireUuid(friendId);
    return this.database.transaction(async (client) => {
      await this.pairLock(client, viewerId, friendId);
      await this.friend(client, friendId, viewerId);
      const plans = await client.query<{ plan_id: string }>(
        `SELECT s.plan_id FROM plan_shares s JOIN plans p ON p.id = s.plan_id
         WHERE p.owner_id = $1 AND s.friend_id = $2 AND s.revoked_at IS NULL
         AND p.status <> 'deleted' ORDER BY p.created_at DESC, p.id LIMIT 100`,
        [friendId, viewerId],
      );
      const result: SharedPlanDto[] = [];
      for (const row of plans.rows)
        result.push(
          this.project(
            await this.snapshot(client, await this.plan(client, row.plan_id)),
          ),
        );
      return result;
    });
  }

  async sharedPlan(viewerId: string, planId: string): Promise<SharedPlanDto> {
    requireUuid(planId);
    return this.database.transaction(async (client) => {
      const plan = await this.authorized(client, viewerId, planId);
      return this.project(await this.snapshot(client, plan));
    });
  }

  async sharedHistory(
    viewerId: string,
    planId: string,
    month: string | undefined,
  ): Promise<SharedHistoryDto> {
    requireUuid(planId);
    if (month !== undefined) monthValue(month);
    return this.database.transaction(async (client) => {
      const plan = await this.authorized(client, viewerId, planId);
      return this.history(
        await this.snapshot(client, plan),
        month ?? businessDateAt(new Date(), plan.timezone).slice(0, 7),
      );
    });
  }
}

import { Injectable } from "@nestjs/common";
import type { PoolClient } from "pg";
import type {
  CreateEncouragementRequest,
  EncouragementDto,
} from "@plan-checkin/contracts";
import { ApiConfig } from "../config.js";
import { Database } from "../database.js";
import { fail } from "../http.js";
import {
  cleanText,
  guardFields,
  PlanWrite,
  requireUuid,
} from "../plans/write.js";
import { enqueueSocialNotification } from "./notification-jobs.js";

interface CheckinOwner {
  owner_id: string;
  plan_id: string;
  status: string;
}
interface EncouragementRow {
  id: string;
  checkin_id: string;
  sender_id: string;
  kind: "emoji" | "message";
  body: string;
  created_at: Date | string;
  username: string;
  nickname: string | null;
  avatar_media_id: string | null;
}
const emoji = new Set(["👏", "💪", "🌱", "👍", "❤️"]);
const columns = `e.id,e.checkin_id,e.sender_id,e.kind,e.body,e.created_at,
  u.username,u.nickname,u.avatar_media_id`;
function dto(row: EncouragementRow): EncouragementDto {
  return {
    id: row.id,
    checkinId: row.checkin_id,
    kind: row.kind,
    body: row.body,
    createdAt: new Date(row.created_at).toISOString(),
    sender: {
      id: row.sender_id,
      username: row.username,
      nickname: row.nickname,
      avatarMediaId: row.avatar_media_id,
    },
  };
}

@Injectable()
export class EncouragementsService {
  private readonly write: PlanWrite;
  constructor(
    private readonly database: Database,
    config: ApiConfig,
  ) {
    this.write = new PlanWrite(database, config);
  }

  private async checkin(
    client: PoolClient,
    checkinId: string,
  ): Promise<CheckinOwner> {
    const result = await client.query<CheckinOwner>(
      `SELECT p.owner_id,p.id AS plan_id,p.status FROM checkins c
       JOIN plans p ON p.id=c.plan_id WHERE c.id=$1 AND p.status<>'deleted' FOR SHARE OF p`,
      [checkinId],
    );
    const row = result.rows[0];
    if (!row) fail("NOT_FOUND", 404, "记录不存在");
    return row;
  }

  private async authorized(
    client: PoolClient,
    ownerId: string,
    viewerId: string,
    planId: string,
  ): Promise<void> {
    if (ownerId === viewerId) return;
    const [low, high] =
      ownerId < viewerId ? [ownerId, viewerId] : [viewerId, ownerId];
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `friend:${low}:${high}`,
    ]);
    const found = await client.query(
      `SELECT 1 FROM plan_shares s
       JOIN friendships f ON f.user_low=$3 AND f.user_high=$4
       JOIN users owner ON owner.id=$1 AND owner.status='active'
       JOIN users viewer ON viewer.id=$2 AND viewer.status='active'
       WHERE s.plan_id=$5 AND s.friend_id=$2 AND s.revoked_at IS NULL
       AND NOT EXISTS(SELECT 1 FROM blocks b WHERE
         (b.blocker_id=$1 AND b.blocked_id=$2) OR (b.blocker_id=$2 AND b.blocked_id=$1))
       FOR SHARE OF s`,
      [ownerId, viewerId, low, high, planId],
    );
    if (!found.rowCount) fail("SHARE_REVOKED", 403, "这项计划已无法查看");
  }

  async create(
    userId: string,
    checkinId: string,
    input: CreateEncouragementRequest,
    key: string,
  ): Promise<EncouragementDto> {
    requireUuid(checkinId);
    guardFields(input, ["kind", "body"]);
    if (input.kind !== "emoji" && input.kind !== "message")
      fail("VALIDATION_ERROR", 400, "鼓励类型不正确");
    const body = cleanText(input.body, input.kind === "emoji" ? 8 : 500);
    if (!body || (input.kind === "emoji" && !emoji.has(body)))
      fail("VALIDATION_ERROR", 400, "请选择可用的回应或填写留言");
    return this.write.run(
      userId,
      key,
      "encouragement-create",
      { checkinId, input },
      async (client) => {
        const target = await this.checkin(client, checkinId);
        if (target.owner_id === userId)
          fail("VALIDATION_ERROR", 400, "不能给自己的记录留言");
        await this.authorized(client, target.owner_id, userId, target.plan_id);
        const recent = await client.query<{ count: string }>(
          "SELECT count(*)::text AS count FROM encouragements WHERE sender_id=$1 AND created_at>now()-interval '1 day'",
          [userId],
        );
        if (Number(recent.rows[0]?.count ?? 0) >= 50)
          fail("RATE_LIMITED", 429, "今日鼓励次数已达上限");
        const inserted = await client.query<EncouragementRow>(
          `WITH new AS (INSERT INTO encouragements(checkin_id,sender_id,owner_id,kind,body)
          VALUES($1,$2,$3,$4,$5) RETURNING *)
         SELECT ${columns} FROM new e JOIN users u ON u.id=e.sender_id`,
          [checkinId, userId, target.owner_id, input.kind, body],
        );
        const saved = inserted.rows[0]!;
        await enqueueSocialNotification(client, {
          kind: "encouragement",
          encouragementId: saved.id,
          recipientId: target.owner_id,
        });
        return dto(saved);
      },
    );
  }

  async list(userId: string, checkinId: string): Promise<EncouragementDto[]> {
    requireUuid(checkinId);
    return this.database.transaction(async (client) => {
      const target = await this.checkin(client, checkinId);
      await this.authorized(client, target.owner_id, userId, target.plan_id);
      const found = await client.query<EncouragementRow>(
        `SELECT ${columns} FROM encouragements e JOIN users u ON u.id=e.sender_id
         WHERE e.checkin_id=$1 AND ($2::uuid=$3::uuid OR e.sender_id=$2)
         ORDER BY e.created_at,e.id LIMIT 200`,
        [checkinId, userId, target.owner_id],
      );
      return found.rows.map(dto);
    });
  }
}

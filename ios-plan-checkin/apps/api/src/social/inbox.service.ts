import { Buffer } from "node:buffer";
import { createHmac, timingSafeEqual } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type {
  InboxEventType,
  InboxMessageDto,
  InboxPageDto,
  InboxReadDto,
} from "@plan-checkin/contracts";
import type { PoolClient } from "pg";
import { ApiConfig } from "../config.js";
import { Database } from "../database.js";
import { fail } from "../http.js";
import { PlanWrite, requireUuid, uuidPattern } from "../plans/write.js";

interface InboxRow {
  id: string;
  event_type: InboxEventType;
  actor_user_id: string | null;
  subject_id: string | null;
  created_at: Date | string;
  read_at: Date | string | null;
}
const instant = (value: Date | string) => new Date(value).toISOString();

@Injectable()
export class InboxService {
  private readonly write: PlanWrite;
  constructor(
    private readonly database: Database,
    private readonly config: ApiConfig,
  ) {
    this.write = new PlanWrite(database, config);
  }

  private sign(value: string): Buffer {
    return createHmac("sha256", this.config.authIdempotencyKey)
      .update(`inbox:${value}`)
      .digest();
  }

  private cursor(userId: string, row: InboxRow): string {
    const payload = Buffer.from(
      JSON.stringify({ userId, at: instant(row.created_at), id: row.id }),
    ).toString("base64url");
    return `${payload}.${this.sign(payload).toString("base64url")}`;
  }

  private parseCursor(
    userId: string,
    cursor: string | undefined,
  ): { at: string; id: string } | null {
    if (!cursor) return null;
    if (cursor.length > 512 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(cursor))
      fail("VALIDATION_ERROR", 400, "消息游标格式不正确");
    const [payload, signature] = cursor.split(".") as [string, string];
    const actual = Buffer.from(signature, "base64url");
    const expected = this.sign(payload);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
      fail("VALIDATION_ERROR", 400, "消息游标无效");
    let value: unknown;
    try {
      value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    } catch {
      fail("VALIDATION_ERROR", 400, "消息游标格式不正确");
    }
    if (
      !value ||
      typeof value !== "object" ||
      !("userId" in value) ||
      !("at" in value) ||
      !("id" in value) ||
      value.userId !== userId ||
      typeof value.at !== "string" ||
      Number.isNaN(Date.parse(value.at)) ||
      typeof value.id !== "string" ||
      !uuidPattern.test(value.id)
    )
      fail("VALIDATION_ERROR", 400, "消息游标无效");
    return { at: value.at, id: value.id };
  }

  private async canOpen(
    client: PoolClient,
    userId: string,
    row: InboxRow,
  ): Promise<boolean> {
    if (!row.subject_id || !row.actor_user_id) return false;
    let query: string;
    let params: string[];
    if (row.event_type === "friend_request") {
      query = `SELECT 1 FROM friend_requests r
        JOIN users actor ON actor.id=r.sender_id AND actor.status='active'
        WHERE r.id=$1 AND r.receiver_id=$2 AND r.sender_id=$3 AND r.status='pending'
          AND NOT EXISTS (SELECT 1 FROM blocks b WHERE
            (b.blocker_id=$2 AND b.blocked_id=$3) OR
            (b.blocker_id=$3 AND b.blocked_id=$2))`;
      params = [row.subject_id, userId, row.actor_user_id];
    } else if (row.event_type === "friend_accepted") {
      query = `SELECT 1 FROM friendships f
        JOIN users actor ON actor.id=$2 AND actor.status='active'
        WHERE f.user_low=least($1::uuid,$2::uuid)
          AND f.user_high=greatest($1::uuid,$2::uuid)
          AND NOT EXISTS (SELECT 1 FROM blocks b WHERE
            (b.blocker_id=$1 AND b.blocked_id=$2) OR
            (b.blocker_id=$2 AND b.blocked_id=$1))`;
      params = [userId, row.actor_user_id];
    } else if (
      row.event_type === "share" ||
      row.event_type === "shared_update"
    ) {
      query = `SELECT 1 FROM plan_shares s
        JOIN plans p ON p.id=s.plan_id AND p.owner_id=$3 AND p.status<>'deleted'
        JOIN users actor ON actor.id=$3 AND actor.status='active'
        JOIN friendships f ON f.user_low=least($2::uuid,$3::uuid)
          AND f.user_high=greatest($2::uuid,$3::uuid)
        WHERE s.plan_id=$1 AND s.friend_id=$2 AND s.revoked_at IS NULL
          AND NOT EXISTS (SELECT 1 FROM blocks b WHERE
            (b.blocker_id=$2 AND b.blocked_id=$3) OR
            (b.blocker_id=$3 AND b.blocked_id=$2))`;
      params = [row.subject_id, userId, row.actor_user_id];
    } else {
      query = `SELECT 1 FROM checkins c JOIN plans p ON p.id=c.plan_id
        WHERE c.id=$1 AND p.owner_id=$2 AND p.status<>'deleted'`;
      params = [row.subject_id, userId];
    }
    const found = await client.query(query, params);
    return Boolean(found.rowCount);
  }

  async list(
    userId: string,
    rawCursor?: string,
    rawLimit?: string,
  ): Promise<InboxPageDto> {
    const limit = rawLimit === undefined ? 20 : Number(rawLimit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 50)
      fail("VALIDATION_ERROR", 400, "消息页大小需在 1–50 之间");
    const cursor = this.parseCursor(userId, rawCursor);
    return this.database.transaction(async (client) => {
      await client.query(
        "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY",
      );
      const found = await client.query<InboxRow>(
        `SELECT id,event_type,actor_user_id,subject_id,created_at,read_at
         FROM inbox_messages WHERE recipient_user_id=$1
           AND ($2::timestamptz IS NULL OR (created_at,id)<($2::timestamptz,$3::uuid))
         ORDER BY created_at DESC,id DESC LIMIT $4`,
        [userId, cursor?.at ?? null, cursor?.id ?? null, limit + 1],
      );
      const rows = found.rows.slice(0, limit);
      const messages: InboxMessageDto[] = [];
      for (const row of rows) {
        const canOpen = await this.canOpen(client, userId, row);
        messages.push({
          id: row.id,
          eventType: row.event_type,
          actorId: canOpen ? row.actor_user_id : null,
          subjectId: canOpen ? row.subject_id : null,
          canOpen,
          createdAt: instant(row.created_at),
          readAt: row.read_at ? instant(row.read_at) : null,
        });
      }
      const unread = await client.query<{ n: string }>(
        "SELECT count(*)::text AS n FROM inbox_messages WHERE recipient_user_id=$1 AND read_at IS NULL",
        [userId],
      );
      return {
        messages,
        nextCursor:
          found.rows.length > limit && rows.length
            ? this.cursor(userId, rows[rows.length - 1]!)
            : null,
        hasMore: found.rows.length > limit,
        unreadCount: Number(unread.rows[0]?.n ?? 0),
      };
    });
  }

  async markRead(
    userId: string,
    messageId: string,
    key: string,
  ): Promise<InboxReadDto> {
    requireUuid(messageId);
    return this.write.run(
      userId,
      key,
      "inbox.read",
      { messageId },
      async (client) => {
        const changed = await client.query<{
          id: string;
          read_at: Date | string;
        }>(
          `UPDATE inbox_messages SET read_at=coalesce(read_at,now())
         WHERE id=$1 AND recipient_user_id=$2 RETURNING id,read_at`,
          [messageId, userId],
        );
        if (!changed.rows[0]) fail("NOT_FOUND", 404, "消息不存在");
        return {
          id: changed.rows[0].id,
          readAt: instant(changed.rows[0].read_at),
        };
      },
    );
  }
}

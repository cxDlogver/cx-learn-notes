import { createHmac, timingSafeEqual } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type { PoolClient } from "pg";
import type {
  SyncAckDto,
  SyncAckRequest,
  SyncChange,
  SyncChangesDto,
} from "@plan-checkin/contracts";
import { ApiConfig } from "../config.js";
import { Database } from "../database.js";
import { fail } from "../http.js";
import { requireUuid } from "../plans/write.js";

interface ChangeRow {
  seq: number | string;
  entity_type: SyncChange["entityType"];
  entity_id: string;
  operation: SyncChange["operation"];
  payload_min: Record<string, unknown> | null;
  created_at: Date | string;
}

@Injectable()
export class SyncService {
  constructor(
    private readonly database: Database,
    private readonly config: ApiConfig,
  ) {}

  private sign(payload: string): Buffer {
    return createHmac("sha256", this.config.authIdempotencyKey)
      .update(payload)
      .digest();
  }

  private cursor(userId: string, seq: number): string {
    const payload = Buffer.from(
      JSON.stringify({ userId, seq, issuedAt: Date.now() }),
    ).toString("base64url");
    return `${payload}.${this.sign(payload).toString("base64url")}`;
  }

  private parseCursor(userId: string, cursor: string | undefined): number {
    if (cursor === undefined || cursor === "") return 0;
    if (typeof cursor !== "string" || cursor.length > 1000)
      fail("CURSOR_EXPIRED", 409, "同步游标无效，请重新拉取");
    const [payload, signature, extra] = cursor.split(".");
    if (!payload || !signature || extra)
      fail("CURSOR_EXPIRED", 409, "同步游标无效，请重新拉取");
    const expected = this.sign(payload);
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
      fail("CURSOR_EXPIRED", 409, "同步游标无效，请重新拉取");
    let data: { userId: string; seq: number; issuedAt: number };
    try {
      data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    } catch {
      fail("CURSOR_EXPIRED", 409, "同步游标无效，请重新拉取");
    }
    if (
      !data ||
      data.userId !== userId ||
      !Number.isSafeInteger(data.seq) ||
      data.seq < 0 ||
      !Number.isSafeInteger(data.issuedAt) ||
      data.issuedAt > Date.now() + 60_000 ||
      data.issuedAt < Date.now() - 90 * 86_400_000
    )
      fail("CURSOR_EXPIRED", 409, "同步游标已过期，请重新拉取");
    return data.seq;
  }

  private async currentOperation(
    client: PoolClient,
    userId: string,
    row: ChangeRow,
  ): Promise<SyncChange["operation"]> {
    if (row.operation !== "upsert") return row.operation;
    if (row.entity_type === "plan") {
      const found = await client.query(
        "SELECT 1 FROM plans WHERE id=$1 AND owner_id=$2 AND status<>'deleted'",
        [row.entity_id, userId],
      );
      return found.rowCount ? "upsert" : "delete";
    }
    if (row.entity_type === "group") {
      const found = await client.query(
        "SELECT 1 FROM groups WHERE id=$1 AND owner_id=$2",
        [row.entity_id, userId],
      );
      return found.rowCount ? "upsert" : "delete";
    }
    if (row.entity_type === "checkin") {
      const found = await client.query(
        `SELECT 1 FROM checkins c JOIN plans p ON p.id=c.plan_id
         WHERE c.id=$1 AND c.owner_id=$2 AND p.status<>'deleted'`,
        [row.entity_id, userId],
      );
      return found.rowCount ? "upsert" : "delete";
    }
    if (row.entity_type === "share") {
      const found = await client.query(
        `SELECT 1 FROM plan_shares s JOIN plans p ON p.id=s.plan_id
         JOIN users owner ON owner.id=p.owner_id
         JOIN friendships f ON f.user_low=least(p.owner_id,$2::uuid)
           AND f.user_high=greatest(p.owner_id,$2::uuid)
         WHERE s.plan_id=$1 AND s.friend_id=$2 AND s.revoked_at IS NULL
           AND p.status<>'deleted' AND owner.status='active'
           AND NOT EXISTS (SELECT 1 FROM blocks b WHERE
             (b.blocker_id=p.owner_id AND b.blocked_id=$2) OR
             (b.blocker_id=$2 AND b.blocked_id=p.owner_id))`,
        [row.entity_id, userId],
      );
      return found.rowCount ? "upsert" : "revoke";
    }
    if (row.entity_type === "friend") {
      const found = await client.query(
        `SELECT 1 FROM friendships f JOIN users u ON u.id=$1
         WHERE f.user_low=least($1::uuid,$2::uuid)
           AND f.user_high=greatest($1::uuid,$2::uuid)
           AND u.status='active'
           AND NOT EXISTS (SELECT 1 FROM blocks b WHERE
             (b.blocker_id=$1 AND b.blocked_id=$2) OR
             (b.blocker_id=$2 AND b.blocked_id=$1))`,
        [row.entity_id, userId],
      );
      return found.rowCount ? "upsert" : "delete";
    }
    return row.operation;
  }

  async changes(
    userId: string,
    cursor: string | undefined,
    rawLimit: string | undefined,
  ): Promise<SyncChangesDto> {
    const after = this.parseCursor(userId, cursor);
    const limit = rawLimit === undefined ? 100 : Number(rawLimit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 200)
      fail("VALIDATION_ERROR", 400, "同步批量大小需为 1–200");
    return this.database.transaction(async (client) => {
      await client.query(
        "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY",
      );
      const counter = await client.query<{ high: number | string }>(
        "SELECT next_seq-1 AS high FROM user_sync_counters WHERE user_id=$1",
        [userId],
      );
      const high = Number(counter.rows[0]?.high ?? 0);
      if (after > high)
        fail("CURSOR_EXPIRED", 409, "同步游标超出当前数据，请重新拉取");
      const found = await client.query<ChangeRow>(
        `SELECT seq,entity_type,entity_id,operation,payload_min,created_at
         FROM change_log WHERE user_id=$1 AND seq>$2 AND seq<=$3
         ORDER BY seq LIMIT $4`,
        [userId, after, high, limit + 1],
      );
      const changes: SyncChange[] = [];
      for (const row of found.rows.slice(0, limit)) {
        const operation = await this.currentOperation(client, userId, row);
        changes.push({
          seq: Number(row.seq),
          entityType: row.entity_type,
          entityId: row.entity_id,
          operation,
          ...(operation === "upsert" && row.payload_min
            ? { payload: row.payload_min }
            : {}),
          changedAt: new Date(row.created_at).toISOString(),
        });
      }
      return {
        changes,
        nextCursor: this.cursor(userId, changes.at(-1)?.seq ?? after),
        hasMore: found.rows.length > limit,
      };
    });
  }

  async acknowledge(
    userId: string,
    input: SyncAckRequest,
  ): Promise<SyncAckDto> {
    if (
      !input ||
      typeof input.cursor !== "string" ||
      input.cursor.length === 0 ||
      Object.keys(input).some((key) => !["cursor", "deviceId"].includes(key))
    )
      fail("VALIDATION_ERROR", 400, "同步确认字段不正确");
    requireUuid(input.deviceId);
    const seq = this.parseCursor(userId, input.cursor);
    await this.database.transaction(async (client) => {
      const counter = await client.query<{ high: number | string }>(
        "SELECT next_seq-1 AS high FROM user_sync_counters WHERE user_id=$1",
        [userId],
      );
      if (seq > Number(counter.rows[0]?.high ?? 0))
        fail("CURSOR_EXPIRED", 409, "同步游标超出当前数据");
      await client.query(
        `INSERT INTO sync_acknowledgements (user_id,device_id,last_seq) VALUES ($1,$2,$3)
         ON CONFLICT (user_id,device_id) DO UPDATE SET
           last_seq=greatest(sync_acknowledgements.last_seq,excluded.last_seq),updated_at=now()`,
        [userId, input.deviceId, seq],
      );
    });
    return { acknowledgedSeq: seq };
  }
}

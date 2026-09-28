import { Injectable } from "@nestjs/common";
import type { PoolClient } from "pg";
import type {
  FriendRequestDto,
  FriendRequestsDto,
  SocialUserDto,
} from "@plan-checkin/contracts";
import { ApiConfig } from "../config.js";
import { Database } from "../database.js";
import { fail } from "../http.js";
import { PlanWrite, requireUuid } from "../plans/write.js";
import { enqueueSocialNotification } from "./notification-jobs.js";

interface SocialUserRow {
  id: string;
  username: string;
  nickname: string | null;
  avatar_media_id: string | null;
}
interface RequestRow {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: FriendRequestDto["status"];
  created_at: Date | string;
  responded_at: Date | string | null;
}
const userColumns = "id, username, nickname, avatar_media_id";

function userDto(row: SocialUserRow): SocialUserDto {
  return {
    id: row.id,
    username: row.username,
    nickname: row.nickname,
    avatarMediaId: row.avatar_media_id,
  };
}
function pair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}
function iso(value: Date | string | null): string | null {
  return value === null ? null : new Date(value).toISOString();
}

@Injectable()
export class SocialService {
  private readonly write: PlanWrite;
  constructor(
    private readonly database: Database,
    config: ApiConfig,
  ) {
    this.write = new PlanWrite(database, config);
  }

  private async lockPair(
    client: PoolClient,
    a: string,
    b: string,
  ): Promise<void> {
    const [low, high] = pair(a, b);
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `friend:${low}:${high}`,
    ]);
  }

  private async blocked(
    client: PoolClient,
    a: string,
    b: string,
  ): Promise<boolean> {
    const found = await client.query(
      `SELECT 1 FROM blocks WHERE (blocker_id = $1 AND blocked_id = $2)
       OR (blocker_id = $2 AND blocked_id = $1) LIMIT 1`,
      [a, b],
    );
    return Boolean(found.rowCount);
  }

  private async activeUser(
    client: PoolClient,
    id: string,
  ): Promise<SocialUserRow> {
    const found = await client.query<SocialUserRow>(
      `SELECT ${userColumns} FROM users WHERE id = $1 AND status = 'active' AND username IS NOT NULL`,
      [id],
    );
    if (!found.rows[0]) fail("NOT_FOUND", 404, "用户不存在");
    return found.rows[0];
  }

  private async requestDto(
    client: PoolClient,
    row: RequestRow,
  ): Promise<FriendRequestDto> {
    const people = await client.query<SocialUserRow>(
      `SELECT ${userColumns} FROM users WHERE id IN ($1, $2)`,
      [row.sender_id, row.receiver_id],
    );
    const sender = people.rows.find((person) => person.id === row.sender_id);
    const receiver = people.rows.find(
      (person) => person.id === row.receiver_id,
    );
    if (!sender || !receiver) fail("NOT_FOUND", 404, "好友申请不存在");
    return {
      id: row.id,
      sender: userDto(sender),
      receiver: userDto(receiver),
      status: row.status,
      createdAt: iso(row.created_at)!,
      respondedAt: iso(row.responded_at),
    };
  }

  private async change(
    client: PoolClient,
    userId: string,
    entityId: string,
    entityType: "friend" | "share",
    operation: "upsert" | "delete" | "revoke",
  ): Promise<void> {
    await client.query(
      "INSERT INTO user_sync_counters (user_id) VALUES ($1) ON CONFLICT DO NOTHING",
      [userId],
    );
    const next = await client.query<{ seq: number | string }>(
      "UPDATE user_sync_counters SET next_seq = next_seq + 1 WHERE user_id = $1 RETURNING next_seq - 1 AS seq",
      [userId],
    );
    await client.query(
      `INSERT INTO change_log (user_id, seq, entity_type, entity_id, operation)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, next.rows[0]!.seq, entityType, entityId, operation],
    );
  }

  private async revokeShares(
    client: PoolClient,
    a: string,
    b: string,
  ): Promise<void> {
    const revoked = await client.query<{ plan_id: string; friend_id: string }>(
      `UPDATE plan_shares s SET revoked_at = now(), revision = s.revision + 1
       FROM plans p WHERE p.id = s.plan_id AND s.revoked_at IS NULL
       AND ((p.owner_id = $1 AND s.friend_id = $2)
         OR (p.owner_id = $2 AND s.friend_id = $1))
       RETURNING s.plan_id, s.friend_id`,
      [a, b],
    );
    for (const share of revoked.rows) {
      await this.change(
        client,
        share.friend_id,
        share.plan_id,
        "share",
        "revoke",
      );
    }
  }

  async search(viewerId: string, username: string): Promise<SocialUserDto[]> {
    if (typeof username !== "string")
      fail("VALIDATION_ERROR", 400, "请输入用户名");
    const value = username.normalize("NFKC").trim();
    if (
      value.length < 3 ||
      value.length > 30 ||
      !/^[\p{L}\p{N}_]+$/u.test(value)
    )
      fail("VALIDATION_ERROR", 400, "用户名格式不正确");
    const found = await this.database.query<SocialUserRow>(
      `SELECT ${userColumns} FROM users u WHERE username_normalized = lower($1)
       AND id <> $2 AND status = 'active'
       AND NOT EXISTS (SELECT 1 FROM blocks b WHERE
         (b.blocker_id = $2 AND b.blocked_id = u.id)
         OR (b.blocker_id = u.id AND b.blocked_id = $2)) LIMIT 1`,
      [value, viewerId],
    );
    return found.rows.map(userDto);
  }

  async requests(userId: string): Promise<FriendRequestsDto> {
    const found = await this.database.query<RequestRow>(
      `SELECT r.* FROM friend_requests r
       JOIN users u ON u.id = CASE WHEN r.sender_id = $1 THEN r.receiver_id ELSE r.sender_id END
       WHERE (r.sender_id = $1 OR r.receiver_id = $1) AND r.status = 'pending'
       AND u.status = 'active'
       AND NOT EXISTS (SELECT 1 FROM blocks b WHERE
         (b.blocker_id = r.sender_id AND b.blocked_id = r.receiver_id)
         OR (b.blocker_id = r.receiver_id AND b.blocked_id = r.sender_id))
       ORDER BY r.created_at DESC LIMIT 100`,
      [userId],
    );
    return this.database.transaction(async (client) => {
      const items = await Promise.all(
        found.rows.map((row) => this.requestDto(client, row)),
      );
      return {
        incoming: items.filter((item) => item.receiver.id === userId),
        outgoing: items.filter((item) => item.sender.id === userId),
      };
    });
  }

  async friends(userId: string): Promise<SocialUserDto[]> {
    const found = await this.database.query<SocialUserRow>(
      `SELECT ${userColumns} FROM friendships f JOIN users u ON u.id =
         CASE WHEN f.user_low = $1 THEN f.user_high ELSE f.user_low END
       WHERE (f.user_low = $1 OR f.user_high = $1) AND u.status = 'active'
       AND NOT EXISTS (SELECT 1 FROM blocks b WHERE
         (b.blocker_id = $1 AND b.blocked_id = u.id)
         OR (b.blocker_id = u.id AND b.blocked_id = $1))
       ORDER BY u.username_normalized LIMIT 200`,
      [userId],
    );
    return found.rows.map(userDto);
  }

  async request(
    senderId: string,
    receiverId: string,
    key: string,
  ): Promise<FriendRequestDto> {
    requireUuid(receiverId);
    if (senderId === receiverId)
      fail("VALIDATION_ERROR", 400, "不能添加自己为好友");
    return this.write.run(
      senderId,
      key,
      "friend-request",
      { receiverId },
      async (client) => {
        await this.lockPair(client, senderId, receiverId);
        await this.activeUser(client, receiverId);
        if (await this.blocked(client, senderId, receiverId))
          fail("FRIEND_BLOCKED", 403, "无法向该用户发送好友申请");
        const [low, high] = pair(senderId, receiverId);
        const friends = await client.query(
          "SELECT 1 FROM friendships WHERE user_low = $1 AND user_high = $2",
          [low, high],
        );
        if (friends.rowCount) fail("VALIDATION_ERROR", 409, "双方已是好友");
        const reverse = await client.query<RequestRow>(
          `SELECT * FROM friend_requests WHERE sender_id = $1 AND receiver_id = $2
         AND status = 'pending' FOR UPDATE`,
          [receiverId, senderId],
        );
        if (reverse.rows[0]) {
          const accepted = await client.query<RequestRow>(
            `UPDATE friend_requests SET status = 'accepted', responded_at = now()
           WHERE id = $1 RETURNING *`,
            [reverse.rows[0].id],
          );
          await client.query(
            "INSERT INTO friendships (user_low, user_high) VALUES ($1, $2)",
            [low, high],
          );
          await this.change(client, senderId, receiverId, "friend", "upsert");
          await this.change(client, receiverId, senderId, "friend", "upsert");
          return this.requestDto(client, accepted.rows[0]!);
        }
        const existing = await client.query<RequestRow>(
          `SELECT * FROM friend_requests WHERE sender_id = $1 AND receiver_id = $2
         AND status = 'pending'`,
          [senderId, receiverId],
        );
        if (existing.rows[0]) return this.requestDto(client, existing.rows[0]);
        const recent = await client.query<{ count: string }>(
          `SELECT count(*)::text AS count FROM friend_requests
         WHERE sender_id = $1 AND created_at > now() - interval '1 day'`,
          [senderId],
        );
        if (Number(recent.rows[0]?.count ?? 0) >= 20)
          fail("RATE_LIMITED", 429, "今日好友申请次数已达上限");
        const created = await client.query<RequestRow>(
          `INSERT INTO friend_requests (sender_id, receiver_id)
         VALUES ($1, $2) RETURNING *`,
          [senderId, receiverId],
        );
        await enqueueSocialNotification(client, {
          kind: "friend_request",
          requestId: created.rows[0]!.id,
          recipientId: receiverId,
        });
        return this.requestDto(client, created.rows[0]!);
      },
    );
  }

  async accept(
    userId: string,
    requestId: string,
    key: string,
  ): Promise<FriendRequestDto> {
    requireUuid(requestId);
    return this.write.run(
      userId,
      key,
      "friend-accept",
      { requestId },
      async (client) => {
        const original = await client.query<RequestRow>(
          "SELECT * FROM friend_requests WHERE id = $1 AND receiver_id = $2",
          [requestId, userId],
        );
        const item = original.rows[0];
        if (!item) fail("NOT_FOUND", 404, "好友申请不存在");
        await this.lockPair(client, item.sender_id, userId);
        const latest = await client.query<RequestRow>(
          "SELECT * FROM friend_requests WHERE id = $1 FOR UPDATE",
          [requestId],
        );
        if (latest.rows[0]?.status !== "pending")
          fail("RULE_CHANGED", 409, "好友申请状态已变化");
        await this.activeUser(client, item.sender_id);
        if (await this.blocked(client, item.sender_id, userId))
          fail("FRIEND_BLOCKED", 403, "无法接受该好友申请");
        const accepted = await client.query<RequestRow>(
          `UPDATE friend_requests SET status = 'accepted', responded_at = now()
         WHERE id = $1 RETURNING *`,
          [requestId],
        );
        const [low, high] = pair(item.sender_id, userId);
        await client.query(
          `INSERT INTO friendships (user_low, user_high) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
          [low, high],
        );
        await client.query(
          `UPDATE friend_requests SET status = 'cancelled', responded_at = now()
         WHERE sender_id = $1 AND receiver_id = $2 AND status = 'pending'`,
          [userId, item.sender_id],
        );
        await this.change(client, userId, item.sender_id, "friend", "upsert");
        await this.change(client, item.sender_id, userId, "friend", "upsert");
        return this.requestDto(client, accepted.rows[0]!);
      },
    );
  }

  async reject(
    userId: string,
    requestId: string,
    key: string,
  ): Promise<FriendRequestDto> {
    requireUuid(requestId);
    return this.write.run(
      userId,
      key,
      "friend-reject",
      { requestId },
      async (client) => {
        const original = await client.query<RequestRow>(
          "SELECT * FROM friend_requests WHERE id = $1 AND receiver_id = $2",
          [requestId, userId],
        );
        const item = original.rows[0];
        if (!item) fail("NOT_FOUND", 404, "好友申请不存在");
        await this.lockPair(client, item.sender_id, userId);
        const changed = await client.query<RequestRow>(
          `UPDATE friend_requests SET status='rejected',responded_at=now()
           WHERE id=$1 AND receiver_id=$2 AND status='pending' RETURNING *`,
          [requestId, userId],
        );
        if (!changed.rows[0]) fail("RULE_CHANGED", 409, "好友申请状态已变化");
        return this.requestDto(client, changed.rows[0]);
      },
    );
  }

  async remove(
    userId: string,
    friendId: string,
    key: string,
  ): Promise<{ deleted: true }> {
    requireUuid(friendId);
    if (userId === friendId) fail("VALIDATION_ERROR", 400, "好友标识不正确");
    return this.write.run(
      userId,
      key,
      "friend-delete",
      { friendId },
      async (client) => {
        await this.lockPair(client, userId, friendId);
        const [low, high] = pair(userId, friendId);
        const removed = await client.query(
          "DELETE FROM friendships WHERE user_low = $1 AND user_high = $2",
          [low, high],
        );
        if (!removed.rowCount) fail("NOT_FOUND", 404, "好友关系不存在");
        await this.revokeShares(client, userId, friendId);
        await this.change(client, userId, friendId, "friend", "delete");
        await this.change(client, friendId, userId, "friend", "delete");
        return { deleted: true };
      },
    );
  }

  async block(
    userId: string,
    blockedId: string,
    key: string,
  ): Promise<{ blocked: true }> {
    requireUuid(blockedId);
    if (userId === blockedId) fail("VALIDATION_ERROR", 400, "不能屏蔽自己");
    return this.write.run(
      userId,
      key,
      "friend-block",
      { blockedId },
      async (client) => {
        await this.lockPair(client, userId, blockedId);
        await this.activeUser(client, blockedId);
        await client.query(
          `INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
          [userId, blockedId],
        );
        const [low, high] = pair(userId, blockedId);
        await client.query(
          "DELETE FROM friendships WHERE user_low = $1 AND user_high = $2",
          [low, high],
        );
        await client.query(
          `UPDATE friend_requests SET status = 'cancelled', responded_at = now()
         WHERE status = 'pending' AND
         ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1))`,
          [userId, blockedId],
        );
        await this.revokeShares(client, userId, blockedId);
        await this.change(client, userId, blockedId, "friend", "delete");
        await this.change(client, blockedId, userId, "friend", "delete");
        return { blocked: true };
      },
    );
  }

  async unblock(
    userId: string,
    blockedId: string,
    key: string,
  ): Promise<{ unblocked: true }> {
    requireUuid(blockedId);
    return this.write.run(
      userId,
      key,
      "friend-unblock",
      { blockedId },
      async (client) => {
        const removed = await client.query(
          "DELETE FROM blocks WHERE blocker_id = $1 AND blocked_id = $2",
          [userId, blockedId],
        );
        if (!removed.rowCount) fail("NOT_FOUND", 404, "屏蔽关系不存在");
        return { unblocked: true };
      },
    );
  }
}

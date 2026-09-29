import { Injectable } from "@nestjs/common";
import { Database } from "../database.js";
import { fail } from "../http.js";
import { appendUserChange } from "../sync/change-log.js";

export interface DeletionStatus {
  status: "active" | "deletion_pending";
  dueAt: string | null;
}

@Injectable()
export class DeletionService {
  constructor(private readonly database: Database) {}

  async status(userId: string): Promise<DeletionStatus> {
    const result = await this.database.query<{
      status: DeletionStatus["status"];
      deletion_due_at: Date | null;
    }>("SELECT status,deletion_due_at FROM users WHERE id=$1", [userId]);
    const row = result.rows[0];
    if (!row) fail("NOT_FOUND", 404, "账号不存在");
    return {
      status: row.status,
      dueAt: row.deletion_due_at?.toISOString() ?? null,
    };
  }

  async request(userId: string, confirmed: boolean): Promise<DeletionStatus> {
    if (confirmed !== true)
      fail("VALIDATION_ERROR", 400, "请确认注销账号及 30 天撤销期");
    return this.database.transaction(async (client) => {
      const found = await client.query<{ status: string }>(
        "SELECT status FROM users WHERE id=$1 FOR UPDATE",
        [userId],
      );
      if (found.rows[0]?.status !== "active")
        fail("FORBIDDEN", 403, "账号当前不可注销");
      const changed = await client.query<{ deletion_due_at: Date }>(
        `UPDATE users SET status='deletion_pending',deletion_due_at=now()+interval '30 days',updated_at=now()
         WHERE id=$1 RETURNING deletion_due_at`,
        [userId],
      );
      const dueAt = changed.rows[0]!.deletion_due_at;
      await client.query(
        "UPDATE sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL",
        [userId],
      );
      await client.query(
        "UPDATE devices SET notifications_enabled=false,apns_token_ciphertext=NULL,push_token_hash=NULL WHERE user_id=$1",
        [userId],
      );
      await client.query(
        `UPDATE web_push_subscriptions
         SET enabled=false,revoked_at=coalesce(revoked_at,now()),updated_at=now()
         WHERE user_id=$1 AND revoked_at IS NULL`,
        [userId],
      );
      const revoked = await client.query<{
        plan_id: string;
        friend_id: string;
        owner_id: string;
      }>(
        `UPDATE plan_shares s SET revoked_at=now(),revision=s.revision+1
         FROM plans p WHERE p.id=s.plan_id AND s.revoked_at IS NULL
           AND (s.friend_id=$1 OR p.owner_id=$1)
         RETURNING s.plan_id,s.friend_id,p.owner_id`,
        [userId],
      );
      for (const share of revoked.rows) {
        const other =
          share.friend_id === userId ? share.owner_id : share.friend_id;
        await appendUserChange(client, other, "share", share.plan_id, "revoke");
      }
      const friends = await client.query<{ other_id: string }>(
        `SELECT CASE WHEN user_low=$1 THEN user_high ELSE user_low END AS other_id
         FROM friendships WHERE user_low=$1 OR user_high=$1`,
        [userId],
      );
      for (const friend of friends.rows)
        await appendUserChange(
          client,
          friend.other_id,
          "friend",
          userId,
          "revoke",
        );
      await client.query(
        "UPDATE data_exports SET expires_at=now() WHERE user_id=$1 AND status='ready'",
        [userId],
      );
      await client.query(
        `INSERT INTO deletion_jobs(user_id,due_at) VALUES($1,$2)
         ON CONFLICT(user_id) DO UPDATE SET status='pending',due_at=excluded.due_at,
           attempts=0,completed_at=NULL,last_error_code=NULL,updated_at=now()`,
        [userId, dueAt],
      );
      return { status: "deletion_pending", dueAt: dueAt.toISOString() };
    });
  }
}

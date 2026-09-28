import type { Pool, PoolClient } from "pg";

async function transaction<T>(
  pool: Pool,
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

/** A deleted plan stays unreadable until its private objects have been removed. */
export async function finalizeDeletedPlans(pool: Pool): Promise<number> {
  await pool.query(
    `INSERT INTO plan_deletion_jobs(plan_id,owner_id)
     SELECT id,owner_id FROM plans WHERE status='deleted' ON CONFLICT DO NOTHING`,
  );
  const candidates = await pool.query<{ id: string }>(
    `SELECT p.id FROM plans p JOIN plan_deletion_jobs j ON j.plan_id=p.id
     WHERE p.status='deleted' AND p.deleted_at<=now()-interval '11 minutes'
       AND j.status IN ('pending','failed') ORDER BY p.deleted_at LIMIT 20`,
  );
  let completed = 0;
  for (const candidate of candidates.rows) {
    try {
      const removed = await transaction(pool, async (client) => {
        const locked = await client.query(
          "SELECT id FROM plans WHERE id=$1 AND status='deleted' FOR UPDATE",
          [candidate.id],
        );
        if (!locked.rowCount) return false;
        const outstanding = await client.query(
          `SELECT m.id FROM media m LEFT JOIN checkins c ON c.id=m.checkin_id
         WHERE coalesce(c.plan_id,m.one_time_plan_id)=$1 AND m.object_deleted_at IS NULL LIMIT 1`,
          [candidate.id],
        );
        if (outstanding.rowCount) return false;
        await client.query(
          `DELETE FROM worker_jobs WHERE payload->>'planId'=$1::text OR payload->>'mediaId' IN (
           SELECT m.id::text FROM media m LEFT JOIN checkins c ON c.id=m.checkin_id
           WHERE coalesce(c.plan_id,m.one_time_plan_id)=$1::uuid)`,
          [candidate.id],
        );
        await client.query(
          `DELETE FROM media m USING checkins c WHERE m.checkin_id=c.id AND c.plan_id=$1`,
          [candidate.id],
        );
        await client.query("DELETE FROM media WHERE one_time_plan_id=$1", [
          candidate.id,
        ]);
        await client.query(
          "DELETE FROM plans WHERE id=$1 AND status='deleted'",
          [candidate.id],
        );
        await client.query(
          `UPDATE plan_deletion_jobs SET status='completed',attempts=least(attempts+1,20),
           completed_at=now(),last_error_code=NULL WHERE plan_id=$1`,
          [candidate.id],
        );
        return true;
      });
      if (removed) completed++;
    } catch {
      await pool.query(
        `UPDATE plan_deletion_jobs SET status='failed',attempts=least(attempts+1,20),
           last_error_code='PLAN_DELETE_FAILED' WHERE plan_id=$1`,
        [candidate.id],
      );
      throw new Error("Plan deletion sweep failed");
    }
  }
  return completed;
}

/** Durable due-date sweep; each pass either advances object cleanup or commits the final tombstone. */
export async function finalizeDueAccounts(pool: Pool): Promise<number> {
  const due = await pool.query<{ user_id: string }>(
    `SELECT d.user_id FROM deletion_jobs d JOIN users u ON u.id=d.user_id
     WHERE d.status IN ('pending','failed') AND d.due_at<=now()
       AND u.status='deletion_pending' AND u.deletion_due_at<=now()
     ORDER BY d.due_at LIMIT 10`,
  );
  let completed = 0;
  for (const item of due.rows) {
    try {
      const removed = await transaction(pool, async (client) => {
        const found = await client.query<{ phone_lookup_hash: Buffer }>(
          `SELECT phone_lookup_hash FROM users WHERE id=$1 AND status='deletion_pending'
           AND deletion_due_at<=now() FOR UPDATE`,
          [item.user_id],
        );
        if (!found.rows[0]) return false;
        const audit = await client.query<{
          attempts: number;
          last_error_code: string | null;
        }>(
          "SELECT attempts,last_error_code FROM deletion_jobs WHERE user_id=$1 FOR UPDATE",
          [item.user_id],
        );
        await client.query(
          "UPDATE media SET status='deleted',deleted_at=coalesce(deleted_at,now()) WHERE owner_id=$1 AND object_deleted_at IS NULL",
          [item.user_id],
        );
        await client.query(
          "UPDATE data_exports SET expires_at=now() WHERE user_id=$1 AND status='ready' AND expires_at>now()",
          [item.user_id],
        );
        const remaining = await client.query<{
          media: string;
          exports: string;
        }>(
          `SELECT
             (SELECT count(*) FROM media WHERE owner_id=$1 AND object_deleted_at IS NULL)::text AS media,
             (SELECT count(*) FROM data_exports WHERE user_id=$1 AND status='ready' AND object_key IS NOT NULL)::text AS exports`,
          [item.user_id],
        );
        if (
          Number(remaining.rows[0]?.media) ||
          Number(remaining.rows[0]?.exports)
        )
          return false;
        await client.query(
          `DELETE FROM worker_jobs WHERE payload->>'recipientId'=$1::text
             OR payload->>'planId' IN (SELECT id::text FROM plans WHERE owner_id=$1::uuid)
             OR payload->>'mediaId' IN (SELECT id::text FROM media WHERE owner_id=$1::uuid)
             OR payload->>'exportId' IN (SELECT id::text FROM data_exports WHERE user_id=$1::uuid)
             OR payload->>'requestId' IN (SELECT id::text FROM friend_requests WHERE sender_id=$1::uuid OR receiver_id=$1::uuid)
             OR payload->>'encouragementId' IN (SELECT id::text FROM encouragements WHERE sender_id=$1::uuid OR owner_id=$1::uuid)`,
          [item.user_id],
        );
        await client.query("DELETE FROM media WHERE owner_id=$1", [
          item.user_id,
        ]);
        await client.query("DELETE FROM plans WHERE owner_id=$1", [
          item.user_id,
        ]);
        await client.query(
          "DELETE FROM auth_idempotency_keys WHERE expires_at<=now()",
        );
        await client.query(
          "DELETE FROM auth_challenges WHERE phone_lookup_hash=$1",
          [found.rows[0].phone_lookup_hash],
        );
        await client.query(
          `INSERT INTO deletion_tombstones(subject_hash,completed_at,backup_replay_until,attempt_count,last_error_code)
           VALUES($1,now(),now()+interval '365 days',$2,$3)
           ON CONFLICT(subject_hash) DO UPDATE SET completed_at=excluded.completed_at,
             backup_replay_until=greatest(deletion_tombstones.backup_replay_until,excluded.backup_replay_until),
             attempt_count=excluded.attempt_count,last_error_code=excluded.last_error_code`,
          [
            found.rows[0].phone_lookup_hash,
            Math.min(20, (audit.rows[0]?.attempts ?? 0) + 1),
            audit.rows[0]?.last_error_code ?? null,
          ],
        );
        await client.query("DELETE FROM users WHERE id=$1", [item.user_id]);
        return true;
      });
      if (removed) completed++;
    } catch {
      await pool.query(
        `UPDATE deletion_jobs SET status='failed',attempts=least(attempts+1,20),
           last_error_code='ACCOUNT_DELETE_FAILED',updated_at=now() WHERE user_id=$1`,
        [item.user_id],
      );
      throw new Error("Account deletion sweep failed");
    }
  }
  return completed;
}

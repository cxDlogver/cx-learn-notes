import type { PoolClient } from "pg";
import type { SyncChange } from "@plan-checkin/contracts";

export async function appendUserChange(
  client: PoolClient,
  userId: string,
  entityType: SyncChange["entityType"],
  entityId: string,
  operation: SyncChange["operation"],
  payload: Record<string, unknown> | null = null,
): Promise<number> {
  await client.query(
    "INSERT INTO user_sync_counters (user_id) VALUES ($1) ON CONFLICT DO NOTHING",
    [userId],
  );
  const next = await client.query<{ seq: number | string }>(
    "UPDATE user_sync_counters SET next_seq = next_seq + 1 WHERE user_id = $1 RETURNING next_seq - 1 AS seq",
    [userId],
  );
  const sequence = Number(next.rows[0]!.seq);
  await client.query(
    `INSERT INTO change_log (user_id, seq, entity_type, entity_id, operation, payload_min)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, sequence, entityType, entityId, operation, payload],
  );
  return sequence;
}

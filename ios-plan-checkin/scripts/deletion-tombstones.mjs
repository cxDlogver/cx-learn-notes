import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHmac, timingSafeEqual } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import process from "node:process";
import pg from "pg";

const mode = process.argv[2];
if (!["export", "apply", "check"].includes(mode))
  throw new Error("Use export, apply or check.");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
if (mode !== "check" && !process.env.TOMBSTONE_FILE)
  throw new Error("TOMBSTONE_FILE is required.");
if (
  mode !== "check" &&
  (!process.env.TOMBSTONE_SIGNING_KEY ||
    process.env.TOMBSTONE_SIGNING_KEY.length < 32)
)
  throw new Error("TOMBSTONE_SIGNING_KEY must contain at least 32 characters.");

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 2,
});
const sign = (payload) =>
  createHmac("sha256", process.env.TOMBSTONE_SIGNING_KEY)
    .update(JSON.stringify(payload))
    .digest("hex");
try {
  if (mode === "export") {
    const records = await pool.query(
      `SELECT encode(subject_hash,'hex') AS subject_hash,completed_at,backup_replay_until,attempt_count,last_error_code
       FROM deletion_tombstones ORDER BY subject_hash`,
    );
    const payload = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      records: records.rows.map((row) => ({
        subjectHash: row.subject_hash,
        completedAt: row.completed_at.toISOString(),
        backupReplayUntil: row.backup_replay_until.toISOString(),
        attemptCount: row.attempt_count,
        lastErrorCode: row.last_error_code,
      })),
    };
    await writeFile(
      process.env.TOMBSTONE_FILE,
      JSON.stringify({ payload, signature: sign(payload) }) + "\n",
      { encoding: "utf8", mode: 0o600, flag: "wx" },
    );
    process.stdout.write(
      `Exported ${payload.records.length} deletion tombstones.\n`,
    );
  } else if (mode === "apply") {
    const envelope = JSON.parse(
      await readFile(process.env.TOMBSTONE_FILE, "utf8"),
    );
    const payload = envelope.payload;
    const expected = Buffer.from(sign(payload), "hex");
    const actual = Buffer.from(envelope.signature ?? "", "hex");
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
      throw new Error("Deletion tombstone signature mismatch.");
    assert.equal(payload.schemaVersion, 1);
    assert.ok(Array.isArray(payload.records));
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const row of payload.records) {
        if (
          !/^[a-f0-9]{64}$/.test(row.subjectHash) ||
          !Number.isFinite(Date.parse(row.completedAt)) ||
          !Number.isFinite(Date.parse(row.backupReplayUntil))
        )
          throw new Error("Invalid deletion tombstone record.");
        await client.query(
          `INSERT INTO deletion_tombstones(subject_hash,completed_at,backup_replay_until,attempt_count,last_error_code)
           VALUES(decode($1,'hex'),$2,$3,$4,$5)
           ON CONFLICT(subject_hash) DO UPDATE SET
             completed_at=greatest(deletion_tombstones.completed_at,excluded.completed_at),
             backup_replay_until=greatest(deletion_tombstones.backup_replay_until,excluded.backup_replay_until),
             attempt_count=greatest(deletion_tombstones.attempt_count,excluded.attempt_count),
             last_error_code=coalesce(excluded.last_error_code,deletion_tombstones.last_error_code)`,
          [
            row.subjectHash,
            row.completedAt,
            row.backupReplayUntil,
            row.attemptCount ?? 0,
            row.lastErrorCode ?? null,
          ],
        );
      }
      const revived = await client.query(
        `UPDATE users u SET status='deletion_pending',deletion_due_at=now()-interval '1 second',updated_at=now()
         FROM deletion_tombstones t WHERE u.phone_lookup_hash=t.subject_hash
           AND u.created_at<=t.completed_at
         RETURNING u.id`,
      );
      for (const row of revived.rows) {
        await client.query(
          "UPDATE sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL",
          [row.id],
        );
        await client.query(
          "UPDATE devices SET notifications_enabled=false,apns_token_ciphertext=NULL,push_token_hash=NULL WHERE user_id=$1",
          [row.id],
        );
        await client.query(
          `UPDATE plan_shares SET revoked_at=now(),revision=revision+1
           WHERE revoked_at IS NULL AND (friend_id=$1 OR plan_id IN (SELECT id FROM plans WHERE owner_id=$1))`,
          [row.id],
        );
        await client.query(
          "UPDATE data_exports SET expires_at=now() WHERE user_id=$1 AND status='ready'",
          [row.id],
        );
        await client.query(
          `INSERT INTO deletion_jobs(user_id,due_at) VALUES($1,now()-interval '1 second')
           ON CONFLICT(user_id) DO UPDATE SET status='pending',due_at=excluded.due_at,updated_at=now()`,
          [row.id],
        );
      }
      await client.query("COMMIT");
      process.stdout.write(
        `Applied ${payload.records.length} tombstones; quarantined ${revived.rows.length} restored accounts.\n`,
      );
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  } else {
    const revived = await pool.query(
      `SELECT count(*)::integer AS n FROM users u JOIN deletion_tombstones t
       ON u.phone_lookup_hash=t.subject_hash AND u.created_at<=t.completed_at`,
    );
    if (revived.rows[0].n)
      throw new Error(
        "Restored deleted accounts remain; run deletion Worker before opening API traffic.",
      );
    process.stdout.write(
      "No tombstoned account remains in the restored database.\n",
    );
  }
} finally {
  await pool.end();
}

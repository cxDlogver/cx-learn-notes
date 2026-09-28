import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import process from "node:process";
import { URL } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(
  await readFile(new URL("db/migrations/manifest.json", root), "utf8"),
);
const db = new PGlite();
try {
  for (const migration of manifest.migrations) {
    const sql = await readFile(
      new URL(`db/migrations/${migration.file}`, root),
      "utf8",
    );
    await db.exec(sql);
  }
  const count = await db.query(
    "SELECT count(*)::integer AS n FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'",
  );
  assert.equal(count.rows[0].n, 32);

  const user = await db.query(
    "INSERT INTO users (phone_ciphertext, phone_lookup_hash) VALUES (decode('01','hex'), decode('02','hex')) RETURNING id",
  );
  const ownerId = user.rows[0].id;
  const plan = await db.query(
    `INSERT INTO plans (owner_id, kind, direction, title, timezone, start_date)
     VALUES ($1, 'fixed', 'do', '跑步', 'Asia/Shanghai', '2026-09-27') RETURNING id`,
    [ownerId],
  );
  const planId = plan.rows[0].id;
  const rule = await db.query(
    `INSERT INTO plan_rule_versions (plan_id, version, effective_date, weekdays)
     VALUES ($1, 1, '2026-09-27', ARRAY[7]::SMALLINT[]) RETURNING id`,
    [planId],
  );
  const ruleId = rule.rows[0].id;
  await db.query(
    `INSERT INTO checkins (plan_id, owner_id, business_date, result, rule_version_id)
     VALUES ($1, $2, '2026-09-27', 'success', $3)`,
    [planId, ownerId, ruleId],
  );
  await assert.rejects(
    db.query(
      `INSERT INTO checkins (plan_id, owner_id, business_date, result, rule_version_id)
       VALUES ($1, $2, '2026-09-27', 'failure', $3)`,
      [planId, ownerId, ruleId],
    ),
    /duplicate key/i,
  );
  await assert.rejects(
    db.query("UPDATE plans SET timezone = 'Europe/London' WHERE id = $1", [
      planId,
    ]),
    /immutable/i,
  );
  await assert.rejects(
    db.query("UPDATE plan_rule_versions SET version = 2 WHERE id = $1", [
      ruleId,
    ]),
    /append-only/i,
  );
  await assert.rejects(
    db.query(
      `INSERT INTO plans (owner_id, kind, direction, title, timezone, start_date, due_date)
       VALUES ($1, 'one_time', 'avoid', 'Invalid', 'Asia/Shanghai', '2026-09-27', '2026-09-28')`,
      [ownerId],
    ),
    /check constraint/i,
  );
  process.stdout.write(
    "Migration smoke passed: 32 tables, unique checkin, immutable timezone/rules and one-time direction.\n",
  );
} finally {
  await db.close();
}

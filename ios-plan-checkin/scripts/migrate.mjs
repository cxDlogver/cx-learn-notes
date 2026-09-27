import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import process from "node:process";
import { URL } from "node:url";
import pg from "pg";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(
  await readFile(new URL("db/migrations/manifest.json", root), "utf8"),
);
const migrations = await Promise.all(
  manifest.migrations.map(async ({ file }) => {
    const sql = await readFile(new URL(`db/migrations/${file}`, root), "utf8");
    return {
      file,
      sql,
      sha256: createHash("sha256").update(sql).digest("hex"),
    };
  }),
);

if (process.argv.includes("--plan")) {
  for (const migration of migrations) {
    process.stdout.write(`${migration.file} ${migration.sha256}\n`);
  }
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be injected for database migration.");
}
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query("SELECT pg_advisory_lock(741001)");
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      file TEXT PRIMARY KEY,
      sha256 TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  for (const migration of migrations) {
    const existing = await client.query(
      "SELECT sha256 FROM schema_migrations WHERE file = $1",
      [migration.file],
    );
    if (existing.rowCount) {
      if (existing.rows[0].sha256 !== migration.sha256) {
        throw new Error(`Applied migration changed: ${migration.file}`);
      }
      continue;
    }
    await client.query("BEGIN");
    try {
      await client.query(migration.sql);
      await client.query(
        "INSERT INTO schema_migrations (file, sha256) VALUES ($1, $2)",
        [migration.file, migration.sha256],
      );
      await client.query("COMMIT");
      process.stdout.write(`Applied ${migration.file}\n`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
} finally {
  await client
    .query("SELECT pg_advisory_unlock(741001)")
    .catch(() => undefined);
  await client.end();
}

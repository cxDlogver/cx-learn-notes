import { readFile } from "node:fs/promises";
import process from "node:process";
import { URL } from "node:url";
import { parse } from "libpg-query";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(
  await readFile(new URL("db/migrations/manifest.json", root), "utf8"),
);
const names = new Set();
let allSql = "";
for (const migration of manifest.migrations) {
  if (migration.phase !== "expand")
    throw new Error(`Unexpected migration phase: ${migration.file}`);
  const sql = await readFile(
    new URL(`db/migrations/${migration.file}`, root),
    "utf8",
  );
  try {
    await parse(sql);
  } catch (error) {
    throw new Error(`PostgreSQL 17 parser rejected ${migration.file}`, {
      cause: error,
    });
  }
  // Dropping a constraint can relax a rule without removing data; column/table drops cannot.
  if (
    /\b(?:DROP\s+TABLE|TRUNCATE|ALTER\s+TABLE\s+\w+\s+DROP\s+COLUMN)\b/i.test(
      sql,
    )
  ) {
    throw new Error(
      `Destructive statement in expand migration: ${migration.file}`,
    );
  }
  for (const match of sql.matchAll(/\bCREATE\s+TABLE\s+(\w+)/gi)) {
    if (names.has(match[1])) throw new Error(`Duplicate table: ${match[1]}`);
    names.add(match[1]);
  }
  allSql += `${sql}\n`;
}
const requiredTables = [
  "users",
  "auth_challenges",
  "auth_idempotency_keys",
  "phone_change_requests",
  "sessions",
  "devices",
  "groups",
  "plans",
  "plan_rule_versions",
  "plan_lifecycle_events",
  "checkins",
  "checkin_revisions",
  "one_time_resolutions",
  "one_time_resolution_revisions",
  "media",
  "friend_requests",
  "friendships",
  "blocks",
  "plan_shares",
  "encouragements",
  "reminder_settings",
  "idempotency_keys",
  "change_log",
  "user_sync_counters",
  "sync_acknowledgements",
  "worker_jobs",
  "export_jobs",
  "deletion_jobs",
  "deletion_tombstones",
];
for (const table of requiredTables) {
  if (!names.has(table)) throw new Error(`Missing core schema table: ${table}`);
}
const requiredConstraints = [
  /UNIQUE\s*\(plan_id,\s*business_date\)/i,
  /UNIQUE\s*\(plan_id,\s*version\)/i,
  /PRIMARY KEY\s*\(user_id,\s*seq\)/i,
  /CHECK\s*\(result IN \('success', 'failure', 'skip'\)\)/i,
  /tr_plan_timezone_immutable/i,
];
for (const constraint of requiredConstraints) {
  if (!constraint.test(allSql))
    throw new Error(`Missing required database constraint: ${constraint}`);
}
process.stdout.write(
  `SQL static catalog passed: ${names.size} tables, ${manifest.migrations.length} migrations.\n`,
);

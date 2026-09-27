export interface LocalMigration {
  version: number;
  sql: string;
}

/** Keep every migration immutable after release; user_version advances only in the same transaction. */
export const localMigrations: readonly LocalMigration[] = [
  {
    version: 1,
    sql: `
CREATE TABLE local_plans (
  id TEXT PRIMARY KEY,
  revision INTEGER NOT NULL CHECK (revision >= 0),
  lifecycle TEXT NOT NULL CHECK (lifecycle IN ('active','paused','archived','deleted')),
  payload TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE local_rule_versions (
  plan_id TEXT NOT NULL REFERENCES local_plans(id) ON DELETE CASCADE,
  version INTEGER NOT NULL CHECK (version > 0),
  effective_date TEXT NOT NULL,
  payload TEXT NOT NULL,
  PRIMARY KEY (plan_id, version)
);
CREATE TABLE local_checkins (
  plan_id TEXT NOT NULL REFERENCES local_plans(id) ON DELETE CASCADE,
  business_date TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK (revision >= 0),
  sync_state TEXT NOT NULL CHECK (sync_state IN ('synced','local','syncing','failed','conflict')),
  payload TEXT NOT NULL,
  operation_id TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (plan_id, business_date)
);
CREATE TABLE local_outbox (
  operation_id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  business_date TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('create','update','backfill','resolve_conflict')),
  status TEXT NOT NULL CHECK (status IN ('pending','sending','retry','conflict','failed')),
  retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  next_attempt_at TEXT,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE local_media (
  id TEXT PRIMARY KEY,
  operation_id TEXT,
  file_uri TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL CHECK (byte_size >= 0),
  sha256 TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('staged','uploading','uploaded','failed')),
  remote_id TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE local_sync_cursor (
  scope TEXT PRIMARY KEY,
  cursor TEXT,
  updated_at TEXT NOT NULL
);
CREATE TABLE local_permission_tombstones (
  plan_id TEXT PRIMARY KEY,
  sequence INTEGER NOT NULL CHECK (sequence >= 0),
  updated_at TEXT NOT NULL
);
`,
  },
  {
    version: 2,
    sql: `
CREATE INDEX local_plans_lifecycle_idx ON local_plans(lifecycle, updated_at);
CREATE INDEX local_rules_effective_idx ON local_rule_versions(plan_id, effective_date);
CREATE INDEX local_checkins_date_idx ON local_checkins(business_date, sync_state);
CREATE INDEX local_outbox_ready_idx ON local_outbox(status, next_attempt_at, created_at);
CREATE INDEX local_media_operation_idx ON local_media(operation_id, status);
`,
  },
  {
    version: 3,
    sql: `
ALTER TABLE local_outbox ADD COLUMN last_error_code TEXT;
ALTER TABLE local_outbox ADD COLUMN last_error_message TEXT;
`,
  },
] as const;

export const localSchemaVersion = localMigrations.at(-1)!.version;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_ciphertext BYTEA NOT NULL,
  phone_lookup_hash BYTEA NOT NULL UNIQUE,
  username TEXT,
  username_normalized TEXT GENERATED ALWAYS AS (lower(username)) STORED,
  nickname TEXT,
  avatar_media_id UUID,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deletion_pending', 'deleted')),
  deletion_due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (username IS NULL OR (length(username) BETWEEN 3 AND 30)),
  CHECK ((status = 'deletion_pending') = (deletion_due_at IS NOT NULL))
);
CREATE UNIQUE INDEX ux_users_username_normalized ON users (username_normalized) WHERE username_normalized IS NOT NULL;

CREATE TABLE auth_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_lookup_hash BYTEA NOT NULL,
  phone_ciphertext BYTEA NOT NULL,
  requester_hash BYTEA NOT NULL,
  code_hash BYTEA NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('login', 'change_phone', 'cancel_deletion')),
  attempts SMALLINT NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 10),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at)
);
CREATE INDEX ix_auth_challenges_phone_created ON auth_challenges (phone_lookup_hash, created_at DESC);
CREATE INDEX ix_auth_challenges_requester_created ON auth_challenges (requester_hash, created_at DESC);

CREATE TABLE auth_idempotency_keys (
  key UUID PRIMARY KEY,
  operation TEXT NOT NULL CHECK (operation IN ('sms_challenge', 'sms_verify', 'refresh', 'logout', 'change_phone_challenge', 'change_phone_confirm')),
  request_hash BYTEA NOT NULL,
  response_ciphertext BYTEA NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_auth_idempotency_expiry ON auth_idempotency_keys (expires_at);

CREATE TABLE phone_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  new_phone_ciphertext BYTEA NOT NULL,
  new_phone_lookup_hash BYTEA NOT NULL,
  old_code_hash BYTEA NOT NULL,
  new_code_hash BYTEA NOT NULL,
  attempts SMALLINT NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 10),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at)
);
CREATE INDEX ix_phone_change_user_created ON phone_change_requests (user_id, created_at DESC);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_hash BYTEA NOT NULL UNIQUE,
  device_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rotated_from UUID REFERENCES sessions(id) ON DELETE SET NULL
);
CREATE INDEX ix_sessions_user_active ON sessions (user_id, expires_at) WHERE revoked_at IS NULL;

CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  apns_token_ciphertext BYTEA,
  push_token_hash BYTEA,
  notifications_enabled BOOLEAN NOT NULL DEFAULT false,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, id)
);
CREATE UNIQUE INDEX ux_devices_push_token_hash ON devices (push_token_hash) WHERE push_token_hash IS NOT NULL;

CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 40),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, owner_id),
  UNIQUE (owner_id, name)
);

CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID,
  kind TEXT NOT NULL CHECK (kind IN ('fixed', 'weekly', 'one_time')),
  direction TEXT NOT NULL CHECK (direction IN ('do', 'avoid')),
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 80),
  timezone TEXT NOT NULL CHECK (length(timezone) BETWEEN 3 AND 64),
  start_date DATE NOT NULL,
  end_date DATE,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived', 'deleted')),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  current_rule_version INTEGER NOT NULL DEFAULT 1 CHECK (current_rule_version >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (id, owner_id),
  FOREIGN KEY (group_id, owner_id) REFERENCES groups(id, owner_id) ON DELETE SET NULL (group_id),
  CHECK (end_date IS NULL OR end_date >= start_date),
  CHECK ((kind = 'one_time' AND direction = 'do' AND due_date IS NOT NULL AND due_date >= start_date AND end_date IS NULL)
      OR (kind <> 'one_time' AND due_date IS NULL)),
  CHECK ((status = 'deleted') = (deleted_at IS NOT NULL))
);
CREATE INDEX ix_plans_owner_status ON plans (owner_id, status, updated_at DESC);
CREATE INDEX ix_plans_group ON plans (group_id, status) WHERE group_id IS NOT NULL;

CREATE FUNCTION forbid_plan_timezone_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.timezone IS DISTINCT FROM OLD.timezone THEN
    RAISE EXCEPTION 'plan timezone is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tr_plan_timezone_immutable BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION forbid_plan_timezone_change();

CREATE TABLE plan_rule_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  version INTEGER NOT NULL CHECK (version >= 1),
  effective_date DATE NOT NULL,
  weekdays SMALLINT[],
  weekly_target SMALLINT,
  numeric_config JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (plan_id, version),
  UNIQUE (plan_id, effective_date),
  UNIQUE (id, plan_id),
  CHECK ((weekdays IS NOT NULL AND cardinality(weekdays) BETWEEN 1 AND 7 AND weekly_target IS NULL)
      OR (weekdays IS NULL AND weekly_target BETWEEN 1 AND 7)
      OR (weekdays IS NULL AND weekly_target IS NULL)),
  CHECK (weekdays IS NULL OR weekdays <@ ARRAY[1,2,3,4,5,6,7]::SMALLINT[])
);
CREATE INDEX ix_rule_versions_effective ON plan_rule_versions (plan_id, effective_date DESC);
CREATE FUNCTION forbid_rule_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'rule versions are append-only' USING ERRCODE = '23514';
END $$;
CREATE TRIGGER tr_rule_immutable BEFORE UPDATE ON plan_rule_versions
  FOR EACH ROW EXECUTE FUNCTION forbid_rule_mutation();

CREATE TABLE plan_lifecycle_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL CHECK (seq >= 1),
  action TEXT NOT NULL CHECK (action IN ('pause', 'resume', 'archive', 'delete')),
  effective_at TIMESTAMPTZ NOT NULL,
  business_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (plan_id, seq)
);
CREATE INDEX ix_lifecycle_plan_date ON plan_lifecycle_events (plan_id, business_date, seq);

CREATE TABLE checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL,
  owner_id UUID NOT NULL,
  business_date DATE NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('success', 'failure', 'skip')),
  note TEXT,
  failure_reason TEXT,
  numeric_value NUMERIC(18, 6),
  numeric_unit TEXT,
  rule_version_id UUID NOT NULL,
  is_backfilled BOOLEAN NOT NULL DEFAULT false,
  is_revised BOOLEAN NOT NULL DEFAULT false,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (plan_id, owner_id) REFERENCES plans(id, owner_id) ON DELETE CASCADE,
  FOREIGN KEY (rule_version_id, plan_id) REFERENCES plan_rule_versions(id, plan_id),
  UNIQUE (plan_id, business_date),
  CHECK ((numeric_value IS NULL) = (numeric_unit IS NULL))
);
CREATE INDEX ix_checkins_owner_date ON checkins (owner_id, business_date DESC);
CREATE INDEX ix_checkins_plan_date ON checkins (plan_id, business_date DESC);

CREATE TABLE checkin_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id UUID NOT NULL REFERENCES checkins(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL CHECK (revision >= 1),
  before_snapshot JSONB,
  after_snapshot JSONB NOT NULL,
  actor_id UUID NOT NULL REFERENCES users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT NOT NULL CHECK (reason IN ('create', 'edit', 'conflict_resolution')),
  UNIQUE (checkin_id, revision)
);

CREATE TABLE one_time_resolutions (
  plan_id UUID PRIMARY KEY REFERENCES plans(id) ON DELETE CASCADE,
  resolution TEXT NOT NULL CHECK (resolution IN ('completed', 'failed', 'cancelled')),
  resolved_business_date DATE NOT NULL,
  resolved_at TIMESTAMPTZ NOT NULL,
  note TEXT,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE one_time_resolution_revisions (
  plan_id UUID NOT NULL REFERENCES one_time_resolutions(plan_id) ON DELETE CASCADE,
  revision INTEGER NOT NULL CHECK (revision >= 1),
  before_snapshot JSONB,
  after_snapshot JSONB NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT NOT NULL CHECK (reason IN ('create', 'correction')),
  PRIMARY KEY (plan_id, revision)
);

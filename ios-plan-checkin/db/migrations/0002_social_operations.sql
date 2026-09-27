CREATE TABLE media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  checkin_id UUID REFERENCES checkins(id) ON DELETE SET NULL,
  one_time_plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
  object_key TEXT NOT NULL UNIQUE CHECK (length(object_key) BETWEEN 16 AND 200),
  sha256 BYTEA,
  mime TEXT NOT NULL CHECK (mime IN ('image/jpeg', 'image/png', 'image/heic', 'image/webp')),
  bytes BIGINT NOT NULL CHECK (bytes BETWEEN 1 AND 20971520),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  CHECK (status <> 'ready' OR num_nonnulls(checkin_id, one_time_plan_id) = 1),
  CHECK ((status = 'deleted') = (deleted_at IS NOT NULL))
);
CREATE INDEX ix_media_owner_status ON media (owner_id, status, created_at DESC);
CREATE INDEX ix_media_pending ON media (created_at) WHERE status = 'pending';

CREATE TABLE friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  CHECK (sender_id <> receiver_id)
);
CREATE UNIQUE INDEX ux_friend_requests_pending_pair ON friend_requests (sender_id, receiver_id) WHERE status = 'pending';
CREATE INDEX ix_friend_requests_receiver ON friend_requests (receiver_id, status, created_at DESC);

CREATE TABLE friendships (
  user_low UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_high UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_low, user_high),
  CHECK (user_low < user_high)
);
CREATE INDEX ix_friendships_high ON friendships (user_high, user_low);

CREATE TABLE blocks (
  blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
CREATE INDEX ix_blocks_blocked ON blocks (blocked_id, blocker_id);

CREATE TABLE plan_shares (
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  PRIMARY KEY (plan_id, friend_id)
);
CREATE INDEX ix_shares_friend_active ON plan_shares (friend_id, revoked_at, plan_id);

CREATE TABLE encouragements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id UUID NOT NULL REFERENCES checkins(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (sender_id <> owner_id)
);
CREATE INDEX ix_encouragements_checkin_created ON encouragements (checkin_id, created_at DESC);

CREATE TABLE reminder_settings (
  plan_id UUID PRIMARY KEY REFERENCES plans(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  weekdays SMALLINT[],
  time_local TIME WITHOUT TIME ZONE,
  lead_days SMALLINT CHECK (lead_days IN (0, 1, 3)),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (weekdays IS NULL OR weekdays <@ ARRAY[1,2,3,4,5,6,7]::SMALLINT[])
);

CREATE TABLE idempotency_keys (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key UUID NOT NULL,
  request_hash BYTEA NOT NULL,
  status_code SMALLINT NOT NULL CHECK (status_code BETWEEN 200 AND 599),
  response_json JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);
CREATE INDEX ix_idempotency_expiry ON idempotency_keys (expires_at);

CREATE TABLE user_sync_counters (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  next_seq BIGINT NOT NULL DEFAULT 1 CHECK (next_seq >= 1)
);
CREATE TABLE change_log (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seq BIGINT NOT NULL CHECK (seq >= 1),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('plan', 'checkin', 'group', 'share', 'friend', 'user')),
  entity_id UUID NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('upsert', 'delete', 'revoke')),
  payload_min JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, seq)
);
CREATE INDEX ix_change_log_created ON change_log (created_at);

CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  friend_requests BOOLEAN NOT NULL DEFAULT true,
  shared_updates BOOLEAN NOT NULL DEFAULT true,
  encouragements BOOLEAN NOT NULL DEFAULT true,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE worker_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (name IN ('send-social-notification', 'prepare-data-export', 'finalize-account-deletion', 'cleanup-orphan-media')),
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
  attempts SMALLINT NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 20),
  run_after TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_until TIMESTAMPTZ,
  dedupe_key TEXT,
  last_error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_worker_jobs_dedupe ON worker_jobs (name, dedupe_key) WHERE dedupe_key IS NOT NULL AND status IN ('queued', 'running');
CREATE INDEX ix_worker_jobs_ready ON worker_jobs (run_after, created_at) WHERE status IN ('queued', 'failed');

CREATE TABLE export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'ready', 'failed', 'expired')),
  progress SMALLINT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  object_key TEXT,
  expires_at TIMESTAMPTZ,
  failure_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_export_jobs_user_created ON export_jobs (user_id, created_at DESC);

CREATE TABLE deletion_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'cancelled', 'running', 'completed', 'failed')),
  due_at TIMESTAMPTZ NOT NULL,
  attempts SMALLINT NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 20),
  completed_at TIMESTAMPTZ,
  last_error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_deletion_jobs_due ON deletion_jobs (due_at) WHERE status IN ('pending', 'failed');

CREATE TABLE deletion_tombstones (
  subject_hash BYTEA PRIMARY KEY,
  completed_at TIMESTAMPTZ NOT NULL,
  backup_replay_until TIMESTAMPTZ NOT NULL
);

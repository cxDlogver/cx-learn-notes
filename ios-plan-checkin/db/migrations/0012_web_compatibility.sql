-- Web expansion. Keep every iOS column and legacy endpoint interpretation intact.
ALTER TABLE sessions ADD COLUMN client_channel TEXT NOT NULL DEFAULT 'ios'
  CHECK (client_channel IN ('ios', 'web'));
CREATE INDEX ix_sessions_user_channel_active ON sessions(user_id, client_channel, expires_at)
  WHERE revoked_at IS NULL;

-- reminder_settings remains the shared schedule; delivery preferences are per channel.
CREATE TABLE channel_notification_preferences (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('ios', 'web')),
  plan_enabled BOOLEAN NOT NULL DEFAULT true,
  friend_requests BOOLEAN NOT NULL DEFAULT true,
  shared_updates BOOLEAN NOT NULL DEFAULT true,
  encouragements BOOLEAN NOT NULL DEFAULT true,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, channel)
);
INSERT INTO channel_notification_preferences
  (user_id, channel, friend_requests, shared_updates, encouragements, revision, updated_at)
SELECT user_id, 'ios', friend_requests, shared_updates, encouragements, revision, updated_at
FROM notification_preferences;

CREATE TABLE web_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  browser_device_id TEXT NOT NULL CHECK (length(browser_device_id) BETWEEN 8 AND 128),
  endpoint_hash BYTEA NOT NULL UNIQUE CHECK (octet_length(endpoint_hash) = 32),
  endpoint_ciphertext BYTEA NOT NULL CHECK (octet_length(endpoint_ciphertext) > 0),
  p256dh_ciphertext BYTEA NOT NULL CHECK (octet_length(p256dh_ciphertext) > 0),
  auth_ciphertext BYTEA NOT NULL CHECK (octet_length(auth_ciphertext) > 0),
  enabled BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_failure_code TEXT,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, browser_device_id),
  CHECK (revoked_at IS NULL OR enabled = false)
);
CREATE INDEX ix_web_push_active_user ON web_push_subscriptions(user_id, created_at DESC)
  WHERE enabled AND revoked_at IS NULL;

CREATE TABLE inbox_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('friend_request', 'friend_accepted', 'share', 'shared_update', 'encouragement')),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  subject_id UUID,
  sanitized_payload JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(sanitized_payload) = 'object' AND octet_length(sanitized_payload::text) <= 4096),
  business_event_key TEXT NOT NULL CHECK (length(business_event_key) BETWEEN 1 AND 160),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  UNIQUE (recipient_user_id, business_event_key)
);
CREATE INDEX ix_inbox_recipient_created ON inbox_messages(recipient_user_id, created_at DESC, id DESC);
CREATE INDEX ix_inbox_unread ON inbox_messages(recipient_user_id, created_at DESC)
  WHERE read_at IS NULL;

-- One optional numeric item per plan, with append-only effective-date versions.
CREATE TABLE plan_numeric_config_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  version INTEGER NOT NULL CHECK (version >= 1),
  effective_from DATE NOT NULL,
  label TEXT NOT NULL CHECK (length(trim(label)) BETWEEN 1 AND 40),
  unit TEXT NOT NULL CHECK (length(trim(unit)) BETWEEN 1 AND 20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (plan_id, version),
  UNIQUE (plan_id, effective_from),
  UNIQUE (id, plan_id)
);
CREATE INDEX ix_numeric_config_effective ON plan_numeric_config_versions(plan_id, effective_from DESC);
CREATE TRIGGER tr_numeric_config_immutable BEFORE UPDATE ON plan_numeric_config_versions
  FOR EACH ROW EXECUTE FUNCTION forbid_rule_mutation();

ALTER TABLE checkins ADD COLUMN numeric_label TEXT
  CHECK (numeric_label IS NULL OR length(trim(numeric_label)) BETWEEN 1 AND 40);
ALTER TABLE checkins ADD COLUMN numeric_config_version_id UUID;
ALTER TABLE checkins ADD CONSTRAINT fk_checkins_numeric_config_plan
  FOREIGN KEY (numeric_config_version_id, plan_id)
  REFERENCES plan_numeric_config_versions(id, plan_id);
-- Only recover labels when a historical rule has the same explicit unit.
UPDATE checkins c SET numeric_label = r.numeric_config->>'label'
FROM plan_rule_versions r
WHERE c.rule_version_id = r.id AND c.numeric_value IS NOT NULL
  AND c.numeric_label IS NULL AND jsonb_typeof(r.numeric_config) = 'object'
  AND r.numeric_config ? 'label' AND r.numeric_config ? 'unit'
  AND r.numeric_config->>'unit' = c.numeric_unit
  AND length(trim(r.numeric_config->>'label')) BETWEEN 1 AND 40;

ALTER TABLE one_time_resolutions ADD COLUMN numeric_value NUMERIC(18, 6);
ALTER TABLE one_time_resolutions ADD COLUMN numeric_unit TEXT;
ALTER TABLE one_time_resolutions ADD COLUMN numeric_label TEXT
  CHECK (numeric_label IS NULL OR length(trim(numeric_label)) BETWEEN 1 AND 40);
ALTER TABLE one_time_resolutions ADD COLUMN numeric_config_version_id UUID;
ALTER TABLE one_time_resolutions ADD CONSTRAINT ck_one_time_numeric_pair
  CHECK ((numeric_value IS NULL) = (numeric_unit IS NULL));
ALTER TABLE one_time_resolutions ADD CONSTRAINT fk_one_time_numeric_config_plan
  FOREIGN KEY (numeric_config_version_id, plan_id)
  REFERENCES plan_numeric_config_versions(id, plan_id);

-- Existing APNs jobs remain valid; these names are consumed by later Web workers.
ALTER TABLE worker_jobs DROP CONSTRAINT worker_jobs_name_check;
ALTER TABLE worker_jobs ADD CONSTRAINT worker_jobs_name_check
  CHECK (name IN ('send-social-notification', 'prepare-data-export',
    'finalize-account-deletion', 'cleanup-orphan-media',
    'send-web-push', 'send-plan-reminder'));

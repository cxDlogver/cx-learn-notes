CREATE TABLE data_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','ready','failed','expired')),
  object_key TEXT UNIQUE,
  file_bytes BIGINT CHECK (file_bytes IS NULL OR file_bytes BETWEEN 1 AND 2147483648),
  file_sha256 BYTEA,
  file_count INTEGER CHECK (file_count IS NULL OR file_count BETWEEN 1 AND 20000),
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  CHECK ((status = 'ready') = (object_key IS NOT NULL AND file_bytes IS NOT NULL AND file_sha256 IS NOT NULL AND expires_at IS NOT NULL))
);
CREATE INDEX ix_data_exports_user_created ON data_exports(user_id, created_at DESC);
CREATE INDEX ix_data_exports_expiry ON data_exports(expires_at) WHERE status='ready';
CREATE UNIQUE INDEX ux_data_exports_active_user ON data_exports(user_id)
  WHERE status IN ('queued','running');

CREATE TABLE data_export_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  export_id UUID NOT NULL REFERENCES data_exports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_id TEXT,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_data_export_access_export ON data_export_access(export_id, accessed_at DESC);

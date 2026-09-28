CREATE TABLE rate_limit_buckets (
  scope_hash BYTEA NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  hits INTEGER NOT NULL DEFAULT 1 CHECK (hits >= 1),
  PRIMARY KEY(scope_hash,window_start)
);
CREATE INDEX ix_rate_limit_buckets_expiry ON rate_limit_buckets(window_start);

CREATE TABLE worker_heartbeats (
  worker_name TEXT PRIMARY KEY,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

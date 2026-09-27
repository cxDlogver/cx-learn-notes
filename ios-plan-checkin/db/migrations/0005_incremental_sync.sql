CREATE TABLE sync_acknowledgements (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id UUID NOT NULL,
  last_seq BIGINT NOT NULL CHECK (last_seq >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, device_id)
);
CREATE INDEX ix_sync_acknowledgements_updated ON sync_acknowledgements (updated_at);

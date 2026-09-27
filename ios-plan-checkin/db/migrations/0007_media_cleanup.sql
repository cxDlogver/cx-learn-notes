ALTER TABLE media ADD COLUMN object_deleted_at TIMESTAMPTZ;

CREATE INDEX ix_media_object_cleanup ON media(status, created_at)
  WHERE object_deleted_at IS NULL;

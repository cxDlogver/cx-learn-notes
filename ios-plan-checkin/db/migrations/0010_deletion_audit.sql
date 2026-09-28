CREATE TABLE plan_deletion_jobs (
  plan_id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','failed','completed')),
  attempts SMALLINT NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 20),
  last_error_code TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX ix_plan_deletion_jobs_open ON plan_deletion_jobs(requested_at)
  WHERE status IN ('pending','failed');

ALTER TABLE deletion_tombstones ADD COLUMN attempt_count SMALLINT NOT NULL DEFAULT 0
  CHECK (attempt_count BETWEEN 0 AND 20);
ALTER TABLE deletion_tombstones ADD COLUMN last_error_code TEXT;

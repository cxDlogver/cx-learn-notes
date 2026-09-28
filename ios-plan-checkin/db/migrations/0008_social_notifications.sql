ALTER TABLE encouragements ADD COLUMN kind TEXT NOT NULL DEFAULT 'message'
  CHECK (kind IN ('emoji','message'));
CREATE INDEX ix_encouragements_owner_created ON encouragements(owner_id, created_at DESC);
CREATE INDEX ix_encouragements_sender_created ON encouragements(sender_id, created_at DESC);

-- A business event may create one durable notification job, including after completion.
CREATE UNIQUE INDEX ux_social_notification_event ON worker_jobs(dedupe_key)
  WHERE name='send-social-notification' AND dedupe_key IS NOT NULL;

-- APNs acceptance is tracked per device so a retried job skips accepted devices.
CREATE TABLE notification_deliveries (
  job_id UUID NOT NULL REFERENCES worker_jobs(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  apns_id UUID,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(job_id,device_id)
);

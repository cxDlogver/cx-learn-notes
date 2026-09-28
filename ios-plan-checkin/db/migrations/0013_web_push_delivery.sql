-- Keep Web Push provider acceptance separate from APNs devices and delivery.
CREATE TABLE web_push_deliveries (
  job_id UUID NOT NULL REFERENCES worker_jobs(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES web_push_subscriptions(id) ON DELETE CASCADE,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (job_id, subscription_id)
);

-- Business event and reminder slot deduplication must survive job completion.
CREATE UNIQUE INDEX ux_worker_jobs_web_push_event ON worker_jobs(dedupe_key)
  WHERE name='send-web-push' AND dedupe_key IS NOT NULL;
CREATE UNIQUE INDEX ux_worker_jobs_plan_reminder_slot ON worker_jobs(dedupe_key)
  WHERE name='send-plan-reminder' AND dedupe_key IS NOT NULL;

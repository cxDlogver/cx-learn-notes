CREATE TABLE checkin_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  business_date DATE NOT NULL,
  current_revision INTEGER NOT NULL CHECK (current_revision >= 1),
  submitted_summary JSONB NOT NULL,
  client_operation_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  UNIQUE (owner_id, client_operation_id),
  CHECK (expires_at > created_at)
);
CREATE INDEX ix_checkin_conflicts_plan_date ON checkin_conflicts (plan_id, business_date, created_at DESC);

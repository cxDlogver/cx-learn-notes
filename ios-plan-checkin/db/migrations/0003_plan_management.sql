ALTER TABLE groups ADD COLUMN revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1);
ALTER TABLE plans ADD COLUMN description TEXT CHECK (description IS NULL OR length(description) <= 1000);
ALTER TABLE plan_rule_versions DROP CONSTRAINT plan_rule_versions_plan_id_effective_date_key;
CREATE INDEX ix_rule_versions_order ON plan_rule_versions (plan_id, version DESC);

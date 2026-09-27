ALTER TABLE checkin_revisions
  ADD COLUMN resolution_of_conflict_id UUID REFERENCES checkin_conflicts(id);

CREATE UNIQUE INDEX ix_checkin_revisions_conflict_resolution
  ON checkin_revisions(resolution_of_conflict_id)
  WHERE resolution_of_conflict_id IS NOT NULL;

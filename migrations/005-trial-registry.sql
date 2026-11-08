ALTER TABLE account_access
  ADD COLUMN trial_decision_id text,
  ADD COLUMN trial_schema_version integer,
  ADD COLUMN trial_scope text,
  ADD COLUMN trial_status text NOT NULL DEFAULT 'pending'
    CHECK (trial_status IN ('pending', 'reconciled', 'review')),
  ADD CONSTRAINT reconciled_trial_has_evidence CHECK (
    trial_status <> 'reconciled' OR (
      trial_started_at IS NOT NULL AND trial_decision_id IS NOT NULL
      AND trial_schema_version IS NOT DISTINCT FROM 1 AND trial_scope IS NOT NULL
    )
  );

UPDATE account_access SET trial_status = 'review' WHERE trial_started_at IS NOT NULL;

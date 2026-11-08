ALTER TABLE workspaces ADD COLUMN last_operation_sequence bigint NOT NULL DEFAULT 0
  CHECK (last_operation_sequence BETWEEN 0 AND 9007199254740991);

CREATE TABLE workspace_operation_receipts (
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  operation_sequence bigint NOT NULL CHECK (operation_sequence BETWEEN 1 AND 9007199254740991),
  operation_id text NOT NULL CHECK (operation_id ~ '^[A-Za-z0-9_-]{1,128}$'),
  fingerprint text NOT NULL CHECK (fingerprint ~ '^[a-f0-9]{64}$'),
  committed_revision bigint NOT NULL CHECK (committed_revision BETWEEN 1 AND 9007199254740991),
  public_result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (workspace_id, operation_sequence),
  UNIQUE (workspace_id, operation_id)
);

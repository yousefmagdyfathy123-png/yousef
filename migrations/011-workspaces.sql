CREATE TABLE workspaces (
  id uuid PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  -- Session identifiers survive revocation so a later explicit resume can transfer the binding.
  session_id text NOT NULL,
  tab_id text NOT NULL CHECK (tab_id ~ '^[A-Za-z0-9_-]{1,128}$'),
  binding_revision bigint NOT NULL DEFAULT 0 CHECK (binding_revision BETWEEN 0 AND 9007199254740991),
  recovery_generation text NOT NULL CHECK (recovery_generation ~ '^[A-Za-z0-9_-]{1,128}$'),
  revision bigint NOT NULL CHECK (revision BETWEEN 0 AND 9007199254740991),
  encoded_state jsonb NOT NULL CHECK (octet_length(encoded_state::text) <= 16777216),
  codec_version integer NOT NULL,
  state_schema_version integer NOT NULL,
  engine_version text NOT NULL,
  catalog_revision text NOT NULL,
  preference_version bigint CHECK (preference_version BETWEEN 0 AND 9007199254740991),
  last_activity_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL
);

CREATE INDEX workspaces_expiry_idx ON workspaces (expires_at);
CREATE INDEX workspaces_owner_idx ON workspaces (user_id);

CREATE FUNCTION keep_workspace_owner() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Workspace owner is immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER workspaces_owner_immutable BEFORE UPDATE OF user_id ON workspaces
FOR EACH ROW EXECUTE FUNCTION keep_workspace_owner();

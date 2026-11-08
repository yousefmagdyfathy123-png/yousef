CREATE TABLE account_access (
  user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  suspended boolean NOT NULL DEFAULT false,
  CHECK (
    (trial_started_at IS NULL AND trial_ends_at IS NULL)
    OR (trial_started_at IS NOT NULL AND trial_ends_at IS NOT NULL
        AND trial_ends_at = trial_started_at + interval '120 hours')
  )
);

CREATE TABLE preferences (
  user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  "values" jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof("values") = 'object'),
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0)
);

CREATE TABLE user_roles (
  user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'admin'))
);

CREATE TABLE audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  subject_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

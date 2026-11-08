CREATE TABLE deletion_requests (
  id uuid PRIMARY KEY,
  user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  requested_at timestamptz NOT NULL,
  due_at timestamptz NOT NULL CHECK (due_at > requested_at),
  reviewed_at timestamptz,
  reviewed_by text REFERENCES "user"(id) ON DELETE SET NULL,
  completed_at timestamptz
);
CREATE UNIQUE INDEX deletion_one_active ON deletion_requests(user_id) WHERE completed_at IS NULL;

CREATE TABLE service_closure (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  announced_at timestamptz NOT NULL,
  shutdown_at timestamptz NOT NULL CHECK (shutdown_at >= announced_at + interval '1440 hours')
);

CREATE TABLE account_notice_outbox (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  recipient text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('closure', 'deletion-completed')),
  body text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  failed_at timestamptz
);

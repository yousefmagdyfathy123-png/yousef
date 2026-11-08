ALTER TABLE entitlement_grants ADD COLUMN state text NOT NULL DEFAULT 'active'
  CHECK (state IN ('active', 'suspended', 'revoked'));
UPDATE entitlement_grants SET state = 'revoked' WHERE revoked_at IS NOT NULL;

ALTER TABLE orders
  ADD COLUMN settlement_at timestamptz,
  ADD COLUMN last_verified_at timestamptz,
  ADD COLUMN recovery_failures integer NOT NULL DEFAULT 0,
  ADD COLUMN recovery_lease text,
  ADD COLUMN recovery_lease_until timestamptz,
  ADD COLUMN last_manual_check_at timestamptz,
  ADD COLUMN recovery_paused boolean NOT NULL DEFAULT false;
UPDATE orders SET recovery_due_at = now()
  WHERE status IN ('creation-unknown', 'pending', 'paid') AND recovery_due_at IS NULL;
CREATE INDEX orders_recovery_due ON orders(recovery_due_at, id) WHERE NOT recovery_paused;
CREATE TABLE payment_provider_quota (
  provider text NOT NULL, environment text NOT NULL,
  window_start timestamptz NOT NULL, requests integer NOT NULL CHECK (requests > 0),
  PRIMARY KEY (provider, environment)
);
CREATE TABLE payment_refunds (
  provider text NOT NULL, environment text NOT NULL, id text NOT NULL, order_id text NOT NULL,
  minor_units integer NOT NULL CHECK (minor_units > 0),
  PRIMARY KEY (provider, environment, id),
  FOREIGN KEY (order_id, provider, environment) REFERENCES orders(id, provider, environment)
);
CREATE TABLE payment_disputes (
  provider text NOT NULL, environment text NOT NULL, id text NOT NULL, order_id text NOT NULL,
  state text NOT NULL CHECK (state IN ('open', 'won', 'lost')),
  PRIMARY KEY (provider, environment, id),
  FOREIGN KEY (order_id, provider, environment) REFERENCES orders(id, provider, environment)
);
CREATE TABLE payment_review_cases (
  order_id text REFERENCES orders(id),
  reason text NOT NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  PRIMARY KEY (order_id, reason)
);
CREATE TABLE payment_reference_conflicts (
  order_id text NOT NULL REFERENCES orders(id),
  provider_reference text NOT NULL,
  source text NOT NULL CHECK (source IN ('webhook', 'authenticated-query', 'authenticated-history')),
  minor_units integer NOT NULL CHECK (minor_units > 0),
  currency text NOT NULL CHECK (currency IN ('EGP','SAR','USD')),
  observed_at timestamptz NOT NULL,
  PRIMARY KEY (order_id, provider_reference)
);
CREATE TABLE payment_history_cursors (
  provider text NOT NULL, environment text NOT NULL, cursor text,
  generation bigint NOT NULL DEFAULT 0, incomplete boolean NOT NULL DEFAULT false,
  PRIMARY KEY (provider, environment)
);
CREATE TABLE payment_history_records (
  provider text NOT NULL, environment text NOT NULL, id text NOT NULL,
  result text NOT NULL CHECK (result IN ('applied', 'quarantined')),
  reason text CHECK (reason IN ('unmatched', 'needs-review', 'invalid-record')),
  PRIMARY KEY (provider, environment, id)
);

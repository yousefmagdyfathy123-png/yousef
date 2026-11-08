CREATE TABLE quotes (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user"(id),
  currency text NOT NULL CHECK (currency IN ('EGP', 'SAR', 'USD')),
  minor_units integer NOT NULL CHECK (minor_units > 0),
  country_code text CHECK (country_code ~ '^[A-Z]{2}$'),
  country_source text NOT NULL CHECK (country_source IN ('trusted-edge', 'geo-provider', 'unknown')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'consumed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, user_id, currency, minor_units)
);

CREATE UNIQUE INDEX quotes_one_open_per_user ON quotes(user_id) WHERE status = 'open';

CREATE TABLE orders (
  id text PRIMARY KEY,
  quote_id text NOT NULL UNIQUE,
  user_id text NOT NULL,
  currency text NOT NULL,
  minor_units integer NOT NULL,
  provider text NOT NULL,
  provider_reference text,
  environment text NOT NULL CHECK (environment IN ('test', 'live')),
  status text NOT NULL CHECK (status IN ('creation-unknown', 'pending', 'failed', 'cancelled', 'paid')),
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (quote_id, user_id, currency, minor_units) REFERENCES quotes(id, user_id, currency, minor_units),
  UNIQUE (user_id, idempotency_key),
  UNIQUE (provider, environment, provider_reference),
  UNIQUE (id, provider, environment),
  UNIQUE (id, user_id)
);

CREATE TABLE provider_events (
  provider text NOT NULL,
  environment text NOT NULL,
  id text NOT NULL,
  order_id text NOT NULL,
  kind text NOT NULL,
  payload jsonb NOT NULL,
  provider_time timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, environment, id),
  FOREIGN KEY (order_id, provider, environment) REFERENCES orders(id, provider, environment)
);

CREATE TABLE entitlement_grants (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user"(id),
  order_id text UNIQUE,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz CHECK (revoked_at >= granted_at),
  FOREIGN KEY (order_id, user_id) REFERENCES orders(id, user_id)
);
CREATE INDEX entitlement_grants_active_user ON entitlement_grants(user_id) WHERE revoked_at IS NULL;

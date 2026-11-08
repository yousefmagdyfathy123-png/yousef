ALTER TABLE "user"
  ADD COLUMN registration_country_code text,
  ADD COLUMN registration_country_source text NOT NULL DEFAULT 'unknown',
  ADD CHECK (
    (registration_country_source = 'unknown' AND registration_country_code IS NULL)
    OR (registration_country_source IN ('trusted-edge', 'geo-provider')
        AND registration_country_code IS NOT NULL AND registration_country_code ~ '^[A-Z]{2}$')
  );

ALTER TABLE orders
  ADD COLUMN checkout_claimed_at timestamptz,
  ADD COLUMN checkout_url text,
  ADD COLUMN recovery_due_at timestamptz;

-- Orders currently represent a single product, lifetime access.
CREATE UNIQUE INDEX orders_one_unresolved_lifetime_per_user ON orders(user_id)
  WHERE status IN ('creation-unknown', 'pending');

UPDATE orders SET recovery_due_at = now() WHERE status = 'creation-unknown';

CREATE TABLE checkout_request_keys (
  user_id text NOT NULL,
  idempotency_key text NOT NULL,
  order_id text NOT NULL,
  PRIMARY KEY (user_id, idempotency_key),
  FOREIGN KEY (order_id, user_id) REFERENCES orders(id, user_id)
);

INSERT INTO checkout_request_keys(user_id, idempotency_key, order_id)
SELECT user_id, idempotency_key, id FROM orders;

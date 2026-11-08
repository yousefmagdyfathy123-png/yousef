CREATE TABLE order_policy_acceptances (
  order_id text PRIMARY KEY,
  user_id text NOT NULL,
  version text NOT NULL CHECK (version ~ '^[A-Za-z0-9._-]{1,80}$'),
  content_hash text NOT NULL CHECK (content_hash ~ '^[a-f0-9]{64}$'),
  accepted_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (order_id, user_id) REFERENCES orders(id, user_id)
);

CREATE FUNCTION reject_order_policy_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Order policy acceptance is immutable';
END;
$$;

CREATE TRIGGER order_policy_immutable BEFORE UPDATE OR DELETE ON order_policy_acceptances
FOR EACH ROW EXECUTE FUNCTION reject_order_policy_change();

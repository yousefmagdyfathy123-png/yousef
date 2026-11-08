CREATE TABLE email_confirmation_links (
  digest text PRIMARY KEY,
  expires_at timestamptz NOT NULL,
  consumed boolean NOT NULL DEFAULT false
);

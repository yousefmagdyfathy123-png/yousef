# Payment reconciliation

Task 17 uses the existing checkout reservation and order ID as the merchant
reference. Verified webhooks, authenticated per-order queries, and optional
history records use the same financial policy. Each paid purchase gets one
grant. Confirmed refund and dispute IDs are distinct from transport IDs.
Refund/dispute facts survive omissions in later snapshots. A failed provider
request changes monitoring status and leaves prior financial facts intact.

## Trust boundaries

The browser may request `POST /api/orders/:id/verify` with an empty body,
its live session, exact source and session-bound CSRF token. The server checks
ownership and enforces a 60-second per-order cooldown in PostgreSQL. The
webhook uses the provider's raw-byte signature and configured provider
identity. It has no browser session or CSRF requirement. Audit and history
rows store normalized facts or restricted reasons. Keep provider credentials,
checkout links, raw payloads and card data out of logs.

The app currently resolves no live provider. The test adapter is available
only by code injection in development and tests and rejects production
initialization. The browser fixture uses an isolated PostgreSQL database and
loopback app. Before live use, verify merchant approval, accepted currencies,
signature and reference guarantees, lookup semantics and actual provider limits.
Adapters must report failed or cancelled only when provider evidence
establishes definitive closure. Unknown outcomes retain the original
reservation. Even an adapter that advertises safe create retries is used
only for lookup by the reconciliation process.

## Recurring process

Apply migrations and run `npm run payments:reconcile` against the application
database as a restricted internal job, once per minute locally. Each run takes
up to 20 oldest-due orders. Claims expire in 30 seconds and calls time out
after 5 seconds. Configure external scheduling and restrict its DB credentials.
At most one lookup is started at a time per process. For a 60-second schedule,
the configured cap is 20 claims per run per process. At the full timeout a
batch can take up to 100 seconds plus database time. Account for overlap and
provider rate limits before configuring multiple workers.

The app and CLI accept positive integer overrides. Use the
`PAYMENT_RECOVERY_` prefix with `BATCH_SIZE`, `TIMEOUT_MS`,
`LEASE_MS`, `RETRY_BASE_MS`, `RETRY_CAP_MS`, `MAX_FAILURES`,
`PENDING_MAX_AGE_MS`, `PENDING_CADENCE_MS`, `PAID_CADENCE_MS`,
`MANUAL_COOLDOWN_MS`, and `PROVIDER_REQUESTS_PER_MINUTE`. Keep the lease
longer than the provider timeout. The default shared quota is 120 queries
per provider and environment per database-clock minute. History and
per-order lookups share it. Quota deferrals leave retry budgets intact.

A successful unresolved check schedules the next check in 15 minutes. The
pending age budget is seven days. Paid purchases are reviewed every 24 hours
with no age cutoff. Failures back off from one minute to at most one hour and
pause after eight consecutive failures. Under local defaults, a healthy paid
purchase's normal review target is 24 hours plus scheduler and queue delay.
Treat a review more than one hour past due as overdue operationally. At local
capacity, a covered change can therefore take up to 25 hours to discover
before the job is considered outside that target. Retries, outages and
backlog can extend detection. Alert on overdue jobs and open review cases.

Verified administrators can see unresolved order review cases on the account
page. After investigating a paused order, a restricted operator can run
`npm run payments:reconcile -- --resume ORDER_ID ADMIN_USER_ID`. The database
checks the named administrator and records the action. Restrict shell access
to trusted operators who can attest the actor. A resumed check runs through
the same verified payment policy. Monitoring does not create checkouts,
refunds or trial entries.

## Optional provider history

History must be enabled per adapter only after documenting its initial
cursor, ordering, pagination, overlap, consistency and retention guarantees.
The synchronizer processes at most five pages of at most 200 records per
call. It atomically records an applied transport ID with its financial facts.
It quarantines unusable identified records and advances the cursor only
after every record is durable. A malformed page or cursor/retention gap marks
coverage incomplete. Optional adapter catch-up is bounded by the same page
limits and preserves the incomplete marker for operator follow-up.
Per-purchase lookup continues independently. The test adapter defaults to
no history capability and tests inject explicit overlapping and gap pages.

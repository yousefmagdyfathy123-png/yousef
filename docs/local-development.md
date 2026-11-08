# Alfadata foundation

Use Node 24.15+ within major 24 and npm 12.0.2. Install with `npm ci`.

PowerShell:

```powershell
$env:LEGACY_CULTURE = 'en-US'
npm run dev
```

`LEGACY_CULTURE` is mandatory for dev, test, build and start. Missing/unsupported settings fail; browser input cannot configure culture. No locale fallback is provided. This is a new release1 policy.

`npm run typecheck` and `npm test` check the foundation. `npm run evidence:discover` reads the sibling original artifact, reconstructed source and SearchFile without modifying them. For a different source location set LEGACY_SOURCE_ROOT to that source root. Generated evidence contains coordinates/hashes, never the original code or database contents. `npm run evidence:check` verifies reproducibility and provenance. `npm run coverage:check` deliberately exits nonzero until all required functional cards pass. Pending cards must never be promoted merely to make that command green.

`npm run catalog:build -- --source ../Database` builds the private source-preserving catalog; see [CATALOG.md](CATALOG.md) for integrity, reference generation and server-boundary checks. `npm run test:e2e` is configured for future workspace tests; task1 does not claim browser feature coverage. The root page identifies the foundation only. Private catalogs and original binaries/audit/database are excluded from Git and browser assets.

Package versions, registry integrity and official documentation URLs are recorded in evidence/package-provenance.json and package-lock.json. No remote, issue tracker, deployment or payment provider is configured.

## Local database and mail

Use Node 24.15 and npm 12.0.2. The lockfile pins embedded-postgres
17.11.0-beta.19 and its Windows x64 engine, PostgreSQL 17.11. Better Auth
and its SQL generation CLI are both pinned to 1.7.15. See the [embedded-postgres API](https://github.com/leinelissen/embedded-postgres) and the [Better Auth CLI guide](https://better-auth.com/docs/concepts/cli).

From the app root in PowerShell:

```powershell
npm ci
$env:LEGACY_CULTURE = 'en-US'
npm run db:migrate
npm run test:integration -- tests/integration/db-mail.test.ts
```

With no `DATABASE_URL`, the tools start PostgreSQL on an available port on
127.0.0.1 and stop it after the command. The cluster and randomly generated
SCRAM credential live in the ignored `.local/postgres` directory. Keep this
directory private to the OS account running the tools. Run embedded commands
one at a time. If the owner process is interrupted and leaves an owner lock,
verify that both the owner PID in the lock file and its PostgreSQL process
have exited before removing the lock.

To keep PostgreSQL running, use `npm run db:local` in a separate terminal.
Read the private connection file into the environment of the terminal running
database consumers:

```powershell
$env:DATABASE_URL = Get-Content .local/postgres/connection-url -Raw
npm run db:migrate
```

You can also set `DATABASE_URL` to an explicitly named app-owned database on
an external PostgreSQL instance. Production requires an external database.
The integration runner requires a role with `CREATEDB`, creates a randomly
named database, and drops only that database at the end.

The runner records SHA-256 checksums and serializes migrations in a
transaction. Add a new numbered migration for schema changes. Migration 001
was generated against an empty database with
`npm exec -- auth generate --config tools/db/auth-schema.mjs --output migrations/001-auth.sql --yes`.
Supply a local `DATABASE_URL`, `BETTER_AUTH_URL` and disposable
`BETTER_AUTH_SECRET` for schema generation.

Local mail is an in-process capture transport for development and tests.
It makes no network requests. SMTP uses server-side `SMTP_URL` and `SMTP_FROM`.
Use a TLS-enabled SMTP server and keep credentials in the server environment.

Logical database tools require compatible `pg_dump` and `pg_restore` binaries
on PATH and an explicit `DATABASE_URL`. Backups create a new custom-format file.
Restore requires an empty app-owned target. Pass its host and database name to
confirm the target, for example `localhost:5432/alfadata_restore`.

```powershell
npm run db:backup -- .local/alfadata.dump
# Set DATABASE_URL to the empty restore database before running this command.
npm run db:restore -- .local/alfadata.dump localhost:5432/alfadata_restore
```
## Account flows

Run the migrations, then start the application with the migrated `DATABASE_URL`,
an exact `BETTER_AUTH_URL` origin, a randomly generated `BETTER_AUTH_SECRET`
of at least 32 characters, and `SMTP_URL` and `SMTP_FROM` for the mail relay.
Production requires an HTTPS application origin. Local HTTP is limited to loopback.

- `npm run test:integration` runs the account and request-guard tests against an owned temporary PostgreSQL database.
- `npm run test:e2e:auth` uses the Next application, Chrome, a temporary PostgreSQL database, and a loopback TLS SMTP capture. It requires OpenSSL on PATH or `ALFADATA_TEST_OPENSSL` pointing to its executable. The runner also detects the default Git for Windows OpenSSL location.

### Authentication and browser requests

Better Auth 1.7.15 handles email and password validation, password hashing,
session cookies and the email-link operations. The HTTP boundary exposes only
the account routes used by the app. Account POSTs require the configured exact
Origin or an exact-origin Referer when Origin is absent. Fetch Metadata, when
present, must indicate a same-origin request. Better Auth's own origin and
callback checks also apply. The two email-link GET callbacks accept the
library credential and a fixed local redirect destination.

Confirmation links expire in one hour. Better Auth signs and validates the
confirmation credential. PostgreSQL atomically claims its digest once before
the library verifies the email. If that request fails after the claim, the
user can request a fresh link. Better Auth hashes reset-token identifiers,
consumes them once, and revokes existing sessions on password reset. Reset
links expire in 30 minutes. Account operations leave trial state untouched.
Mail delivery runs in the route's post-response work so recovery responses
do not wait for SMTP. Delivery errors are reported without message details.

HTTPS sessions use Secure, HttpOnly, host-only, SameSite=Lax cookies. Session
reads check PostgreSQL. Better Auth rate limits account routes in memory. Each
instance uses a shared per-route bucket because the app does not trust client
IP headers by default. Ingress deployments can enforce additional limits
using trusted connection metadata.

For app mutations, `POST /api/browser-token` checks the source and active
verified session before returning a no-store token. The token is an HMAC of
the session ID under a domain-separated label and the shared auth secret.
The client sends it as `x-alfadata-csrf`. The guard rechecks the live session,
the request source and token before callers perform side effects. It allows
multiple tabs and retries with the same session. Deployments serving the
same sessions share the configured secret. Signing out, session expiry and
password reset invalidate that session's token. A new sign-in requires a
fresh token. The guard is separate from resource ownership and entitlement.

Protected application POST handlers include `/api/workspace/enter`,
`/api/admin/trial-recheck`, `/api/checkout`, and `/api/orders/:id/verify`. Checkout checks the guard
before parsing the body or reserving an order. Its body contains only
`quoteId` and `idempotencyKey`.

For registration geography, allow only a trusted ingress to inject
`x-country` and `x-alfadata-geo-token`. Strip both incoming client headers
before injecting the ingress country and the shared secret configured as
`ALFADATA_GEO_EDGE_TOKEN` (32 random bytes encoded as lowercase hex). Keep
the origin behind that ingress and redact the secret header from logs and
traces. With no authenticated country, registration uses the USD tier.
The saved country and its source determine the quote. The quote and order
retain the original amount and currency through retries.

The checkout route uses the unconfigured provider until a payment adapter
is wired. Integration tests inject a fixture provider. A committed checkout
claim has one stable merchant reference and a recovery due time. An
uncertain result stays reserved for lookup by the payment reconciliation
worker. A browser retry returns the existing order. See
[Payment reconciliation](PAYMENT-RECONCILIATION.md) for the manual-check and
signed-webhook boundaries and the internal job.

Keep cookies, request bodies and the CSRF header out of request logs. Next
request logging is disabled because verification and reset URLs carry
credentials. At ingress, redact the query string and the token-bearing reset
callback path, or omit access logging for those routes. Use the same policy
for tracing and mail capture.

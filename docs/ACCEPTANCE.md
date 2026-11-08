# Acceptance

## Task 19a · Protected contracts and access policy

The integration policy tests use real Better Auth sessions, PostgreSQL entitlement records, a test trial registry and the Task 14 browser mutation guard. They verify server-derived account and session scope, guest and unverified denial, trial initialization only on protected POST, missing token denial, expiry and suspension rechecks, and projection to a private, no-store DTO without raw buffers, history, traces or evidence metadata. The action contract validates the envelope separately from the action, and admits route IDs, input fields and enabled options only from the supplied server scope.

Asset contract tests use injected workspace snapshots and derived renderers. They cover ownership, session, tab, binding revision, recovery generation, workspace expiry, entitlement denial, opaque asset IDs, mandatory binding headers and a private no-store response. The deployed nested handler uses the real auth and entitlement policy. At the 19a checkpoint its workspace loader returned no records pending 19b.

### Verification

- With `LEGACY_CULTURE=en-US`, `npm run test:integration -- tests/integration/engineering-policy.test.ts` passed 2 tests. The combined policy and workspace-assets run passed 5 tests.
- `npm run test:integration` passed 40 tests across 16 files. `npm test -- tests/workspace` passed 191 tests across 8 files.
- Next route type generation passed. TypeScript passed against the production route declarations using a temporary configuration that excluded the active dev server's duplicate declarations.

### Cross-system acceptance by child

| Child | Assertions |
| --- | --- |
| 19b | Persist immutable account ownership and a current session/tab binding. Verify two tabs maintain separate buffers, results and history, and another account cannot load or use an owned workspace. Connect asset authorization to persisted state and the current view/catalog. |
| 19c | Exercise real action and replay responses in the authenticated account/workspace scope. Verify stale expected revisions return 409 without combining selections or changing state. |
| 19d and 19e | Verify asset authorization ordering during binding transfer, stale binding rejection, and the recovery-generation fence. |
| 19g | Exercise guest, unverified, expired, suspended and foreign access across real HTTP journeys. Test browser mutation denials for each implemented endpoint and prove asset GET does not start/reset a trial. Verify raw Database paths, executables and the old engineering asset route return no file. Scan the deployable browser bundle and public/shared cache paths for complete catalog data, raw rows, private tokens and internal state. Verify actual per-tab browser isolation, DTOs and derived asset rendering. |

### Browser mutation protection inventory

All implemented browser mutation handlers are listed below. Paths are relative to `/api`.

| Method and path | Protection |
| --- | --- |
| POST `/workspaces/[id]/actions` | Task 14 browser guard, then fresh entitlement and workspace binding checks under the row lock. |
| POST `/workspaces/[id]/resume` | Task 14 browser guard, then account ownership, entitlement, expiry and expected binding revision under the row lock. |
| POST `/workspaces/[id]/operations/status`, `/workspaces/[id]/search` | Task 14 browser guard, then fresh entitlement and current binding checks under the row lock. |
| POST `/workspaces` | Validates the tab header, then calls the same protected Task 15 entry policy before workspace creation. |
| POST `/workspace/enter` | Engineering policy calls Task 15 entry, which requires the Task 14 browser guard before trial initialization. |
| POST `/account/preferences`, `/account/deletion` | Verified session and Task 14 browser guard. |
| POST `/admin/closure`, `/admin/deletion-review`, `/admin/suspension` | Admin authorization and Task 14 browser guard. |
| POST `/admin/trial-recheck` | Admin authorization, then Task 15 applies the Task 14 browser guard before rechecking. |
| POST `/checkout`, `/checkout/quote`, `/orders/[id]/verify` | Verified session and Task 14 browser guard before quote/order/reconciliation work. |
| POST `/browser-token` | Token bootstrap checks browser source and verified, active session before issuing a session-bound token. |
| POST `/auth/[...all]` | Library-owned identity flow. Task 14 applies its auth operation allowlist and browser source policy alongside Better Auth's own controls. |
| POST `/payments/[provider]/webhook` | Provider-to-server exception. The handler verifies the signed payload before reconciliation. |

Workspace creation uses the protected entry policy. The manual recovery control uses the same protected status endpoint as automatic recovery. Workspace GET and resume-info reads use entitlement checks. Resume-info exposes only the owner-authorized binding revision.

## Task 19b · PostgreSQL workspace persistence and cleanup

Migration `011-workspaces.sql` appends workspace storage after the existing migration sequence. Migration 004 already belongs to email confirmation. The workspace row retains the immutable owner, session and tab binding, engine/catalog/codec/schema versions, exact codec payload and private startup preference version. Creation snapshots account defaults once. Recovery projects the saved view. The protected `drawing` asset serves its validated display commands as JSON. The encoded state has a 16 MiB limit.

Reads and writes lock the workspace row, check fresh entitlement on the same database connection, and check the seven-day expiry against the database clock. A committed activity sets expiry 168 hours after its server timestamp. Failed projections, expired or incompatible rows, denied bindings and stale revisions leave the row untouched. Cleanup rechecks the expiry predicate if it waits behind a concurrent activity update. The integration tests cover the independent Flan1 reference view, private sparse and special-number round trips, a second connection and competing saves, activity rollback, incompatible data, preference snapshot races, tab/session/account isolation and cleanup.

Run `npm run workspaces:cleanup` hourly from one production scheduler using the app's explicit `DATABASE_URL` and a role authorized to delete workspace rows. Capture the exit status and deleted count. Retention is enforced on access even if cleanup is delayed.

### Verification

- The full integration suite passed 42 tests across 17 files. The targeted preferences, workspace-persistence and workspace-assets integration run passed 6 tests. The state-codec and workspace-access run passed 29 tests.
- The two production-browser tests verified reload, cloned-tab isolation, persisted drawing access, expiry and preference snapshot isolation. The build used a temporary TypeScript exclusion for the active dev server's duplicate generated declarations, then restored the project configuration.

The authenticated browser recovery and preference tests use `npm run test:e2e:auth -- tests/e2e/preferences.spec.ts tests/e2e/workspace-recovery.spec.ts` to run against production Next.js and an isolated PostgreSQL database. Sequenced browser actions remain in 19c, cross-session binding transfer in 19d, recovery-generation rotation in 19e/22b, and the complete browser/HTTP authorization matrix in 19g.

## Task 19c · Sequenced workspace actions and bounded receipts

Migration `012-workspace-operations.sql` appends the sequence cursor and receipt table to the applied migration chain. Migration 005 already belongs to the trial registry. One PostgreSQL transaction commits the validated private state, revision, sequence, public receipt and pruning. Each receipt stores a fingerprint of the schema-canonical action and expected revision. Matching retained operations replay before the current revision check and leave activity timestamps untouched. An evicted sequence returns `410 OPERATION_RESULT_EXPIRED`. Conflicting IDs, fingerprints, sequences and revisions return `409 OPERATION_CONFLICT`. Authorized creation, recovery and action responses carry the current cursor in `X-Workspace-Operation-Sequence`.

The engineering UI submits one operation at a time. An uncertain response retries with the same ID, sequence, expected revision and action. If that response is still uncertain, the tab holds the envelope in memory for explicit retry. After a conflict or expired result, it recovers current state and requires explicit repetition. Durable pending envelopes across reload and reconciliation belong to 19e.

The PostgreSQL suite exercises a real engine transition, concurrent identical requests, stale and mismatched envelopes, authorization and expiry before replay, and receipt insertion failure after the state write. The 1,000-operation retention check uses a lightweight deterministic transition and restores the exported workspace and receipt records into a second PostgreSQL database before checking replay, eviction, state preservation and the next cursor. The deployment-level backup/restore and blue-green drill remains in 22b/22c.

The full integration suite passed 44 tests across 18 files, including both operation tests. The workspace unit suite passed 191 tests. `npm run test:e2e:auth -- tests/e2e/workspace-network.spec.ts tests/e2e/workspace-recovery.spec.ts` passed both browser tests against a production build. The build temporarily excluded the active dev server's duplicate type declarations and restored the project configuration.

## Task 19d · Explicit resume

Migration `013-workspace-resume.sql` stores the latest resume request ID and fingerprint. The owner can inspect the binding revision and explicitly transfer the workspace to a new authenticated session and tab. The transfer preserves the private state and operation receipts. A retry of the latest matching request returns the current binding without incrementing it. Existing bound requests and transfers serialize on the workspace row.

The production-browser resume test passed with account sign-out and sign-in, exact workspace ID and revision recovery, successful drawing asset access under the new binding, and rejection of the previous binding.

## Task 19e · Pending operation recovery

The browser saves one versioned logical operation per account and workspace in tab-scoped session storage before dispatch. It uses the current binding and recovery generation as separate transport metadata. A mismatched saved generation quarantines the operation. Status checks use a two-second database lock timeout and report whether the operation was committed at inspection time. The client retries an eligible operation using its original envelope. Defaults are three automatic inspections with delays of 1, 3 and 10 seconds and a 10-second timeout per request. After those attempts, the workspace offers Check action status.

The production-browser network test passed by losing a committed response, recovering through status with the exact envelope, and verifying that the server received only one action request. The storage unit tests passed for schema validation, account/workspace isolation, generation quarantine and write failure before dispatch.

## Task 19f · Protected search

Search inspects the catalog in the persisted workspace culture and projects ordered public ID/text pairs. The search endpoint leaves workspace state and activity untouched. The browser records the source's retained search query through a sequenced action and uses the same transport to select a result.

The production-browser search test passed for Find, the first source-derived result and sequenced selection. The PostgreSQL suite passed with independent source fixtures for empty, matching, no-hit and invalid queries.

## Task 19g · Cross-system acceptance

The full PostgreSQL run passed 44 tests across 18 files after the resume, status and search additions. A later focused run passed six tests covering competing resume requests, rejected malformed receipts, protected assets and browser mutation policy. The authenticated production-browser run passed the request-protection and culture tests, including missing-token and wrong-origin rejection for actions, resume, search and status, plus identical search results and action-schema rejection of culture overrides under en-US, ar-EG and de-DE.

The latest production-browser run passed all five tests covering the three locales and currencies, browser mutation protection, search, pending action recovery across reload, and resume with protected asset rendering. The culture test observed USD, EGP and SAR quotes alongside identical protected search results and engineering views. The resume test verified that the previous binding and the old engineering asset route return 404. A targeted scan of the generated browser assets found no matches for the private search-table path, executable name, operation receipt table, legacy buffer or trial registry markers. The workspace unit suite passed 194 tests.

Final verification on 2026-11-03 included the full PostgreSQL suite with 44 passing tests across 18 files and the workspace unit suite with 195 passing tests across nine files. The focused operations, asset and browser-mutation run passed six tests after adding inspection during a concurrent commit, lock timeout, receipt conflict and eviction checks. The production build and six authenticated browser tests passed. The browser tests cover denial for guests, expired workspaces and former bindings, ordered search with an obsolete response, and automatic and manual recovery using the original operation envelope. The new PostgreSQL assertions extend the existing workspace operations test file, and the authenticated browser assertions use the existing recovery, network and request-protection suites.

The implementation checkpoints are `fc8b87e` for 19d, `d8fef43` for 19e and `d47a8f9` for 19f. This acceptance checkpoint records the final 19g coverage. Deployment-level database restore and recovery-generation rotation remain in Task 22b. Live provider acceptance, production SMTP credentials and DNS remain launch dependencies.

## Task 20 · Functional acceptance

Run from the Alfadata repository with the pinned Node dependencies, built private catalog, original source directory alongside the repository, Python, local PostgreSQL test tooling, and Chrome.

```powershell
$env:LEGACY_CULTURE = 'en-US'
npm run acceptance:functional
```

[Functional stage report](../evidence/acceptance/functional.json) links to each check's actual results. The gate runs the unit and integration suites, source coverage, Chrome over loopback HTTPS, typecheck, and production build. Per-command summaries are in the linked evidence and raw logs are in `.local/functional-acceptance`.

Source rediscovery compares the original executable and projected inventory against the pinned denominator. Source hashes are compared before and after the run. Independent numeric references are checked against passing test results, including every pinned calculator fixture case. Stale Find entries and the constructed pressure and wall menus retain their evidenced no-dispatch behavior. The source-empty handlers, vendor links, and hidden controls retain their independently classified behavior.

The HTTP checks inventory browser mutations, then exercise source and CSRF rejection and compare relevant database rows before and after the requests. Better Auth, browser-token issuance, and provider webhook authentication have distinct boundaries. Browser tests exercise workspace asset transfer, private caching, the former asset URL, and preferences. PostgreSQL tests cover continuation, binding validation, trial registry recovery, and recurring paid reconciliation.

Original screenshots carry the `unverified-visual-nonblocking` waiver. Live merchant integration and independent trial-registry host resilience are external setup. The report covers the functional stage.

The run passed 39,490 unit tests, 44 PostgreSQL integration tests and 11 core Chrome scenarios. Coverage found 495 required source entries, 167 implemented dispatch routes and zero functional gaps. All 6,998 calculator cases matched fresh independent extraction. The original source comparison covered 1,638 files with zero differences.

The first combined run recorded candidate drift after moving screenshot output into Playwright's test directories and an authenticated browser snapshot race caused by a background workspace read. The final report incorporates a fresh authenticated Chrome run, typecheck and production build after those corrections. The earlier unit and integration results carry forward because the verified file changes were limited to browser tests and this documentation. [Reverification record](../evidence/acceptance/reverification.json).

## Task 21 · Interface acceptance

From the Alfadata repository, set the approved culture and run the stage gate.

```powershell
$env:LEGACY_CULTURE = 'en-US'
npm run acceptance:ui
```

The gate builds Next.js and uses the real protected HTTPS workspace with isolated PostgreSQL databases, synthetic mail and a local trial registry. It records the browser version for each Windows project. The browser matrix covers branded Chrome and Edge, bundled Chromium, Firefox and WebKit, plus Android Chrome and iPhone WebKit emulation. The phone tests use 390 × 844 and 844 × 390. The desktop tests include 1024 × 768 and 1440 × 900. Chromium uses browser-dispatched emulated pinch input. On Firefox and WebKit, two-pointer sequences exercise the application handlers with synthetic events. Mobile projects also use trusted touchscreen taps. The print checks use browser print media and lifecycle events with a simulated printer exception.

[UI stage report](../evidence/acceptance/ui.json) separates the automated results, manual screen-reader evidence, and device availability. The explicit physical iPhone waiver applies after passing mobile emulation. Physical Android coverage is reported separately. The original-image waiver is independent of both. Raw Playwright output and screenshots remain in the local run directory named in the report. These are Alfadata QA captures.

The standalone desktop, mobile, print and journey command uses the local checkpoint server for quick feedback. The stage gate repeats the required scenarios through protected workspaces and adds account preference conflicts, separate workspaces, expired access with cached content, recovery and resume.

The manual screen-reader record must identify the protected candidate by source tree hash and include the reader, reader version, browser, OS, and observations for results, forms and messages. Automated semantic assertions cover the table and keyboard, copy success and fallback, exact values from the independent Flan1 reference, unit changes and a shared committed revision with the drawing.

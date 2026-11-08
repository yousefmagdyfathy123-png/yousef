# Company homepage Task 1 — public shell

Plan: `docs/superpowers/plans/2026-11-07-alfadata-company-homepage.md`.
Scope: Task 1 only. Implemented inline, without subagents, as requested.

## Delivered

- Supplied compact (353×140) and full (500×221) PNGs copied unchanged into `public/brand/`. SHA256 matches the originals: compact `1e189a50e81b3bc99c8da2b18bdbA05e6c4af5a025afa35e5ef14e227b7dd833`, full `f414d16c8499a38b35b5f04b70d390c9b165fd915c8be7b2f939b9f63c688de9` (hex is case-insensitive).
- Shared company metadata, server-rendered header/footer, and a small client disclosure menu. Company URL, support email, signup/sign-in and existing purchase-policy destinations use the approved values. Privacy/terms links belong to Task 3, when their routes exist.
- Styles scoped beneath `.marketing-site`, navy/teal identity, proportional images, visible focus, skip link and mobile links. Escape closes the disclosure and returns focus to Menu. Same-page destination selection closes it and moves focus to the target section. Modified link clicks retain native behavior.
- SSR regression and real production-route browser acceptance. No dependency, engineering, access, checkout, policy configuration or workspace changes.

## Integration contract and repeatable shell acceptance

Task 2 owns the actual homepage composition. The original `src/app/page.tsx` is preserved byte-for-byte; the shell is not mounted on the delivered homepage yet. Task 2 must wrap the page in `.marketing-site`, render `PublicHeader`/`PublicFooter`, and provide focusable `main-content`, `features` and `example` targets (`tabIndex={-1}`). Features/Example link to `/#features` and `/#example`, including when the header is used on another public page. Pricing and policy page composition remain Tasks 2–3.

The plan explicitly permits temporary test composition before Task 2. Run from this worktree in PowerShell:

```powershell
$env:LEGACY_CULTURE='en-US'
$env:NODE_OPTIONS='--max-old-space-size=768'
$env:GOMAXPROCS='2'
$env:GOMEMLIMIT='512MiB'
node --import tsx tools/marketing/test-shell.ts
```

This installs an explicitly labelled acceptance-only composition at `/`, runs the existing isolated production Next.js/PostgreSQL/mail browser runner, and restores the exact original page in `finally`. It refuses to overwrite concurrent page edits or an interrupted earlier fixture. A recovery snapshot is retained at `.local/homepage-task1-original-page.tsx`. No fixture route or fixture copy is delivered in application source. The standalone `homepage.spec.ts` runs against `/` for Task 2; until then use the shell runner above, since the foundation homepage intentionally does not render these components.

## Verification

- Initial brand test failed on the absent shell modules. The first browser invocation stopped at TypeScript for those absent imports, so it is not browser RED evidence. After the modules existed, the baseline production build succeeded and **both browser assertions failed on the original page's absent banner/menu**: `.local/homepage-task1-red-browser.log`.
- Brand SSR: **1 passed**, `.local/homepage-task1-green-unit.log`; final repetition **1 passed**, `.local/homepage-task1-final-unit.log`.
- Production shell browser acceptance: **2 passed**, `.local/homepage-task1-green-browser.log`. Desktop image loading/native dimensions/proportions and real company/support links; 390×844 menu Enter/Tab/Escape, focus restoration, Features/Example target visibility/focus, Pricing and Sign in navigation, and no horizontal overflow. Final hardened-runner repetition is recorded in `.local/homepage-task1-final-browser.log`.
- `npm run typecheck`: **exit 0**, `.local/homepage-task1-typecheck.log`.
- Final `npm run build` after restoring the original homepage: **exit 0**, `.local/homepage-task1-final-build.log`. This replaces the temporary-composition build output with the actual delivered application's output.
- Actual screenshot inspection: `.local/homepage-task1-desktop.png` (1280px) and `.local/homepage-task1-mobile.png` (390px, disclosure open). Both logos are fully visible and retain source proportions; links are readable/reachable and mobile has no horizontal overflow. These are acceptance-fixture screenshots, not a finished homepage preview.
- The full unit command `npm test -- --maxWorkers=1` was started, then deliberately stopped while the first engineering-fixture worker was processing, without a completed file result. Evidence: `.local/homepage-task1-full-unit.log`. The preceding full-run record took about 45 minutes; this task changes no engineering/shared application source. **No full-suite pass or failure-free completed run is claimed.**

## Review and limits

Self-review checked client/server separation, responsive disclosure semantics/focus, original asset hashes, safe external/mail links, scoped CSS and exact restoration of the current homepage. No subagent or independent-review claim. Existing detached linked worktree and all preceding dirty work are preserved. The one shared configuration edit adds `homepage.spec.ts` to protected test collection while retaining every existing selection.

Tasks 2–4, completed homepage content, real engineering example, privacy/terms drafts, integrated trial acceptance and deployment remain outside this request. No publish, push, merge, payment activation or company-site edit.

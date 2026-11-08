# Centered drawings - Task 5 verification

Workspace: `Q:/data alfa/centered-drawing-task4`, isolated detached worktree at `73f1c16`, retaining the uncommitted Tasks 1-4 dependencies. Task 5 executed and reviewed inline under the user's explicit no-subagent instruction. No pushes, merges or invented Git identity.

## Changes

- `drawing-fidelity.test.ts` projects every independent engineering reference through the public-result boundary, fits screen/print presentations, and verifies exact commands, headers, selected strings and result rows. Print captures retain their revision and survive subsequent mutation of the live result. Real transition coverage includes Metric/Imperial fractions, gasket/span navigation and Ptem1's existing no-dispatch behavior.
- Browser regressions compare actual replayed label strings with independent reference commands at 390x844, 844x390, 1024x768 and 1440x900. Normal workspace captures use real UI selections for Flan1, Gflt1 and Span1, including the largest offered size. Each capture writes its exact route, selections, units, revision and viewport to a task-owned JSON file beside its evidence. Standalone fixture renders explicitly have no live revision.
- Authenticated drawing/layout/print tests now run in the existing isolated HTTPS test runner, with no authentication bypass. Recovery gets its own database/server group to avoid exhausting the shared sign-up rate bucket after the account tests; production limits are unchanged.
- Actual authenticated PDFs exposed an extra-page defect: surrounding account/trial and saved-workspace content printed before the drawing. A new host-content regression failed first. Print CSS now retains only the print sheet and its ancestor chain in print flow, hiding unrelated content only while printing a snapshot. Every Chromium PDF capture asserts one page; Firefox/WebKit capture print-media screenshots and make no PDF claim.

No engineering formulas, catalog values, source commands, arithmetic, result schemas or authentication behavior were changed. Task 5's sole production change is the print-media isolation rule in `workspace.css`.

## Reference coverage

| Family | Routes | Independent cases |
| --- | ---: | ---: |
| Flanges and gaskets | 39 | 6,044 |
| Fittings, pipe and branches | 80 | 11,564 |
| Valves, strainers and fasteners | 38 | 11,765 |
| Calculators | 10 | 8,021 |
| Total | 167 | 37,394 |

The fixtures already include unit/format variants, option extremes and unavailable selections. The new tests do not regenerate goldens. The existing full engine suite supplies independent recipe/arithmetic checks; presentation tests do not claim to rederive engineering values from pixels. Node metric fallbacks are supplemented by actual browser metrics, DPR/font tests and rendered pages.

Sensitivity checks: temporarily dropping the first fitted command made the Flan1 fidelity regression fail; exact source bytes were restored before the successful reference sweep. The host-content regression independently failed with the outer application header visible, then passed after the CSS fix.

## Verification results

- Reference sweep: 167 route tests passed over all 37,394 cases, exit 0, 432.08 seconds. The separate real-transition regression passed; all 168 new fidelity tests also passed in the full run below.
- Final focused loopback suites after print isolation: 33 passed, exit 0, 1.0 minute. Covers desktop, mobile, print, drawing-layout and workspace-layout.
- `npm.cmd run test:e2e:auth -- drawing-layout.spec.ts print.spec.ts workspace-layout.spec.ts` after the CSS fix: exit 0, **28 passed**, 1.3 minutes. Its production build passed. All browser sessions use the existing verified-session/trial and isolated HTTPS/database setup.
- Broader default `npm.cmd run test:e2e:auth`: an earlier run passed all 38 tests before the host-print fix; subsequent runs failed the existing request-protection test, first at the unchanged workspace database-digest assertion and later at browser-token fetch (`TypeError: Failed to fetch`). This broader default run remains incomplete after the fix. A temporary readiness experiment was removed; request-protection and production auth are unchanged. Logs: `.local/task5-auth-verified.log` and `.local/task5-auth-final-checked.log`.
- Firefox/WebKit sequential matrix after the CSS fix: exit 0, **62 passed, 4 skipped**, 2.3 minutes. The skips cover Chromium CDP-only runtime DPR/pinch tests; those pass in Chromium. This includes host-content print isolation, actual reference label replay, desktop/mobile and normal workspace print-media checks. Log: `.local/task5-engines-verified.log`.
- Bare `npm.cmd test`: **exit 1**, **39,700 passed, 2 failed**, 40 files, 1776.94 seconds. `Wbol10-146 preserves independently derived recipe and drawing` and `Vlbw1-368 matches independent source recipe and drawing` each exceeded the existing 5,000 ms timeout with approximately 192 seconds elapsed. No engineering-value mismatch was reported. This is a failed full-suite command, not a uniformly green release gate. Log: `.local/task5-full-suite.log`.
- Focused rerun of those exact two cases with unchanged timeouts/assertions: **2 passed**, exit 0, 3.66 seconds total including fixture imports (23,495 unrelated tests skipped). This establishes their focused engineering assertions pass; it does not erase the full-run failures. Log: `.local/task5-timeout-rerun.log`.
- Final `npm.cmd run typecheck`, `npm.cmd run build` and `git diff --check`: **exit 0**. Logs: `.local/task5-typecheck-verified.log`, `.local/task5-build-verified.log`, `.local/task5-diff-check-final.log`.

Logs and browser artifacts are ignored under `.local/task5-*`; the final authenticated browser artifacts are in `test-results/` and its successful log is `.local/task5-auth-drawings-verified.log`. Final loopback artifacts are in `.local/task5-loopback-final-results/`; Firefox/WebKit artifacts are in `.local/task5-engines-verified-results/`. Source fixtures and metadata are unchanged.

## Actual PDFs and visual review

All **seven final authenticated Chromium PDFs** passed independent pypdf inspection: one page each, **841.91998 x 594.95996 points**, within one point of 841.89 x 595.28, with CSS A4 page size honored. All seven final pages were rasterized with Poppler at **150 DPI** and visually reviewed after the host-content fix. Titles, selected parameter strings and annotation edges were inspected; account/trial content and unrelated application controls are absent, and unavailable output has no stale geometry. Flan1 readability still fails as described below. Screenshots alone are not print verification. Inspection data: `.local/task5-auth-pdf-inspection.json`; final page rasters: `.local/task5-auth-pdf-verified-rasters/`.

Visual cases: Flan1 Metric/default and Imperial, Flan1 largest offered size (24 inch, 300#, RF, STD), Gflt1 largest offered size (24 inch, 300#), Span1 largest offered size (48 inch, STD, Carbon Steel, Full, insulation index 25), plus explicit long-header and unavailable fixtures using original Flan1 commands. The long-header case is a display-only stress fixture, not an independently validated new engineering selection. Captured JSON records provide actual revisions and exact displayed parameter strings.

Final authenticated normal-path capture identities (each has a screen PNG, PDF and `captured-selection.json`):

| Route | Revision | Units | Screen viewport | Selected component identity |
| --- | ---: | --- | --- | --- |
| Flan1 | 2 | Metric | 1440x900 | 24 inch Weldneck Flange, 300#, RF, STD |
| Gflt1 | 3 | Metric | 1440x900 | 24 inch Nonmetallic Flat Gasket, 300# |
| Span1 | 3 | Metric | 1440x900 | 48 inch Rack Spans, STD, Carbon Steel, Full, insulation index 25 |

Additional PDF captures use Flan1 default Metric revision 1, Imperial revision 2, explicit long-header fixture revision 37 and unavailable fixture revision 39. These fixtures and initial unit selections are pinned in `print.spec.ts`. All PDFs use the same 273x186 mm printable sheet, independent of the screen viewport. Independent reference label screenshots use fixture IDs and settings recorded in each `reference-selection.json`, at all four recorded screen viewports.

## Open acceptance limits

**Overall design acceptance remains open.** Uniform fitting of the complete Flan1 command list preserves widely separated source elements, yielding very small dimension labels on screen and A4. The same readability failure affects the long-header Flan1 stress case. Complete commands and in-bounds labels do not establish readable engineering output. No source elements were removed or repositioned to conceal the failure. Fixing it requires a verified source-view/layout decision consistent with the geometry-preservation constraint, or an explicitly revised design.

Gflt1 and Span1 tested print examples are readable; this is finite visual coverage, not acceptance of every possible selection. Screen zoom/pan/reset and edge reachability are exercised separately. Baseline source anchors can make perceptual ink centering differ from complete-command bounds.

Ptem1 has a hidden menu entry and no direct dispatch in the current application. Its real transition retains the previous drawing; the existing drawing corpus and crosshair/temperature tests cover source behavior. Direct Ptem1 graph screen/PDF acceptance through the normal UI is unavailable and is not claimed. No UI or authentication bypass was introduced to manufacture that coverage.

Review is an author self-review, weaker than an independent review, as requested. Earlier resource failures are not passing evidence: initial overlapping build/matrix attempts exhausted host memory; an authenticated setup lost its server; an initial account group hit sign-up throttling. These attempts and the pre-fix two-page PDFs remain recorded in task logs and are superseded only where final checks explicitly pass.

## Handoff

Preview restored from this worktree at **http://127.0.0.1:3186/** using the existing loopback checkpoint harness, with HTTP 200 verified. It is a local review preview, not the authenticated test server. The normal background launcher was policy-rejected; the tracked execution service is session 44687 instead. No temporary auth configuration or exploratory request-protection change remains. Test evidence is intentionally retained under ignored output directories for review.

Git identity remains unset, so no commit was made and no global settings were changed. Task 5 implementation and its verification record are delivered, but **overall acceptance remains open** for Flan1 readability, direct Ptem graph coverage, the two full-run timeouts and the broader default auth-test failures. Review was inline as requested; no deferred minor findings were identified.

Automatic approval review rejected removal of the verified task-owned `.local/task5-tmp` and `.local/task5-npm` directories with only `blocked by policy`. No deletion occurred; these ignored temporary/cache folders remain alongside the intentionally retained evidence.

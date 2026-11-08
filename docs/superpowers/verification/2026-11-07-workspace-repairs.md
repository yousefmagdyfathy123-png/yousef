# Workspace repairs acceptance — Tasks 1–5

November 7, 2026. Working tree: `Q:/data alfa/centered-drawing-task4`.

**Task 5 is complete locally.** All46 unit-test files have successful results from this session, across the full run and complete affected-file retries (39,746 distinct cases). Final build, TypeScript,61 browser cases and PDF/visual checks passed. The initial full unit command's assertion/resource failures and their resolution are recorded below; no clean single-command full-suite pass is claimed.

## Task 5 implementation

Engineering inputs have visible labels with native `label`/`htmlFor`/`id` associations and unique per-workspace identifiers. Labels and controls share a responsive screen wrapper outside the drawing coordinates. Common Component/Size/ASME Class/Face Type/Schedule names remain stable; Material/Ambient Temperature/Design Temperature and other verified engineering fields are readable. Existing correct `Length: <value>` accessible names remain stable while visible labels distinguish **Length to anchor** (Fxly1) from **Length between anchors** (Fxly2).

`engineeringControlLabel(routeId, controlId)` uses exact verified route overrides, then verified common labels, then the original identifier fallback. No family-prefix guessing. Meanings were verified against `legacy/ui/dialogs.ts`, calculator `shared.ts`, and `state/checks.ts`; EN1092 PN options were checked in `flanges/fldi/en1092.ts`. Unknown/no-dispatch routes get a generic fallback rather than a guessed anchor meaning. The old `engineeringControlLabels` export remains unchanged for immutable print snapshots.

Source-hidden controls keep hidden wrappers; hidden controls are not made visible for labelling. Source control identity, values, option ordering/disabled state, action sequencing and focus survive layout/resize. No engineering formula, unit conversion, drawing command or geometry changed in Task 5. The default protected drawing group now includes focus, usability, labels, search/results, desktop/mobile and print regressions; mobile is explicitly included in protected testMatch.

## Verification evidence

| Gate | Result | Evidence |
| --- | --- | --- |
| Baseline result/search presentation tests | 9 passed | `.local/task5-baseline.log` |
| Label TDD | 10 assertions failed before implementation; 10 passed after | `.local/task5-label-red.log`, `.local/task5-label-green.log` |
| Label browser TDD | 2 failed on absent associations before implementation | `.local/task5-browser-red.log` |
| Checkpoint desktop/mobile label cases | 2 passed | `.local/task5-label-browser.log` |
| First combined protected/browser run | 58 passed, 3 failures investigated and resolved below | `.local/task5-auth.log` |
| Focused post-fix protected gates | 16 passed | `.local/task5-fix-gates.log` |
| Final `npm run build` | exit 0 | `.local/task5-build-final.log` |
| Final browser acceptance | **61 passed**, exit 0 | `.local/task5-auth-final.log` |
| Final `npm run typecheck` | exit 0 | `.local/task5-typecheck-final.log` |
| Full `npm test` | exit 1: 35,051 passed, 1 failed assertion, 1 heap-limit worker error | `.local/task5-full-suite.log` |
| UI/labels/flange-gasket retry | **4,707 passed**, exit0; 768MiB heap, one worker | `.local/task5-unit-retry.log` |
| Complete unit-file coverage across runs | **46/46 files passed; 39,746 distinct cases; no failed/stale file results** | `.local/task5-unit-coverage.json` |
| Actual PDF inspection | 7 single-page A4 landscape PDFs; 3 rasters inspected | `.local/task5-pdf-inspection.json` |
| Scoped whitespace check | exit 0 | `git diff --check` |

Final browser specs: `drawing-layout`, `drawing-focus`, `workspace-focus`, `workspace-layout`, `workspace-usability`, `search`, `results-accessibility`, `desktop`, `mobile`, `print`, `workspace-network`. The protected configuration collected all 61 cases. These include actual authenticated workspaces using an isolated PostgreSQL/mail fixture, plus isolated canvas fixtures for precise rendering checks. Final browser-only execution used `.local/task5-browser-only.ts` against the completed production build, with fresh isolated database/server setup. No production source changed after that build.

Build/test resource limits: `LEGACY_CULTURE=en-US`, `GOMAXPROCS=2`, `GOMEMLIMIT=256MiB`; unit heap256MiB with normal Vitest2workers; build heap384MiB with `CIRCLE_NODE_TOTAL=2` (bundled Next defaults to one page-data worker). The 256MiB full run completed in2703.76s. It found the native hidden-property assertion below plus a heap-limit worker exit134 while loading `tests/legacy/flanges-gaskets.test.ts`. The affected files passed when retried in full with a768MiB heap and one worker; no fixture or assertion is trimmed. The retry took384.17s. Vitest cache results were checked against all46 current non-integration unit files and the session start timestamp: none were failed, missing or stale. Distinct cases are35,051 initial passes +4,707 retry passes −12 already-passing UI/label cases retried =39,746. A read-only local runtime probe confirmed progress during the long run; its diagnostic endpoint was closed, and it changed no assertion or fixture. No clean single-command full-suite pass is claimed. An initial one-worker full attempt was restarted at the project’s normal two-worker limit after checking cached fixture durations; it has no pass claim. System certificate trust was not changed.

## Runtime issues resolved

1. Enclosing selects in labels caused Playwright’s disabled-option check to retarget an option to its enabled select, despite the option retaining its native disabled attribute. The existing desktop regression reproduced this. Sibling labels linked by `for`/`id` fix the association without surrounding the option subtree. The final disabled400# regression passes.
2. An older all-command bounds test assumed the default was complete overview. Task 2 intentionally defaults verified routes to primary focus, which produced a454px centering discrepancy when measuring every command. The test now explicitly selects All views before measuring the same full-command/ink bounds with unchanged tolerances. Separate primary-focus tests retain their original primary assertions.
3. Native touch regression diagnostics showed the drawing viewport beginning at y839.67 while the fixed swipe started at y780 and hit `P.viewport-hint`. The test now scrolls the viewport into view, asserts its real hit target, retains trusted CDP gestures and measures actual document-scroll delta at the edge. Renderer/pointer behavior did not need changes.

4. The complete unit run found `tests/workspace/ui.test.ts` expected the source-hidden Component select itself to retain `hidden`. Its wrapper already hid both label and control, but Task5 now also retains the select's original native hidden attribute. The existing assertion remains unchanged; Sol reviewed this final single-attribute correction without findings. A fresh build and all61 browser cases passed afterward.

The initial new flexibility-label test tried its source-hidden Component selector. It now follows the constructed Pipe Loop menu and explicitly checks that the Component label/control remain hidden. These changes preserve source navigation behavior rather than revealing a hidden selector.

## Combined coverage and visual inspection

- Flan1 verified primary/default focus, detail, complete overview, bounds, revision changes, metric/imperial and selected values. Actual 6-inch/Class300/RF/STD source screenshot saved for the later homepage phase.
- Fxly1 verified guide-distance text/copy output and revision handling; Fxly2 complete-view fallback and the distinct anchor-length input. EN1092 Fldi2 PN labeling and absent Face/Schedule labels.
- Gflt1 wide gasket, Span1 tall/long calculator, Vlfl1 imperial browser fitting. Profiles remain limited to verified Flan1/Fxly1 structures; unsupported/changed metadata falls back to complete geometry. These examples do not certify every route/template/formula.
- Desktop1440px and mobile390px labels, resize/rotation, selected values/focus, keyboard mode changes, native scroll/pan/pinch, mouse drag, zoom ceiling/raster budget, delayed asset/font/revision cases and unknown-profile fallback.
- Search idle/loading/empty/error/retry, duplicate names/context, rapid queries, pending close/reopen and focus restoration; calculator result table/clipboard and unavailable/stale/foreign response cases.
- Immutable print snapshots match their captured revision and selected values; cancellation/failure restore actions/focus. All7 actual PDFs are single-page A4 landscape. Flan1/Gflt1/Span1 pages were rasterized with bundled Poppler and visually inspected. Existing complete-sheet Flan1 printing retains distant secondary views and therefore small annotations; print readability/composition was not redesigned.

Inspected actual protected screen screenshots: `.local/task5-screens/task5-flange-1440.png`, `task5-flange-390.png`, `task5-labels-390.png` (plus saved desktop calculator image). Labels are paired, readable and wrap without page overflow. Actual PDF rasters: `.local/task5-print-Flan1.png`, `.local/task5-print-Gflt1.png`, `.local/task5-print-Span1.png`. The PDF Python check uses the bundled runtime (the default system Python lacked pypdf); no package installation was needed.

No numerical discrepancy was corrected or introduced by Task5. Existing engine values/units remain authoritative. Earlier Task3 evidence covers metric/imperial, Celsius/Fahrenheit, changed/reversed temperatures and unavailable combinations; this acceptance retains those tests and does not claim all engineering formulas were audited.

## Independent review and delivery

**GPT-6.1 Sol, high reasoning effort:** no actionable findings. The reviewer checked route semantics/fallbacks, native label associations, hidden controls, responsive layout, focus/identity preservation, print isolation and test collection. It separately reviewed the sibling-label correction, the two browser-test adaptations and the final native-hidden-property correction; no weakened assertion or unresolved issue was identified. No deferred minors.

All prior dirty work was preserved in the existing detached linked worktree. Task5 baseline: `.local/task5-baseline/`; scoped delta: `.local/task5-changes.patch`. Shared files remain uncommitted to avoid including preceding drawing/calculator/search work. Task5 is complete with no unresolved test/review failure; future full runs should allow more than256MiB per worker for the flange/gasket fixture import, while respecting Windows committed-memory headroom. No reset, stash, merge, push, publication or deployment. Scope remains Task5 only; company homepage work has not started in this request.

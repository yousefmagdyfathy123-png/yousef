# Task 2: drawing focus and readable detail

User scope: Task 2 only. Base commit `1b02d43`; shared files already had uncommitted drawing/usability work. Baselines were copied to `.local/task2-baseline/` before edits. Tasks 3–9 are not started.

## Result

- Workspace passes Task 1's verified indices to the viewport. Verified drawings open with primary-group bounds; unverified groups use the complete drawing.
- Primary view fits geometry together with its annotation/mask bounds. All commands are still replayed, in original order, with a uniform presentation transform. Full overview remains available through All views / reset at100% and zero pan.
- Read dimensions uses the group's center and a minimum numeric-font target of12 CSS pixels, within the existing1600% zoom ceiling. When necessary, a visible notice explains panning. Read from overview first establishes a verified primary fit, then applies fresh mode/size/revision-tagged metrics.
- Active reading adjusts after actual size/font metric changes. Deliberate manual zoom leaves reading mode; redraw/font notifications do not repeatedly undo user pan. Resize recenters the current fitted view as needed.
- A resolved drawing asset must have the same commands as its source result to reuse its primary indices. A different same-revision asset falls back to overview, and stale revision metrics are not applied to a later selection.
- Printing still uses its original full-sheet fit and immutable result snapshot. No engineering formula, unit value, source command, or private catalog content was changed.

## TDD and review

- `.local/task2-red.log`: five new unit tests failed;25 existing assertions passed. `.local/task2-browser-red.log`: default primary/mode UI test failed before the change.
- `.local/task2-unit-green.log`:35 layout/focus/canvas tests passed in4 files.
- `.local/task2-browser-first.log`:16 component/browser tests passed; expanded focus suite subsequently passed5 cases.
- GPT-6.1 Sol performed one independent review against the saved baseline, rather than unrelated HEAD dirty changes. It found an Important overview-to-read centering issue and a rotated-readable-size issue initially graded Minor.
- The centering issue reproduced RED at618.6px away from the viewport center (`.local/task2-red-overview.log`), then passed after selecting the primary base before reading.
- The rotation issue reproduced RED at10.28px instead of12px (`.local/task2-red-rotation.log`). Regraded Important because an active reading mode should retain its promised target. Both issues were fixed in one review fix pass; `.local/task2-focus-final.log` passed6 browser cases afterward. No second review or unrelated changes requested.
- Type narrowing found by the first standalone typecheck was corrected in the numeric-label selection. The subsequent production build's TypeScript phase passed.

## Production-route verification

First run: `.local/task2-auth.log`, `npm run test:e2e:auth -- drawing-layout.spec.ts drawing-focus.spec.ts workspace-focus.spec.ts workspace-usability.spec.ts workspace-network.spec.ts print.spec.ts`.

Production build passed, including TypeScript.38 browser tests passed in2.4 minutes, using the real protected app, temporary PostgreSQL, captured mail and verified sessions. Covers default primary view and asset completion, units/revisions, unsupported gasket fallback, flexibility, delayed responses, native touch/wheel scrolling, reset, keyboard controls, font/DPR changes and A4 print behavior. Touch contexts now inherit the verified fixture session and enter `/workspace` over HTTPS; old checkpoint usage remains supported.

Final post-review run: `.local/task2-auth-final.log` — production compilation and TypeScript passed, then 39 browser tests passed in 2.4 minutes. This includes both reviewed fixes. Final focus-only coverage additionally passed 7 cases (`.local/task2-focus-final.log`), including actual mouse drag, keyboard pan and two-finger touch pinch.

Complete workspace unit run: `.local/task2-workspace-tests.log` — 408 tests passed in 14 files, exit 0, 601.66 seconds. Includes the existing independent source/drawing-fidelity cases across families. Final fresh focused unit gate after the review fix pass: `.superpowers/sdd/2026-11-07-alfadata-workspace-repairs/task-2-tests.log` — 50 tests passed in 6 files, exit 0. Final standalone `npm run typecheck` also exited 0 (`.local/task2-typecheck-final.log`).

Task 2 complete locally. Shared dirty source files were not committed wholesale; the existing Task 1 HEAD is unchanged. Source changes, new tests, baseline snapshots, scoped patch and verification record are retained for continued work. No unresolved review findings or deferred minors remain.

## Visual inspection

- CUA before/after desktop images: `C:/Users/CM/.codex/visualizations/2026/11/07/01a1b535-284b-7ca0-9e4e-e121a76e1913/task2-before.jpg` and `task2-after-desktop.jpg`.
- Verified mobile component image: `C:/Users/CM/.codex/visualizations/2026/11/07/01a1b535-284b-7ca0-9e4e-e121a76e1913/task2-mobile-verified.png`.
- PDF skill used for read-only print inspection. Seven real browser-produced PDFs were single-page A4 landscape (`.local/task2-pdf-inspection.json`). Rasterized and inspected actual Flan1, Gflt1 and Span1 pages using Poppler. The Flan1 complete-sheet print still spreads distant views across the page and therefore retains its previous small annotations; redesigning print layout is outside this screen-only task. Do not claim print readability was redesigned.

## Rulings and scope limits

- Primary mode fits a verified subset but retains the whole command list. Content outside that focused virtual sheet is reached through the explicitly labelled full-overview control; unknown templates never get guessed grouping. Only Task 1's Flan1/Fxly1 structures have primary profiles.
- Matched asset command identity is required before reusing indices. Mismatch sacrifices primary focus in favor of correct complete geometry until a matching result is available.
- The readable mode remains active across genuine font/size changes, whereas manual zoom intentionally takes control. This resolves the reviewed orientation issue without continuously overriding the user's pan.
- Existing source files are dirty from earlier approved work. Task 2 deltas are preserved separately in `.local/task2-changes.patch`; no shared dirty file is staged wholesale or unrelated baseline committed. The execution ledger is retained for later tasks.
- Heavy unit validation runs with one worker and a384MiB Node old-space limit after Task 1's resource-pressure evidence. The complete cross-project legacy/integration matrix is not claimed by this workspace-focused validation.

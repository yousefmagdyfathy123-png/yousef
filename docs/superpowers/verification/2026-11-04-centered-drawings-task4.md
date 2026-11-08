# Centered drawings — Task 4 verification

Implementation: `Q:/data alfa/centered-drawing-task4` (isolated detached worktree at 73f1c16, with Task 1–3 dependency changes copied from centered-drawing-task2). No subagents, commits, pushes or merges. Git identity remains unset. Native worktree creation on C: failed for lack of disk space; Q: fallback preserves the original checkout.

Task 4 adds an A4 landscape composition with 12 mm margins and a 273 × 186 mm sheet. The wrapping header uses the captured component header, committed UI identity, visible selections and captured unit/format settings. Results tables, selectors, menus and the product footer are excluded. Hidden/unavailable drawings cannot replay stale geometry. The remaining drawing area is measured before printing and after header/font/media changes, using the shared fitting renderer with 12 CSS pixel inset.

`printSnapshot` now deep-clones the entire result without changing its source transform, commands, settings or visibility. A print session retains that capture through repeated beforeprint events and completion of pending engineering work. Programmatic printing waits for drawing/header fonts and layout. Cancellation, errors and native-print takeover invalidate the pending attempt, restore action availability and restore focus. The screen and print views share the existing selector labels.

## Evidence

- Baseline: 29 workspace tests passed. RED: three expected unit failures for source-transform mutation, missing selected parameter labels and hidden drawing replay. GREEN: 36 focused workspace tests passed.
- RED: four browser failures for legacy composition and missing selection locks. First GREEN: 4 lifecycle tests passed; extended screen/print coverage: 23 passed.
- Self-review found a second-dialog race when native beforeprint takes over a pending font wait. The focused regression failed with printCalls=1 (expected 0), then passed after guarding the pending programmatic invocation with printStarted.
- Final focused browser run: **24 passed**, 51.9 s. Includes desktop/mobile controls, fitted drawing metrics, DPR/font handling, unavailable/stale assets, long headers, pending work, repeat beforeprint, print cancellation/failure, focus/action restoration and native takeover.
- Typecheck passed; diff whitespace check passed. Full project suite final result is recorded below when complete.
- Chromium PDFs: Flan1 Metric revision 1; Flan1 Imperial revision 2; explicit long-header fixture revision 37 using original Flan1 commands; unavailable fixture revision 39. All four are **one page, 841.92 × 594.96 points**, landscape A4, with CSS page size honored. PDFs and Poppler rasterizations are in ignored `.local/task4-browser-final-results/`. Actual rasterized pages were visually inspected, including annotation edges, selected values, wrapped titles and absence of stale unavailable geometry.

## Limits and review

The complete Flan1 source commands contain widely separated views and markers. A uniform fit preserving all relative geometry produces very small dimension text on A4. This is an explicit **readability failure for overall design acceptance**, not an accepted readable drawing. No commands or labels were removed or repositioned to conceal it. Task 5 must resolve/assess this with verified engineering semantics before accepting the overall design. The long-header fixture tests wrapping, not an independently verified new engineering selection.

Review was performed inline under the user's no-subagent instruction. No formulas, catalog values, result parsing, authentication or source arithmetic were changed. Broad reference fidelity, authenticated print/layout runs, production build and cross-browser/PDF acceptance remain Task 5 scope; this task does not claim those checks. Native beforeprint is synchronous; external native browser printing cannot await a newly introduced network font, whereas the application Print command explicitly waits for font readiness.

An initial full-suite launch was stopped when overlapping browser verification exhausted host allocation space; it is not a passing check. Final heavy checks are sequential with a 1024 MB process heap, unchanged Vitest maxWorkers=2, and browser workers=1. Q: task-owned temp/cache paths avoid C: disk exhaustion.

## Final regression result

`LEGACY_CULTURE=en-US; NODE_OPTIONS=--max-old-space-size=1024; npm.cmd test`: **39 files, 39,534 tests passed**, exit 0, 1911.25 seconds. Final typecheck and `git diff --check` passed. Preview restored from this worktree at http://127.0.0.1:3186/ and HTTP 200 verified. Task 4 implementation and its scoped checks are complete; the overall design readability acceptance remains open as described above.

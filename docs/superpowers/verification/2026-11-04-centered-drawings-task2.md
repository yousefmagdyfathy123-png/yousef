# Centered engineering drawings — Task 2

Implemented inline without subagents in `C:/Users/CM/.codex/worktrees/centered-drawing-task2/alfadata`, based on `73f1c16`. Task 1's unchanged `drawing-layout.ts` and its tests are dependency copies from the completed Task 1 worktree, not new Task 2 implementations. Reconcile those copies before integration. The original checkout, staged design, untracked instructions, and preview process are untouched. Git identity is unset; changes are saved without a commit.

## Behavior

- `renderCanvas(ctx, drawing, dpr, presentation?)` retains the three-argument source-transform path. The optional presentation changes logical size and transform only. Commands, text, masks, endpoints, alignment, baseline, font conversion, and order remain unchanged.
- `LegacyCanvas` optionally accepts `{width,height,padding,zoom}`. It measures the currently resolved asset/result and renders directly at the final logical zoom size. Zoom clamps to 1–3. Backing raster allocation is approximately 16 million pixels maximum, with each edge capped at 8192; normal sizes use native DPR.
- Fonts used only by canvas are explicitly loaded and measured again after readiness/loading events. DPR changes trigger repaint through resolution/resize listeners, with a cheap one-second ratio check for browsers that omit those events. Cleanup cancels obsolete callbacks and listeners.
- Asset identity includes source drawing, workspace ID, revision, and binding. Revision changes and empty drawings cannot retain a stale resolved asset. Sub-1 effective DPR reserves at least half a device pixel for hairline strokes even with zero requested padding.

## Verification

Run project commands with `LEGACY_CULTURE=en-US`. Vitest retains `maxWorkers:2`; Playwright uses one worker.

- Baseline focused canvas/layout tests: 25 passed.
- New renderer tests: three expected failures before implementation; 28 focused tests passed afterward. They verify original text, coordinates, masks, order, source immutability, explicit presentation sizing, hairlines, and invalid-presentation rejection.
- `npm.cmd test -- tests/workspace`: 10 files, 221 tests passed.
- `npx.cmd playwright test --config playwright.drawing-layout.config.ts --reporter=line`: 8 tests passed in actual Chrome. Covers independent raster bounds at DPR 1/2, resize/zoom, a delayed real WOFF2 font, empty clearing, revision invalidation with a reused drawing object, late asset cancellation, resolved-asset fitting, runtime DPR changes, raster allocation limits, and DPR .5 hairline padding. Screenshots are in ignored `test-results/`; wide and tall renders were visually inspected.
- The reused-source stale-asset regression, silent runtime-DPR change, and DPR .5 stroke margin each failed before their correction.
- `npm.cmd run typecheck`: passed.
- `git diff --check`: passed.
- Full `npm.cmd test`: 39 files, 39,530 passed and one failed after 1,837 seconds. `Fldi3 exposes strict public UI matching the same calculated view` failed at `structuredClone` with `DataCloneError: Data cannot be cloned, out of memory.` This overlapped the first build's 11 page-data workers, consistent with temporary resource pressure on the 8 GB host. The entire affected UI-routes file plus canvas/layout tests then passed alone: 3 files, 199 tests. No engineering code was changed to make the retry pass. This is not a claim that the original full-suite command exited successfully; repeat the full suite without overlapping heavy checks for the Task 5 release gate.
- Production build: `npm.cmd run build -- --webpack` passed in a same-drive Q: validation copy, with `experimental.cpus:2` only in that copy. All three affected drawing implementation files were hash-checked against the execution worktree. Compilation, TypeScript, page-data collection, 21 static pages, and build traces completed. The temporary worker limit was not added to application configuration.

## Limits and decisions

The standalone Playwright config bundles the real component and intercepts the test document, avoiding an occupied checkpoint port without stopping the preview. It proves browser component behavior. Authenticated workspace flows, screen composition, and print/PDF verification remain Tasks 3–5.

The execution worktree's default Turbopack build cannot resolve Next through its cross-drive shared dependency junction. Webpack also fails there on a cross-drive entry path. An attempted C: build-validation copy exhausted disk space before dependency installation; it was removed, along with cache files created by failed builds. The successful validation used a same-drive Q: copy and two workers, after the unrestricted build's page-data worker exited. Application configuration was preserved. Both temporary validation copies were removed after saving the build log.

Review was performed by the author, as explicitly requested by the user. No deferred minor findings. No formulas, source catalog data, or engineering values were changed.

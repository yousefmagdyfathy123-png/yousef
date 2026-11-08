# Centered engineering drawings — Task 3

Implemented inline without subagents in the existing `centered-drawing-task2/alfadata` execution worktree. Task 1/2 changes remain dependencies and are preserved. Git author identity remains unset; no commit or publication was created.

Updated local preview: [http://127.0.0.1:3186/](http://127.0.0.1:3186/). Restarted from this worktree; HTTP 200 and the responsive workspace bundle were confirmed.

## Result

- Component navigation and engineering selectors wrap above a dedicated drawing stage. Their labels, values, source visibility/availability, effects, and action handling remain unchanged. Non-empty visible engineering headers and messages flow above the drawing. The committed-result container retains `.legacy-workspace[data-revision]`; results and product information remain available on screen.
- `Viewport({drawing,asset,visible,revision})` measures its stage with `ResizeObserver` and uses Task 2's fitted canvas at its final raster size. It preserves the original drawing commands and current revision/binding. Screen padding is 24 CSS pixels.
- Fit-relative zoom starts at 100%, ranges from 100–300%, and uses 1.25 button steps. Fit/reset and committed drawing changes restore 100%; viewport-only resize preserves zoom and recenters the view. Positive scroll extents keep all enlarged edges reachable. Keyboard, mouse, and two-pointer interactions remain available; cancelled pointers cannot retain a stale pinch.
- Responsive screen CSS is scoped separately from legacy print positioning. The A4 composition remains Task 4.

## Checks

All project commands used `LEGACY_CULTURE=en-US`. Vitest retains `maxWorkers:2`; browser workers remain 1. Heavy checks were ultimately run serially after an overlapping launch exhausted host allocation limits and was stopped. The first unbounded serial launch also exhausted host allocation space, so the final run used process-scoped `NODE_OPTIONS=--max-old-space-size=1024`. Repository configuration was unchanged.

- RED: the revised navigation markup test failed for the missing flow toolbar. Browser tests then produced three expected failures for separated controls and fit-relative zoom; three existing behavior checks passed.
- `npm.cmd test -- tests/workspace/navigation.test.ts`: 4 passed after implementation.
- `npm.cmd run typecheck`: passed.
- Focused Playwright run including desktop, mobile, workspace, workspace-layout, drawing-layout, results-accessibility, and existing print suites: **28 passed** in 44.6 seconds. Covers action dispatch, disabled options, dialogs/focus, wrapping controls outside the pan area, fitted command centering, parameter/revision stability, resize, all zoomed edges, keyboard/mouse pan, trusted touch cancellation, unavailable clearing, stale results, font/DPR behavior, and unchanged print lifecycle.
- Authenticated `npm.cmd run test:e2e:auth -- tests/e2e/workspace-network.spec.ts --reporter=line`: **2 passed** in 39.3 seconds, through the real HTTPS/PostgreSQL application. Existing lost-response recovery still passes; a delayed old drawing asset cannot overwrite the next fitted selection or its parameters.
- That authenticated runner first completed a production Webpack build in a same-drive Q: validation copy using two build workers. Only the validation copy's Next worker count and runner's `--webpack` flag differed. All six drawing implementation file hashes matched the execution worktree. Application configuration and authentication were unchanged. The temporary copy and its local database were removed after shutdown; its log is retained as `.task3-auth-verified.log`.
- Final full `npm.cmd test`, with the bounded Node heap and no concurrent browser/build jobs: **39 files, 39,531 tests passed**, 1,726.62 seconds. Earlier stopped launches are not claimed as passing results.

## Visual inspection and limits

Actual Chrome renders were captured at 390×844, 844×390, 1024×768, and 1440×900 for Flan1, revision 1, Metric, source Size value `16` (displayed as `6"`), `300#`, `RF`, `STD`. Images are under ignored `test-results/workspace-layout-controls--06a58-serves-engineering-identity/` as `workspace-<width>.png`.

The centering check observes actual replayed lines, text bounds, and masks independently of the fit helper. A dark-pixel-only box misses pale fractional-width strokes, white masks, and text advance boxes; all source commands remain preserved. Pixel checks separately verify visible ink and padded edges. Source views retain their original relative spacing, so narrow fit views can require zoom for small labels. Task 5 retains the broader fidelity/readability and print/PDF acceptance gate.

Review is by the author under the user's no-subagent preference. No engineering formulas, catalog data, unit values, source command content, authorization, or action sequencing were changed. Only Task 3 is being completed; Tasks 4–5 remain pending.

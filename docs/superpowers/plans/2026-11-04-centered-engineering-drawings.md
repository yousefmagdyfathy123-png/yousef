# Centered Engineering Drawings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Center complete engineering drawings independently of controls on screen and print A4 landscape with matching component identity and selected parameters.

**Architecture:** Keep the validated engineering result immutable. Measure the complete existing drawing command list, apply a separate uniform presentation transform, and compose controls and identity outside the canvas. Screen and print share the same fitting and rendering logic, while print retains an immutable result snapshot.

**Tech Stack:** Existing React, TypeScript, Canvas 2D, Vitest, Playwright, Next.js. No new runtime dependency.

**Spec:** `docs/superpowers/specs/2026-11-04-centered-engineering-drawings-design.md` — approved by the user in this chat.

## Global Constraints

- Engineering data fidelity is the primary acceptance condition.
- Print on A4 landscape with the drawing and its dimensions, component name, and selected engineering parameters. Exclude the results table and application controls from the printed composition.
- Preserve every engineering value, unit, symbol, dimension endpoint, annotation association, and relative geometric relationship supplied by the engine.
- Apply a uniform display scale and translation to drawing geometry and its associated dimension annotations together. Preserve original command data for comparison.
- Obtain component names and selected parameters from the same validated result revision as the drawing.
- Do not remove text based on position or guessed string patterns.
- No changes to engineering formulas, source arithmetic, catalog data, authentication, or result values. No schema extension is needed for this design.
- Set `$env:LEGACY_CULTURE='en-US'` before project commands. Keep Vitest `maxWorkers: 2` and browser workers at 1.
- Read applicable `AGENTS.md` and relevant installed Next.js documentation before implementation. Establish an isolated execution workspace according to the execution skill, and retain access to ignored `private/catalog` and reference assets through existing project procedures.
- Git identity is currently unset. The approved design is staged and saved but its commit failed. Preserve unrelated changes, including the pre-existing untracked root `AGENTS.md`. Do not invent an author identity or alter global Git settings.

## Review Focus

1. Long, right-aligned, bottom-aligned, fractional, degree, and diameter labels must remain complete and attached to the correct geometry. Pinned by Task 1 metric tests and Task 5 browser renders.
2. Late asset responses and selection changes must never combine different result revisions. Pinned by Task 3 network tests and Task 4 snapshot tests.
3. Empty or hidden drawings and unavailable selections must clear prior geometry and avoid fabricated dimensions. Pinned by Tasks 2, 3, and 5.
4. Zoomed content must remain reachable at all edges on narrow screens, including after resize and pinch cancellation. Pinned by Task 3 interaction tests.
5. Font readiness, multiple views, and long parameter headers must not crop drawing annotations or spill printed content. Pinned by Tasks 1 and 4, including rendered PDF inspection in Task 5.

## File Responsibilities

- `src/workspace/drawing-layout.ts` — new bounds and proportional fitting functions.
- `src/workspace/render-canvas.ts` — existing command replay and font conversion, extended with a compatible explicit presentation input.
- `src/workspace/LegacyCanvas.tsx` — asset revision handling, measured rendering, font readiness, and raster sharpness.
- `src/workspace/Workspace.tsx` — control composition, current identity, action sequencing, and print lifecycle.
- `src/workspace/Viewport.tsx` — responsive drawing area, fit-relative zoom, pan, and resize.
- `src/workspace/PrintView.tsx` — immutable snapshot and approved print composition.
- `src/workspace/workspace.css` — responsive controls and A4 landscape print rules. Avoid unrelated formatting churn.
- Extend existing workspace and browser tests. Add focused fitting and fidelity regression tests where existing tests do not cover the change.

## Task 1 — Measure and fit the complete engineering drawing

**Files:** Create `src/workspace/drawing-layout.ts`, `tests/workspace/drawing-layout.test.ts`. Modify `src/workspace/render-canvas.ts`, `tests/workspace/canvas.test.ts` as needed for shared font metrics.

**Interfaces:** Export `DrawingBounds = {left:number;top:number;right:number;bottom:number}`, `measureDrawingBounds(ctx: CanvasRenderingContext2D, drawing: PublicDrawing): DrawingBounds | null`, and `fitDrawing(drawing: PublicDrawing, bounds: DrawingBounds | null, size: {width:number;height:number}, padding: number): PublicDrawing`. Keep `canvasFont(font:string):string` reusable. The original drawing and command objects remain immutable.

- [ ] Add failing tests for negative coordinates, multiple separated views, text alignment and baseline, asymmetric glyph overhangs, strokes, masks, single-point extents, and empty lists. Assert fitted left/right/top/bottom extents stay inside the padded viewport, x/y scale are equal, geometry-to-label displacement scales uniformly, command arrays equal the originals, and input drawings remain unchanged.
- [ ] Run `$env:LEGACY_CULTURE='en-US'; npm.cmd test -- tests/workspace/drawing-layout.test.ts` and confirm failures concern the missing fitting behavior.
- [ ] Measure all line endpoints plus stroke radius, fill rectangle extents, and text ink and advance extents using the same font/alignment/baseline as rendering. Preserve all commands and their replay order, including annotation masks. Account conservatively for zero-width hairlines in output-space padding. Use actual browser font metrics after fonts are ready, with conservative font-size fallback when optional metric fields are missing. Recompute after font readiness or font changes.
- [ ] Implement fitting in raw command coordinates with `s = min((width-2*padding)/boundsWidth, (height-2*padding)/boundsHeight)`, equal axis scale, and translation to the content center. Handle degenerate extents without division by zero. For absent drawing content return a blank, finite presentation and discard previous bounds. Validate finite positive output dimensions. Default padding is 24 CSS pixels on screen and 12 CSS pixels inside the print drawing area, both assistant implementation choices.
- [ ] Rerun the focused tests and existing canvas tests. Confirm the current three-argument renderer still works for existing callers. Commit only this task if configured Git identity permits.

## Task 2 — Render the fitted drawing sharply without changing commands

**Files:** Modify `src/workspace/LegacyCanvas.tsx`, `src/workspace/render-canvas.ts`, `tests/workspace/canvas.test.ts`. Create `tests/e2e/drawing-layout.spec.ts` for the browser-only metric assertions.

**Interfaces:** Keep `renderCanvas(ctx, list, dpr):void` callable. Add optional `presentation?: {width:number;height:number;transform:number[]}` as a fourth parameter. Add optional `presentation?: {width:number;height:number;padding:number;zoom:number}` to `LegacyCanvas` props while preserving `drawing` and `asset`. Fitting uses the actual resolved drawing selected by the existing revision guard. Canvas CSS dimensions reflect logical presentation size, backing dimensions reflect that size times device pixel ratio. The commands are replayed once with the effective transform.

- [ ] Add failing renderer tests asserting exact original text, line endpoints, masks, and draw order at multiple presentation sizes. Add a browser test for actual label ink bounds and DPR 1/2, including a delayed font load. Assert invalidated/empty drawings cannot retain the old image.
- [ ] Run the focused canvas and drawing-layout tests to confirm the new behavior fails.
- [ ] Implement presentation as an independent transform, using Task 1 measurement and fitting. Render zoom at its final logical size so backing resolution increases with zoom. Preserve existing `canvasFont`, alignment, baseline, hairline, and asset transport semantics. Limit zoom to avoid unbounded memory use on this 8 GB host. Repaint for DPR, fonts, presentation size, and valid resolved drawing changes.
- [ ] Verify missing `presentation` uses the existing source transform for older callers. Run canvas unit tests and the focused browser tests. Commit only this task if Git identity permits.

## Task 3 — Separate controls and center the responsive screen drawing

**Files:** Modify `src/workspace/Workspace.tsx`, `src/workspace/Viewport.tsx`, `src/workspace/workspace.css`, `tests/e2e/mobile.spec.ts`, `tests/e2e/desktop.spec.ts`, `tests/e2e/drawing-layout.spec.ts`, `tests/e2e/workspace-network.spec.ts` where applicable.

**Interfaces:** Replace internal viewport composition with `Viewport({drawing,asset,visible,revision})`, typed from `LegacyCanvas` asset props and `PublicDrawing`, with `visible:boolean` and `revision:number`. It consumes a result drawing and renders only the canvas inside the pan area. Preserve existing accessible names for zoom, pan, drawing, selectors, and navigation. Keep a `.legacy-workspace[data-revision]` container for committed-result identity and existing integration checks.

- [ ] Add failing browser assertions that controls sit outside the pan/zoom area, selection still dispatches the same action, fitted ink is centered within tolerance, and resizing does not alter parameter values or revision. Test portrait/landscape narrow screens, pointer cancellation, keyboard pan, fit, and access to all zoomed edges. Test unavailable drawings clear the previous image.
- [ ] Update obsolete tests that specifically require absolute selector offsets and a fixed 400-pixel toolbar, keeping their action, availability, selected-value, and focus assertions. Run the affected browser tests and confirm only intended layout assertions fail.
- [ ] Move the existing navigation and selectors into a wrapping toolbar, preserving labels, hidden/disabled behavior, input dialogs, effects, and action locks. Render existing non-empty engineering headers as flow content, preserving their text and visibility. Keep product information and the results panel available on screen.
- [ ] Use a measured, bounded drawing stage with `ResizeObserver`. Fit on initial load and committed drawing changes. Define zoom output as a percentage of fitted scale, initially 100%, with a 100–300% range, a 1.25 button step, and reset returning to fit. Preserve zoom through pure viewport resize, recenter the fitted view, and preserve reachable positive scroll extents when zoomed. Maintain touch and keyboard controls.
- [ ] Pass the committed result revision and current asset binding unchanged. Extend the existing network regression to delay a drawing asset across a selection change, asserting stale assets cannot alter the fitted drawing or current parameters.
- [ ] Run affected workspace and browser tests. Inspect real renders at widths 390, 844, 1024, and 1440. Commit this task if Git identity permits.

## Task 4 — Compose immutable A4 landscape print output

**Files:** Modify `src/workspace/PrintView.tsx`, the print lifecycle in `src/workspace/Workspace.tsx`, `src/workspace/workspace.css`, `tests/workspace/print.test.ts`, `tests/e2e/print.spec.ts`.

**Interfaces:** Keep `printSnapshot(result:PublicWorkResult):PublicWorkResult` as a deep clone with identical engineering data and source drawing transform. Replace the legacy 650-pixel transform. Keep `PrintView({snapshot})` and `data-print-revision`. Use Task 2 presentation props to fit the cloned drawing. Source the printed title and visible selected engineering parameters exclusively from `snapshot.view.headers`, `snapshot.view.controls`, and existing authoritative UI labels. Derive the title from the visible component header with the current committed component identity, without guessing geometry from strings.

- [ ] Replace legacy-width test expectations with assertions that snapshot command content, source transform, units, selected parameters, and revision equal the captured result, and later mutations of the live result cannot affect the snapshot. Test absent optional `ui`, long labels, hidden drawings, and unavailable states. Assert printed content includes only the approved engineering title/parameters/drawing, with no results table, menus, selectors, or product-information footer.
- [ ] Add browser tests for print during pending work, delayed font readiness, cancellation, print failure, and subsequent selection changes. Assert the canvas and parameters refer to one captured revision and action locks/focus restore correctly. Run tests to confirm failures match the requested new behavior.
- [ ] Set `@page { size: A4 landscape; margin: 12mm; }`. Compose a 273 mm by 186 mm printable region with a wrapping identity/parameter header and a drawing area using its remaining measured height. Use one uniform fit transform for all geometry and dimension text. Recheck measurement for print media because the screen print container is hidden. Account for fonts before programmatic printing and handle native browser printing through the existing `beforeprint` lifecycle.
- [ ] Fit the entire drawing without cropping, with room for every annotation. For unusually dense pages, retain all data and flag a readability failure during verification rather than silently omitting text. Keep unavailable-state messages visible and clear stale geometry. Fitted output carries no claim of physical scale.
- [ ] Run print unit/browser tests. Produce actual Chromium PDF output with CSS page size honored, verify one landscape A4 page for the selected coverage cases, and render pages for visual inspection during Task 5. Commit this task if Git identity permits.

## Task 5 — Verify engineering fidelity and the normal application path

**Files:** Create `tests/workspace/drawing-fidelity.test.ts`. Extend `tests/e2e/drawing-layout.spec.ts` and `tests/e2e/print.spec.ts`. Store screenshots and PDFs in the existing ignored test output area. Add a concise verification record under the existing project evidence/documentation convention only when needed for review.

**Interfaces:** Reuse existing reference loaders such as `loadFlangeCases(routeId)`, existing public-result projection, and the real transition fixtures. Compare exact source commands and parameter strings. Exercise Task 1 fit functions without altering golden files.

- [ ] Add a regression iterating the existing engineering reference cases for supported routes, checking commands and values remain exact before/after screen and print presentation, and matching selected parameters to the captured result. Include metric/imperial, fractions, degree/diameter labels, option extremes, and unavailable cases already represented in project fixtures. Add focused missing regression cases without regenerating independent goldens from changed code.
- [ ] Inspect the existing route manifest/reference coverage to choose real visual cases with wide/tall geometry, dense dimensions, multiple views, and long headers. Record the exact route, selections, units, revision, and viewport for each captured screenshot/PDF. Include relevant calculator/graph routes whose text and graphical results share the canvas, such as Ptem1 and Span1.
- [ ] Run `$env:LEGACY_CULTURE='en-US'; npm.cmd test`, `npm.cmd run typecheck`, and `npm.cmd run build`. Required result is exit 0 with no new regression. If environment/setup prevents a check, retain that check as incomplete and report the concrete blocker.
- [ ] Run focused desktop, mobile, print, and drawing-layout Playwright suites with the existing loopback harness. Its server uses port 3186 with `reuseExistingServer:false`. Identify any already-running checkpoint process before starting tests and coordinate its shutdown/restart so test data and catalogs match the branch under test. Do not terminate unrelated Node processes.
- [ ] Run the existing `npm.cmd run test:e2e:auth` path with its isolated setup to cover real asset-backed workspaces. `playwright.auth.config.ts` excludes the print/layout suites by default, so explicitly extend the existing test-runner suite list or use a temporary task-owned config to run `drawing-layout.spec.ts` and `print.spec.ts` with `ui-fixture.ts` through the authenticated HTTPS server as well. Restore temporary configuration after verification. Keep the tests independent of an auth bypass.
- [ ] Use the PDF skill for actual print-output inspection. Confirm page size is approximately 841.89 by 595.28 points, verify complete page rendering, and inspect titles, parameter strings, and all annotation edges. Rasterize at readable resolution and review actual pages, in addition to browser print-media screenshots. Do not label screenshots alone as print verification.
- [ ] Review changes for arithmetic/data mutation and compare the original command content to the presented output. Investigate every new mismatch or overlap. Report any baseline defect separately and keep the acceptance gate open for unresolved display defects within this scope.
- [ ] Record passing commands and coverage limits, remove only task-owned temporary files, and restore the local preview service with the updated implementation for user review. Commit verified changes only if an authorized Git identity is available.

## Completion and Handoff

This plan is ready for user review. Implementation starts after plan review and execution-method selection, following the writing-plans skill. The linked design has already been approved. No product code has been changed by this planning step.

At delivery, provide the local preview URL, the exact test/PDF inspection outcome, and any unresolved coverage limits. Do not claim that finite verification guarantees zero possible defects.

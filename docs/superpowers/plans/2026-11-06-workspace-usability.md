# Workspace usability implementation plan

> Execute inline in the existing drawing worktree; preserve the earlier uncommitted drawing work.

**Goal:** Resolve the four browser-confirmed drawing and menu problems.
**Spec:** ../specs/2026-11-06-workspace-usability-design.md
**Architecture:** Native scroll chaining and touch scrolling in Viewport; visible canvas rendering over a virtual zoom surface; document-level outside interaction handling scoped to LegacyMenu.
**Tech Stack:** React, TypeScript, Canvas 2D, Playwright, Vitest.

- [x] Add `tests/e2e/workspace-usability.spec.ts` with wheel, touch, readable dimensions and menu regression checks. Run against the original checkpoint and record expected assertion failures.
- [x] In `Viewport.tsx` and `workspace.css`, use `overscroll-behavior:auto`, native `pan-y` touch action, skip custom one-finger drag, and prevent arrow defaults only when drawing panning can move. Keep custom two-pointer pinch and mouse dragging.
- [x] In `drawing-layout.ts`, calculate detail magnification from measured text size and fitted scale; target 12 CSS pixels with a 16x cap, centered on a dimension. In `LegacyCanvas.tsx`, add optional viewport offsets and fit callback, keep the virtual fit transform but subtract scroll offsets and render a viewport-sized canvas. Preserve the default print and isolated canvas path.
- [x] In `Viewport.tsx`, wire scroll offsets, Read dimensions, max 16x and instructions; keep Fit / reset. Add unit checks for dimension detail selection and empty drawings.
- [x] In `LegacyMenu.tsx`, close all open details on outside pointerdown and focusin, with effect cleanup. Keep current Escape and item handlers.
- [x] Run `node node_modules/vitest/vitest.mjs run tests/workspace`, `node node_modules/typescript/bin/tsc --noEmit`, and Playwright usability/layout/mobile/desktop/print coverage using a task config with the installed Chrome executable and existing loopback server.
- [x] Inspect desktop and phone screenshots, restart only the verified preview process, rerun regressions, and deliver the same local URL with the verified results.

Review: all four findings have tasks and behavioral checks. Engineering data, full-fit completeness, print rendering and authentication are outside the changes.

## Execution record

All implementation tasks completed inline. The original browser regression run failed all four checks for the reported behaviors. The final combined browser run passed 38/38, including the additional trusted-touch zoom-boundary check, existing touch pinch/cancellation, mouse pan, nested navigation, drawing bounds, asset revision handling, DPR limits and A4 print/PDF tests. Updated two existing 300% assertions to the intended 1600% limit.

The changed-path unit run passed 34/34 across canvas, drawing layout/detail and print tests. TypeScript and the production build passed. Final desktop (1440x900) and phone (390x844) screenshots showed readable dimensions, no horizontal page overflow and no JavaScript page errors. The loopback preview remains at http://127.0.0.1:3186 with no login.

Validation adjustment: the broader `tests/workspace` run was stopped after more than six minutes of CPU work traversing the large reference fixture suite (about 454 MB); it did not finish and is not claimed as passed. The scoped unit run above and the browser coverage completed. No original source geometry, engineering values or authentication logic was changed. No commits, merge or publication were made over the existing uncommitted work.

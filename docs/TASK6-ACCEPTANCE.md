# Task6 — Flanges and gaskets

Date: 2026-11-02. Branch: `task/01-foundation`.

Task6 is complete: all 39 route implementations, final assembly and verification have been accepted.

The exported `flangeRoutes: FeatureRoute[]` contains 30 handlers: Flan1–7, Flaa1–2, Flap1–2, Orif1–3, Flre1–2, Flco1–3, Fl6b1–2, Flbx1–2, Fldi1–5, Flhb1 and Flbs1. `gasketRoutes: FeatureRoute[]` contains Gflt1–3, Gspr1–3 and Grtj1–3. Their indexes are under `src/legacy/features/flanges/` and `src/legacy/features/gaskets/`. Consumers register and invoke their existing `FeatureRoute.apply` interface.

The source dispatch and menu denominator is exactly 39; search contains those 39 plus Fl6b3, which remains no-dispatch. Later-task routes remain pending. The Flan1 browser checkpoint remains intentionally limited to its accepted scope; full all-route UI/mobile/print work belongs to Task11.

## Independent references and behavior

- 39 route evidence cards pin source methods, RVA, IL hashes and fixture hashes. The original Flan1 checkpoint card retains its earlier metadata shape.
- 6,044 independently generated reference cases include 668 unavailable cases. Each route checks the complete private view, exact commands/headers/controls, requested filename order, populated bank-cell fingerprint, row limits and selected source/saved globals.
- Nine gasket routes add 1,396 independent cases and nine real drawing-error recoveries. Their separate Python analyst models never import the product TypeScript.
- Gflt preserves disabled persisted classes, class-specific sensors, source rounding/fractions and recursive column12 mutation. Gspr preserves its distinct dimension columns and FormatDim-only header preparation; route1 offers all seven classes while routes2/3 disable 1500/2500 without correcting saved values.
- Grtj uses sign-free size controls while restoring the global list sign. R/RX radius suffixes repeat after recursive clamping. BX reads metric bank2 in both units and preserves Single cylinder results, subtraction, Weight×100, hidden globals and the saved/current Length distinction.
- Navigation checks verify caller ownership, exact serialized continuation and retained sparse banks. Class/size interaction checks verify persistence and disabled-selection rejection.

Parent implemented all code. A separate `gpt-6.1-sol` reviewer at high effort reviewed each gasket route and final assembly without implementation delegation. All reviews approved with no outstanding findings.

## Verification

- `npm test`: 7,265 passed / 14 files in 488.30s (`.task6-final-suite-green.log`). This includes 1,415 gasket checks and 40 Task6 assembly/provenance checks.
- `npm run typecheck`: passed (`.task6-final-typecheck.log`).
- `npm run build`: passed (`.task6-final-build.log`).
- `npm run test:e2e -- tests/e2e/flan1-checkpoint.spec.ts`: four Chrome journeys passed in 8.9s (`.task6-final-browser.log`). The existing desktop screenshot was inspected; drawing, labels and controls remain readable within the accepted checkpoint viewport. Screenshot bytes remain unchanged in Git.
- `npm run evidence:check`: zero blockers / 488 pending functional cards (`.task6-final-evidence.log`).
- `git diff --check`: passed.

Use `LEGACY_CULTURE=en-US`; Vitest retains `maxWorkers: 2`. The persistent machine-readable result is `evidence/task6-acceptance.json`.

Fresh source hashing confirmed all 1,634 original Database files / 41,852,002 bytes, original executable SHA256 `55a55522875ad7131d1367a08667ae653416c9be2decbd3bd5c54a9b8c04d03c`, and decompile SHA256 `ae2389a910a610523c4e012acf3e65be4f7458c7ca9fdbb0d83d5e2c63d13c6a` unchanged. The original executable was never executed or loaded.

The initial combined navigation test exceeded its 5000ms timeout. It was split into per-route checks retaining every assertion and adding bank2 retention; ten focused checks passed. No product code changed in response to that test-harness timeout.

The global evidence checker reports zero blockers, with 488 pending functional cards for later work. This report accepts Task6 only. Original screenshot comparison remains `unverified-visual-nonblocking`; no new claim of original runtime or pixel equivalence is made.

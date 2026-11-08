# Task 1: verified drawing focus metadata

Scope: Task 1 only, from `docs/superpowers/plans/2026-11-07-alfadata-workspace-repairs.md`. No viewport/homepage behavior has been implemented in this task.

## Changes

- Verified Flan1 and Fxly1 primary command groups, with structural signatures and safe unknown/changed-template fallback.
- Optional strict `view.presentation.primaryCommandIndices`, projected on the server without modifying source drawing commands, values, transforms or stored legacy view/asset schemas.
- Source-group evidence in `docs/DRAWING-FOCUS.md`; new schema, real transition, unit/size, changed-template and snapshot regression coverage.

## Verification results

- RED: `.local/task1-red-focus.log` — 3 failures caused by missing presentation metadata, 1 existing fallback test passed.
- RED schema: `.local/task1-baseline-small.log` — optional metadata acceptance failed as expected; calculator tests and existing public mapping remained green. This was run after adding the new schema assertions, so it is not an untouched whole-workspace baseline.
- First GREEN: `.local/task1-green-first.log` — 12 tests passed in 2 files.
- Typecheck: `.local/task1-typecheck-clean-cache.log` — `npm run typecheck` exited 0 with `GOMAXPROCS=2`, `GOMEMLIMIT=512MiB`. The first unconstrained attempt exhausted system commit memory; the next exposed duplicate generated `.next/dev/types` and `.next/types` LayoutProps. Archived the stale generated dev routes/validator locally as `.cache` files and regenerated types; no source compiler setting was changed.
- Independent review: GPT-6.1 Sol, high effort, no Critical/Important/Minor findings. Reviewer probed all 20 available Flan1 sizes, all 35 Fxly1 sizes, Metric/Imperial × fractions × list-unit settings; unavailable Flan1 size had no hint. Astra review was stopped at the user's instruction and replaced by Sol.

- Focused schema/projection/drawing-fidelity run: `.local/task1-focused.log` — 183 tests passed in 3 files, exit 0, 506.75 seconds. This includes the existing independent-reference screen/print checks across component families.
- Final task-owned tests after relocating the new snapshot regression into the new test file: `.local/task1-final-focused.log` — 15 tests passed in 2 files, exit 0, 20.14 seconds, with a 384MiB Node old-space limit and one worker.
- General unit command: `npm test -- --maxWorkers=2 --exclude tests/workspace/drawing-fidelity.test.ts`, `.local/task1-general-tests.log`. The excluded file had already passed above. Stopped this broader run before completion because Windows reported only 379,512 KiB free virtual memory of 15,929,972 KiB total while workers held approximately 0.9 and 1.1 GB working sets. No full-suite pass is claimed and no individual general-test failure was reported before the stop.
- `git diff --check` passed for task-owned tracked changes. No build, authenticated end-to-end or browser-presentation pass is claimed for this metadata-only task.

## Outcome

Task 1 implemented and verified within the limits above. The display UI still uses its original fitting behavior; actual user-visible focus/zoom repair belongs to Task 2. No live deployment or company-site changes occurred.

## Rulings and limits

- User requested Task 1 only; Tasks 2–9 remain outside this turn. Read dimensions/default fit are deliberately unchanged until Task 2.
- Profiles are restricted to verified structures; Gflt1, Span1, Flan2 and opposite-temperature Fxly variants fall back to overview.
- Initial concurrent test attempts exhausted available system memory. Verification is using bounded worker counts rather than changing application behavior or silently skipping assertions.
- Previous hands-on screenshots reproduce the same unchanged viewport baseline. Since this task changes metadata only, browser presentation correctness is neither claimed nor inferred from unit checks.
- The independent-reference snapshot regression was placed in the new task-owned `drawing-presentation.test.ts` instead of committing the pre-existing untracked `drawing-fidelity.test.ts`. The earlier file's own added block was removed; the preceding work remains outside the task commit. This is a test-placement deviation only.
- Task completion does not claim the initial untouched whole-workspace baseline was green: that broad baseline was interrupted during resource pressure. Existing calculator/public mapping cases passed in the smaller run; full drawing-fidelity and final task tests then passed on the implementation.

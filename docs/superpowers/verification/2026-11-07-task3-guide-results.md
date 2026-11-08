# Task 3: guide distance in table and copy results

Scope: Task 3 only, in the existing detached linked worktree at `Q:/data alfa/centered-drawing-task4`. Prior dirty work is preserved. Baseline snapshots: `.local/task3-baseline/`; scoped delta: `.local/task3-changes.patch`.

## Implementation

Fxly1 now includes `Required distance to first guide` as an output row. Its value is read directly from bank 1, current size, column 16 after the existing floor/format operation. Ambient/design rows retain their names and values and are marked as inputs. Units are `mm` or `in`, from the authoritative `Units` setting, independent of the nominal size list or temperature scale. Fxly2 remains unchanged.

The optional input/output role passes strict internal/stored/public schemas and the public serializer. Old rows without a role remain valid. The visible table adds a Type column only when roles exist; the existing Result/Value/Unit clipboard format is unchanged. Unavailable results contain no rows.

Source evidence: `Fxly1_Headers` in the existing decompiled Module1 writes floored Ans1 into column 16; the existing marker mapping resolves bank/column from the template marker. Tests confirm column-16 markers in both heating and cooling templates and preserve exact pre-change drawing fingerprints, Ans strings, and values. No formulas, source commands, or reference catalog data changed.

## Verification

- RED: `.local/task3-red.log`: 9 new requirement failures, 1,056 prior assertions passed.
- GREEN: `.local/task3-green-final.log`: 1,065 tests passed in the calculator, result-panel, and public-result suites. Includes metric/imperial, Celsius/Fahrenheit, changed length, reversed temperatures, unavailable size, copy strings, optional legacy rows, invalid roles, persistence, and unchanged drawing/Ans values.
- `npm run typecheck`: exit 0 initially and again after the reference-test adaptation (`.local/task3-typecheck-final.log`).
- Protected production build and `npm run test:e2e:auth -- results-accessibility.spec.ts`: passed, 6 browser tests, `.local/task3-auth-retry.log`. Real account verification/trial/session journey; desktop 1440px and mobile 390px; length/unit changes and real clipboard readback; unavailable selection removes table/copy; stale and foreign responses retain the committed revision; clipboard failure permits manual copy.
- Initial browser build attempt failed in the native TypeScript process with Windows VirtualAlloc errno 1455. Retry used a 256MiB Node heap, Go concurrency 2 and 384MiB GC target; build/typecheck passed. No machine trust or application configuration changed.
- Actual mobile screenshot inspected: `test-results/results-accessibility-guid-3172b-henticated-results-at-390px/guide-results-390.png`; table fits the screen and displays the same 487-inch quantity as the drawing, with visible Input/Output types.
- GPT-6.1 Sol independent scoped review: no actionable findings. Reviewed engineering source, schemas, state/persistence, table/copy and browser tests against saved baselines; excluded pre-existing dirty work. Review was conditional on the subsequently passing authenticated checks.

Historical reference adaptation: the original exact-view test failed 851 Fxly1 cases because the source application had no guide text row/roles (`.local/task3-recipe-red.log`). The comparison now removes only those approved additions before comparing every historical field; original fixtures remain unchanged. The dedicated new tests independently assert the added row. Sol reviewed this narrow harness adjustment and found no weakened engineering assertions beyond excluding the approved addition.

The first broad run ended during the user pause without a final result. The fresh full `npm test -- --maxWorkers=1` run (`.local/task3-suite-final.log`) was stopped when Windows committed-memory headroom fell to 526,716 KiB, after the earlier native compiler out-of-memory failure. Only the two verified Vitest processes belonging to this run were stopped; available headroom recovered to 1,608,780 KiB. The suite had not emitted a final result. No full-suite pass or absence of full-suite failures is claimed. Task-scoped tests and the protected production build/browser checks are the completion gates.

The adjusted independent Fxly1 references passed: `.local/task3-recipe-final.log`, 1,031 passed and 5,967 unrelated recipe cases skipped by the explicit Fxly1 filter, exit 0, 24.26 seconds. All original engineering bank fingerprints, controls, drawing commands and values remain checked against the independent fixtures.

## Delivery

Changes remain local and uncommitted, with baseline snapshots and a scoped patch. The protected config and plan already contain prior uncommitted changes; retaining the reviewed delta avoids committing that prior work. No reset/stash, merge, push, deployment, or subsequent plan task was performed. No unresolved review finding remains. The full cross-project regression result is the verification limitation above.

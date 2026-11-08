# Task 4: Search context and explicit request state

Implemented locally in `Q:/data alfa/centered-drawing-task4` on November 7, 2026.

## Behavior

- Public search hits carry verified category/standard context. Blind Flange routes Flan3 and Fldi2 now distinguish ASME B16.5-2020 from EN 1092-1:2018; B16.47 routes distinguish Series A/B. The public literal map has exact route membership and a `Component <routeId>` fallback. It imports no private source/catalog data.
- Authenticated search responses and checkpoint result projection add context without changing source search matching, query strings, identity, text, ordering or the private SearchHit contract. Strict public parsing accepts optional context and rejects private extras.
- Both dialogs distinguish idle, loading, success, empty and error. Zero matches show `No results found. Try a component name or standard.` only after successful submission. Reopening starts at the initial prompt with no stale list. Status is announced politely.
- Async searches abort superseded requests and use request IDs before/after the existing sequenced SearchString mutation. Closing/unmounting invalidates outstanding work. Failures clear on successful retry. Cancel/Escape remain reachable while the read-only request waits; protected mutation busy rules are retained.
- Visible secondary context contributes to each result button's accessible name. Lists scroll independently while query/actions remain reachable at 390px and 1440px; result selection works with Enter, and Escape restores Find focus.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Baseline public-result suite | 9 passed | `.local/task4-baseline.log` |
| Test-first requirements | 9 assertions failed before implementation | `.local/task4-red.log` |
| Checkpoint browser RED | 2 failed on absent status | `.local/task4-browser-red.log` |
| Context/state/public schema + unchanged legacy state/search fixtures | 260 passed | `.local/task4-final-unit.log` |
| Existing engine/source-order projection regression | 1 passed; 170 unrelated route cases filtered | `.local/task4-order.log` |
| PostgreSQL operations/search regression | 1 passed; unrelated 2000-receipt stress case filtered | `.local/task4-integration.log` |
| Standalone `npm run typecheck` | exit 0 | `.local/task4-typecheck.log` |
| Production build in `npm run test:e2e:auth -- search.spec.ts desktop.spec.ts` | exit 0 | `.local/task4-auth.log` |
| Final protected search + desktop browser suite | 7 passed | `.local/task4-auth-final.log` |
| Final checkpoint desktop/mobile search suite | 2 passed | `.local/task4-checkpoint.log` |
| Scoped whitespace check | exit 0 | `git diff --check` |

The PostgreSQL regression covers current binding/auth denial, unchanged ordered hits for empty/elbow/BLIND/no-match queries, malformed query rejection, revision/operation replay and no public private-data extras. Legacy-state fixtures independently preserve the original query semantics.

Final authenticated and checkpoint browser coverage includes initial/empty/success/error/retry, duplicate names and accessible context, empty-query long lists, reachable Cancel, no horizontal overflow, rapid superseded queries, Escape during a delayed request, reopening while the old response is pending, focus restoration and keyboard result selection. Final auth reruns used the same completed production build and fresh isolated databases via `.local/task4-browser.ts`; only test assertions changed after the build.

Real authenticated desktop/mobile screenshots were inspected at `.local/task4-search-1440.png` and `.local/task4-search-390.png` before checkpoint reruns refreshed those filenames. The result list and secondary context are readable, and dialog actions remain visible.

Initial browser runs exposed test-only unscoped status locators (the drawing has other status outputs) and a Windows pipeline encoding issue in new expected strings. Both were corrected; final protected and checkpoint runs passed. Production code did not require a workaround.

## Independent review and limits

GPT-6.1 Sol with **high** reasoning effort reviewed the scoped Task 4 patch, route/title evidence, request races, close/unmount guards, public projection/schema, checkpoint states and accessibility. Result: **no actionable findings**. The reviewer independently ran the 6 search-state tests successfully. No deferred review issues.

The broad `npm test -- --maxWorkers=1` run was attempted with a 256MiB heap, then stopped when Windows committed-memory headroom fell to 605984KiB. Only that run's identified Vitest parent/worker processes were stopped; headroom recovered. **No full regression-suite pass is claimed.** The task-specific checks above completed successfully. Routine Node NO_COLOR/FORCE_COLOR warnings appeared in browser fixtures.

The existing detached linked worktree and all previous dirty drawing/calculator changes were preserved. Task 4 baseline: `.local/task4-baseline/`; task-owned diff: `.local/task4-changes.patch`. Shared files remain uncommitted because whole-file staging would include earlier work. Nothing was published. Task 5 and homepage work remain outside this request.

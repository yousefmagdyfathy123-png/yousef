# Core coverage and protected workspace handoff

The core coverage report checks the assembled registry, the source UI event IDs, the source no-dispatch entries, and the parity ledger against the pinned source revision. It includes 495 required entries, of which 167 are engineering dispatch routes. The remaining entries account for source menu and event behavior, dialogs, and search-only IDs. The 498 tested cards include shared behaviors in addition to the required functional cards. Each tested card identifies the conditions and test files used as evidence. The card count measures ledger coverage.

The original-image comparison retains the existing visual waiver. The browser acceptance test checks the Alfadata workspace through the managed server, including a visible non-Find dispatch, a stale Find selection, drawing retention, and Back navigation. The engine test separately covers all three dispatch IDs absent from Find. Pipe Size Ready Reckoner stays hidden according to the source menu designer.

## Reproduce the acceptance checks

Run from the Alfadata repository in PowerShell with the private catalog built and Chrome installed.

```powershell
$env:LEGACY_CULTURE = 'en-US'
python tools/evidence/core-source-check.py
npm run test -- tests/legacy tests/workspace
npm run coverage:check
npm run typecheck
npm run build
npm run test:e2e -- tests/e2e/core-acceptance.spec.ts
npm run perf:core
python tools/evidence/core-source-check.py
```

[Core acceptance evidence](../evidence/core-acceptance.json) records the commands, source anchors, and results. [Performance evidence](../evidence/performance/core-baseline.json) records Flan1, Flhb1, and Psiz1. Each workload uses independent fixtures for the headers, display commands, and bank identities. The first transition includes lazy table reads. Warm transitions reuse a process and catalog. Browser timing measures Canvas raster work with a pixel flush, and process memory is sampled across repeated transitions.

## Protected application handoff

Plan 2 takes the engine and workspace through the protected service boundary. Use the existing `requireEngineeringAccess` integration point and the public result projection. The built application currently denies workspace access and returns 404 for the checkpoint action path. The managed browser harness binds to loopback, requires a session and matching origin and CSRF for actions, and rejects production startup. It lives under `tools/checkpoints`.

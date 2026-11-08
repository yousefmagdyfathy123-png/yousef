# Task 8 — valves, strainers, line blanks and nuts

Scope: the approved implementation plan's Task8, 38 dispatch routes (22 valves,
10 strainers, 6 fasteners). Primary agent only, including self-review, per user.
Existing task/01-foundation branch retained from Task7; clean tree at start.

Status: COMPLETE. All38 separately importable routes are implemented and
verified against independent Python references from immutable source tables.
Task10 owns workspace assembly. The source executable was never executed.

Verified during development:
- Registration RED: all38 source dispatch entries were pending; no Blnd data invented.
- Initial independent Vlfl1 reference was RED, then all938 route cases passed.
- All38 default reference cases passed. Srrb3 retains its prior title because
  GetTitle lists only Srrb1/2 despite Srrb3 being searchable and dispatched.
- Literal persisted400 tests distinguish existing unavailable tables from absent
  files; Vlv8150 is used without the extra underscore.
- Review found missing SubSubTab/SubSubSubTab state, Vlfl1 implicit weight
  conversion, and selected-subtab error identity. Regression failures were
  observed before correction. Final suite was restarted after code fixes.
- No Task8 handler or GetSubTab branch consumes saved Material; a regression
  confirms material does not invent a valve drawing variant.
- Production build, typecheck,4 retained Chrome journeys and77 source/IL/hash
  checks passed. Sampled regression checks across110 earlier route cases passed.
- All1634 original data hashes, source EXE and Module1 were reverified unchanged.

Final verification:11,765 unique reference cases (2,053 unavailable),104
navigation/recovery checks,77 provenance checks,1,237 core regression checks,
110 sampled earlier-route checks, build/typecheck and4 Chrome journeys passed.
All four final route batches passed after reference correction;244 additional
hidden persisted-face cases also passed. An exact case-id union checked the
full current denominator. The38 Task8 functional ledger cards are now passed.
Acceptance: docs/TASK8-ACCEPTANCE.md and evidence/task8-acceptance.json.
No deferred functional/review finding remains within Task8.

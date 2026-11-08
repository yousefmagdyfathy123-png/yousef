# Task2 — source-preserving catalog and independent fixtures

Plan: Q:/data alfa/docs/superpowers/plans/2026-11-01-alfadata-implementation-plan.md
Spec: Q:/data alfa/docs/superpowers/specs/2026-11-01-alfadata-design.md
Scope: task2 only. Base commit: a1b12e0.

Pre-flight: Catalog/RawTable contracts remain compatible with tasks1/3–12. Template source bytes are available privately; task5 still owns conversion into LegacyTemplate records. Reference normalization and fixture validation, assigned globally to task2, are included.

Source evidence: eight Module1 load-bank/search/drawing/icon/sector methods are recorded with build-local token, RVA, reconstructed-source line/hash and raw IL hash. Existing REA audit matched all1481 selected raw IL bodies. The original artifact SHA256 remains 55a55522875ad7131d1367a08667ae653416c9be2decbd3bd5c54a9b8c04d03c, MVID948a0d3b-1670-4555-9843-5e7ed73785db. No vendor executable was run.

TDD: the importable parser/importer/loader skeletons reached actual assertions. All17 initial catalog tests failed (hash, row count, token preservation, classification, stale reuse and PNG metadata expectations), then passed. Reference helpers independently reached two failing behavior assertions before implementation. Further failing regressions demonstrated mutable manifest metadata and junction traversal creating directories outside the private output; both were corrected before final verification.

Ruling: retain `Catalog.template` as an explicit task5-pending error while providing exact private DXF bytes through the loaded catalog asset API. Implementing a placeholder record list would fabricate source semantics; implementing the parser now would cross task scope. Cost if wrong: task5 adjusts this loader adapter while keeping original identities/bytes.

Ruling: copy only the five proven engineering text/sector files besides table/template/image assets. Other source artifacts stay inventoried as not-selected with no normal engineering load established; they are not declared required UI tables. Cost if later evidence establishes a use: extend the selection policy with source proof and regenerate a new immutable catalog revision.

Three invalid-UTF8 table cells were independently checked with .NET Framework v4.0.30319/mscorlib4 and UTF8 StreamReader: U+FFFD, row13/column12, all14 physical rows retained. A separate Framework helper produced complete lexical fingerprints for all935 CSV files. These helpers call framework IO only and never load the vendor assembly.

Verification results and final review will be appended after the final runs. Functional route cards remain pending; only task2 data infrastructure is eligible for completion.

Final verification (2026-11-01T13:42:26.791Z):

- npm run catalog:build -- --source ../Database: passed twice with identical revision 654e1907186f5d97147a0350a8017c4c1adb37cb8616a06e23d7ada4bfdcc178.
- Targeted catalog/reference tests: 21 passed, including all935 complete Framework fingerprints.
- npm test: 4 files,26 tests passed; task1 regression coverage unchanged.
- npm run typecheck and normal production build: passed.
- Actual Next compiler negative client-import check: passed; the exclusive temporary probe was removed and the normal build restored.
- npm run evidence:check: passed;495 functional route cards remain pending.
- Independent reference generator rechecked all1634 original hashes after implementation with zero changes; independent reviewer separately confirmed all1634.
- git diff --check passed; generated private/catalog/manifest.json is ignored.
- Fresh independent review: no actionable or minor findings.
- Estimate history appended at task2 handoff; no representative route accepted, costs/effort measurements unavailable, coarse range remains low-confidence.

Task2: complete. Keep the existing local task/01-foundation branch and command-scoped Codex identity already established in task1. No remote or publication is configured.

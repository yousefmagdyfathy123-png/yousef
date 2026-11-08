# Alfadata Delivery Plan Index

Approved design: `docs/superpowers/specs/2026-11-07-alfadata-usability-and-homepage-design.md`.

Two independently reviewable implementation plans cover the approved project:

1. `2026-11-07-alfadata-workspace-repairs.md`: verified drawing focus/overview, complete guide-distance results, search context/states and visible labels. Five tasks.
2. `2026-11-07-alfadata-company-homepage.md`: company assets/public shell, full homepage/example/prices, policy drafts and integrated acceptance/deployment prerequisites. Four tasks.

Execute in that order because the homepage's real screenshot should depict the repaired workspace. Homepage shell/policy preparation is otherwise independent. No parallel implementation is needed; shared public contracts and the existing dirty worktree make one implementer the recommended method, with independent review at completion.

Tasks 1 and 2 were individually authorized and implemented inline with independent GPT-6.1 Sol reviews. Their verification records are `../verification/2026-11-07-task1-drawing-focus.md` and `../verification/2026-11-07-task2-drawing-viewport.md`. Task 2 source is retained in the working tree with a scoped patch/baseline to avoid committing preceding dirty work. Task 3 is implemented and independently reviewed by GPT-6.1 Sol; its verification record is `../verification/2026-11-07-task3-guide-results.md`. Task 4 search repairs are implemented and independently reviewed by GPT-6.1 Sol at high reasoning effort; see `../verification/2026-11-07-task4-search.md`. Task5 visible labels and combined workspace acceptance are complete locally; see `../verification/2026-11-07-workspace-repairs.md` for successful gates and the full-run heap-limit/retry record. Tasks6–9 (company homepage phase) are not started. Later reviews must use GPT-6.1 Sol per the user's instruction.

## Self-review

- All seven reported issues map to workspace tasks 1–5 plus homepage task 2. Company/logos/support/policies map to homepage tasks 1–3. Hosting constraints map to homepage task 4.
- Public search metadata enriches boundary responses without changing legacy matching/order. Optional view presentation metadata does not modify commands or the stored legacy drawing schema. Optional result-row kind is carried through both internal and public validation/serialization.
- Drawing metadata is verified and falls back on unprofiled/changed routes. Plan does not require heuristic command deletion or new engineering formulas.
- Review Focus conditions have explicit tests in their owning tasks. Browser specs must be included in protected testMatch; final commands check actual collection counts.
- Plan uses focused interfaces and named tests; implementation bodies remain the builder's responsibility. No new dependencies are planned.
- Existing dirty state/detached HEAD and launch prerequisites are explicit, not treated as permission to erase work or claim deployment readiness.

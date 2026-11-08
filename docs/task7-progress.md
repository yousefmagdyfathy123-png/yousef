# Task 7 - fittings, pipe and welded branches

Plan: Q:/data alfa/docs/superpowers/plans/2026-11-01-alfadata-implementation-plan.md, Task7 only. Base: fb1151a.

Execution: primary agent directly, including self-review; no subagents, per user request. Existing task/01-foundation branch retained per Task6 handoff. Working tree clean at start.

Pre-flight: tasks3-5 supply VB semantics, persistent state, table banks and drawing protocol. Task7 supplies 80 routes to Task10 assembly: 53 fitting, 2 pipe, 25 welded branch. Task9 retains linked calculator dialogs. No invented pressure routes. The source executable was never executed or loaded.

Status: COMPLETE - all80 routes accepted. Full suite19078/19078 across16 files passed in1269.74s; typecheck/build and4 Chrome journeys passed;81 provenance checks passed after LF stabilization. Original-image comparison remains unverified-visual-nonblocking.

Ruling: Pipe1 uses Pipe/Pipe1.dxf raw color6 markers, so its active Sch10 wall label remains 0.065. GetSubTab has no Pipe1 switch. The plan's 0.06-inch / 1/16-inch assertion applies to the numeric formatter and inactive Pipe1a numeric markers, not the active route. Preserve the source mapping and test raw-route output plus numeric helper behavior separately. Cost if wrong: active drawing parity would differ; pinned GetSubTab/LoadDrawing and both DXF marker records support this decision.

Verification record:
- Initial required-route assertion failed with pending instead of implemented.
- 4860 first-wave independent fitting/pipe cases passed before the Pipe-plan conflict was resolved.
- 2520 first-wave welded-branch cases passed; source review subsequently found missing intermediate rounding and a diagonal-radius operation in four Wbol routes. Those initial passes are superseded by corrected fixtures.
- 296 selector/formatting checks passed; 163 recovery/codec/navigation checks passed.
- Self-review fixes: Ftbw10 FormatDim before storing the OD difference, Wbol2 whole-number intermediate, and Wbol3/6/9 diagonal radius plus whole-number rounding. Corrected independent fixtures failed against the implementation; 468 focused checks then passed, including literal lateral height165 and Piwt exact nominal conversion/reload behavior.
- Persisted Wbpi class400 retains disabled controls but uses DesigBtn2ForBranchSize's counter when no class branch assigns it. Literal regression failed weight3 instead of1.89, then361 focused checks passed after correction. Fixtures now cover all seven persisted classes.
- No fresh-context reviewer was dispatched. Self-review followed the code-reviewer checklist, re-reading full source headers after the initial compact evidence scan proved insufficient.
- 80 individually importable route modules, fixture sets and source/IL cards. Reference geometry is losslessly factored into hash-verified literal trailing line commands; no product code generates expected outputs.
- Production build, typecheck and four retained Flan1 Chrome journeys passed. Final full suite passed against all corrected code and fixtures.

Source classification: 80 dispatch routes, 68 direct-menu routes (Wbpi1-12 absent), 79 search entries (Piwt1 absent). Ftsc29 and Ftsw15 are data/drawing names, never registered as routes. No Task10 UI/menu integration is claimed by Task7.

Final acceptance: evidence/task7-acceptance.json and docs/TASK7-ACCEPTANCE.md. Global ledger has0 blockers and376 pending later/global cards. Reconciled32 stale Task6 pending flags against previously accepted hash-verified evidence and the fresh full suite. All1634 source files, original EXE and decompiled Module1 rehashed unchanged. Branch retained; Task8 onward remains pending.

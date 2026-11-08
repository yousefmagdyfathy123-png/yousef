# Task 7 acceptance

Status: complete. Date: 2026-11-02.

Task 7 implements the source-derived engineering recipes for 80 dispatch routes:
53 fittings (Ftbw1-11, Ftsc1-25, Ftsw1-14, Fswa1-3), Pipe1/Piwt1, and 25 welded
branches (Wbol1-13, Wbpi1-12). Each route has its own module, fixture set and
source/IL provenance card. Category indices expose `fittingRoutes`, `pipeRoutes`
and `branchRoutes` for Task10 assembly. This is the Task7 engine package;
remaining workspace, calculator and all-route integration tasks retain their
planned scope.

The independent reference models contain 11,564 cases, including 1,524
unavailable combinations. They cover independent unit tables, every fitting
schedule filename, rating/class branches, offered limits, list/fraction modes,
headers, controls, bank mutations and complete display commands. Repeated
geometry is stored once as literal hash-verified data and expanded without
production code. Additional tests cover all80 drawing-failure recoveries and
serialized navigation sequences, source retained-bank behavior, persisted
class400, and exact Piwt nominal-string conversion/configuration behavior.

Source classifications are preserved: 80 dispatch routes, 68 direct-menu
entries (Wbpi1-12 are absent), and 79 search entries (Piwt1 is absent). Ftsc29
and Ftsw15 are not added as routes. Drawing selection follows GetSubTab; nearby
alternate filenames do not become active drawings.

Pipe1's source drawing uses raw wall markers, so Sch10 NPS1/4 displays 0.065.
GetSubTab does not switch to the numeric Pipe1a drawing. The numeric formatter's
separate 0.065 -> 0.06-inch / 1/16-inch behavior is tested. The approved source
parity policy takes precedence over the plan's implied numeric active drawing.

Review was performed directly by the author, without subagents, as requested.
Re-reading complete source headers found omitted Ftbw10 intermediate rounding,
Wbol2 intermediate rounding, Wbol3/6/9 diagonal-radius/rounding operations, and
the Wbpi persisted-class400 menu-counter continuation. Corrected independent
references/literal regressions were observed failing before fixes; focused
verification then passed. There are no deferred review findings.

Verification: 19,078 tests passed across16 files in1269.74s. Production build,
typecheck, four retained Chrome journeys (17.3s), and81 Task7 provenance and
classification checks passed. The81 checks were repeated after fixture JSON
line endings were pinned; every parsed expected value remained unchanged.
The global evidence check reports0 blockers and376 pending later/global cards.
All1634 original data files, the executable and decompiled Module1 rehashed
unchanged. Exact identities and commands are in `evidence/task7-acceptance.json`.

The global ledger also had32 stale pending flags for already accepted Task6
routes. These were reconciled against their existing hash-verified acceptance
records and the fresh full suite. Task7's own80 cards are marked passed.

Original-image comparison remains `unverified-visual-nonblocking`. No original
runtime/pixel parity claim is made. The original executable is never executed
or loaded. No provider setup, push, merge or publication is part of this task.

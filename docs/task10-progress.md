# Task 10 — all-route assembly, menus and source content

Status: COMPLETE. Primary agent only; no subagents, including review.
Base: 7e3a327 on the existing clean task/01-foundation branch following Task9.

Scope: combine 167 dispatch routes; reconcile 169 search IDs and constructed
events; provide source menus, action adapters, dialogs and inert documents;
verify the full functional ledger without waiving missing behavior.

Pre-flight: family exports satisfy the registry contract; transition currently
defaults to an empty registry. Source menus consume settings, titles, controls,
and history already implemented in Tasks4–9. Task11 owns React integration,
browser lifecycle, gestures and print execution; Task10 provides their descriptors.

Ruling: retain the existing task branch and checkout used by Tasks1–9, avoiding
an unsolicited worktree. Cost if wrong: changes share that branch.
Ruling: the user's no-subagent instruction includes final review; perform a
separate author self-review. Cost if wrong: no independent reviewer.

REA static member inspection: ev_991bdf5081b3c8a175c7d1457f238a5a9c686a4bbceeda96b07dd34ac798afc9,
artifact SHA256 55a55522875ad7131d1367a08667ae653416c9be2decbd3bd5c54a9b8c04d03c,
MVID 948a0d3b-1670-4555-9843-5e7ed73785db. Selected frmPipedata and
frmParameters; complete static coverage, no assembly execution.

Implementation:
- Assemble all167 routes in the default transition/replay registry. Keep the
  registry-independent transition core available to family error recovery,
  preventing family-first import cycles. Save family subtab selections apart
  from the ten-entry navigation history.
- Reconcile169 search IDs: five search-only no-dispatch IDs; Comp1, Piwt1 and
  Psiz1 dispatch without search entries. Keep hidden Pwal/Ptem menus inert.
- Extract315 wired event descriptors and324 constructed control property sets;
  preserve menu ordering, checks, titles, units status, dynamic title visibility,
  option availability, empty handlers, dialog guards and source toolbar counters.
- Provide typed actions/effects and configuration, find, About, span-parameter
  and flexibility dialog models. Preserve source labels, units, Single display,
  private Millimeters/public Millimetres conversion and cancellation behavior.
- Allowlist six documents; select two additional private catalog documents.
  Sanitize HTML into text blocks only. Source company/system/license copy is
  handled under the approved public identity exception, documented separately
  in docs/source-content-policy.md. No vendor service or maintenance action ships.
- Coverage completion checks the actual route assembly and event handlers,
  in addition to the existing hash-bound functional ledger.

Source findings (no engineering corrections): no-dispatch retains the drawing
but AddChecks clears the first six headers; frmParameters_Load replaces even
the process-area caller's path with the units-specific rack-span parameter file;
Notes is an empty guarded helper. Toolbar guards use TabbCount/TabbQty rather
than the title list length, including Fxly/Span/Nuts single-counter quirks.

RED→GREEN evidence: absent assembly modules; unselected material asset;
family-first registry import cycle (four existing family acceptance suites);
source dialog units/labels; dynamic title/status; dialog unit value reload;
single-counter toolbar navigation. Logs are ignored .task10-*.log files.
Hash-bound generated UI facts explicitly use LF on Windows; a failing byte
assertion caught CRLF output that Git would otherwise normalize on checkout.

Final review: author self-review per explicit user instruction. Reviewed registry
set differences, import order, saved family navigation, all recipe selector
adapters, hidden/empty source actions, dialog validation/cancellation, inert
content boundaries, public identity and evidence coverage. Corrected the above
findings with failing tests before each implementation correction. No deferred
minor findings. No independent reviewer was used.

Task11 boundary: UiEffect host descriptors are not browser/mobile/print
execution. The existing Flan1 browser checkpoint is regression-tested here;
full React menu/dialog integration, host lifecycle/print and final public notice
placement remain Task11. Original pixel comparison remains
unverified-visual-nonblocking under the approved exception. Original binaries
were not executed or loaded; raw source/data remain outside public assets.

Verification (LEGACY_CULTURE=en-US):
- Task10 assembly/acceptance plus core, state, codec, drawing, VB, catalog,
  calculators, family acceptance and public-result tests:19 files,
  2,663/2,663 passed in75.42s (.task10-final-verified2.log).
- The five large unchanged family golden-recipe suites were not rerun; their
  hashes and provenance were checked through all four family acceptance suites.
  All167 route defaults and offered wired selector adapters ran in this task.
- npm run coverage:check:498 cards,0 pending functional,0 blocking.
- npm run typecheck:passed. npm run build:passed.
- npm run test:e2e:4/4 Flan1 checkpoint tests passed (desktop, unavailable
  combination, private endpoint boundary, DPR2 Canvas).
- git diff --check:passed. Catalog build verified all1,634 source artifacts;
  source resources/IL and UI extraction hashes pinned in Task10 acceptance.
- After LF normalization, reran the186 Task10 assembly/acceptance tests:
  all passed; verified fixture/extractor hashes against Git's staged bytes.

Task 10: complete — full registry, source menus/dialogs/documents and coverage;
kept on the existing task branch. No push, merge or deployment requested.

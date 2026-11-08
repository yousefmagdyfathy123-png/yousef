# Task 11 — React workspace, Canvas, phone gestures and print

Status: IMPLEMENTED. Automated checks passed; manual screen-reader/device QA limits are explicit in docs/task11-browser-qa.md. Primary agent only, including final self-review.
Base: f7f7658, existing clean task/01-foundation checkout.
Plan: Q:/data alfa/docs/superpowers/plans/2026-11-01-alfadata-implementation-plan.md
Spec: Q:/data alfa/docs/superpowers/specs/2026-11-01-alfadata-design.md

Pre-flight: Task6a supplies strict projection and renderer; Task10 supplies all-route registry, source menus/dialogs/documents. Extend these; no parallel UI.
Ruling: preserve the existing task checkout and branch used by Tasks1–10. No subagents per user, including review.
Ruling: no operation receipts exist yet (plan2). Keep old DTOs readable with optional UI; new server outputs carry UI. Any future receipt replay must validate through parsePublicWorkResult.
REA: ev_c91111d646a2ad7a8be56a792c562697336fbded1edd4a4f9c5271f92ecb6377; selected frmPipedata, complete static metadata, no execution. SHA256 55a55522875ad7131d1367a08667ae653416c9be2decbd3bd5c54a9b8c04d03c, MVID 948a0d3b-1670-4555-9843-5e7ed73785db.
Source review: frmPipedata.cs 11048–11054: AutoScale DPI 96, ClientSize 1599×582 (not outer frame). Existing recipe canvas 1067×690 is a distinct logical drawing, not inferred desktop frame. Source selectors/headers retain their established logical coordinates. Source fonts use Point explicitly; drawing commands already carry pt, not px. Menu hierarchy/order/events are hash-bound Task10 source-data. 14072–14098 print: Width=650, hide MenuStrip1/StatusStrip1–3/Label7, restore; browser implementation uses an isolated immutable snapshot.
Original-image comparison: unverified-visual-nonblocking (approved exception). Alfadata screenshots are QA only.

Implementation:
- Extend the same Task6a Workspace and Canvas, preserving the public-only client
  boundary. All167 routes project to the finalized strict public UI contract.
- Source menus, tabs/history, settings/find/About/parameters and numeric dialogs;
  canceled/rejected input keeps the source behavior and modal focus.
- Semantic Results table and displayed-text copy, clipboard failure/manual
  selection, unavailable output, source units/fractions and revision coherence.
- Fixed logical engineering layout, DPR rendering, explicit Point→Pixel font
  conversion, keyboard/mouse/touch pan/zoom, narrow scrolling and orientation.
- Immutable650px print clone with source transform/hidden controls, shared
  reference-use notice, before/afterprint and blocking/nonblocking/failure
  restoration. Live engine state and selections are not mutated.
- Fail-closed production access seam and a fully assembled loopback-only harness.
  Production identity/session loading remains plan2, as intended.

Ruling: source SortNavigationButtons (Module1 lines18470–18559) overrides static
constructor flags and changes strip widths. Final renderer honors runtime
TabbQty, Gpas4 toolbar visibility and220/270/275/400 widths. Canonical recipe
control coordinates retain their220px navigation baseline; the source strip
translation is separate from the drawing transform. This corrects a gap in the
Task10 static descriptors without changing engine numbers or golden recipes.
Ruling: WhiteBlock bypasses GotoForm/SortNavigationButtons. Preserve prior UI
widths/arrows for unavailable/no-dispatch paths, retain the prior TabArray for
stale search IDs, and carry these scalar private UI fields through the existing
codec. Search/rejected input retain the UI state. New server gateways must call
advanceWorkspaceUi before projection/commit; no persisted old receipts exist.
Ruling: the original's image-only history items expose designer placeholder
Text. Render their source event meanings as Back/Forward; preserve order and
source enabled state. Toolbar labels use their source tooltips.
Ruling: original pixel comparison is waived, not passed. Physical iPhone Safari
is not tested under the approved waiver; emulation is reported separately.
Manual screen-reader and physical Android checks are not claimed and remain
explicit delivery QA, not an asserted universal accessibility/device pass.

Additional evidence: Module1 summary ev_660044f26b35a686e19a3021147f624ed60e819abe159b2d9dcc67b1f6636744
hit the64MiB metadata representation budget. The concrete SortNavigationButtons,
GotoForm, WhiteBlock, GetTitle, Clicker and print method anchors use the existing
hash-bound source/IL inventory in evidence/task11-acceptance.json. No assembly
was loaded/executed. Source files and all raw Database/binary assets are unchanged.

RED→GREEN findings: missing workspace components, strict hidden metadata,
sanitized projection errors, source toolbar tooltip labels, source numeric
button identities, rejected input lifecycle, unavailable semantic messages,
complete menu dismissal, nonblocking print lifetime, WebKit opener focus,
source-hidden title controls, runtime strip widths/visibility and historical
no-dispatch navigation. Final corrections have dedicated unit/browser checks.

Review: separate author self-review, per explicit no-subagent instruction.
Reviewed source layout/state retention, public DTO recursion and leakage,
client import boundary, stale responses, copy/revision behavior, dialog focus,
source input errors, print cleanup, source identity/notice placement and the
loopback-only guard. No independent reviewer was used.

Tooling: two incremental Turbopack builds hit a stale source-map cancellation.
Automatic approval review blocked recursive cache deletion. Preserved the
cache via a reversible rename to ignored .next-task11-cache-backup; the clean
build and subsequent ordinary incremental builds passed. One early Playwright
worker exited with Windows3221226505 under concurrent load; the complete final
seven-project matrix passed with a bounded512MiB Node heap. No product failure
was hidden by retries.

Verification:
- npm test:24 files,39,271 passed in2365.85s. Full existing engine/golden suite;
  final newly added/changed workspace and assembly checks run separately below.
- Final workspace/assembly:10 files,377 passed; includes all167 route DTOs,
  source UI state/codec retention, strict projection, controls, results and print.
- Seven-project matrix:83/83 passed; wide-toolbar extension:7/7 passed.
- Browser/OS versions, actual font availability, screenshot QA and untested
  screen-reader/device limits: docs/task11-browser-qa.md and runtime evidence.
- Final typecheck/build passed; final coverage/staged-byte checks recorded at
  completion below. Source-image comparison:unverified-visual-nonblocking.

Ruling: source Srrb3 dispatches but has no third GetTitle/TabArray entry. Preserve
the prior split-button caption with an unselected caption in the HTML adapter;
retain only the two original Basket menu entries. Do not fabricate a Srrb3 option
or reject its engineering result. A dedicated source-state/renderer test and
all167 strict route projections cover this exception.

Completion checks: source coverage498 cards,0 pending functional/0 blocking;
private source hashes and all referenced tests verified; client bundle import
graph contains no legacy/server/catalog/audit/Database modules. Final strict
contract browser rerun:5/5 Chrome/WebKit/iPhone-emulation checks passed.
Manual screen-reader/device coverage remains explicitly unclaimed. Implementation
is retained on the existing task branch as a local commit; no push, merge or
deployment was requested.

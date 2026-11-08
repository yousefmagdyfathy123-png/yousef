# Task4 — state, selectors, navigation and search

Base: 6b70aae; task4 only from ../docs/superpowers/plans/2026-11-01-alfadata-implementation-plan.md. Retain existing task/01-foundation branch and command-scoped Codex identity per prior handoff. Skills: executing-plans, test-driven-development, reverse-engineer-anything, verification-before-completion; independent review before completion.

Exact task brief read directly: previously established skill task wrapper does not parse approved Task4 heading. No approved plan edits required.

Source findings: Clicker reloads family-scoped settings and appends only unseen routes. SaveTablist shifts the stored ten-item window on an eleventh unique route; revisiting an existing route does not move the cursor. Wired back/forward are ToolStripMenuItem2_Click / ToolStripMenuItem1_Click_1, distinct from subtab arrow handlers. Search checks source columns2–5 (not id/standard column6), uppercases without trimming, invokes all four Like operations and displays original description/order. Malformed patterns reaching Find's catch invoke ErrorCatch, changing engineering state; query submission must therefore use a revisioned action. Normal search only alters scratch/UI search state.

Private source state has family-scoped settings plus retained last view (required for evidenced no-dispatch ids). Persisting these requires schema2; codecVersion remains1. Schema1 remains readable, but transition requires explicit upgrade with independently supplied retained view rather than silently guessing old screen/state. Detailed route recipes/rendering remain later-task scope; known unimplemented dispatch must throw a development error.

Task4: Ruling: the already-declared reset action is a new workspace-local current-route default-selection command, retaining units/history and never rereading account preferences. It reuses AddDefaultSettings rather than exposing the vendor distribution reset. Cost if wrong: revise this command before UI adoption; numeric recipes/data remain unchanged.

Evidence:88 Module1 methods (including all LoadSettings/SaveSettings variants),7 constructed handlers and the source family defaults/title/selection inventory are pinned in evidence/state-compatibility.json. Reused matching source/MVID/REA1481-body identity evidence. Independent defaults preparation covers174 discovered ids and40 family default branches, retaining sequential duplicate Fswa assignments. Windows Framework reference scripts cover17 queries across all169 search rows and8 repeated shared-family Single conversions. Their output reproduced identical byte hashes; helper/fixture identities use explicit LF attributes. Originals were rehashed:1634 Database files and the supplied executable unchanged. No vendor assembly loaded or executed.

TDD: importable state skeletons reached215 failing behavior assertions with4 existing/no-hit passes. Later RED→GREEN steps covered common checks/title inheritance, explicit schema migration, settings allowlists, source-cell traces, source option order and text-result persistence. The independent search helper exposed Framework UCase simple-casing differences for sharp-s/fi ligatures; corrected without JS full-case expansion. Fixed the independent default extractor to accumulate both source Fswa blocks rather than overwrite earlier assignments. Tool encoding/configuration errors were corrected before counting RED.

Minimal independent public SearchHit and text-result shapes were declared. Private result rows are strictly validated, unavailable views contain no invented numeric rows, and representative Flan1 source labels/column/unit origins are inventoried. Actual numeric row calculations, strict final HTTP projection and browser results panel remain task6a/route/task11 scope. The reference comparison helper was extended RED→GREEN so it cannot silently drop new persisted family/view state, text results or search hits.

Fresh independent review completed using gpt-6.1-sol. At the user's explicit request the earlier Astra review was interrupted; no Astra model was used thereafter. Two Important findings, no Critical/Minor findings:

- Final: fixed route-local ErrorCatch integration: validated cloned recovery states cross dispatch, preserve caller ownership and commit exactly one revision — route-recovery integration test RED→GREEN.
- Final: fixed family-specific Vlfl Actuator selection: enabled Lever/Handwheel choices are admitted, saved and reloaded — actuator persistence test RED→GREEN.

Review declined-to-judge items remain exactly the approved later-task boundaries: real engineering recipes, drawing/color/sensor geometry, UI/touch/print/browser QA and authenticated DB/cache/public endpoint behavior. These are not claimed complete here. Provenance/docs were completed after review. No deferred minors.

Verification in this session:

- npm test:8 files,837 tests passed, including242 state tests and all595 earlier regression tests.
- npm run typecheck: passed.
- npm run build with LEGACY_CULTURE=en-US: passed.
- npm run evidence:check:497 cards,495 required functional cards still pending,0 structural blockers. Added only a shared infrastructure card.
- python tools/evidence/state-reference.py: passed;88 method/7 handler anchors and all1634 original hashes verified.
- Isolated Windows Framework search/configuration helpers: passed; identical regenerated fixture hashes.
- git diff --check: passed.

Task4: complete (base6b70aae; no remote/publish/merge). Keep task/01-foundation and command-scoped Codex identity. Next: task5 drawing parsing/display-list, then approved early task6a Flan1 integration; no complete route claim is made from synthetic dispatch adapters.

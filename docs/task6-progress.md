# Task6 — Flanges and gaskets

Base: c5e2993. Plan: ../docs/superpowers/plans/2026-11-01-alfadata-implementation-plan.md.

Parent-only implementation; GPT6.1 high subagent for independent review only. Retain task/01-foundation per previous handoff.

Task6a Flan1 checkpoint must be accepted before other routes. Then each route has independent fixtures, recipe, commit and review boundary.

- [x] Flan1: source branches, banks/sensors, independent fixtures, module, tests, review, commit
- [x] Flan2: source branches, banks/sensors, independent fixtures, module, tests, review, commit
- [x] Flan3: source branches, banks/sensors, independent fixtures, module, tests, review, commit
- [x] Flan4: source branches, banks/sensors, independent fixtures, module, tests, review, commit
- [x] Flan5: source branches, banks/sensors, independent fixtures, module, tests, review, commit
- [x] Flan6: source branches, banks/sensors, independent fixtures, module, tests, review, commit
- [x] Flan7: source branches, banks/sensors, independent fixtures, module, tests, review, commit
- [x] Flaa1: source branches, banks/sensors, independent fixtures, module, tests, review, commit
- [x] Flaa2: source branches, banks/sensors, independent fixtures, module, tests, review, commit
- [x] Flap1: source branches, banks/sensors, independent fixtures, module, tests, review, commit
- [x] Flap2: source branches, banks/sensors, independent fixtures, module, tests, review, commit
- [x] Orif1: source branches, banks/sensors, independent fixtures, module, tests, review, commit
- [x] Orif2: source branches, banks/sensors, independent fixtures, module, tests, review, commit
- [x] Orif3: source branches, banks/sensors, independent fixtures, module, tests, review, commit
- [x] Flre1: source branches, banks/sensors, independent fixtures, module, tests, review, commit
- [x] Flre2: source branches, banks/sensors, independent fixtures, module, tests, review, commit
- [x] Flco1: source branches, banks/sensors, independent fixtures, module, tests, review, commit
- [x] Flco2: source branches, banks/sensors, independent fixtures, module, tests, review, commit
- [x] Flco3: source branches, banks/sensors, independent fixtures, module, tests, review, commit
- [x] Fl6b1: source branches, banks/sensors, independent fixtures, module, tests, review, commit
- [x] Fl6b2: source branches, banks/sensors, independent fixtures, module, tests, review, commit
- [x] Flbx1: source branches, banks/sensors, independent fixtures, module, tests, review, commit
- [x] Flbx2: source branches, banks/sensors, independent fixtures, module, tests, review, commit
- [x] Fldi1: source branches, banks/sensors, independent fixtures, module, tests, review, commit
- [x] Fldi2: source branches, banks/sensors, independent fixtures, module, tests, review, commit
- [x] Fldi3: source branches, banks/sensors, independent fixtures, module, tests, review, commit
- [x] Fldi4: source branches, banks/sensors, independent fixtures, module, tests, review, commit
- [x] Fldi5: source branches, banks/sensors, independent fixtures, module, tests, review, commit
- [x] Flhb1: source branches, banks/sensors, independent fixtures, module, tests, review, commit
- [x] Flbs1: source branches, banks/sensors, independent fixtures, module, tests, review, commit
- [x] Gflt1: source branches, banks/sensors, independent fixtures, module, tests, review, commit
- [x] Gflt2: source branches, banks/sensors, independent fixtures, module, tests, review, commit
- [x] Gflt3: source branches, banks/sensors, independent fixtures, module, tests, review, commit
- [x] Gspr1: source branches, banks/sensors, independent fixtures, module, tests, review, commit
- [x] Gspr2: source branches, banks/sensors, independent fixtures, module, tests, review, commit
- [x] Gspr3: source branches, banks/sensors, independent fixtures, module, tests, review, commit
- [x] Grtj1: source branches, banks/sensors, independent fixtures, module, tests, review, commit
- [x] Grtj2: source branches, banks/sensors, independent fixtures, module, tests, review, commit
- [x] Grtj3: source branches, banks/sensors, independent fixtures, module, tests, review, commit

Preflight: Task2 private catalog -> shared bank loader; Task3 VB helpers -> header/marker formatting; Task4 transition+schema3 -> owned state; Task5 drawing -> Canvas/public schema. No anonymous engineering API in Next deployable app; checkpoint-only loopback harness injects the actual product adapters.

Task6a: accepted —107 targeted tests independently reviewed, four desktop Chrome journeys passed, source-based screenshots inspected. Parent-only implementation; gpt-6.1-sol/high review clean. Source/fixture evidence, limitations and sample observations in docs/FLAN1-CHECKPOINT.md and evidence/checkpoints/flan1.json. Full Task6 still in progress.

Task6a final verification: npm test1218 passed; Chrome e2e4 passed; typecheck/build passed; evidence check0 blockers/494 pending functional cards. One source-inventory test exceeded its old5s timeout under the larger parallel suite; retained all assertions and assigned its full-source scan30s, then full suite passed. Source1634 files and executable rehashed unchanged.

Flan2: complete (base57f3ee0).101 independent cases plus source recovery regression;204 happy/reference tests and1320 full-suite tests passed; typecheck passed. Source-specific catch added after independent gpt-6.1-sol/high Important finding, reproduced RED and corrected GREEN. Reviewer approved; no remaining findings. Shared helper covers only evidenced identical Flan bolting/control fields; sensor7, one-bank path andweight-column28 stay explicit in Flan2 module. Source navigation probe verified class2500→1500 persistence, disabled2500 option, nonloaded banks2–4 preserved and caller ownership.

Flan3: complete (baseb5f468b).101 independent reference cases plus recovery check; gpt-6.1-sol/high reviewed source and navigation, independently102 Flan3 checks passed, no findings. Entire private view/all commands and bank fingerprint match, including2500# enabled. Full suite1422 tests and typecheck passed. Analyst model indexing/refactor preserved accepted Flan1/2 fixture bytes exactly.

Flan4: complete (base34d752a).125 independent fixtures including24 offered unavailable combinations plus recovery. Review found an unavailable-matrix gap shared withFlan2; added24 source-derived negative cases to each, without changing Flan2 recipe. A discarded mutation run missed required culture; explicit-en-US repeat then produced exactly24 assertion failures when source unavailable branch was omitted and code was restored.

Flan4 Ruling: include related Flan2 fixture correction and WhiteBlock state correction forFlan1–4 in this checkpoint because new source investigation exposed shared missing coverage/state. SourceWhiteBlock28831 updatesFactor exactly likeDoDrawing;24 REDfactor assertions observed0 instead of1. Extracted shared arithmetic and passed owned state to unavailableView. No prior geometry/header reference values changed. Reviewer independently252 route checks and equality-ratio regression passed; no remaining findings. Full suite1572 tests, typecheck, production build and fourChrome checkpoint journeys passed.

Flan5: complete (base4a0adf4).101 independent cases plus source recovery;1674 full-suite tests and typecheck passed. gpt-6.1-sol/high independently102 focused checks passed, no findings; raw-table scan confirmed0 unavailable combinations across212 offered combinations after source corrections/trimming. This is explicit not-applicable evidence, not a fabricated unavailable fixture. Source sensor17/weight28, class corrections/disable flags and retainedDataBaseName3 are tested; bank3 remains unmodified/not loaded.

Flan6: complete (base3914564).177 independent references including44 unavailable cases plus recovery; gpt-6.1-sol/high178 focused checks passed, no findings. Independent564 offered-profile scan found no missing unavailable fixtures. Supplementary reviewer navigation probe hit OS memory-allocation failure; no result claimed from that probe. Full suite1852 tests and typecheck passed.

Tooling Ruling from observed8GB-host pressure: bounded Vitest workers to2; all four complete-source-inventory tests retain assertions with30s scan timeouts (two old5s timeouts occurred under load). Goldens now load as rawJSON data via tests/reference/flange-cases.ts rather than enormous generatedJS/TS literal modules. All732 fixture cases and5 recovery checks retained; reviewer approved no value/assertion loss. Fullsuite after refactor1852 passed in77.16s; no application capacity claim follows from test timings.

Flan7: complete (base0f35d85).220 independent references including41 unavailable combinations plus recovery; hidden inherited Flange_wt, source double header pass after clamp,14/15 hub boundary, STD current/saved distinctions and retained-bank/JSON continuation covered. Review found ScheduleIndex stale during clamped re-entry:8 RED assertions thenLoadSettings before nestedapply fixed it. RelatedFlan1 actualXXS fallback got8 new independent cases and the same source-reload correction (8 REDindex18vs8). OriginalFlan1 first103 entries unchanged. Reviewer approved both with no remaining findings. Entire suite2082 tests and typecheck passed. Flan family7/7 accepted; Task6 overall7/39, remaining32 routes still pending.

Flaa1: complete (base963e8a5).297 independent full offered-row references including38 unavailable cases; source nearest5 strict weight/Val bolts, minimum3/default8, class/face flags, unit-specific data and recursive clamp continuation preserved.301 focused checks including drawing recovery, RTJ300-to150 navigation and two missing-table persisted-class recoveries passed.Independent gpt-6.1-sol/high review approved with no findings.Entire suite2383 tests/12files and typecheck passed. Task6 now8/39 accepted;31 remaining. Retained existing branch as requested. Preparatory analyst-model changes from handoff included; accepted Flan fixtures unchanged.

Flaa2: complete (base8631723).297 independent references/38 unavailable plus drawing recovery; explicit source weight29 and tab2. Extracted source-identical Series A flow preserving Flaa1 references. Both Flaa routes599 focused checks and fresh typecheck passed after optional textResults test access correction. Independent gpt-6.1-sol/high review approved no findings. Task6 now9/39 accepted;30 remaining.

Flap1: complete (base7be99cc).333 independent full offered-row references,0 unavailable after full matrix scan;334 focused tests including recovery and typecheck passed. Hidden inherited Face selects sensor11+FaceIndex and header text; GetSubTab never switches Flap drawing. Fractioncol10, strict weight16/nearest5, boltsVal21, annotations19/20 retained. Independent gpt-6.1-sol/high review approved no findings. Task6 now10/39 accepted;29 remaining. Ledger encoding restored from accepted8631723 bytes after Python default cp1252 read was detected; no reference values changed.

Flap2: complete (baseb9d16e3).333 independent references/0 unavailable plus drawing recovery; explicit source weight17/tab2/regular drawing. Both Flap routes668 focused checks passed and fresh typecheck passed. Independent gpt-6.1-sol/high static review approved before reviewer session usage-limit exit; no findings. Series B extraction preserves Flap1 references. Task6 now11/39 accepted;28 remaining.

Orif1: complete (base4d867f4).105 independent cases/0 source-offered unavailable after scan, plus drawing recovery and class600-RTJ-to300 navigation:107 focused tests and fresh typecheck passed. Sensor3, class300 hidden retained Face and regular SubTab, Val weights/round2, doubled RTJdistance, recursive in-place20/25 double labels preserved. Independent gpt-6.1-sol/high static review approved no findings. Task6 now12/39 accepted;27 remaining.

Orif2: complete (based9c1e35).125 independent references plus recovery/settings correction regression:127 focused checks and typecheck passed. Reviewer found omitted LoadSettingsOrif4533 corrections;105 RED failures observed, then RTJ-toRF/non300-to300 correction before defaults/indices persisted final values and GREEN127. Reference model independently corrected; unreachable missing-RTJ-drawing expectation removed. Independent gpt-6.1-sol/high re-review approved no findings. Full suite running separately in .task6-orif2-suite.log; no full-suite success claim yet. Task6 now13/39 accepted;26 remaining.

Orif3: complete (base7d7a948).125 independent references plus recovery/inheritedChkType regression; all3 Orif routes361 focused checks and typecheck passed. Source deliberately retains ChkType unlike Orif2; extracted identical2/3 body/headers with explicit assignment onlytab2. Independent gpt-6.1-sol/high review approved no findings. Earlier full suite throughOrif2 completed3583 tests/12files, .task6-orif2-suite.log. Task6 now14/39 accepted;25 remaining.

Flre1: complete (baseb14f843).431 independent cases including64 unavailable;431 reference checks and4 branch-specific real drawing failure recoveries passed, typecheck passed. Source SmallSize4..Main-1 clamps without saving, inherited threshold rows5/6, four drawing branches/150class split, unitFlan tables, no bankfraction conversion, blank weight text, annotations30-34/48-49/60-64 preserved. Independent gpt-6.1-sol/high reviews approved reference model and implementation with no findings. Task6 now15/39 accepted;24 remaining.

Flre2: complete (basef3171c0).431 independent references/64 unavailable plus2 drawing recovery branches and inheritedChkType/SubSubTab continuation; both reducing routes869 focused checks and typecheck passed. Explicit tab2/Drilled blind annotation63, two drawings even150class, retained extra globals. Source-identical sizing/header code extracted preserving acceptedFlre1. Independent gpt-6.1-sol/high review approved no findings. Task6 now16/39 accepted;23 remaining.

Flco1: complete (base47fd092).57 independent references/0 unavailable after offered scan plus drawing recovery:58 focused checks and typecheck passed. Shared metric table for bothunits, imperial drawingconversion/DimFactor25.4, source bolt rounding/G15/FormatDim order, Valweight4, pairweightnote/DESTEC preserved. Independent gpt-6.1-sol/high review approved no findings. Task6 now17/39 accepted;22 remaining.

Flco2: complete (base3e4c5ca).77 independent references/0 unavailable including incoming sizes3/4/5 and source lowerclamp. Both compactroutes136 focused checks and typecheck passed. Sensor11/min4for1500or2500else5, upper/lower saved reentry and outercontinuation preserved; identical compactheaders extracted without Flco1 changes. Independent gpt-6.1-sol/high review approved no findings. Task6 now18/39 accepted;21 remaining.

Flco3: complete (base97bac33).57 independent references/0 unavailable plus drawing recovery; all3 compactroutes194 focused checks and typecheck passed. Explicit blind weightcolumn5, sensor2/min4/tab3 while preserving accepted1/2 behavior. Independent gpt-6.1-sol/high review approved no findings. Task6 now19/39 accepted;20 remaining.

Fl6b1: complete (basee9f3b6c).49 independent references/0 unavailable after full offered-row scan plus drawing recovery:50 focused checks and typecheck passed. Original API6A-2004/Type6B weldneck title, sensor21/min3/default8/rating1, actualMPa/PSIcontroltext, weights38/41, fractioncol34 and twice-appended inchsigns on recursiveclamp preserved. Independent gpt-6.1-sol/high review approved no findings. API-size source20-option cap exceeds all real offeredrows(max11), no inventedoptions. Task6 now20/39 accepted;19 remaining.

Fl6b2: complete (base228e1b9).49 independent references/0 unavailable plus drawing recovery; bothAPI6B routes100 focused checks and typecheck passed. Explicit source sensor3/weight39/Client Specify annotation37, remaining API6B header/units/fractions flow shared preserving Fl6b1. Independent gpt-6.1-sol/high review approved no findings. Task6 now21/39 accepted;18 remaining.

Flbx1: complete (base9cf6ad1).47 independent references/0 unavailable after full offered scan plus drawing recovery:48 focused checks and typecheck passed. SourceBXWeldneck2004 title, WNunitfiles/rating4/disabled1-3, sensor2/min3, weights20/22, fractioncol14, sourceannotations48-50/53 and literalRTJdistance0 preserved. Independent gpt-6.1-sol/high review approved no findings. Task6 now22/39 accepted;17 remaining.

Flbx2: complete (base1dc6b57).46 independent references/0 unavailable plus normal drawing and header overflow recovery. BothBX routes96 focused checks passed; fresh typecheck and isolated overflow regression passed after readonly test-table clone correction. Explicit source BTfiles, extra FormatDim, annotationsMax/Holes/Dia, and inner Flbx2_Headers error identity preserved; drawing errors retain Flbx2 identity. Independent gpt-6.1-sol/high review approved no findings. Task6 now23/39 accepted;16 remaining.

Fldi1: complete (base6783891).133 independent references/0 unavailable plus drawing recovery and PN16 navigation:134 focused reference/recovery checks + isolated navigation passed; typecheck passed. PN12 button values (including16) remain distinct from11-item checker array. Sensor9/min4, highPN correction100, zero-weightN/A, in-place imperialhole diameter doubleconversion onclamp, markerconversion, weight35/bolts45/length40 and EN1092Type01 preserved. Independent gpt-6.1-sol/high review approved no findings. Task6 now24/39 accepted;15 remaining.

Fldi2: complete (base479e231).123 independent references/0 unavailable plus drawing recovery; bothDIN routes259 focused checks and typecheck passed. Sensor15/weight36/bolts46/length41/Type05, regulardrawing despite unused2a asset; PN12/sourceconversions shared preserving acceptedFldi1. Independent gpt-6.1-sol/high review approved no findings. Task6 now25/39 accepted;14 remaining.

Fldi3: complete (based6ab42e).143 independent references including2 unavailable plus drawing recovery/unconditionalhighPNsave regression; all3DIN routes404 focused checks and typecheck passed. HighPN remains offered, rows6/8 disabled and corrected7/9, completefamilyrecord saved evenvalidsize (semantic REDundefinedvs0 beforefix). Sensor23/weight37/bolts47/length42/Type11 preserved. Independent gpt-6.1-sol/high review approved no findings. Task6 now26/39 accepted;13 remaining.

Fldi4: complete (basee8bb7f8).123 independent references/0 unavailable plus drawing recovery and PN2.5-to6 settings regression; all4DIN routes529 focused checks and typecheck passed. Semantic RED2.5vs6 proved omitted correction, now persisted before tablelookup; sourcePN2.5buttondisabled plus highPNs. Sensor22/weight38/bolts48/length43/Type12 preserved. Independent gpt-6.1-sol/high review approved no findings. Task6 now27/39 accepted;12 remaining.

Fldi5: complete (basedc2511c).123 independent references/0 unavailable plus drawing recovery; all5DIN routes653 focused checks and typecheck passed. Explicit sensor22/weight39/bolts49/length44/Type13, sourcePNlow/highcorrections andflags; accepted1-4 unchanged. Independent gpt-6.1-sol/high review approved no findings. Task6 now28/39 accepted;11 remaining.

Flhb1: complete (base22675b6).77 independent references/0 unavailable plus drawing and header overflow recoveries:79 focused checks and typecheck passed. Exact7schedulesSTD/40/60/80/120/160/XXS, sharedmetricdata/imperialdraw conversion, annotations30-34, connectionweight11 andstudcount10footer preserved. Headerfaultidentity Flhb1Headers (no underscore); testfaulttargets actualrow4 becauseSTD source contains only4physicalrows/default8clamps4. Independent gpt-6.1-sol/high review approved no findings. Task6 now29/39 accepted;10 remaining.

Flbs1: complete (base4f84df9).107 independent references/0 unavailable plus base/alternate drawing recoveries:109 focused checks and typecheck passed. Reviewer found missing largestoffered TableD row46 boundary; added Metric/Imperial row46 references while retainingphysicalrow50/oversize100. SourceTableprefix/options, H/J/K/R/S/T alternate drawing, literalinchholelabel, weights12/13/length22 andBS10captions preserved. Independent gpt-6.1-sol/high review approved after fixture fix. Entire suite throughall30flanges:5810 passed/12files, .task6-flanges30-suite.log. Task6 now30/39 accepted;9 gasket routes remaining; finalarrays/build/hashacceptance pending.

Gflt1: complete (base961d590).154 independent references/1 unavailable plus drawing recovery;155 focused checks passed. Persisted disabled classes, recursive column12 formatting, min3/default16, unit tables and full command/bank fingerprints preserved. Independent gpt-6.1-sol/high review approved without findings. Task6 now31/39 accepted.

Gflt2: complete (baseb1a5853).243 independent references/162 unavailable plus recovery;244 focused checks passed. Additional900# disabled, persisted disabled values retained. Independent gpt-6.1-sol/high approved without findings. Source-identical Gflt header/recipe flow extracted for family reuse. Task6 now32/39 accepted.

Gflt3: complete (base61b0db8).243 independent references/162 unavailable plus recovery. Entire Gflt family643 focused checks passed; independent gpt-6.1-sol/high approved Gflt3 and shared extraction without findings. Task6 now33/39 accepted.

Gspr1: complete (basec03a3c7).151 independent references/0 unavailable after offered matrix scan plus recovery;152 focused checks passed. All7classes enabled, sensor2+index/weight25+index, formatted34-37 dimensions without headerfractionizing, hiddenFace retained. Independent gpt-6.1-sol/high approved without findings. Task6 now34/39 accepted.

Gspr2: complete (baseb2c5425).153 independent references/0 unavailable plus recovery;154 focused checks passed. Source22+index sensor/weight and4*index dimensions, disabled persisted1500/2500 retained. Source-proven common spiral flow extracted preserving route1 differences. Independent gpt-6.1-sol/high approved without findings. Task6 now35/39 accepted.

Gspr3: complete (base079df10).153 independent references/0 unavailable plus recovery. All3spiral routes460 focused checks passed; independent gpt-6.1-sol/high approved Gspr3 and shared extraction without findings. Task6 now36/39 accepted.

Grtj1: complete (base363158d).117 independent references/0 unavailable plus recovery;118 focused checks passed. Every offered row, physical/clamp bounds, sign-free ring size controls with restored ListUnitsSign, weight9 and recursive in-place radius label preserved. Independent gpt-6.1-sol/high approved without findings. Task6 now37/39 accepted.

Grtj2: complete (base4245e6d).109 independent references/0 unavailable plus recovery;110 focused checks passed. Weight10, repeated col9 radius, annotations12-14 preserved. Shared R/RX flow extracted with explicit differing fields. Independent gpt-6.1-sol/high approved without findings. Task6 now38/39 accepted.

Grtj3: complete (baseb6ee34b).73 independent references/0 unavailable plus recovery;74 focused checks and fresh typecheck passed. All offered BX rows, metric bank2 bothunits, Single cylinder/subtraction/product precision, hidden globals and saved/currentLength distinction preserved. Independent gpt-6.1-sol/high approved without findings. All39 route implementations accepted; final Task6 assembly/full verification still pending.

Task6: COMPLETE — all39/39 independently accepted routes assembled as30 flangeRoutes +9 gasketRoutes. Final source-index dispatch/menu/search checks preserve Fl6b3 no-dispatch and later routes pending. Fresh full suite7265 passed/14files/488.30s, typecheck/build passed, fourChrome Flan1 checkpoint journeys passed/8.9s, evidence check0 blockers/488 pending global cards. All1634 source files/41852002bytes, originalEXE and decompile rehashed unchanged after verification. Original executable never executed/loaded. New combined navigation test initially hit5s timeout; split into10 focused checks retaining all assertions and addingbank2 retention; final suite includes all1415 gasket checks. gpt-6.1-sol/high independently approved all9 routes/shared extractions/final assembly/test refinements, no outstanding findings. Acceptance report: docs/TASK6-ACCEPTANCE.md and evidence/task6-acceptance.json. Keep branch task/01-foundation; no push/merge/publication. Task7 onward remains pending.

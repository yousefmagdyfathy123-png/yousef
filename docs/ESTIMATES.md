# Initial delivery estimates

Date: 2026-11-01. Unit: focused engineering person-hours, not calendar duration or agent token usage. Confidence: low. Staffing assumption: one implementer with independent review at handoff; no assumed parallel speedup. These are planning judgments, not measured productivity or a delivery promise.

| Phase | Optimistic | Expected | Conservative | Basis |
|---|---:|---:|---:|---|
| Engineering engine/workspace, tasks1–12 | 350 | 700 | 1400 | 167 dispatch cases, heterogeneous recipes, numeric/state semantics, desktop/mobile/print; no route sample accepted yet |
| Identity/commerce, tasks13–19 | 180 | 340 | 650 | Persistent database, auth, CSRF, payments, replay/recovery, concurrency and HTTP integration tests |
| Acceptance/operating package, tasks20–22 | 100 | 200 | 400 | Full QA, performance/recovery evidence and dual-slot operating procedures |
| External providers/launch | unknown | unknown | unknown | Accounts, destination, provider requirements and approval waits not supplied |

Budget ceiling: not supplied. Monetary tool usage/cost: unknown; no actual billing records or declared rates supplied. Provider/infrastructure quotes: none obtained; no spend authorized by this estimate. No invented measured route duration. Local elapsed execution observations belong in history; representative route work begins in tasks6–9.

Recalibrate after independently accepted Flan1, a calculator, a prior-state drawing sequence and an unavailable combination. Record investigation, fixtures, implementation, review/correction, elapsed time and waits separately. Do not extrapolate one table route across every dispatch case. Retain every revision in evidence/estimates/history.json. Branch counts are lexical inventory measures, not independent difficulty weights.

Dependencies: source-derived fixtures, private catalog import, original state/formatting semantics, PostgreSQL and supported Windows packages, browser QA; external launch further requires authorized accounts and destination. Functional evidence gaps remain pending. Original screenshot comparison alone is nonblocking under the approved spec.

Task7 checkpoint (2026-11-02):80 further engine routes verified;119/167 dispatch implementations exist,48 dispatch routes remain plus Task10 assembly, remaining workspace work and core acceptance. Evidence and measured suite durations are in evidence/task7-acceptance.json. Phase-specific engineering effort and monetary usage remain unknown; automated test duration is not a person-hour measurement. Prior low-confidence ranges are retained, not presented as a calibrated new forecast. History/sample records preserve these limits and self-review mode.

Task8 checkpoint (2026-11-02):38 further engine routes verified;157/167 dispatch
implementations exist,10 remain in Task9, followed by Task10 assembly and the
remaining workspace/acceptance scope. Independent cases, verification batches
and source-preservation evidence are in evidence/task8-acceptance.json. No phase
person-hour timers or billing records were available; the prior ranges remain
low-confidence assumptions rather than a newly calibrated forecast. Parallel
test-batch durations are not additive engineering effort or development cost.

Task9 checkpoint (2026-11-02): the ten calculator exports complete167/167 dispatch
implementations. Task10 assembly and the remaining workspace/acceptance scope
remain open, followed by the identity and delivery plans. The calculator sample
is accepted in evidence/task9-acceptance.json. Focused engineering person-hours
and monetary usage remain unknown; automated test durations are not additive
effort. The initial ranges remain historical low-confidence assumptions; no
new calibrated remaining-hours forecast is claimed.

Identity and commerce checkpoint (2026-11-03). The PostgreSQL suite exercised
44 tests across 18 files in 97.21 seconds, including account identity,
entitlements, payment reconciliation and workspace persistence. The focused
workspace operations, asset and browser-mutation suite exercised six tests
in 68.88 seconds. The authenticated browser runs exercised local email
confirmation, workspace resume and recovery, search and mutation protection.
These are verification durations. Phase implementation effort, external
waiting time and monetary tool cost remain unknown. The original ranges
remain historical assumptions, and there is no measured new remaining-hours
range. Launch still depends on live provider acceptance, SMTP credentials
and DNS.

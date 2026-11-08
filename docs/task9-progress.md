# Task 9 — calculators and linked input dialogs

Scope: ten source dispatch routes, the wired flexibility input dialog, and
pressure/thickness menu classification. Primary agent only, including review,
per the user's instruction. Existing task/01-foundation branch retained.

Status: COMPLETE. All Task9 functional checks passed.

Implemented Gpas1–4, Comp1, Span1–2, Fxly1–2 and Psiz1 as calculatorRoutes.
The ten family exports bring implemented dispatch coverage to167/167. Task10
still owns assembling those exports and menus into the workspace.

Independent references cover6,998 complete recipe cases,793 unavailable cases,
36 immutable tables and12 drawings. All offered primary table rows are covered
for each distinct file/sensor branch, with separate class-pair, insulation,
schedule, material, full/empty, units/list/fractions and cooling/heating cases.
An additional1,023 isolated .NET4 cases cover arithmetic, the wired Button4
handler, invalid/nonfinite inputs, the OD65 boundary and Single string reload.

Self-review corrections were observed as failing tests before correction:
template selection, secondary-class options, Comp1's strict smaller-size upper
bound, Single intermediate span multiplication, source string/nonfinite
semantics, failed-input display retention and selected cooling-subtab error
identity. Tests also preserve Medium Oil's inherited coefficients.

Review of Single persistence found an earlier configuration reference omitted
the registry string step between the two wired flexibility visits. A fresh,
isolated .NET registry probe confirmed String/G7 storage and was deleted in a
finally block. The vendor registry was untouched. The independent configuration
helper and its eight expectations now include each load and the final reload;
all state tests passed after this evidence-backed correction.

Pwal1/Ptem1 remain no-dispatch. Constructed menus call Clicker, which has no
matching dispatch cases. Pwal1 has no caller, PwalCalculate is reachable only
inside that dead chain, and PtemCalculate has no caller. Piwt1 has no call into
either helper. No dead pressure/thickness calculator was activated.

Original source/data are unchanged. No original executable or vendor assembly
was executed or loaded. Original-image comparison remains
unverified-visual-nonblocking under the approved exception.

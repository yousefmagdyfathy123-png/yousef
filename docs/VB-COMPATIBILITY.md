# VB compatibility boundary

Release1 explicitly requires `LEGACY_CULTURE=en-US`. `resolveLegacyCulture` returns the frozen server profile; the existing startup guard delegates to it. Helpers validate the full profile, so locale headers, browser language and currency preferences cannot select a different parser. Missing/unsupported setup errors never echo input values.

`vbVal` follows VB prefix scanning (including whitespace removal, radix/sign width, exponent and type-suffix behavior). `vbDouble` is a separate culture-dependent conversion: grouping, en-US currency, parentheses and trailing signs have different meanings than `Val`. Neither helper silently converts a failed conversion to zero. `vbInt` floors; `vbSingle` explicitly narrows to binary32; `vbRound` scales binary64 and rounds ties to even. `vbString` uses Framework double general formatting with fifteen significant digits, rather than JS shortest-string formatting or fixed decimals.

`vbCompare` Binary uses UTF-16 ordinal ordering and treats null as empty. Text mode uses the en-US collation path with independently checked Windows word-sort punctuation/ligature rules. Normal source searches/comparisons consume Binary mode. The pinned Framework sort version is recorded; this is not a claim of exhaustive Unicode/global-culture collation parity. Any later route that consumes additional text-mode behavior needs its own source/Framework fixtures, as every route recipe already requires.

`vbLike` consumes the source's Binary pattern mode: UTF-16 code units, wildcard `*`, `?`, Unicode decimal digit `#`, bracket lists/ranges/negation, empty `[]`, and source-progress-dependent invalid-pattern errors. The matcher uses rolling dynamic-programming rows, without regex wildcard backtracking. Entering star matching validates the remaining pattern according to independently observed Framework behavior; a preceding literal mismatch can prevent reaching an invalid pattern.

`formatLegacyDimension` models only the two established numeric drawing branches: bank1/color1 sentinel guard followed by FormatDim → route-specific imperial conversion → fractionization → inch sign, and bank2/color99 preappend sign → FormatDim → fractionization → sign. Other drawing labels/headers are owned by their route/parser tasks. Fractions use strict open tolerance windows at 1/64 around multiples of 1/32, preserve `Conversion.Str` leading spaces for mixed numbers, and reparse after the below-one branch exactly as source does. Metric is not an invented global switch disabling fractions. `Span1` has zero-place imperial rounding and `Ftsw14` is excluded from its family's conversion.

Run the independent Windows helper from the product root:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/evidence/framework-fixtures.ps1
python tools/evidence/vb-provenance.py
$env:LEGACY_CULTURE='en-US'
npm test -- tests/legacy/vb.test.ts tests/legacy/culture.test.ts tests/legacy/state-codec.test.ts
```

The helper calls installed Framework4/VB10 APIs and an independently source-transcribed dimension model; it never loads the vendor assembly or imports product helpers. Raw numeric/special outcomes are JSON-safe, culture/runtime/sort/helper identities are pinned, and rerunning reproduces the same fixture hash. The provenance tool checks the executable hash, reconstructed source coordinates, method token/RVA/raw-IL hashes, all1634 original data hashes and helper hash. Reused REA evidence establishes static instruction identity, not original runtime/screenshots. Route implementation/continuation and database persistence remain later-task acceptance scope.

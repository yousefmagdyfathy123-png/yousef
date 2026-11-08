# Drawing protocol (Task5)

`drawing-compatibility.json` pins nine source/IL anchors to the same supplied
artifact/MVID as the earlier REA raw-body crosscheck. No vendor assembly is
loaded or executed. `drawing-reference.py` verifies all 1,634 original files and
the executable, then derives independent fixtures from the existing analyst
Python audit. It never imports the TypeScript implementation.

`parseLegacyDrawing(bytes, prior)` returns an owned clone with sparse memory and
accepted records. Physical capture starts after line26, only literal
`AcDbEntity` resets the persistent capture origin, and its window is 25 lines.
Drawlines1 scans through `sc` inclusive and requires `AcDbLine` at offset+8.
Coordinates are VB Val, ties-to-even rounded to three decimal places, serialized
with the established en-US VB string helper. Layer and linetype scratch values
are retained, including the source's unusual absolute-token linetype lookup.
Unknown colors inherit the previous `colr`.

Only tokens1..20000 and lineMem rows1..1000/columns1..10 are cleared. Actual
capacities are200001 tokens and10001×11 line cells, including index0. The
inclusive one-past record can retain previous navigation data. A source failure
throws `DrawingProtocolError` with its stage, cause and partially changed owned
buffers for the later route-level ErrorCatch boundary; the caller's input stays
unchanged. No source exception becomes successful invented geometry.

`catalog.template(id)` provides immutable fresh-profile records, verified exact
private source bytes and canonical source identity. These records are an analyst
profile, not a promise of the current screen's inherited colors.
`buildDisplayList(state, template, catalog, viewport)` reparses those bytes against
the supplied state, then updates drawing scratch memory on that owned state.
For controlled record fixtures without source bytes, callers must supply already
parsed lineMem/drawing state; the fresh record fallback has no navigation
history. Route implementations must call the builder on their transition clone.

Labels and white masks precede ordinary linework. Marker colors5/6/2 select bank1
numeric (absolute Single delta), bank2 numeric (signed Single delta) and bank1
raw text (signed Single delta). Negative/out-of-range indexes throw rather than
clamp. Formatting reuses Task3's source-backed bank-specific pipeline, including
N/A and SPA guards only for bank1. Raw text trims before measuring its UTF16
length, replaces terminal `*` with a degree sign after measuring, and uses the
source Flan alignment/mask branches. Trimming follows VB Strings.Trim (ASCII
space/U+3000), preserving tabs/NBSP/BOM as verified by five independent Framework
cases. Exact delta100 uses28-point far/far text.
Other text is16-point Verdana bold with top alignment; `verticalAlign:bottom`
records the far vertical alignment for the future Canvas renderer. Colors and
pen widths come from DoDrawing rather than the CAD palette/linetype.

The transform uses1067/690, ratio0.6466 and scale0.6; equality preserves prior
Factor. Each VB Single arithmetic step is rounded, including Y inversion around
DrawDatum. Ptem1 adds its red hairline crosshair after *each* ordinary segment,
including the inclusive blank row. After each crosshair it restores temperature
through the source's Framework Single G7 text roundtrip, which can change its
precision and subsequent crosshair positions. Six independently run Framework4
fixtures verify this, including negative/zero/tiny and rounding-sensitive values.
It also updates the source class multiplier AnyInt. No automatic bounds fitting, INSERT/xref,
TEXT, ARC, circle, polyline expansion or dashed-pen interpretation is added.

Tests compare every accepted record's source/token offsets, coordinates, raw and
inherited colors and marker index for all245 DXFs against independent
fingerprints. The fresh-state profile is80,280 records/1,701 markers, not an
unconditional runtime total. All seven xref files retain their independently
known counts. The four zero-record files are classified separately from normal
selected routes: Flan/flan6a, Vlsc/vlsc, Ftsc/ftsc29 and Ftsw/ftsw15. They do not
establish active blank-screen defects. Conditional negative markers in alternate
Ftbw3a/Vlfl-vlbw2 likewise do not establish normal route reachability.

The tests cover synthetic protocol boundaries, navigation beyond both clearing
limits, private encode/JSON/decode continuation, degree text, bank errors,
Ptem crosshairs, exact transforms, mask order and Gpas3 column26/Pipe1a column4.
Synthetic banks/records are explicitly test inputs, not claimed completed routes.
Real route selection/subtab lookup, source ErrorCatch integration, full geometry
recipes, Canvas rendering/browser/phone/print QA belong to Tasks6a/6–11.
Original-image comparison remains `unverified-visual-nonblocking`.

# Verified drawing focus profiles

These are presentation-only hints. They do not remove, reorder or change drawing commands, source geometry, engineering text, unit formatting, transforms, stored legacy views or drawing asset responses. Task 1 publishes hints; changing the viewport is Task 2.

## Evidence and grouping

Source inspection uses the existing `parseLegacyDrawing`, `markerFor`, `markerText` and `buildDisplayList` pipeline. Template rows below are one-based; output command indices are zero-based. Record layers alone do not identify complete views: Flan1's primary dimension markers occur on several layers. The renderer emits marker masks/text before geometry; masks belonging to a label must travel with that label.

### Flan1: weldneck flange

- Template identity: SHA-256 `99b2bc45ccd5f0417f7493f7666de48122c3e99347acfb9955b5081c80938965`.
- Source rows 81–86 form two three-segment navigation triangles. Rows 87–116 form the distant auxiliary flange outline. They do not carry the primary view's markers.
- All primary geometry, dimension/extension lines, and marker labels/masks are in the remaining source rows. The marker pass emits 28 commands; geometry corresponding to rows 81–116 is output indices 108–143.
- The renderer also emits an extra degenerate trailing line from its cleared scratch row. This is output index 293 and is not primary geometry. It remains in the full command array.
- Verified primary indices: 0–107 and 144–292 (257 commands). All 14 labels, their masks, and their associated dimension/extension lines are included. No numeric-label-first or coordinate-threshold heuristic is used at runtime.
- Raw-text masks at indices 18, 20 and 26 have widths determined by the following label's string length (`Math.fround(length * 18)`). Guard this relationship before normalizing those widths in the structural signature. Text values themselves vary with selected size, units and fractions and are not the template identity.

### Fxly1: distance to first guide

- Template identity: SHA-256 `b164cd6ec371ab1dfc602a7f33902af97602167e5a5a3fe2336c2bb0f9497bed`.
- This template has a single dimensioned pipe-leg view, including Anchor, First Guide, Dim A and dynamic length/distance labels. Keep every emitted mask/text and geometry command in that group.
- Verified primary indices: 0–133 (134 commands). The final cleared-row degenerate line at 134 remains in the full drawing but is not primary geometry.
- Opposite-temperature template variants are separate identities. Until independently profiled, they fall back to full overview.

## Structural guard

The server matches the route and SHA-256 of the complete emitted command structure. Identity includes every line endpoint/color/width, mask placement/color/height, and text position/font/alignment/color/baseline. Only text values and the three verified length-derived Flan1 mask widths are normalized. Widths must first satisfy their actual rendering relationship. This supports dynamic values while rejecting changed geometry, moved labels, reordered/added/removed commands or changed masks. The public DTO receives indices only, not profile hashes, source files or catalog rows.

Drawing size/transform are not used to guess a view. The profiles describe source-space commands; the complete source drawing and transform are preserved for the future consumer. Changed/unmatched command structure means no hint. The schema rejects empty, duplicate, noninteger, negative and out-of-range indices and any extra metadata fields. Older DTOs without hints remain supported.

## Deliberate fallback coverage

Gflt1 (gasket/multiple geometry groups), Span1 (span calculator), and Flan2 (another flange with distant elements) were inspected alongside Flan1/Fxly1. Their source grouping differs, so no Flan1 profile is reused for them. All unsupported routes, unavailable/empty drawings, new variants and changed signatures receive no presentation metadata and retain the existing full drawing. Add a profile only after documenting its template identity and complete primary geometry/annotations; never approximate with bounding-distance or label-name rules.

## Verification

Tests cover real catalog transitions, independent reference cases, geometry and label/mask changes, unknown routes/variants, empty drawings, unit/size changes, strict public validation, and source command equality through projection and print snapshots. Logs and raw exploratory template summaries remain local, outside public assets. No raw catalog/template data is included in this document.

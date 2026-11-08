# Centered engineering drawings

## Intent and acceptance priority

Improve engineering drawing placement and readability on screen and on A4 landscape printouts. The user selected a separate drawing area with controls above it. Engineering data fidelity is the primary acceptance condition.

## Agreed scope

- Place component navigation and engineering selectors above a dedicated drawing area.
- Center the drawing with its dimension lines, values, symbols, and annotations. Fit it proportionally to the available area and support zoom, pan, and fit/reset.
- Print on A4 landscape with the drawing and its dimensions, component name, and selected engineering parameters. Exclude the results table and application controls from the printed composition.
- Reuse the existing engine, units, catalog, and engineering drawing commands. The preview flange was illustrative and supplies no engineering geometry or values.

## Approaches

1. Separate the drawing area from interface controls. This requires more layout work and allows independent fitting and printing. Selected by the user after the assistant recommended it.
2. Scale and center the existing combined board. This takes less layout work but ties drawing size to the legacy controls and text positions. Considered and declined in favor of approach 1.

## Data fidelity constraints

- Preserve every engineering value, unit, symbol, dimension endpoint, annotation association, and relative geometric relationship supplied by the engine.
- Apply a uniform display scale and translation to drawing geometry and its associated dimension annotations together. Preserve original command data for comparison. Display fitting is independent of the engineering unit system.
- Obtain component names and selected parameters from the same validated result revision as the drawing. Do not infer engineering values from rendered pixels or substitute illustrative data.
- Distinguish engineering annotations from interface text through explicit existing semantics or verified metadata. Do not remove text based on position or guessed string patterns.
- Fit bounds must include text extents, dimension arrows, strokes, and all drawing views, with room at the edges. Clipped or overlapping engineering information fails acceptance.
- Keep printed output tied to an immutable revision snapshot, including when the user changes selections or opens print preview during an operation.
- A fitted printout is a reference drawing. Physical drawing scale is outside this change and must not be presented as a calibrated scale.

## Current implementation and affected areas

Workspace.tsx overlays navigation, selectors, and headers on the LegacyCanvas within one fixed-coordinate board. Viewport.tsx scales the combined board. render-canvas.ts renders validated drawing commands with a device-pixel-ratio transform. PrintView.tsx clones a revision snapshot and applies a legacy 650-pixel print transform. The CSS currently specifies a fixed print composition.

The planned work concerns workspace composition, drawing presentation, fitting bounds, canvas clarity, and print layout. Preserve calculation behavior, source coordinates, result parsing, authorization, and action sequencing. Changes to private engineering formulas, catalog data, or result values are outside scope.

## Verification and release criteria

- Compare original and displayed engineering command content and selected parameters for matching revisions. Allow only the documented presentation transform and layout metadata to differ.
- Verify multiple views, wide and tall drawings, dense dimensions, minimum and maximum supported selections, unavailable results, and supported unit/format settings. Run the existing relevant engineering regression checks.
- Inspect real screen renders at desktop and narrow widths, including zoom and fit, and inspect actual rendered A4 landscape print output. Check readable labels, complete extents, centering, selected parameters, and revision consistency.
- Exercise selection changes and print snapshot behavior through the normal workspace entry points. A server response or screenshot alone does not establish engineering data fidelity.
- Resolve any new discrepancy, missing annotation, stale selected value, or clipping before accepting the change. Report any pre-existing or unresolved discrepancy explicitly.

## Assistant-proposed implementation choices

Use the existing React and canvas stack. Choose fit margins, zoom limits, and responsive wrapping during implementation, guided by real drawing extents and readability checks. Ensure fit remains reachable and panning reaches enlarged content. No new dependency is proposed.

## Next step

Obtain user approval of this short design, then prepare the implementation plan. Approval of the illustrative preview alone does not establish engineering correctness. Verification provides evidence for the tested coverage and cannot guarantee the absence of every possible defect.

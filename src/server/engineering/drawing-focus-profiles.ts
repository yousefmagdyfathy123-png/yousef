import 'server-only';

export type DrawingFocusProfile = {
  readonly structureHash: string;
  readonly primaryRanges: readonly (readonly [number, number])[];
  readonly dynamicMaskIndices: readonly number[];
};

// Exact emitted structures, verified against the templates in docs/DRAWING-FOCUS.md.
// Ranges refer to unchanged command indices, including every primary label/mask.
const profiles: Readonly<Record<string, DrawingFocusProfile>> = {
  Flan1: {
    structureHash: 'afcd2a56ae7b9715a0b12cc2e3aea60edf49ab4eeabb33f4a26bdba72d0877ea',
    primaryRanges: [[0, 107], [144, 292]],
    dynamicMaskIndices: [18, 20, 26],
  },
  Fxly1: {
    structureHash: '818433df2128c7f93eec877855a41acb362e7d178945e68166b00eebefcfdd9d',
    primaryRanges: [[0, 133]],
    dynamicMaskIndices: [],
  },
};

export function drawingFocusProfile(routeId: string): DrawingFocusProfile | undefined {
  return Object.hasOwn(profiles, routeId) ? profiles[routeId] : undefined;
}

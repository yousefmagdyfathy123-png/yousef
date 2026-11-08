import { expect, test } from 'vitest';
import type { PublicDrawCommand, PublicDrawing } from '../../src/shared/public-contracts';
import { fitDrawing, measureDrawingBounds } from '../../src/workspace/drawing-layout';

function drawing(commands: PublicDrawCommand[]): PublicDrawing {
  return { width: 1067, height: 690, transform: [.6, 0, 0, .6, .5, 105], commands };
}

// Node has no Canvas 2D. Supply browser metrics at this boundary so the tests
// exercise extent calculation with independently specified glyph measurements.
function context(metrics: Partial<TextMetrics> = {}) {
  const ctx = {
    font: '10px sans-serif', textAlign: 'left', textBaseline: 'alphabetic',
    save() { this.saved = [this.font, this.textAlign, this.textBaseline]; },
    restore() { [this.font, this.textAlign, this.textBaseline] = this.saved; },
    saved: [] as string[],
    measureText(_text: string) { return { width: 80, ...metrics } as TextMetrics; },
  };
  return ctx as unknown as CanvasRenderingContext2D;
}

test('bounds include separated views, negative endpoints, stroke radii and annotation masks', () => {
  const source = drawing([
    { op: 'line', from: { x: -20, y: -10 }, to: { x: 0, y: 10 }, width: 4, color: 'navy' },
    { op: 'line', from: { x: 100, y: 60 }, to: { x: 80, y: 40 }, width: 2, color: 'navy' },
    { op: 'fillRect', x: 20, y: -30, width: 30, height: 10, color: 'white' },
    { op: 'fillRect', x: -10, y: 20, width: -5, height: -6, color: 'white' },
  ]);
  expect(measureDrawingBounds(context(), source)).toEqual({ left: -22, top: -30, right: 101, bottom: 61 });
});

test.each([
  { align: 'left' as const, verticalAlign: 'top' as const, left: 3, right: 84, ascent: -2, descent: 22,
    expected: { left: 97, top: 202, right: 184, bottom: 222 } },
  { align: 'center' as const, verticalAlign: 'bottom' as const, left: 43, right: 44, ascent: 8, descent: 4,
    expected: { left: 57, top: 192, right: 144, bottom: 204 } },
  { align: 'right' as const, verticalAlign: 'bottom' as const, left: 83, right: 4, ascent: 21, descent: 2,
    expected: { left: 17, top: 179, right: 104, bottom: 202 } },
])('text bounds retain $align aligned ink overhangs and baseline offsets', row => {
  const ctx = context({ actualBoundingBoxLeft: row.left, actualBoundingBoxRight: row.right,
    actualBoundingBoxAscent: row.ascent, actualBoundingBoxDescent: row.descent });
  const source = drawing([{ op: 'text', text: 'Ø16 1/2″ · 90°', x: 100, y: 200,
    font: 'bold 16pt Verdana', align: row.align, verticalAlign: row.verticalAlign, color: 'navy' }]);
  expect(measureDrawingBounds(ctx, source)).toEqual(row.expected);
  expect([ctx.font, ctx.textAlign, ctx.textBaseline]).toEqual(['10px sans-serif', 'left', 'alphabetic']);
});

test('text bounds include advance width when whitespace exceeds visible ink', () => {
  const ctx = context({ actualBoundingBoxLeft: 20, actualBoundingBoxRight: 15,
    actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 2 });
  const source = drawing([{ op: 'text', text: '  A  ', x: 100, y: 50,
    font: '12px Verdana', align: 'center', color: 'navy' }]);
  expect(measureDrawingBounds(ctx, source)).toEqual({ left: 60, top: 40, right: 140, bottom: 52 });
});

test.each(['top', 'bottom'] as const)('missing text ink metrics get conservative %s font bounds', baseline => {
  const source = drawing([{ op: 'text', text: 'ØB', x: 10, y: 20,
    font: 'bold 9pt Tahoma', align: 'center', verticalAlign: baseline, color: 'navy' }]);
  expect(measureDrawingBounds(context({ width: 40 }), source)).toEqual({
    left: -16, right: 36, top: baseline === 'top' ? 14 : 2, bottom: baseline === 'top' ? 38 : 26,
  });
});

test('measuring uses renderer font conversion and alignment before obtaining metrics', () => {
  const ctx = context();
  ctx.measureText = () => {
    expect(ctx.font).toBe('bold 12px Tahoma');
    expect(ctx.textAlign).toBe('right');
    expect(ctx.textBaseline).toBe('bottom');
    return { width: 40 } as TextMetrics;
  };
  measureDrawingBounds(ctx, drawing([{ op: 'text', text: 'N/A', x: 0, y: 0,
    font: 'bold 9pt Tahoma', align: 'right', verticalAlign: 'bottom', color: 'navy' }]));
});

test('fit centers all extents and preserves exact source commands, annotations and geometry relationships', () => {
  const source = drawing([
    { op: 'line', from: { x: -50, y: 0 }, to: { x: 150, y: 100 }, width: 1, color: 'navy' },
    { op: 'text', text: '123.456 mm Ø', x: 50, y: 50, font: '16px Verdana', align: 'center', color: 'navy' },
  ]);
  const before = structuredClone(source);
  Object.freeze(source.commands); Object.freeze(source.transform); Object.freeze(source);
  const fitted = fitDrawing(source, { left: -50, top: 0, right: 150, bottom: 100 }, { width: 440, height: 240 }, 20);
  expect(fitted.transform).toEqual([2, 0, 0, 2, 120, 20]);
  expect(fitted.width).toBe(440); expect(fitted.height).toBe(240);
  expect(fitted.commands).toEqual(before.commands);
  expect(source).toEqual(before);
  // The dimension label at (50,50) stays at the midpoint of its source line.
  const [scale, , , scaleY, offsetX, offsetY] = fitted.transform;
  expect(scale).toBe(scaleY);
  expect([50 * scale + offsetX, 50 * scale + offsetY]).toEqual([220, 120]);
  expect((150 - -50) * scale).toBe(400);
});

test.each([
  { size: { width: 200, height: 600 }, expected: [.8, 0, 0, .8, 60, 260] },
  { size: { width: 800, height: 200 }, expected: [1.6, 0, 0, 1.6, 320, 20] },
])('fit keeps complete extents inside portrait and landscape viewports $size', ({ size, expected }) => {
  const result = fitDrawing(drawing([]), { left: -50, top: 0, right: 150, bottom: 100 }, size, 20);
  expect(result.transform).toEqual(expected);
  const [scale, , , , x, y] = result.transform;
  expect(-50 * scale + x).toBeGreaterThanOrEqual(20);
  expect(150 * scale + x).toBeLessThanOrEqual(size.width - 20);
  expect(y).toBeGreaterThanOrEqual(20);
  expect(100 * scale + y).toBeLessThanOrEqual(size.height - 20);
});

test.each([
  { bounds: { left: 5, top: 10, right: 5, bottom: 10 }, expected: [1, 0, 0, 1, 45, 40] },
  { bounds: { left: 5, top: 0, right: 5, bottom: 20 }, expected: [4, 0, 0, 4, 30, 10] },
  { bounds: { left: 0, top: 5, right: 20, bottom: 5 }, expected: [4, 0, 0, 4, 10, 30] },
])('degenerate extents remain centered and finite $bounds', ({ bounds, expected }) => {
  expect(fitDrawing(drawing([]), bounds, { width: 100, height: 100 }, 10).transform).toEqual(expected);
});

test('empty drawings clear measured bounds and fit with finite output', () => {
  const source = drawing([]);
  expect(measureDrawingBounds(context(), source)).toBeNull();
  const result = fitDrawing(source, null, { width: 300, height: 200 }, 24);
  expect(result.commands).toEqual([]);
  expect(result.transform.every(Number.isFinite)).toBe(true);
  expect([result.width, result.height]).toEqual([300, 200]);
});

test('zero-width hairlines retain a half-pixel allowance at the fitted edges', () => {
  const source = drawing([{ op: 'line', from: { x: 0, y: 0 }, to: { x: 100, y: 100 }, width: 0, color: 'navy' }]);
  const bounds = measureDrawingBounds(context(), source);
  const result = fitDrawing(source, bounds, { width: 100, height: 100 }, 0);
  expect(result.transform).toEqual([.99, 0, 0, .99, .5, .5]);
});

test.each([
  { size: { width: 0, height: 100 }, padding: 10 },
  { size: { width: Number.NaN, height: 100 }, padding: 10 },
  { size: { width: 100, height: Number.POSITIVE_INFINITY }, padding: 10 },
  { size: { width: 100, height: 100 }, padding: -1 },
  { size: { width: 100, height: 100 }, padding: Number.NaN },
  { size: { width: 100, height: 100 }, padding: 50 },
])('fit rejects invalid viewport or padding $size $padding', ({ size, padding }) => {
  expect(() => fitDrawing(drawing([]), null, size, padding)).toThrow('Invalid drawing viewport');
});

test('fit rejects inverted and nonfinite bounds instead of producing a corrupt transform', () => {
  for (const bounds of [
    { left: 10, top: 0, right: 0, bottom: 100 },
    { left: 0, top: Number.NaN, right: 100, bottom: 100 },
  ]) expect(() => fitDrawing(drawing([]), bounds, { width: 300, height: 200 }, 24)).toThrow('Invalid drawing bounds');
});

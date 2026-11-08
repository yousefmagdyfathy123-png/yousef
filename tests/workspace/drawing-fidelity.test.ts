import { expect, test, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type { LegacyView, WorkResult } from '../../src/legacy/contracts';
import { toPublicWorkResult } from '../../src/server/engineering/public-result';
import { printSnapshot } from '../../src/workspace/PrintView';
import { fitDrawing, measureDrawingBounds } from '../../src/workspace/drawing-layout';
import { loadFlangeCases } from '../reference/flange-cases';
import { loadTask7Cases } from '../reference/task7-cases';
import { resolve } from 'node:path';
import { loadCatalog } from '../../src/server/catalog';
import { createInitialState } from '../../src/legacy/state/initial';
import { transition } from '../../src/legacy/state/transition';
import { advanceWorkspaceUi } from '../../src/server/engineering/ui-state';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PrintView } from '../../src/workspace/PrintView';

vi.mock('server-only', () => ({}));
type Reference = { id: string; expected: { view: LegacyView } };
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

// Node supplies conservative advance metrics; actual browser glyph metrics,
// replay, clipping and readability are checked by the browser suites.
const ctx = {
  save() {}, restore() {}, font: '', textAlign: 'left', textBaseline: 'top',
  measureText(text: string) { return { width: text.length * 24 } as TextMetrics; },
} as unknown as CanvasRenderingContext2D;

// Catches dropped/reordered commands, rewritten units/values, anisotropic
// fitting, source mutation, and print snapshots sharing live result objects.
for (const family of ['flanges-gaskets', 'fittings-pipe-branches', 'valves-strainers-fasteners', 'calculators']) {
  for (const file of readdirSync(`tests/reference/${family}`).filter(f => f.endsWith('.json') && !['framework.json', 'layout.json'].includes(f))) {
    test(`${family}/${file}: every independent reference retains commands and values through screen and print`, () => {
      const fixture = JSON.parse(readFileSync(`tests/reference/${family}/${file}`, 'utf8'));
      const cases: Reference[] = family === 'flanges-gaskets' ? loadFlangeCases(file.slice(0, -5))
        : family === 'fittings-pipe-branches' ? loadTask7Cases<Reference>(file) : fixture.cases;
      expect(cases.length).toBeGreaterThan(0);
      for (const [revision, row] of cases.entries()) {
        const view = row.expected.view;
        const drawing = view.drawing as LegacyView['drawing'] & { geometryRef?: string };
        if (drawing.geometryRef) {
          const geometry = fixture.geometries[drawing.geometryRef];
          // Other families use producer-specific serialization for their keys;
          // resolve the independent literal data, without re-hashing in JS.
          expect(Array.isArray(geometry), row.id).toBe(true);
          drawing.commands = [...drawing.commands, ...geometry];
          delete drawing.geometryRef;
        }
        const before = digest(view);
        const result = toPublicWorkResult('fidelity', { state: { revision }, view, trace: [], evidenceIds: [] } as unknown as WorkResult);
        expect(digest(result.view.drawing), row.id).toBe(digest(drawing));
        expect(result.view.headers, row.id).toEqual(view.headers);
        expect(result.view.textResults, row.id).toEqual(view.textResults);
        expect(result.view.controls.map(c => c.text), row.id).toEqual(view.controls.map(c => c.text));
        const capture = printSnapshot(result);
        const bounds = measureDrawingBounds(ctx, result.view.drawing);
        for (const [width, height, padding] of [[390, 500, 24], [1440, 690, 24], [1032, 560, 12]]) {
          const fitted = fitDrawing(capture.view.drawing, bounds, { width, height }, padding);
          expect(fitted.commands, row.id).toBe(capture.view.drawing.commands);
          const [sx, skewY, skewX, sy, x, y] = fitted.transform;
          expect(fitted.transform.every(Number.isFinite), row.id).toBe(true);
          expect([skewY, skewX, sy], row.id).toEqual([0, 0, sx]);
          if (bounds) {
            expect(bounds.left * sx + x, row.id).toBeGreaterThanOrEqual(padding - 0.001);
            expect(bounds.right * sx + x, row.id).toBeLessThanOrEqual(width - padding + 0.001);
            expect(bounds.top * sy + y, row.id).toBeGreaterThanOrEqual(padding - 0.001);
            expect(bounds.bottom * sy + y, row.id).toBeLessThanOrEqual(height - padding + 0.001);
          }
        }
        expect(digest(capture.view), row.id).toBe(digest(result.view));
        result.view.drawing.commands.length = 0;
        if (result.view.controls[0]) result.view.controls[0].text = 'later revision';
        expect(digest(capture.view.drawing), row.id).toBe(digest(drawing));
        expect(capture.view.controls.map(c => c.text), row.id).toEqual(view.controls.map(c => c.text));
        expect(capture.revision).toBe(revision);
        expect(digest(view), row.id).toBe(before);
      }
    }, 120_000);
  }
}

test('real transitions capture matching units, revision and selected strings, including no-dispatch Ptem1', async () => {
  const catalog = await loadCatalog(resolve('private/catalog'));
  let state = createInitialState({ name: 'en-US', decimalSeparator: '.', groupSeparator: ',' });
  for (const action of [
    { type: 'select-route', routeId: 'Flan1' },
    { type: 'configure', units: 'Imperial', listUnits: 'Inches', temperature: 'Fahrenheit', fractions: true },
    { type: 'select-route', routeId: 'Gflt1' },
    { type: 'select-route', routeId: 'Span1' },
    { type: 'select-route', routeId: 'Ptem1' },
  ] as const) {
    const previous = state;
    const result = transition(state, action, catalog);
    advanceWorkspaceUi(previous, result);
    state = result.state;
    const dto = toPublicWorkResult('transition-fidelity', result, catalog);
    const snapshot = printSnapshot(dto);
    expect(snapshot.view.drawing).toEqual(result.view.drawing);
    expect(snapshot.ui?.settings).toEqual(dto.ui?.settings);
    expect(snapshot.revision).toBe(result.state.revision);
    const html = renderToStaticMarkup(createElement(PrintView, { snapshot }));
    // Text escaping is supplied independently by React for the expected string.
    for (const control of result.view.controls.filter(c => c.visible)) {
      const escaped = renderToStaticMarkup(createElement('dd', null, control.text));
      expect(html).toContain(escaped);
    }
    expect(html).not.toContain('<table');
    expect(html).not.toContain('<select');
  }
});

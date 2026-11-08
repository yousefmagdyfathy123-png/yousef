import { expect, test, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { searchContext } from '../../src/shared/search-context';
import { publicSearchHitSchema } from '../../src/shared/public-schemas';
import { toPublicWorkResult } from '../../src/server/engineering/public-result';
import { searchCatalog } from '../../src/legacy/state/search';
import { loadCatalog } from '../../src/server/catalog';
import { resolve } from 'node:path';
import type { WorkResult } from '../../src/legacy/contracts';

test('duplicate Blind Flanges have verified, different category and standard context', () => {
  expect(searchContext('Flan3')).toBe('Flanges · ASME B16.5-2020');
  expect(searchContext('Fldi2')).toBe('Flanges · EN 1092-1:2018');
  expect(searchContext('Flaa2')).toBe('Flanges · ASME B16.47-2017 · Series A');
  expect(searchContext('Flap2')).toBe('Flanges · ASME B16.47-2017 · Series B');
  expect(searchContext('unknown')).toBe('Component unknown');
  expect(searchContext('Flan999')).toBe('Component Flan999');
  expect(searchContext('constructor')).toBe('Component constructor');
});

test('checkpoint projection adds context while preserving exact engine identity, text and order', async () => {
  const catalog = await loadCatalog(resolve('private/catalog'));
  const hits = searchCatalog('BLIND', catalog, { name: 'en-US', decimalSeparator: '.', groupSeparator: ',' });
  const source = { state: { revision: 1 }, trace: [], searchHits: hits, view: {
    headers: [], controls: [], messages: [], visibility: {},
    drawing: { width: 1, height: 1, transform: [1, 0, 0, 1, 0, 0], commands: [] },
  } } as unknown as WorkResult;
  Object.assign(hits[0], { sourcePath: 'PRIVATE', rawRow: ['PRIVATE'] });
  const dto = toPublicWorkResult('search', source);
  expect(dto.searchHits!.map(({ id, text }) => ({ id, text }))).toEqual(hits.map(({ id, text }) => ({ id, text })));
  expect(dto.searchHits!.filter(h => h.text === 'Blind Flange').map(h => h.context)).toEqual([
    'Flanges · ASME B16.5-2020', 'Flanges · EN 1092-1:2018',
  ]);
  expect(JSON.stringify(dto)).not.toContain('PRIVATE');
});

test('public hits accept optional context and still reject private fields', () => {
  expect(publicSearchHitSchema.parse({ id: 'Flan3', text: 'Blind Flange' })).toEqual({ id: 'Flan3', text: 'Blind Flange' });
  expect(publicSearchHitSchema.parse({ id: 'Flan3', text: 'Blind Flange', context: 'Flanges' }).context).toBe('Flanges');
  expect(() => publicSearchHitSchema.parse({ id: 'Flan3', text: 'Blind Flange', context: 'Flanges', sourcePath: 'PRIVATE' })).toThrow();
  expect(() => publicSearchHitSchema.parse({ id: 'Flan3', text: 'Blind Flange', context: 1 })).toThrow();
});

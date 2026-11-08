import { expect, test } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { searchStatusMessage, type SearchStatus } from '../../src/workspace/search-state';
import { LegacyDialog } from '../../src/workspace/LegacyDialog';

test('search states distinguish no search, waiting, no matches, results and failure', () => {
  expect(searchStatusMessage('idle')).toMatch(/component name or standard/i);
  expect(searchStatusMessage('loading')).toMatch(/searching/i);
  expect(searchStatusMessage('empty')).toBe('No results found. Try a component name or standard.');
  expect(searchStatusMessage('success')).not.toMatch(/no results|zero|0 matches/i);
  expect(searchStatusMessage('error')).toMatch(/could not.*try again/i);
});

test.each<SearchStatus>(['idle', 'loading', 'success', 'empty', 'error'])('dialog announces %s and exposes context to sighted and keyboard users', searchStatus => {
  const html = renderToStaticMarkup(createElement(LegacyDialog, {
    dialog: { id: 'search', title: 'Find', controls: [], blocks: [] }, busy: false, searchStatus,
    hits: searchStatus === 'success' ? [{ id: 'Flan3', text: 'Blind Flange', context: 'Flanges · ASME B16.5-2020' }] : [],
    messages: [], onAction: async () => true, onClose: () => {},
  }));
  expect(html).toContain('role="status"');
  expect(html).toContain(searchStatusMessage(searchStatus));
  if (searchStatus === 'success') {
    expect(html).toContain('class="search-result-title">Blind Flange');
    expect(html).toContain('class="search-result-context">Flanges · ASME B16.5-2020');
  } else expect(html).not.toContain('Blind Flange');
});

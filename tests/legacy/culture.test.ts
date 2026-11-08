import { expect, test } from 'vitest';
import { resolveLegacyCulture } from '../../src/legacy/vb/culture';
import { vbDouble, vbVal } from '../../src/legacy/vb/numbers';
import { vbString } from '../../src/legacy/vb/strings';
test('fails closed for missing, blank, unsupported and injected cultures', () => {
  for (const LEGACY_CULTURE of [undefined, '', 'ar-EG', 'en-us', ' en-US', 'secret-marker']) {
    expect(() => resolveLegacyCulture({ LEGACY_CULTURE })).toThrow('LEGACY_CULTURE must explicitly equal en-US for release1');
  }
});
test('uses server culture despite locale, country and currency request-like hints', () => {
  const c = resolveLegacyCulture({ LEGACY_CULTURE: 'en-US', LANG: 'ar-EG', country: 'EG', currency: 'EGP', culture: 'ar-EG' });
  expect(c).toEqual({ name: 'en-US', decimalSeparator: '.', groupSeparator: ',' });
  expect(vbVal('1,234.5')).toBe(1);
  expect(vbDouble('1,234.5', c)).toBe(1234.5);
  expect(vbString(1.25, c)).toBe('1.25');
  expect(() => vbString(1.25, { ...c, decimalSeparator: ',' })).toThrow();
});

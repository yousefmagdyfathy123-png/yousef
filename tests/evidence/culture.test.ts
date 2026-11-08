import { expect, test } from 'vitest';
import { requireLegacyCulture } from '../../src/server/legacy-culture';
test('requires the explicit release1 engine culture and has no fallback', () => {
  expect(() => requireLegacyCulture({})).toThrow('LEGACY_CULTURE');
  expect(() => requireLegacyCulture({ LEGACY_CULTURE: 'ar-EG' })).toThrow('LEGACY_CULTURE');
  expect(requireLegacyCulture({ LEGACY_CULTURE: 'en-US', LANG: 'ar-EG' })).toEqual({ name: 'en-US', decimalSeparator: '.', groupSeparator: ',' });
});

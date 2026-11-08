import { expect, test } from 'vitest';
import { grantState } from '../../src/server/commerce/payment-policy';

test('payment facts apply independently of arrival order', () => {
  expect(grantState(10000, 2500, [])).toBe('active');
  expect(grantState(10000, 10000, ['won'])).toBe('revoked');
  expect(grantState(10000, 0, ['won', 'open'])).toBe('suspended');
  expect(grantState(10000, 0, ['open', 'lost'])).toBe('revoked');
});

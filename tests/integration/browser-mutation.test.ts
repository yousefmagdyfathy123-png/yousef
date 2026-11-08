import { expect, test } from 'vitest';

test('browser origin validation rejects malformed and foreign sources before mutation', async () => {
  const { hasBrowserSource } = await import('../../src/server/security/browser-mutation');
  const origin = 'https://app.example.invalid';
  const deniedHeaders: Record<string, string>[] = [
    {}, { origin: 'null', referer: origin }, { origin: 'https://sibling.example.invalid' },
    { 'x-forwarded-host': 'app.example.invalid', host: 'app.example.invalid' },
    { origin, 'sec-fetch-site': 'cross-site' }, { origin: origin + '/' },
  ];
  for (const headers of deniedHeaders) {
    expect(hasBrowserSource(new Request(origin, { headers }), origin)).toBe(false);
  }
  expect(hasBrowserSource(new Request(origin, { headers: { referer: origin + '/account' } }), origin)).toBe(true);
  expect(hasBrowserSource(new Request(origin, { headers: { origin } }), origin)).toBe(true);
});

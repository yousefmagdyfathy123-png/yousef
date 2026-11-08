import { expect, test } from 'vitest';
import { trustedEdgeCountryResolver } from '../../src/server/commerce/country';
import { priceForCountry } from '../../src/server/commerce/pricing';

test('only an authenticated edge can supply a valid ISO country', async () => {
  const secret = 'ab'.repeat(32);
  const request = (country: string, token = '') => new Request('https://app.example.invalid', {
    headers: { 'x-country': country, 'x-forwarded-for': '1.2.3.4', 'x-alfadata-geo-token': token },
  });
  const resolve = trustedEdgeCountryResolver(secret);
  const unknown = { countryCode: null, source: 'unknown' };
  expect(await resolve(request('EG'))).toEqual(unknown);
  expect(await trustedEdgeCountryResolver()(request('EG', secret))).toEqual(unknown);
  expect(await resolve(request('ZZ', secret))).toEqual(unknown);
  expect(await resolve(request('EG, SA', secret))).toEqual(unknown);
  expect(await resolve(request('eg', secret))).toEqual({ countryCode: 'EG', source: 'trusted-edge' });
});

test('regional prices are fixed in minor units', () => {
  expect(priceForCountry('EG')).toEqual({ currency: 'EGP', minorUnits: 100000 });
  expect(priceForCountry('SA')).toEqual({ currency: 'SAR', minorUnits: 50000 });
  for (const country of ['GB', null]) {
    expect(priceForCountry(country)).toEqual({ currency: 'USD', minorUnits: 10000 });
  }
});

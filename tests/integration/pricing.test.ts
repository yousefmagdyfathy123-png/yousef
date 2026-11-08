import { policyAcknowledgement } from '../../src/server/commerce/purchase-policy';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { afterAll, beforeAll, expect, test, vi } from 'vitest';
import { migrate } from '../../tools/db/migrate';
import { createIdentity } from '../../src/server/auth/config';
import { createBrowserProtection } from '../../src/server/security/browser-mutation';
import { trustedEdgeCountryResolver } from '../../src/server/commerce/country';
import { checkoutHandler } from '../../src/server/commerce/checkout-handler';
import { createOrders } from '../../src/server/commerce/orders';
import { getOrCreateQuote } from '../../src/server/commerce/pricing';
import { createLocalMailTransport } from '../../src/server/mail/local';

const database = new Pool({ connectionString: process.env.ALFADATA_TEST_DATABASE_URL });
const origin = 'http://127.0.0.1:3186';
const secret = 'integration-secret-not-for-production-123';
const edgeToken = 'ab'.repeat(32);
beforeAll(async () => { await migrate(database); });
afterAll(() => database.end());

test('signup stores trusted geography and quotes survive travel or later estimate changes', async () => {
  const identity = createIdentity({
    database, origin, secret, mail: createLocalMailTransport(), resolveCountry: trustedEdgeCountryResolver(edgeToken),
  });
  function register(headers: Record<string, string>, extra = {}) {
    const email = randomUUID() + '@example.invalid';
    return identity.handler(new Request(origin + '/api/auth/sign-up/email', {
      method: 'POST', headers: { origin, 'content-type': 'application/json', ...headers },
      body: JSON.stringify({ name: 'Tester', email, password: 'A long password', ...extra }),
    }));
  }
  async function signup(headers: Record<string, string>) {
    const response = await register(headers);
    const { user } = await response.json();
    expect(response.status).toBe(200);
    expect(user).not.toHaveProperty('registrationCountryCode');
    return user.id as string;
  }
  const forged = await register({}, { registrationCountryCode: 'SA' });
  expect(forged.status).toBe(400);
  expect(await forged.json()).toMatchObject({ code: 'FIELD_NOT_ALLOWED' });
  const egypt = await signup({ 'x-country': 'EG', 'x-alfadata-geo-token': edgeToken });
  const unknown = await signup({ 'x-country': 'EG' });
  const quote = await getOrCreateQuote(egypt, database);
  expect(quote).toMatchObject({
    price: { currency: 'EGP', minorUnits: 100000 }, country: { countryCode: 'EG', source: 'trusted-edge' },
  });
  expect(await getOrCreateQuote(unknown, database)).toMatchObject({
    price: { currency: 'USD', minorUnits: 10000 }, country: { countryCode: null, source: 'unknown' },
  });
  await database.query("UPDATE \"user\" SET registration_country_code = 'SA' WHERE id = $1", [egypt]);
  expect(await getOrCreateQuote(egypt, database)).toEqual(quote);
});

test('checkout protects the order and provider boundary, preserves EGP, and enforces ownership', async () => {
  const userId = randomUUID();
  const otherId = randomUUID();
  for (const id of [userId, otherId]) {
    await database.query(`INSERT INTO "user"(id,name,email,"emailVerified",registration_country_code,registration_country_source)
      VALUES ($1,$1,$2,true,'EG','trusted-edge')`, [id, id + '@example.invalid']);
  }
  const quote = await getOrCreateQuote(userId, database);
  const otherQuote = await getOrCreateQuote(otherId, database);
  const principal = { userId, sessionId: 'first', emailVerified: true, suspended: false, role: 'user' as const };
  const readPrincipal = async (request: Request) => ({
    ...principal, sessionId: request.headers.get('x-fixture-session') ?? principal.sessionId,
  });
  const guard = createBrowserProtection({ origin, secret, readPrincipal });
  const providerCreate = vi.fn(async () => ({ reference: userId, url: 'https://pay.example.invalid/session' }));
  const provider = { id: 'fixture', environment: 'test' as const, currencies: new Set<'USD' | 'EGP'>(['USD']), createCheckout: providerCreate };
  const policy = { version: 'test-v1', text: 'Synthetic checkout test policy.' };
  const acknowledgement = policyAcknowledgement(policy);
  const handle = checkoutHandler(provider, { readPrincipal, protect: guard.require, readPolicy: () => policy, order: createOrders(database).createOrder });
  await expect(createOrders(database).createOrder(userId, quote.id, 'live-without-policy', {
    ...provider, environment: 'live', currencies: new Set(['EGP']),
  })).rejects.toMatchObject({ reason: 'policy-required' });
  const input = { quoteId: quote.id, idempotencyKey: 'request', acknowledgement };
  const post = (body: object, headers: Record<string, string>) => handle(new Request(origin + '/api/checkout', {
    method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body),
  }));
  const token = await guard.issue(new Request(origin, { headers: { origin } }));
  const valid = { origin, 'x-alfadata-csrf': token };
  for (const headers of [{ origin }, { ...valid, origin: 'https://evil.invalid' }, { ...valid, 'x-fixture-session': 'other' }]) {
    expect((await post(input, headers)).status).toBe(403);
  }
  for (const extra of [{ amount: 1 }, { minorUnits: 1 }, { currency: 'USD' }, { userId: otherId }, { country: 'US' }]) {
    expect((await post({ ...input, ...extra }, valid)).status).toBe(400);
  }
  expect((await post({ ...input, quoteId: otherQuote.id }, valid)).status).toBe(404);
  const unavailable = await post(input, valid);
  expect(unavailable.status).toBe(503);
  expect(await unavailable.json()).toEqual({ reason: 'currency-unavailable', price: quote.price });
  expect(await getOrCreateQuote(userId, database)).toEqual(quote);
  expect((await database.query('SELECT * FROM orders WHERE user_id=$1', [userId])).rowCount).toBe(0);
  expect((await database.query('SELECT * FROM checkout_request_keys WHERE user_id=$1', [userId])).rowCount).toBe(0);
  expect(providerCreate).not.toHaveBeenCalled();

  expect((await post({ quoteId: quote.id, idempotencyKey: 'request' }, valid)).status).toBe(400);
  expect((await post({ ...input, acknowledgement: { ...acknowledgement, version: 'stale' } }, valid)).status).toBe(409);
  expect(providerCreate).not.toHaveBeenCalled();

  provider.currencies.add('EGP');
  const first = await post(input, valid);
  expect(first.status).toBe(200);
  const order = await first.json();
  expect(order).toMatchObject({ status: 'pending', price: quote.price, environment: 'test' });
  expect(await (await post(input, valid)).json()).toEqual(order);
  expect((await post({ ...input, quoteId: otherQuote.id }, valid)).status).toBe(404);
  policy.version = 'test-v2';
  expect((await post(input, valid)).status).toBe(409);
  expect(await (await post({ ...input, acknowledgement: policyAcknowledgement(policy) }, valid)).json()).toEqual(order);
  const acceptance = await database.query(
    'SELECT user_id,version,content_hash,accepted_at FROM order_policy_acceptances WHERE order_id=$1', [order.id],
  );
  expect(acceptance.rows).toEqual([{
    user_id: userId, version: acknowledgement.version, content_hash: acknowledgement.hash, accepted_at: expect.any(Date),
  }]);
  expect(providerCreate).toHaveBeenCalledTimes(1);
});

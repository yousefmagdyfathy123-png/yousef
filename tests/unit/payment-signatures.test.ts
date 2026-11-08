import { expect, test, vi } from 'vitest';
import { createTestProvider, signTestWebhook } from '../../src/server/commerce/providers/test';

test('signature covers the exact bytes and is restricted to test events', async () => {
  const secret = '012345678901234567890123456789012345';
  const { provider } = createTestProvider(secret);
  const event = {
    provider: 'test', environment: 'test', id: 'one', userId: 'owner', orderId: 'order',
    providerReference: 'ref', providerTime: new Date().toISOString(), kind: 'paid',
    price: { currency: 'USD', minorUnits: 10000 },
  };
  const raw = Buffer.from(JSON.stringify(event));
  const signature = new Headers({ 'x-alfadata-test-signature': signTestWebhook(raw, secret) });
  await expect(provider.verifyWebhook!(raw, signature)).resolves.toMatchObject({ id: 'one' });
  await expect(provider.verifyWebhook!(Buffer.concat([raw, Buffer.from(' ')]), signature)).rejects.toThrow('signature');
  await expect(provider.verifyWebhook!(raw, new Headers())).rejects.toThrow('signature');
  const live = Buffer.from(JSON.stringify({ ...event, environment: 'live' }));
  await expect(provider.verifyWebhook!(live, new Headers({
    'x-alfadata-test-signature': signTestWebhook(live, secret),
  }))).rejects.toThrow('Invalid test payment event');
});

test('the test payment adapter cannot initialize in production', () => {
  vi.stubEnv('NODE_ENV', 'production');
  try {
    expect(() => createTestProvider('fixture-secret-never-enabled-in-production')).toThrow('unavailable');
  } finally {
    vi.unstubAllEnvs();
  }
});

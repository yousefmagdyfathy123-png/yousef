import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Order } from '../orders';
import type { PaymentEvent, PaymentObservation } from '../payment-types';
import type { PaymentProvider } from './types';

export function signTestWebhook(raw: Uint8Array, secret: string) {
  return createHmac('sha256', secret).update('alfadata-test-payment-v1\0').update(raw).digest('hex');
}

function parseEvent(raw: Uint8Array): PaymentEvent {
  const data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw));
  if (!data || data.provider !== 'test' || data.environment !== 'test' ||
      ![data.id, data.userId, data.orderId, data.providerReference, data.providerTime].every(value => typeof value === 'string') ||
      !data.price || !Number.isInteger(data.price.minorUnits)) throw new Error('Invalid test payment event');
  const common = {
    id: data.id, userId: data.userId, orderId: data.orderId, providerReference: data.providerReference,
    provider: 'test', environment: 'test' as const, providerTime: new Date(data.providerTime),
    price: { currency: data.price.currency, minorUnits: data.price.minorUnits },
  };
  switch (data.kind) {
    case 'paid': case 'pending': case 'failed': case 'cancelled':
      return { ...common, kind: data.kind };
    case 'refunded':
      if (data.refund?.amount && typeof data.refund.id === 'string') return {
        ...common, kind: 'refunded',
        refund: { id: data.refund.id, amount: { currency: data.refund.amount.currency, minorUnits: data.refund.amount.minorUnits } },
      };
      break;
    case 'dispute-opened': case 'dispute-won': case 'dispute-lost':
      if (typeof data.disputeId === 'string') return { ...common, kind: data.kind, disputeId: data.disputeId };
      break;
  }
  throw new Error('Invalid test payment event');
}

export function createTestProvider(secret: string, options: { loseCreateResponse?: boolean } = {}) {
  if (process.env.NODE_ENV === 'production' || secret.length < 32) throw new Error('Test payment provider is unavailable');
  const observations = new Map<string, PaymentObservation>();
  let creates = 0;
  const provider: PaymentProvider = {
    id: 'test', environment: 'test', currencies: new Set(['USD', 'EGP', 'SAR']),
    async createCheckout(order: Order) {
      const reference = 'test-' + order.checkoutAttemptKey;
      const url = 'https://payments.example.invalid/test/' + reference;
      if (!observations.has(order.id)) {
        creates++;
        observations.set(order.id, {
          provider: 'test', environment: 'test', userId: order.userId, orderId: order.id,
          providerReference: reference, price: order.price, settlement: 'pending', observedAt: new Date(),
          refunds: [], disputes: [], checkoutUrl: url,
        });
      }
      if (options.loseCreateResponse) throw new Error('Simulated lost response');
      return { reference, url };
    },
    async verifyWebhook(raw, headers) {
      const signature = headers.get('x-alfadata-test-signature');
      if (!signature || !/^[0-9a-f]{64}$/.test(signature) || !timingSafeEqual(
        Buffer.from(signature, 'hex'), Buffer.from(signTestWebhook(raw, secret), 'hex'),
      )) throw new Error('Invalid signature');
      return parseEvent(raw);
    },
    recovery: {
      supportsSafeCreateRetry: true,
      async lookupOrder(order) {
        const observation = observations.get(order.checkoutAttemptKey);
        return observation ? { kind: 'found', observation: structuredClone(observation) } : { kind: 'not-found' };
      },
    },
  };
  return {
    provider,
    observation(orderId: string) { return structuredClone(observations.get(orderId)!); },
    publish(observation: PaymentObservation) { observations.set(observation.orderId, structuredClone(observation)); },
    get creates() { return creates; },
  };
}

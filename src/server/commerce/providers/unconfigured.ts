import { createTestProvider } from './test';
import type { PaymentProvider } from './types';

export const unconfiguredProvider: PaymentProvider = {
  id: 'unconfigured',
  environment: 'live',
  currencies: new Set(),
  async createCheckout() { throw new Error('Checkout provider is not configured'); },
  async verifyWebhook() { throw new Error('Payment webhook provider is not configured'); },
  recovery: {
    supportsSafeCreateRetry: false,
    async lookupOrder() { throw new Error('Payment recovery provider is not configured'); },
  },
};

let testProvider: PaymentProvider | undefined;

export function configuredPaymentProvider(id: string): PaymentProvider | undefined {
  if (id !== 'test' || process.env.NODE_ENV === 'production' || process.env.CHECKOUT_PROVIDER_ID !== id) return;
  const secret = process.env.TEST_PAYMENT_SECRET;
  if (!secret || secret.length < 32) return;
  return testProvider ??= createTestProvider(secret).provider;
}

export function checkoutProvider(): PaymentProvider {
  const id = process.env.CHECKOUT_PROVIDER_ID;
  return (id && configuredPaymentProvider(id)) || unconfiguredProvider;
}

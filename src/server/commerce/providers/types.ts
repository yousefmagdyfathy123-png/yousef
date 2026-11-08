import type { Currency } from '../pricing';
import type { Order } from '../orders';
import type { PaymentEvent, PaymentRecovery } from '../payment-types';

export interface PaymentProvider {
  id: string;
  environment: 'test' | 'live';
  currencies: ReadonlySet<Currency>;
  // Use checkoutAttemptKey as the stable provider idempotency/merchant reference.
  createCheckout(order: Order): Promise<{ reference: string; url: string }>;
  verifyWebhook?(raw: Uint8Array, headers: Headers): Promise<PaymentEvent>;
  recovery?: PaymentRecovery;
}

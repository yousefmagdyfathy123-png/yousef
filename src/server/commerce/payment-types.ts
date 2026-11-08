import type { Order } from './orders';
import type { Price } from './pricing';

export type Settlement = 'unknown' | 'pending' | 'paid' | 'failed' | 'cancelled';
export type DisputeState = 'open' | 'won' | 'lost';
export type Refund = { id: string; amount: Price };
export type Dispute = { id: string; status: DisputeState };
type PaymentIdentity = {
  provider: string; environment: Order['environment']; orderId: string; userId: string;
  providerReference: string; price: Price;
};
export type PaymentEvent = PaymentIdentity & { id: string; providerTime: Date } & (
  | { kind: Exclude<Settlement, 'unknown'> }
  | { kind: 'refunded'; refund: Refund }
  | { kind: 'dispute-opened' | 'dispute-won' | 'dispute-lost'; disputeId: string }
);
export type PaymentObservation = PaymentIdentity & {
  settlement: Settlement; observedAt: Date; refunds: Refund[]; disputes: Dispute[];
  checkoutUrl?: string;
};
export type RecoveryLookup = { kind: 'found'; observation: PaymentObservation } | { kind: 'not-found' | 'unknown' };
export type HistoryPage = {
  records: { id: string; observation: PaymentObservation }[];
  nextCursor: string | null; hasMore: boolean;
};
export interface PaymentRecovery {
  supportsSafeCreateRetry: boolean;
  lookupOrder(order: Order, signal: AbortSignal): Promise<RecoveryLookup>;
  history?: {
    readPage(cursor: string | null, signal: AbortSignal): Promise<HistoryPage>;
    catchUp?(cursor: string | null, signal: AbortSignal): Promise<HistoryPage>;
  };
}
export class PaymentHistoryGap extends Error {}

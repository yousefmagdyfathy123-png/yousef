import type { DisputeState } from './payment-types';

export function grantState(total: number, refunded: number, disputes: DisputeState[]) {
  if (refunded === total || disputes.includes('lost')) return 'revoked';
  if (disputes.includes('open')) return 'suspended';
  return 'active';
}

export function mergeDispute(previous: DisputeState, next: DisputeState): DisputeState | null {
  if (previous === 'open') return next;
  if (next === 'open' || previous === next) return previous;
  return null;
}

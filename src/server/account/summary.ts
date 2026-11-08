import type { Principal } from '../auth/principal';
import type { Entitlement } from '../access/entitlement';
import type { accountPayments } from '../commerce/payment-status';

export type AccountSummary = {
  access: Entitlement;
  trialSecondsRemaining: number | null;
  payments: Awaited<ReturnType<typeof accountPayments>>;
};

export async function getAccountSummary(principal: Principal): Promise<AccountSummary> {
  const { getEntitlement } = await import('../access/runtime');
  const { accountPayments } = await import('../commerce/payment-status');
  const [access, payments] = await Promise.all([getEntitlement(principal), accountPayments(principal)]);
  const trialSecondsRemaining = access.reason === 'trial' || access.reason === 'trial-expired'
    ? Math.max(0, Math.ceil((Date.parse(access.endsAt) - Date.now()) / 1000))
    : null;
  return { access, trialSecondsRemaining, payments };
}

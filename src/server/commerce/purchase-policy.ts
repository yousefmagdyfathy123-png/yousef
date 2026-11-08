import { createHash } from 'node:crypto';

export type PurchasePolicy = { version: string; text: string };
export type PolicyAcknowledgement = { version: string; hash: string };

export function policyAcknowledgement(policy: PurchasePolicy): PolicyAcknowledgement {
  return { version: policy.version, hash: createHash('sha256').update(policy.text).digest('hex') };
}

export const purchaseScope = 'One payment includes Alfadata access and future updates within the product’s scope while the service operates. There is no recurring renewal.';
export const purchaseSupport = 'Support covers account, payment and technical issues. Engineering consultancy is outside the purchase scope.';
export const finalSale = 'All purchases are final. Voluntary refunds are unavailable after payment. Applicable mandatory rights and payment-provider requirements still apply.';

export function configuredPurchasePolicy(): PurchasePolicy | null {
  const version = process.env.PURCHASE_POLICY_VERSION;
  const text = process.env.PURCHASE_POLICY_TEXT;
  if (!version || !/^[A-Za-z0-9._-]{1,80}$/.test(version) || !text?.trim()) return null;
  return { version, text: [purchaseScope, purchaseSupport, finalSale, text.trim()].join('\n\n') };
}

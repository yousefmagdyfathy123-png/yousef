import { configuredPurchasePolicy } from '../../../server/commerce/purchase-policy';

export const dynamic = 'force-dynamic';

export default function PurchasePolicyPage() {
  const policy = configuredPurchasePolicy();
  return <main>
    <h1>Purchase policy</h1>
    {policy ? <><p>Version {policy.version}</p><div style={{ whiteSpace: 'pre-wrap' }}>{policy.text}</div></>
      : <p>The purchase policy is currently unavailable. Checkout is closed.</p>}
  </main>;
}

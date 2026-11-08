import { getClosure } from '../../server/account/closure';
import { ClosureNotice } from '../closure-notice';
import Link from 'next/link';
import { headers } from 'next/headers';
import { getPrincipal } from '../../server/auth/principal';
import { configuredPurchasePolicy, finalSale, policyAcknowledgement, purchaseScope, purchaseSupport } from '../../server/commerce/purchase-policy';
import { priceForCountry, type Currency } from '../../server/commerce/pricing';
import { checkoutProvider } from '../../server/commerce/providers/unconfigured';
import { SupportLink } from '../support-link';
import { Checkout } from './checkout';

export const dynamic = 'force-dynamic';

export default async function PricingPage() {
  const accountsConfigured = process.env.DATABASE_URL && process.env.BETTER_AUTH_URL && process.env.BETTER_AUTH_SECRET;
  const principal = accountsConfigured
    ? await getPrincipal(new Request('http://localhost/pricing', { headers: await headers() }))
    : null;
  const eligible = principal?.emailVerified && !principal.suspended;
  const policy = configuredPurchasePolicy();
  const db = process.env.DATABASE_URL ? (await import('../../server/db/pool')).db : null;
  const account = eligible && db ? (await db.query<{ registration_country_code: string | null; currency: Currency | null; minor_units: number | null }>(`
    SELECT u.registration_country_code,q.currency,q.minor_units FROM "user" u
    LEFT JOIN quotes q ON q.user_id=u.id AND q.status='open' WHERE u.id=$1
  `, [principal.userId])).rows[0] : undefined;
  const price = account?.currency && account.minor_units !== null
    ? { currency: account.currency, minorUnits: account.minor_units }
    : priceForCountry(account?.registration_country_code ?? null);
  const closure = db ? await getClosure(db) : null;
  const provider = checkoutProvider();
  const available = provider.currencies.has(price.currency);
  return <main>
    <ClosureNotice closure={closure} />
    <h1>Alfadata pricing</h1>
    <p>{purchaseScope}</p>
    <p>{purchaseSupport}</p>
    <ul><li>Egypt · EGP 1,000</li><li>Saudi Arabia · SAR 500</li><li>Other regions · USD 100</li></ul>
    <p>{finalSale}</p>
    <p><Link href="/policies/purchase">Read the purchase policy</Link></p>
    {eligible && <p>Your price is {new Intl.NumberFormat('en-US', {
      style: 'currency', currency: price.currency, currencyDisplay: 'code',
    }).format(price.minorUnits / 100)}.</p>}
    {eligible && price.currency === 'EGP' && !available &&
      <p>An EGP payment method is currently unavailable. Your price remains in EGP.</p>}
    {!eligible ? <p><Link href={principal ? '/account' : '/sign-in'}>Open your account to continue</Link></p>
      : policy && available && !closure ? <Checkout acknowledgement={policyAcknowledgement(policy)} test={provider.environment === 'test'} />
        : <p>Checkout is currently unavailable.</p>}
    <p><SupportLink /></p>
  </main>;
}

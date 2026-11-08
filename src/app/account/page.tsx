import { getPendingDeletion } from '../../server/account/deletion';
import { RequestDeletion } from './request-deletion';
import { configuredDeletionCalendar } from '../../server/account/calendar';
import { ClosureNotice } from '../closure-notice';
import { getAccountSummary } from '../../server/account/summary';
import { SupportLink } from '../support-link';
import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getPrincipal } from '../../server/auth/principal';
import { AuthForm } from '../auth-form';
import { CheckPayment } from './check-payment';
import { StartupDefaults } from './startup-defaults';
import { getPreferences } from '../../server/preferences/service';

export default async function AccountPage() {
  const requestHeaders = await headers();
  const principal = await getPrincipal(new Request('http://localhost/account', { headers: requestHeaders }));
  if (!principal) redirect('/sign-in');
  const { access, payments, trialSecondsRemaining } = await getAccountSummary(principal);
  const preferences = principal.emailVerified && !principal.suspended ? await getPreferences(principal) : null;
  const deletion = await getPendingDeletion(principal);
  const calendar = preferences && configuredDeletionCalendar();
  return <main><ClosureNotice /><h1>Your Alfadata account</h1>
    {principal.suspended ? <p>Your account is suspended.</p> :
      principal.emailVerified ? <p><Link href="/workspace">Open workspace</Link></p> :
        <p><Link href="/verify-email">Confirm your email</Link></p>}
    {access.reason === 'trial' && <p>Trial access ends at <time dateTime={access.endsAt}>{access.endsAt}</time>.
      {' '}{Math.ceil((trialSecondsRemaining ?? 0) / 3600)} hours remaining.</p>}
    {access.reason === 'trial-expired' && <p>Your trial has expired.</p>}
    {access.reason === 'trial-not-started' && <p>Your 120-hour trial starts when you first enter a workspace.</p>}
    {access.reason === 'paid' && <p>Lifetime access is active while Alfadata operates. Your one-time payment includes
      future updates within the product’s scope and has no recurring renewal.</p>}
    <p><Link href="/pricing">View pricing and purchase terms</Link></p>
    <p><SupportLink /></p>
    {principal.role === 'admin' && principal.emailVerified && !principal.suspended &&
      <p><Link href="/admin">Administration</Link></p>}
    {access.reason === 'trial-review' && <p>Your trial access requires review.</p>}
    {payments.orders.length > 0 && <section aria-label="Payments">
      <h2>Payments</h2>
      <ul>{payments.orders.map(order => <li key={order.id}>
        {order.environment === 'test' && <strong>Test payment. </strong>}
        {new Intl.NumberFormat('en-US', { style: 'currency', currency: order.currency, currencyDisplay: 'code' }).format(order.minor_units / 100)}
        {' — '}{order.status === 'creation-unknown' ? 'Checking checkout' : order.status === 'pending' ? 'Payment pending' : order.status}
        {order.refunded > 0 && (order.refunded === order.minor_units ? ' · Fully refunded' : ' · Partially refunded')}
        {order.disputed && ' · Disputed'}
        {order.state && ' · Access ' + order.state}
        {order.review && ' · Needs review'}
        {principal.emailVerified && !principal.suspended && <div><CheckPayment orderId={order.id} /></div>}
      </li>)}</ul>
    </section>}
    {preferences && <StartupDefaults initial={preferences} />}
    {deletion ? <p>Your deletion request is pending processing. The deadline is{' '}
      <time dateTime={deletion.due_at.toISOString()}>{deletion.due_at.toISOString()}</time>.</p>
      : calendar && <RequestDeletion policyUrl="/policies/deletion" />}
    <AuthForm mode="sign-out" />
  </main>;
}

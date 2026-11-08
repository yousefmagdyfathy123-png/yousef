import { ClosureNotice } from '../closure-notice';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getPrincipal } from '../../server/auth/principal';
import { EnterButton } from './enter-button';
import { SavedWorkspace } from './saved-workspace';

export default async function WorkspacePage() {
  const principal = await getPrincipal(new Request('http://localhost/workspace', { headers: await headers() }));
  if (!principal) redirect('/sign-in');
  const { getEntitlement } = await import('../../server/access/runtime');
  const access = await getEntitlement(principal);
  if (access.reason === 'unauthenticated') redirect('/sign-in');
  if (access.reason === 'email-unverified') redirect('/verify-email');
  return <main><ClosureNotice /><h1>Alfadata</h1>
    {access.reason === 'suspended' && <p>Your account is suspended.</p>}
    {access.reason === 'trial-expired' && <p>Your 120-hour trial has ended.</p>}
    {access.reason === 'trial-review' && <p>Your trial access requires review.</p>}
    {(access.reason === 'trial-review' || access.reason === 'trial-not-started') &&
      <EnterButton review={access.reason === 'trial-review'} />}
    {access.reason === 'trial' && <p>Trial access ends at {access.endsAt}.</p>}
    {access.reason === 'paid' && <p>Paid workspace access is active.</p>}
    {(access.reason === 'trial' || access.reason === 'paid') && <SavedWorkspace key={principal.userId} account={principal.userId} />}
  </main>;
}

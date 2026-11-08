import Link from 'next/link';
import { AuthForm } from '../auth-form';

export default async function VerifyEmailPage({ searchParams }: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  return <main><h1>Confirm your email</h1>
    {status === 'verified' ? <p>Email confirmed. <Link href="/sign-in">Sign in</Link></p> :
      <>{status === 'invalid' && <p>This confirmation link is invalid, expired, or already used.</p>}
        <AuthForm mode="verify-email" /></>}
  </main>;
}

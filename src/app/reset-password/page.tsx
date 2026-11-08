import Link from 'next/link';
import { AuthForm } from '../auth-form';

export const metadata = { referrer: 'no-referrer' as const };

export default async function ResetPasswordPage({ searchParams }: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <main><h1>Reset your password</h1>
    {typeof token === 'string' && /^[A-Za-z0-9_-]{24}$/.test(token) ?
      <AuthForm mode="reset-password" token={token} /> :
      <p>This reset link is unavailable. <Link href="/forgot-password">Request a new link</Link></p>}
  </main>;
}

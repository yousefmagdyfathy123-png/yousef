import Link from 'next/link';
import { AuthForm } from '../auth-form';

export default function SignInPage() {
  return <main><h1>Sign in to Alfadata</h1><AuthForm mode="sign-in" />
    <p><Link href="/sign-up">Create an account</Link></p>
    <p><Link href="/verify-email">Resend confirmation</Link></p>
    <p><Link href="/forgot-password">Forgot your password?</Link></p>
  </main>;
}

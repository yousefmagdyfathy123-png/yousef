'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';

type Mode = 'sign-up' | 'sign-in' | 'forgot-password' | 'reset-password' | 'verify-email' | 'sign-out';

const forms = {
  'sign-up': { endpoint: 'sign-up/email', label: 'Create account', success: 'Check your email for a confirmation link.' },
  'sign-in': { endpoint: 'sign-in/email', label: 'Sign in', success: '' },
  'forgot-password': { endpoint: 'request-password-reset', label: 'Send reset link', success: 'If an account exists for this address, check your email for a reset link.' },
  'reset-password': { endpoint: 'reset-password', label: 'Reset password', success: 'Your password was reset. You can now sign in.' },
  'verify-email': { endpoint: 'send-verification-email', label: 'Send confirmation link', success: 'If confirmation is needed, check your email for a new link.' },
  'sign-out': { endpoint: 'sign-out', label: 'Sign out', success: '' },
};

export function AuthForm({ mode, token }: { mode: Mode; token?: string }) {
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const form = forms[mode];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage('');
    const element = event.currentTarget;
    const fields = Object.fromEntries(new FormData(element));
    const body = mode === 'reset-password' ? { ...fields, token } : fields;
    try {
      const response = await fetch('/api/auth/' + form.endpoint, {
        method: 'POST', credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        setMessage(response.status === 429 ? 'Too many attempts. Try again shortly.' :
          mode === 'sign-in' && response.status === 403 ? 'Confirm your email before signing in.' :
          mode === 'sign-in' ? 'Sign-in failed. Check your email and password.' :
          mode === 'reset-password' ? 'Password reset failed. Request a new link.' :
          'The request could not be completed. Try again.');
        return;
      }
      if (mode === 'sign-in' || mode === 'sign-out') {
        window.location.assign(mode === 'sign-in' ? '/account' : '/sign-in');
      } else {
        element.reset();
        setMessage(form.success);
      }
    } catch {
      setMessage('The request could not be completed. Try again.');
    } finally {
      setPending(false);
    }
  }

  return <>
    <form onSubmit={submit}>
      {mode === 'sign-up' && <p><label>Name <input name="name" autoComplete="name" required /></label></p>}
      {mode !== 'reset-password' && mode !== 'sign-out' &&
        <p><label>Email <input name="email" type="email" autoComplete="email" required /></label></p>}
      {(mode === 'sign-up' || mode === 'sign-in' || mode === 'reset-password') &&
        <p><label>{mode === 'reset-password' ? 'New password' : 'Password'} <input
          name={mode === 'reset-password' ? 'newPassword' : 'password'} type="password"
          autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
          minLength={mode === 'sign-in' ? undefined : 12} maxLength={128} required
        /></label></p>}
      <button disabled={pending}>{form.label}</button>
    </form>
    <p role="status">{message}</p>
    {mode !== 'sign-in' && mode !== 'sign-out' && <p><Link href="/sign-in">Sign in</Link></p>}
  </>;
}

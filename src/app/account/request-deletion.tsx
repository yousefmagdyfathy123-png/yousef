'use client';

import { useState } from 'react';
import { browserMutation } from '../../workspace/browser-request';

export function RequestDeletion({ policyUrl }: { policyUrl: string }) {
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState('');
  return <details>
    <summary>Request account deletion</summary>
    <p>Once processed, deletion ends sign-in and paid access and removes personal account and workspace data
      subject to the published retention exceptions. Submitting a request starts a review. It does not issue a refund
      or reset a trial.</p>
    <p><a href={policyUrl}>Review retention exceptions and the seven-business-day calendar</a></p>
    <form method="post" onSubmit={async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const password = new FormData(form).get('password');
      form.reset();
      setPending(true);
      try {
        const response = await browserMutation('/api/account/deletion', {
          method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password }),
        });
        const result = await response.json();
        if (response.ok) {
          setSubmitted(true);
          setMessage('Your request is pending review. Processing deadline (UTC) ' + result.dueAt +
            '. We will email your registered address after processing is complete.');
        } else {
          setMessage(result.reason === 'reauthentication-failed'
            ? 'Password confirmation failed.' : 'Your deletion request could not be confirmed.');
        }
      } catch {
        setMessage('Your deletion request could not be confirmed.');
      } finally {
        setPending(false);
      }
    }}>
      <label>Confirm your password <input type="password" name="password" autoComplete="current-password" required /></label>
      <button disabled={pending || submitted}>Submit deletion request</button>
    </form>
    {message && <p role="status">{message}</p>}
  </details>;
}

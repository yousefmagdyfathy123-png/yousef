'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { browserMutation } from '../../workspace/browser-request';

export function OperationForm({ requestId }: { requestId?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const date = new FormData(event.currentTarget).get('shutdownDate');
    if (!requestId && !window.confirm('Publish the closure notice, queue email notifications, and close checkout?')) return;
    setBusy(true);
    try {
      const response = await browserMutation(requestId ? '/api/admin/deletion-review' : '/api/admin/closure', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(requestId ? { requestId } : { shutdownAt: date + 'T00:00:00.000Z' }),
      });
      setMessage(response.ok ? 'Recorded.' : requestId ? 'Review unavailable.' : 'Choose a shutdown date at least 60 days ahead.');
      if (response.ok) router.refresh();
    } catch {
      setMessage('The operation could not be confirmed. Reload to see its current status.');
    } finally {
      setBusy(false);
    }
  }

  return <form method="post" onSubmit={submit}>
    {!requestId && <label>Shutdown date (UTC) <input name="shutdownDate" type="date" required /></label>}
    <button disabled={busy}>{requestId ? 'Record review' : 'Announce service closure'}</button>
    {message && <span role="status">{message}</span>}
  </form>;
}

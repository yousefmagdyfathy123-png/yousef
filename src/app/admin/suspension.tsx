'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { browserMutation } from '../../workspace/browser-request';

export function Suspension({ userId, suspended }: { userId: string; suspended: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  return <>
    <button disabled={busy} onClick={async () => {
      setBusy(true);
      try {
        const response = await browserMutation('/api/admin/suspension', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ userId, suspended: !suspended }),
        });
        if (!response.ok) throw new Error('Request denied');
        setMessage('Account updated.');
        router.refresh();
      } catch {
        setMessage('Account update could not be confirmed.');
      } finally {
        setBusy(false);
      }
    }}>{suspended ? 'Restore account' : 'Suspend account'}</button>
    {message && <span role="status">{message}</span>}
  </>;
}

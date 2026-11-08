'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { browserMutation } from '../../workspace/browser-request';

export function EnterButton({ review }: { review: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  return <>
    <button type="button" disabled={pending} onClick={async () => {
      setPending(true);
      setMessage('');
      try {
        const response = await browserMutation('/api/workspace/enter', { method: 'POST' });
        if (response.ok) {
          router.refresh();
        } else {
          const result = await response.json();
          setMessage(result.reason === 'trial-review'
            ? 'Your trial access requires review.'
            : 'Workspace access is unavailable. Check your account and try again.');
          router.refresh();
        }
      } catch {
        setMessage('Workspace entry failed. Try again.');
      } finally {
        setPending(false);
      }
    }}>{review ? 'Retry workspace entry' : 'Start 120-hour trial'}</button>
    {message && <p role="status">{message}</p>}
  </>;
}

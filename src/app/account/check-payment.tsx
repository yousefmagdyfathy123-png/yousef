'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { browserMutation } from '../../workspace/browser-request';

export function CheckPayment({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  return <>
    <button type="button" disabled={pending} onClick={async () => {
      setPending(true);
      setMessage('');
      try {
        const response = await browserMutation('/api/orders/' + encodeURIComponent(orderId) + '/verify', { method: 'POST' });
        const { kind } = await response.json();
        const messages: Record<string, string> = {
          checked: 'Payment status updated.',
          checking: 'Payment is still being checked.',
          busy: 'A payment check is already in progress.',
          'needs-review': 'This payment requires review.',
          'rate-limited': 'Please wait before checking this payment again.',
        };
        setMessage(messages[kind] ?? 'Payment status could not be checked.');
        router.refresh();
      } catch {
        setMessage('Payment status could not be checked.');
      } finally {
        setPending(false);
      }
    }}>Check payment status</button>
    {message && <p role="status">{message}</p>}
  </>;
}

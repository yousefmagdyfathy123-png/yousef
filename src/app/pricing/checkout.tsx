'use client';

import { useState } from 'react';
import type { PolicyAcknowledgement } from '../../server/commerce/purchase-policy';
import { browserMutation } from '../../workspace/browser-request';

export function Checkout({ acknowledgement, test }: { acknowledgement: PolicyAcknowledgement; test: boolean }) {
  const [accepted, setAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [key, setKey] = useState<string>();
  const [checkout, setCheckout] = useState<{ checkoutUrl: string; environment: string }>();
  return <section aria-label="Checkout">
    {test && <p><strong>Test checkout. No real payment is collected.</strong></p>}
    <label><input type="checkbox" checked={accepted} disabled={pending} onChange={event => setAccepted(event.target.checked)} />
      I accept the purchase policy, including the final-sale terms.
    </label>
    <button disabled={!accepted || pending} onClick={async () => {
      setPending(true);
      setCheckout(undefined);
      const idempotencyKey = key ?? crypto.randomUUID();
      setKey(idempotencyKey);
      try {
        const quote = await browserMutation('/api/checkout/quote', { method: 'POST' });
        if (!quote.ok) throw new Error('Quote unavailable');
        const { id: quoteId } = await quote.json();
        const result = await browserMutation('/api/checkout', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ quoteId, idempotencyKey, acknowledgement }),
        });
        const order = await result.json();
        if (!result.ok) {
          setMessage(order.reason === 'policy-changed'
            ? 'The purchase policy changed. Reload pricing and review it before continuing.'
            : 'Checkout is currently unavailable.');
        } else if (order.checkoutUrl) {
          setCheckout(order);
          setMessage('Payment is pending.');
        } else {
          setMessage('Check your account for the current order status.');
        }
      } catch {
        setMessage('Checkout could not be confirmed. Check your account for the current order status.');
      } finally {
        setPending(false);
      }
    }}>Prepare payment</button>
    {message && <p role="status">{message}</p>}
    {checkout && <p><a href={checkout.checkoutUrl} rel="noreferrer">
      {checkout.environment === 'test' ? 'Open test checkout' : 'Continue to payment'}
    </a></p>}
    <p><a href="/account">View order status</a></p>
  </section>;
}

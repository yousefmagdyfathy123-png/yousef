import type { paymentEvents } from './events';
import type { PaymentEvent } from './payment-types';
import type { PaymentProvider } from './providers/types';

const maxBody = 64 * 1024;

async function rawBody(request: Request) {
  if (!request.body) return null;
  const reader = request.body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return Buffer.concat(parts, size);
      size += value.length;
      if (size > maxBody) {
        await reader.cancel();
        return null;
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
}

export function webhookHandler(
  resolve: (id: string) => PaymentProvider | undefined,
  apply: ReturnType<typeof paymentEvents>['applyVerifiedEvent'],
) {
  return async (request: Request, id: string) => {
    const provider = resolve(id);
    if (!provider?.verifyWebhook || provider.id !== id) return new Response(null, { status: 404 });
    const raw = await rawBody(request);
    if (!raw) return new Response(null, { status: 413 });
    let event: PaymentEvent;
    try {
      event = await provider.verifyWebhook(raw, request.headers);
      if (event.provider !== provider.id || event.environment !== provider.environment) throw new Error('Provider mismatch');
    } catch {
      return new Response(null, { status: 401 });
    }
    await apply(event);
    return new Response(null, { status: 204 });
  };
}

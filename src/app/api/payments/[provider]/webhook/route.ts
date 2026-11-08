import { applyVerifiedEvent } from '../../../../../server/commerce/events';
import { webhookHandler } from '../../../../../server/commerce/webhook-handler';
import { configuredPaymentProvider } from '../../../../../server/commerce/providers/unconfigured';

const handle = webhookHandler(configuredPaymentProvider, applyVerifiedEvent);

export async function POST(request: Request, context: { params: Promise<{ provider: string }> }) {
  return handle(request, (await context.params).provider);
}

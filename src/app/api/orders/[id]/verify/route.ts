import { verifyPaymentHandler } from '../../../../../server/commerce/verify-handler';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { reconcileOrder } = await import('../../../../../server/commerce/runtime');
  return verifyPaymentHandler(reconcileOrder)(request, (await context.params).id);
}

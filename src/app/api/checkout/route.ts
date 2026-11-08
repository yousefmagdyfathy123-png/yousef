import { checkoutHandler } from '../../../server/commerce/checkout-handler';
import { checkoutProvider } from '../../../server/commerce/providers/unconfigured';

export async function POST(request: Request) {
  return checkoutHandler(checkoutProvider())(request);
}

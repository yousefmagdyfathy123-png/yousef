import { configuredPurchasePolicy, policyAcknowledgement, type PolicyAcknowledgement } from './purchase-policy';
import { getPrincipal } from '../auth/principal';
import { BrowserMutationDenied, requireBrowserMutation } from '../security/browser-mutation';
import { CheckoutUnavailable, createOrder } from './orders';
import type { PaymentProvider } from './providers/types';

const headers = { 'cache-control': 'no-store' };

function response(body: object, status: number) {
  return Response.json(body, { status, headers });
}

function checkoutInput(input: unknown): input is { quoteId: string; idempotencyKey: string; acknowledgement: PolicyAcknowledgement } {
  if (!input || typeof input !== 'object' || Object.keys(input).length !== 3) return false;
  const { quoteId, idempotencyKey, acknowledgement } = input as Record<string, unknown>;
  if (!acknowledgement || typeof acknowledgement !== 'object' || Object.keys(acknowledgement).length !== 2) return false;
  const { version, hash } = acknowledgement as Record<string, unknown>;
  if (typeof version !== 'string' || !/^[A-Za-z0-9._-]{1,80}$/.test(version) ||
      typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash)) return false;
  return typeof quoteId === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(quoteId) &&
    typeof idempotencyKey === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(idempotencyKey);
}

export function checkoutHandler(provider: PaymentProvider, {
  readPrincipal = getPrincipal, protect = requireBrowserMutation, order = createOrder, readPolicy = configuredPurchasePolicy,
} = {}) {
  return async function POST(request: Request) {
    const principal = await readPrincipal(request);
    if (!principal) return response({ reason: 'unauthenticated' }, 401);
    try {
      await protect(request, principal);
      const policy = readPolicy();
      if (!policy) return response({ reason: 'policy-unavailable' }, 503);
      const input: unknown = await request.json().catch(() => null);
      if (!checkoutInput(input)) return response({ reason: 'invalid-checkout' }, 400);
      const expected = policyAcknowledgement(policy);
      if (input.acknowledgement.version !== expected.version || input.acknowledgement.hash !== expected.hash) {
        return response({ reason: 'policy-changed' }, 409);
      }
      const result = await order(principal.userId, input.quoteId, input.idempotencyKey, provider, expected);
      return response({
        id: result.id, status: result.status, price: result.price, checkoutUrl: result.checkoutUrl,
        environment: result.environment,
      }, result.status === 'creation-unknown' ? 202 : 200);
    } catch (error) {
      if (error instanceof BrowserMutationDenied) return response({ reason: 'request-denied' }, 403);
      if (error instanceof CheckoutUnavailable) {
        const status = {
          'account-ineligible': 403, 'quote-not-found': 404, 'lifetime-active': 409, 'currency-unavailable': 503, 'service-closure': 503, 'policy-required': 400,
        }[error.reason];
        const reason = error.reason === 'currency-unavailable' && provider.id === 'unconfigured'
          ? 'provider-unconfigured' : error.reason;
        return response({ reason, price: error.price }, status);
      }
      throw error;
    }
  };
}

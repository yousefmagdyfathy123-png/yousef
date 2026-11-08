import { createHmac, timingSafeEqual } from 'node:crypto';
import { getPrincipal, type Principal } from '../auth/principal';
import { hasBrowserSource } from '../auth/origin';

export { hasBrowserSource } from '../auth/origin';

export class BrowserMutationDenied extends Error {
  readonly status = 403;
}

export function createBrowserProtection({ origin, secret, readPrincipal }: {
  origin: string; secret: string; readPrincipal: typeof getPrincipal;
}) {
  function tokenFor(principal: Pick<Principal, 'userId' | 'sessionId'>) {
    return createHmac('sha256', secret)
      .update('alfadata/browser-mutation/v1\0')
      .update(principal.sessionId)
      .digest('base64url');
  }

  async function verifiedSource(request: Request) {
    if (!hasBrowserSource(request, origin)) throw new BrowserMutationDenied();
    const principal = await readPrincipal(request);
    if (!principal?.emailVerified || principal.suspended) throw new BrowserMutationDenied();
    return principal;
  }

  return {
    async issue(request: Request) {
      return tokenFor(await verifiedSource(request));
    },
    async require(request: Request, principal: Pick<Principal, 'userId' | 'sessionId'>) {
      const active = await verifiedSource(request);
      if (active.userId !== principal.userId || active.sessionId !== principal.sessionId) {
        throw new BrowserMutationDenied();
      }
      const supplied = request.headers.get('x-alfadata-csrf');
      const expected = tokenFor(active);
      if (!supplied || !/^[A-Za-z0-9_-]{43}$/.test(supplied) ||
          !timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))) {
        throw new BrowserMutationDenied();
      }
    },
  };
}

function protection() {
  const origin = process.env.BETTER_AUTH_URL;
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!origin || !secret || secret.length < 32) throw new Error('Browser protection is not configured');
  return createBrowserProtection({ origin, secret, readPrincipal: getPrincipal });
}

export async function requireBrowserMutation(request: Request, principal: Pick<Principal, 'userId' | 'sessionId'>): Promise<void> {
  await protection().require(request, principal);
}

export async function issueBrowserMutationToken(request: Request): Promise<string> {
  return protection().issue(request);
}

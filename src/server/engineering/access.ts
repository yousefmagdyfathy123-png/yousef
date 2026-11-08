import 'server-only';
import type { Entitlement } from '../access/entitlement';
import { getPrincipal, type Principal } from '../auth/principal';
import { BrowserMutationDenied, requireBrowserMutation } from '../security/browser-mutation';

export type { Principal };
export const privateWorkspaceHeaders = { 'Cache-Control': 'private, no-store' };

export type WorkspaceOwnership = { id: string; userId: string; sessionId: string };

export class WorkspaceNotFound extends Error {
  readonly status = 404;

  constructor() {
    super('Workspace or resource not found');
  }
}

export function requireWorkspaceOwner(principal: Principal, workspace: WorkspaceOwnership): void {
  if (workspace.userId !== principal.userId || workspace.sessionId !== principal.sessionId) {
    throw new WorkspaceNotFound();
  }
}

export class EngineeringAccessDenied extends Error {
  readonly status: number;

  constructor(readonly reason: Exclude<Entitlement['reason'], 'trial' | 'paid'>) {
    super('Engineering access denied');
    this.status = reason === 'unauthenticated' ? 401 : 403;
  }
}

export function assertEngineeringEntitlement(access: Entitlement): void {
  if (access.reason !== 'trial' && access.reason !== 'paid') throw new EngineeringAccessDenied(access.reason);
}

export function createEngineeringPolicy({ readPrincipal, getEntitlement, enterVerifiedWorkspace, protect }: {
  readPrincipal: typeof getPrincipal;
  getEntitlement: (principal: Principal) => Promise<Entitlement>;
  enterVerifiedWorkspace: (request: Request, principal: Principal) => Promise<Entitlement>;
  protect: typeof requireBrowserMutation;
}) {
  async function verifiedPrincipal(request: Request) {
    const principal = await readPrincipal(request);
    if (!principal) throw new EngineeringAccessDenied('unauthenticated');
    if (principal.suspended) throw new EngineeringAccessDenied('suspended');
    if (!principal.emailVerified) throw new EngineeringAccessDenied('email-unverified');
    return principal;
  }

  async function checkAccess(principal: Principal) {
    assertEngineeringEntitlement(await getEntitlement(principal));
  }

  async function requireAccess(request: Request) {
    const principal = await verifiedPrincipal(request);
    await checkAccess(principal);
    return principal;
  }

  async function enter(request: Request) {
    if (request.method !== 'POST') throw new BrowserMutationDenied();
    const principal = await verifiedPrincipal(request);
    // Task 15 applies browser protection before initializing the trial.
    return { principal, access: await enterVerifiedWorkspace(request, principal) };
  }

  return {
    checkAccess, requireAccess, enter,
    async requireEntry(request: Request) {
      const { principal, access } = await enter(request);
      assertEngineeringEntitlement(access);
      return principal;
    },
    async requireMutation(request: Request) {
      if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) throw new BrowserMutationDenied();
      const principal = await verifiedPrincipal(request);
      await protect(request, principal);
      await checkAccess(principal);
      return principal;
    },
  };
}

export const engineeringPolicy = createEngineeringPolicy({
  readPrincipal: getPrincipal,
  getEntitlement: async principal => (await import('../access/runtime')).getEntitlement(principal),
  enterVerifiedWorkspace: async (request, principal) => (await import('../access/runtime')).enterVerifiedWorkspace(request, principal),
  protect: requireBrowserMutation,
});

export const requireEngineeringAccess = engineeringPolicy.requireAccess;

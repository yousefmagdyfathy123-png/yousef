import { getPrincipal } from '../../../../server/auth/principal';
import { BrowserMutationDenied, requireBrowserMutation } from '../../../../server/security/browser-mutation';
import { getPreferences, PreferenceConflict, savePreferences } from '../../../../server/preferences/service';
import { parsePreferenceSave } from '../../../../shared/preference-contracts';

function response(body: object, status = 200) {
  return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}

export async function GET(request: Request) {
  const principal = await getPrincipal(request);
  if (!principal) return response({ reason: 'unauthenticated' }, 401);
  if (!principal.emailVerified || principal.suspended) return response({ reason: 'request-denied' }, 403);
  return response(await getPreferences(principal));
}

export async function POST(request: Request) {
  const principal = await getPrincipal(request);
  if (!principal) return response({ reason: 'unauthenticated' }, 401);
  if (!principal.emailVerified || principal.suspended) return response({ reason: 'request-denied' }, 403);
  try {
    await requireBrowserMutation(request, principal);
    const input = parsePreferenceSave(await request.json().catch(() => null));
    if (!input) return response({ reason: 'invalid-preferences' }, 400);
    return response(await savePreferences(principal, input.expectedVersion, input.values));
  } catch (error) {
    if (error instanceof BrowserMutationDenied) return response({ reason: 'request-denied' }, 403);
    if (error instanceof PreferenceConflict) return response({ reason: 'version-conflict' }, 409);
    throw error;
  }
}

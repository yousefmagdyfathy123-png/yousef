import 'server-only';
import { isWorkspaceToken, parseWorkspaceAssetBinding, type WorkspaceAssetBinding } from '../../workspace/asset-transport';
import { getPrincipal } from '../auth/principal';
import { EngineeringAccessDenied, engineeringPolicy, privateWorkspaceHeaders, requireWorkspaceOwner, WorkspaceNotFound, type Principal, type WorkspaceOwnership } from './access';

export type { WorkspaceAssetBinding };
export type AssetResponse = {
  body: Blob;
  contentType: 'image/png' | 'image/jpeg' | 'image/webp' | 'application/json';
  revision?: number;
};

type AssetWorkspace = Readonly<WorkspaceAssetBinding & WorkspaceOwnership & {
  expiresAt: Date;
  // The loader builds this from the current view and catalog. Keys are opaque IDs.
  derivedAssets: ReadonlyMap<string, () => Promise<AssetResponse>>;
}>;

export function createWorkspaceAssetService({ load, checkAccess = engineeringPolicy.checkAccess, now = () => new Date() }: {
  load: (workspaceId: string) => Promise<AssetWorkspace | null>;
  checkAccess?: typeof engineeringPolicy.checkAccess;
  now?: () => Date;
}) {
  return async function getAuthorizedAsset(principal: Principal, workspaceId: string, assetId: string,
    binding: WorkspaceAssetBinding): Promise<AssetResponse> {
    if (!isWorkspaceToken(workspaceId) || !isWorkspaceToken(assetId)) throw new WorkspaceNotFound();
    await checkAccess(principal);
    const workspace = await load(workspaceId);
    if (!workspace || workspace.id !== workspaceId || workspace.tabId !== binding.tabId ||
        workspace.bindingRevision !== binding.bindingRevision || workspace.recoveryGeneration !== binding.recoveryGeneration ||
        !(workspace.expiresAt.getTime() > now().getTime())) {
      throw new WorkspaceNotFound();
    }
    requireWorkspaceOwner(principal, workspace);
    const derive = workspace.derivedAssets.get(assetId);
    if (!derive) throw new WorkspaceNotFound();
    const asset = await derive();
    await checkAccess(principal);
    return asset;
  };
}

export async function getAuthorizedAsset(principal: Principal, id: string, assetId: string, binding: WorkspaceAssetBinding): Promise<AssetResponse> {
  const { readWorkspaceAsset } = await import('./workspace-runtime');
  return readWorkspaceAsset(principal, id, assetId, binding);
}

export function createWorkspaceAssetRoute(readPrincipal = getPrincipal, getAsset = getAuthorizedAsset) {
  return async function GET(request: Request, { params }: { params: Promise<{ id: string; assetId: string }> }) {
    const binding = parseWorkspaceAssetBinding(request.headers);
    if (!binding) return new Response(null, { status: 400, headers: privateWorkspaceHeaders });
    const { id, assetId } = await params;
    try {
      const principal = await readPrincipal(request);
      if (!principal) throw new EngineeringAccessDenied('unauthenticated');
      const { body, contentType, revision } = await getAsset(principal, id, assetId, binding);
      return new Response(body, { headers: {
        ...privateWorkspaceHeaders,
        'Content-Type': contentType,
        'X-Content-Type-Options': 'nosniff',
        ...(revision === undefined ? {} : { 'X-Workspace-Revision': String(revision) }),
      } });
    } catch (error) {
      if (error instanceof EngineeringAccessDenied || error instanceof WorkspaceNotFound) {
        return new Response(null, { status: error.status, headers: privateWorkspaceHeaders });
      }
      const { WorkspaceStoreError } = await import('./workspace-store');
      if (error instanceof WorkspaceStoreError) return new Response(null, { status: error.status, headers: privateWorkspaceHeaders });
      throw error;
    }
  };
}

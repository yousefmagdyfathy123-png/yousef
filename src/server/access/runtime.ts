import 'server-only';
import { db } from '../db/pool';
import { requireBrowserMutation } from '../security/browser-mutation';
import { createEntitlements } from './entitlement';
import { trialIdentity } from './trial-identity';
import { localRegistry } from './trial-registry/local';
import { remoteRegistry } from './trial-registry/remote';
import { unconfiguredRegistry } from './trial-registry/unconfigured';

function configuration() {
  const identity = trialIdentity(process.env.TRIAL_REGISTRY_NAMESPACE, process.env.TRIAL_IDENTITY_KEY_REF,
    process.env.TRIAL_IDENTITY_KEY_HEX);
  const epoch = process.env.TRIAL_MIRROR_EPOCH;
  if (identity && epoch) {
    const endpoint = process.env.TRIAL_REGISTRY_URL;
    const token = process.env.TRIAL_REGISTRY_TOKEN;
    if (endpoint && token) {
      try {
        return { identity, epoch, registry: remoteRegistry(new URL(endpoint), token, identity.registryNamespace) };
      } catch {
        // Invalid configuration fences trial access.
      }
    } else if (!endpoint && !token && process.env.NODE_ENV !== 'production' && process.env.TRIAL_LOCAL_REGISTRY_FILE) {
      return { identity, epoch, registry: localRegistry(process.env.TRIAL_LOCAL_REGISTRY_FILE, identity.registryNamespace) };
    }
  }
  return { identity: null, epoch: undefined, registry: unconfiguredRegistry };
}

export const { enterVerifiedWorkspace, getEntitlement, recheckTrial } = createEntitlements({
  database: db, protect: requireBrowserMutation, ...configuration(),
});

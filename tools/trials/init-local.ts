import { isAbsolute } from 'node:path';
import { trialIdentity } from '../../src/server/access/trial-identity';
import { initializeLocalRegistry } from '../../src/server/access/trial-registry/local';

const file = process.env.TRIAL_LOCAL_REGISTRY_FILE;
const identity = trialIdentity(process.env.TRIAL_REGISTRY_NAMESPACE, process.env.TRIAL_IDENTITY_KEY_REF,
  process.env.TRIAL_IDENTITY_KEY_HEX);
if (!file || !isAbsolute(file) || !identity) throw new Error('An absolute local registry path and trial identity settings are required');
initializeLocalRegistry(file, identity.registryNamespace);
console.log('Local trial registry initialized.');

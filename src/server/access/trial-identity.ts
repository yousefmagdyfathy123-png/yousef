import { createHmac } from 'node:crypto';

export function trialIdentity(namespace?: string, keyRef?: string, keyHex?: string) {
  if (!namespace || !keyRef || !keyHex || !/^[0-9a-f]{64}$/i.test(keyHex) ||
      !/^[\w-]{1,64}$/.test(namespace) || !/^[\w-]{1,64}$/.test(keyRef)) return null;
  const fingerprint = (purpose: string, value: string) =>
    createHmac('sha256', Buffer.from(keyHex, 'hex'))
      .update(JSON.stringify(['alfadata-trial', 1, namespace, keyRef, purpose, value]))
      .digest('hex');
  return {
    registryNamespace: namespace + '.' + keyRef + '.' + fingerprint('namespace', ''),
    subjectId: (canonicalEmail: string) => fingerprint('email', canonicalEmail.toLowerCase()),
  };
}

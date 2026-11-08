import { validDecision, type TrialLookup, type TrialRegistry, type TrialStart } from './types';

export function remoteRegistry(endpoint: URL, token: string, namespace: string): TrialRegistry {
  if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.hash ||
      endpoint.search || !/^[A-Za-z0-9._~-]{32,}$/.test(token)) {
    throw new Error('Invalid remote trial registry configuration');
  }

  async function request(subjectId: string, proposed?: TrialStart): Promise<TrialLookup> {
    try {
      const response = await fetch(endpoint, {
        method: 'POST', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(5000),
        headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
        body: JSON.stringify({ operation: proposed ? 'createIfAbsent' : 'lookup', namespace, subjectId, proposed }),
      });
      if (!response.ok) return { status: 'unknown' };
      const result = await response.json();
      if (result?.namespace === namespace) {
        if (!proposed && result.status === 'absent') return { status: 'absent' };
        if (result.status === 'found' && validDecision(result.decision, subjectId)) {
          return { status: 'found', decision: result.decision };
        }
      }
    } catch {
      // Transport failures are ambiguous, including after a committed write.
    }
    return { status: 'unknown' };
  }

  return {
    lookup: subjectId => request(subjectId),
    createIfAbsent: (subjectId, proposed) => request(subjectId, proposed),
  };
}

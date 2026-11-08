'use client';

import { useEffect, useRef, useState, type ComponentProps } from 'react';
import type { SearchHit } from '../shared/public-contracts';
import { LegacyDialog } from './LegacyDialog';
import type { SearchStatus } from './search-state';

export function LegacySearch({ search, ...dialog }: Omit<ComponentProps<typeof LegacyDialog>, 'hits' | 'onSearch'> & {
  search: (query: string, signal: AbortSignal) => Promise<SearchHit[]>;
}) {
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [status, setStatus] = useState<SearchStatus>('idle');
  const active = useRef<AbortController | null>(null);
  const requestId = useRef(0);
  function cancel() {
    requestId.current++;
    active.current?.abort();
  }
  useEffect(() => () => { requestId.current++; active.current?.abort(); }, []);

  async function find(query: string) {
    active.current?.abort();
    const request = new AbortController();
    active.current = request;
    const id = ++requestId.current;
    const isCurrent = () => id === requestId.current && !request.signal.aborted;
    setStatus('loading');
    setHits([]);
    try {
      const results = await search(query, request.signal);
      if (!isCurrent()) return;
      // The source retains SearchString. Apply that change via the sequenced mutation.
      const accepted = await dialog.onAction({ type: 'search', query });
      if (!isCurrent()) return;
      if (accepted) {
        setHits(results);
        setStatus(results.length ? 'success' : 'empty');
      } else setStatus('error');
    } catch {
      if (isCurrent()) setStatus('error');
    }
  }

  return <LegacyDialog {...dialog} hits={hits} searchStatus={status} onSearch={find}
    onClose={() => { cancel(); dialog.onClose(); }} />;
}

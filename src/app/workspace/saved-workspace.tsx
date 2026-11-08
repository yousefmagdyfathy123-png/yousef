'use client';

import { useEffect, useRef, useState } from 'react';
import type { PublicWorkAction, PublicWorkResult } from '../../shared/public-contracts';
import { parsePublicWorkResult, publicSearchHitSchema } from '../../shared/public-schemas';
import { browserMutation } from '../../workspace/browser-request';
import { isWorkspaceToken, parseWorkspaceAssetBinding, workspaceAssetHeaders, workspaceBindingHeaders,
  type WorkspaceAssetBinding } from '../../workspace/asset-transport';
import { Workspace } from '../../workspace/Workspace';
import { createWorkspaceActionTransport, readWorkspaceOperationSequence, type WorkspaceActionOutcome } from '../../workspace/action-transport';

const storageKey = 'alfadata/workspace/v1';
type TabWorkspace = { id: string; binding: WorkspaceAssetBinding };

function recoveryMessage(outcome: WorkspaceActionOutcome) {
  if (outcome.kind === 'committed') return '';
  if (outcome.reason === 'result-expired') return 'The saved action result has expired. The current workspace state is displayed.';
  if (outcome.reason === 'conflict') return 'The action conflicted with the current workspace. Repeat it if it is still needed.';
  return 'Workspace state was refreshed. Repeat your action if it is still needed.';
}

function storedWorkspace(): TabWorkspace | null {
  const raw = sessionStorage.getItem(storageKey);
  if (!raw) return null;
  const { id, binding } = JSON.parse(raw) as TabWorkspace;
  if (!isWorkspaceToken(id)) return null;
  workspaceBindingHeaders(binding);
  return { id, binding };
}

function claim(id: string, bindingRevision: number): Promise<(() => void) | null> {
  return new Promise((resolve, reject) => {
    void navigator.locks.request('alfadata/workspace/' + id + '/' + bindingRevision, { ifAvailable: true }, lock => {
      if (!lock) return resolve(null);
      return new Promise<void>(release => resolve(release));
    }).catch(reject);
  });
}

export function SavedWorkspace({ account }: { account: string }) {
  const [result, setResult] = useState<PublicWorkResult>();
  const [binding, setBinding] = useState<WorkspaceAssetBinding>();
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState('');
  const release = useRef<(() => void) | null>(null);
  const createRequest = useRef(false);
  const transport = useRef<ReturnType<typeof createWorkspaceActionTransport> | null>(null);
  const [actionBlocked, setActionBlocked] = useState(false);
  const [renderVersion, setRenderVersion] = useState(0);
  const [savedId, setSavedId] = useState('');
  const resumeRequest = useRef<{ id: string; tabId: string; expectedBindingRevision: number; resumeRequestId: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    async function restore() {
      try {
        const saved = storedWorkspace();
        if (!saved) return;
        setSavedId(saved.id);
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
        if (navigation?.type !== 'reload') {
          return;
        }
        const releaseClaim = await claim(saved.id, saved.binding.bindingRevision);
        if (cancelled) {
          releaseClaim?.();
          return;
        }
        if (!releaseClaim) {
          return;
        }
        release.current = releaseClaim;
        const response = await fetch(`/api/workspaces/${saved.id}`, {
          headers: workspaceBindingHeaders(saved.binding), cache: 'no-store', signal: controller.signal,
        });
        if (!response.ok) {
          setMessage(response.status === 410 ? 'This workspace has expired. Open a new workspace to continue.' :
            'This workspace could not be restored.');
          return;
        }
        const recovered = parsePublicWorkResult(await response.json());
        if (recovered.workspaceId !== saved.id) throw new Error('Invalid workspace');
        if (!cancelled) {
          const active = createWorkspaceActionTransport(saved.id, saved.binding,
            readWorkspaceOperationSequence(response.headers), recovered.revision, account);
          transport.current = active;
          setBinding(saved.binding);
          setResult(recovered);
          if (active.needsAttention()) {
            setActionBlocked(true);
            try {
              const outcome = await active.retry();
              if (!cancelled) {
                setResult(outcome.result);
                setRenderVersion(value => value + 1);
                setActionBlocked(false);
                setMessage(recoveryMessage(outcome));
              }
            } catch {
              if (!cancelled) setMessage(active.requiresReview() ? 'The saved action requires recovery review.' : 'Unable to confirm action.');
            }
          }
        }
      } catch {
        if (!cancelled) setMessage('This workspace could not be restored.');
      } finally {
        if (!cancelled) setBusy(false);
      }
    }
    void restore();
    return () => {
      cancelled = true;
      controller.abort();
      release.current?.();
      release.current = null;
    };
  }, [account]);

  async function openWorkspace(resumeId?: string) {
    if (createRequest.current) return;
    createRequest.current = true;
    setBusy(true);
    setMessage('');
    let releaseClaim: (() => void) | null = null;
    try {
      let tabId = crypto.randomUUID();
      let response: Response;
      if (resumeId) {
        const path = '/api/workspaces/' + encodeURIComponent(resumeId);
        if (resumeRequest.current?.id !== resumeId) {
          const info = await fetch(path + '/resume-info', { cache: 'no-store' });
          if (!info.ok) throw new Error('Resume unavailable');
          const { bindingRevision } = await info.json();
          if (!Number.isSafeInteger(bindingRevision) || bindingRevision < 0) throw new Error('Invalid binding');
          resumeRequest.current = { id: resumeId, tabId, expectedBindingRevision: bindingRevision, resumeRequestId: crypto.randomUUID() };
        }
        const { id: _id, ...body } = resumeRequest.current;
        tabId = body.tabId;
        response = await browserMutation(path + '/resume', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        });
        if (!response.ok && response.status < 500) resumeRequest.current = null;
      } else {
        response = await browserMutation('/api/workspaces', { method: 'POST', headers: { [workspaceAssetHeaders.tabId]: tabId } });
      }
      if (!response.ok) throw new Error('Workspace creation failed');
      const created = parsePublicWorkResult(await response.json());
      const binding = parseWorkspaceAssetBinding(response.headers);
      if (!binding || binding.tabId !== tabId) throw new Error('Invalid workspace binding');
      releaseClaim = await claim(created.workspaceId, binding.bindingRevision);
      if (!releaseClaim) throw new Error('Workspace is already open');
      sessionStorage.setItem(storageKey, JSON.stringify({ id: created.workspaceId, binding }));
      if (releaseClaim) {
        release.current?.();
        release.current = releaseClaim;
        releaseClaim = null;
      }
      const active = createWorkspaceActionTransport(created.workspaceId, binding,
        readWorkspaceOperationSequence(response.headers), created.revision, account);
      transport.current = active;
      setActionBlocked(active.needsAttention());
      setBinding(binding);
      if (active.requiresReview()) setMessage('The saved action requires recovery review.');
      setResult(created);
      resumeRequest.current = null;
    } catch {
      setMessage(resumeId ? 'This saved workspace could not be resumed.' : 'A new workspace could not be opened.');
    } finally {
      releaseClaim?.();
      createRequest.current = false;
      setBusy(false);
    }
  }

  async function submit(action: PublicWorkAction) {
    const active = transport.current!;
    setMessage('');
    try {
      const outcome = await active.submit(action);
      setResult(outcome.result);
      if (outcome.kind === 'recovered') {
        setRenderVersion(value => value + 1);
        setMessage(recoveryMessage(outcome));
        throw new Error('Workspace state refreshed');
      }
      return outcome.result;
    } catch (error) {
      if (active.needsAttention()) {
        setActionBlocked(true);
        setMessage('Unable to confirm action.');
      } else if (error instanceof Error && error.message === 'Workspace recovery storage is unavailable') {
        setMessage('Workspace recovery storage is unavailable. Try the action again after restoring browser storage.');
      }
      throw error;
    }
  }

  async function retry() {
    if (busy) return;
    const active = transport.current!;
    setBusy(true);
    try {
      const outcome = await active.retry();
      setResult(outcome.result);
      setRenderVersion(value => value + 1);
      setActionBlocked(false);
      setMessage(recoveryMessage(outcome));
    } catch {
      setMessage(active.requiresReview() ? 'The saved action requires recovery review.' : 'Unable to confirm action.');
      setActionBlocked(active.needsAttention());
    } finally {
      setBusy(false);
    }
  }

  async function search(query: string, signal: AbortSignal) {
    const saved = storedWorkspace();
    if (!saved || saved.id !== result?.workspaceId) throw new Error('Workspace binding unavailable');
    const headers = workspaceBindingHeaders(saved.binding);
    headers.set('Content-Type', 'application/json');
    const response = await browserMutation('/api/workspaces/' + saved.id + '/search', {
      method: 'POST', headers, cache: 'no-store', signal, body: JSON.stringify({ query }),
    });
    if (response.status === 400 && query.length <= 1024 && (await response.json()).reason === 'invalid-action') {
      // Find's legacy invalid-pattern recovery is a sequenced workspace change.
      return [];
    }
    if (!response.ok) throw new Error('Search unavailable');
    const { hits } = await response.json();
    if (!Array.isArray(hits)) throw new Error('Invalid search response');
    return hits.map(hit => publicSearchHitSchema.parse(hit));
  }

  return <section aria-label="Saved workspace">
    {busy && <p role="status">Loading workspace…</p>}
    {message && <p role="status">{message}</p>}
    {(!result || transport.current?.requiresReview()) &&
      <button type="button" disabled={busy} onClick={() => void openWorkspace()}>Open new workspace</button>}
    {!result && savedId && <button type="button" disabled={busy} onClick={() => void openWorkspace(savedId)}>Resume saved workspace</button>}
    {result && <div data-workspace-id={result.workspaceId}>
      <h2>{result.ui?.titleText || 'Engineering workspace'}</h2>
      {result.ui && <p aria-label="Workspace settings">{result.ui.settings.units}, {result.ui.settings.listUnits}, {result.ui.settings.temperature}</p>}
      {actionBlocked && !transport.current?.requiresReview() &&
        <button type="button" disabled={busy} onClick={() => void retry()}>Check action status</button>}
      <Workspace key={result.workspaceId + ':' + renderVersion} initial={result} onAction={submit} onSearch={search} binding={binding} actionsBlocked={actionBlocked} embedded />
    </div>}
  </section>;
}

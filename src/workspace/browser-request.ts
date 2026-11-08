export async function browserMutation(path: string, init: RequestInit): Promise<Response> {
  const url = new URL(path, window.location.origin);
  if (url.origin !== window.location.origin) throw new Error('Expected a same-origin mutation');
  const protection = await fetch('/api/browser-token', {
    method: 'POST', credentials: 'same-origin', cache: 'no-store', redirect: 'error', signal: init.signal,
  });
  if (!protection.ok) return protection;
  const { token } = await protection.json() as { token: string };
  const headers = new Headers(init.headers);
  headers.set('x-alfadata-csrf', token);
  return fetch(url, { ...init, headers, credentials: 'same-origin', redirect: 'error' });
}

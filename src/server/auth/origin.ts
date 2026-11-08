export function hasBrowserSource(request: Request, origin: string): boolean {
  const site = request.headers.get('sec-fetch-site');
  if (site !== null && site !== 'same-origin') return false;
  const supplied = request.headers.get('origin');
  if (supplied !== null) return supplied === origin;
  const referer = request.headers.get('referer');
  if (!referer || !/^https?:\/\//.test(referer) || /[\s\\]/.test(referer)) return false;
  try {
    const url = new URL(referer);
    return url.origin === origin && !url.username && !url.password && !url.hash;
  } catch {
    return false;
  }
}

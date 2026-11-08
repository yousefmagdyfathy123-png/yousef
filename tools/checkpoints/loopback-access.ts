/** Explicit injection for the managed local harness. */
export function loopbackTestAccess(origin: string, principal: { id: string }): (request: Request) => Promise<{ id: string }> {
  const url = new URL(origin);
  if (process.env.NODE_ENV === 'production' || url.protocol !== 'http:' || url.hostname !== '127.0.0.1' ||
      url.origin !== origin || !principal.id) throw new Error('Invalid test access injection');
  return async request => {
    if (process.env.NODE_ENV === 'production' || new URL(request.url).origin !== origin) throw new Error('Engineering access denied');
    return { id: principal.id };
  };
}

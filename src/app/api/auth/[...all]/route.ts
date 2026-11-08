export const runtime = 'nodejs';

async function handle(request: Request) {
  const { identity } = await import('../../../../server/auth/runtime');
  const response = await identity.handler(request);
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'no-store');
  headers.set('Referrer-Policy', 'no-referrer');
  return new Response(response.body, { status: response.status, headers });
}

export { handle as GET, handle as POST };

export type Principal = {
  userId: string;
  sessionId: string;
  emailVerified: boolean;
  suspended: boolean;
  role: 'user' | 'admin';
};

export async function getPrincipal(request: Request): Promise<Principal | null> {
  const { identity } = await import('./runtime');
  return identity.getPrincipal(request);
}

import { createHash } from 'node:crypto';
import { betterAuth } from 'better-auth';
import { toNextJsHandler } from 'better-auth/next-js';
import type { Pool } from 'pg';
import type { MailTransport } from '../mail/transport';
import { trustedEdgeCountryResolver, type CountryResolver } from '../commerce/country';
import { hasBrowserSource } from './origin';

const verificationSeconds = 3600;
const basePath = '/api/auth';
const allowedPosts = new Set([
  '/sign-up/email', '/sign-in/email', '/sign-out', '/send-verification-email',
  '/request-password-reset', '/reset-password',
]);

function digest(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function createIdentity({ database, mail, origin, secret, schedule, resolveCountry = trustedEdgeCountryResolver() }: {
  database: Pool; mail: MailTransport; origin: string; secret: string;
  schedule?: (task: Promise<unknown>) => void;
  resolveCountry?: CountryResolver;
}) {
  const url = new URL(origin);
  const secure = url.protocol === 'https:';
  if (url.origin !== origin || (!secure && (
    process.env.NODE_ENV === 'production' || url.protocol !== 'http:' ||
    !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
  ))) throw new Error('BETTER_AUTH_URL must be an exact HTTPS origin or a local HTTP origin');
  if (secret.length < 32) throw new Error('BETTER_AUTH_SECRET must contain at least 32 characters');

  const auth = betterAuth({
    database,
    secret,
    baseURL: origin,
    basePath,
    trustedOrigins: [origin],
    logger: { disabled: true },
    user: {
      additionalFields: {
        registrationCountryCode: { type: 'string', fieldName: 'registration_country_code', required: false, input: false, returned: false },
        registrationCountrySource: { type: 'string', fieldName: 'registration_country_source', required: false, input: false, returned: false },
      },
    },
    databaseHooks: {
      user: { create: {
        async before(_user, context) {
          const country = context?.request ? await resolveCountry(context.request) : null;
          return { data: {
            registrationCountryCode: country?.countryCode ?? null,
            registrationCountrySource: country?.source ?? 'unknown',
          } };
        },
      } },
    },
    advanced: {
      useSecureCookies: secure,
      trustedProxyHeaders: false,
      disableOriginCheck: false,
      ipAddress: { ipAddressHeaders: [] },
      defaultCookieAttributes: { httpOnly: true, sameSite: 'lax', path: '/' },
      backgroundTasks: schedule ? { handler: schedule } : undefined,
    },
    session: { cookieCache: { enabled: false }, disableSessionRefresh: true },
    verification: { storeIdentifier: 'hashed' },
    rateLimit: {
      enabled: true, window: 60, max: 30,
      customRules: {
        '/sign-in/email': { window: 60, max: 12 },
        '/request-password-reset': { window: 60, max: 8 },
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      expiresIn: verificationSeconds,
      autoSignInAfterVerification: false,
      async sendVerificationEmail({ user, url, token }) {
        await database.query('DELETE FROM email_confirmation_links WHERE expires_at <= now()');
        await database.query(
          `INSERT INTO email_confirmation_links (digest, expires_at)
           VALUES ($1, now() + $2 * interval '1 second') ON CONFLICT DO NOTHING`,
          [digest(token), verificationSeconds],
        );
        const link = new URL(url);
        link.searchParams.set('callbackURL', '/verify-email?status=verified');
        await mail.send({ to: user.email, subject: 'Confirm your Alfadata email', text: link.href });
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 12,
      resetPasswordTokenExpiresIn: 1800,
      revokeSessionsOnPasswordReset: true,
      async sendResetPassword({ user, url }) {
        const link = new URL(url);
        link.searchParams.set('callbackURL', '/reset-password');
        await mail.send({ to: user.email, subject: 'Reset your Alfadata password', text: link.href });
      },
    },
  });
  const next = toNextJsHandler(auth);

  async function getPrincipal(request: Request) {
    const session = await auth.api.getSession({
      headers: request.headers,
      query: { disableCookieCache: true, disableRefresh: true },
    });
    if (!session) return null;
    const { rows } = await database.query<{ emailVerified: boolean; suspended: boolean; role: 'user' | 'admin' }>(
      `SELECT u."emailVerified", coalesce(a.suspended, false) AS suspended, coalesce(r.role, 'user') AS role
       FROM "session" s JOIN "user" u ON u.id = s."userId"
       LEFT JOIN account_access a ON a.user_id = u.id
       LEFT JOIN user_roles r ON r.user_id = u.id
       WHERE s.id = $1 AND u.id = $2 AND s."expiresAt" > now()`,
      [session.session.id, session.user.id],
    );
    if (!rows[0]) return null;
    return {
      userId: session.user.id, sessionId: session.session.id,
      ...rows[0],
    };
  }

  async function handler(request: Request) {
    const requestUrl = new URL(request.url);
    if (!requestUrl.pathname.startsWith(basePath + '/')) return new Response(null, { status: 404 });
    const path = requestUrl.pathname.slice(basePath.length);
    if (request.method === 'POST' && allowedPosts.has(path)) {
      if (!hasBrowserSource(request, origin)) return new Response(null, { status: 403 });
      const response = await next.POST(request);
      if (path === '/sign-in/email' && response.ok) {
        // The browser receives the signed cookie, never a second bearer credential in JSON.
        return Response.json({ status: true }, { headers: response.headers });
      }
      return response;
    }
    if (request.method === 'GET' && path === '/verify-email') {
      const token = requestUrl.searchParams.get('token');
      if (token && token.length <= 4096 &&
          requestUrl.searchParams.getAll('token').length === 1 &&
          requestUrl.searchParams.getAll('callbackURL').length === 1 &&
          requestUrl.searchParams.get('callbackURL') === '/verify-email?status=verified') {
        const claimed = await database.query(
          `UPDATE email_confirmation_links SET consumed = true
           WHERE digest = $1 AND expires_at > now() AND NOT consumed RETURNING digest`,
          [digest(token)],
        );
        if (claimed.rowCount === 1) {
          const response = await next.GET(request);
          if (response.headers.get('location') === '/verify-email?status=verified' ||
              response.headers.get('location') === origin + '/verify-email?status=verified') return response;
        }
      }
      return Response.redirect(origin + '/verify-email?status=invalid', 303);
    }
    if (request.method === 'GET' && /^\/reset-password\/[A-Za-z0-9_-]+$/.test(path) &&
        requestUrl.searchParams.getAll('callbackURL').length === 1 &&
        requestUrl.searchParams.get('callbackURL') === '/reset-password') {
      return next.GET(request);
    }
    return new Response(null, { status: 404 });
  }
  return { auth, getPrincipal, handler };
}

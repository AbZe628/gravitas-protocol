import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { membersFromEnv, type Identity, type Members } from '../auth/members.js';

/**
 * Authentication across the whole application.
 *
 * Majlis is a board's internal record. The questions a board asks and the
 * matters it has open disclose the direction of its deliberation before it has
 * decided anything, so none of it should be world-readable.
 *
 * There are two modes, and which one is in force decides what the application
 * will let anyone do.
 *
 *   **Members.** `MAJLIS_MEMBERS` gives each person their own credential, so a
 *   request carries an identity and a vote can be attributed to whoever cast
 *   it. This is what Stage Two needs.
 *
 *   **Shared credential.** `BASIC_AUTH_USER` and `BASIC_AUTH_PASSWORD` — one
 *   secret for the whole board. It cannot say which member is here, so a
 *   request authenticated this way is an `observer`: it reads and writes
 *   nothing. That is not a degradation of Stage One, which had no write route
 *   at all; it is the same access, named honestly.
 *
 * Both configured, members wins. Neither, and the application is open, which
 * `assertConfiguredForProduction` refuses to let happen in production.
 *
 * A password identifies. It does not sign. See `auth/members.ts`.
 *
 * `/api/health` is exempt so the hosting platform's health check keeps working.
 * It returns no board data; see `app.ts` for exactly what it exposes.
 */

const EXEMPT = new Set(['/api/health']);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Set by the auth middleware. Absent only on exempt routes. */
      identity?: Identity;
    }
  }
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  // timingSafeEqual throws on length mismatch, which would itself leak length.
  if (ab.length !== bb.length) {
    // Compare against self so the work done is the same either way.
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

export interface BasicAuthConfig {
  user: string;
  password: string;
  realm?: string;
}

export function configFromEnv(): BasicAuthConfig | null {
  const user = process.env.BASIC_AUTH_USER;
  const password = process.env.BASIC_AUTH_PASSWORD;
  if (!user || !password) return null;
  return { user, password, realm: process.env.BASIC_AUTH_REALM ?? 'Gravitas Majlis' };
}

/**
 * Refuse to start in production without some way of authenticating.
 *
 * The failure mode of forgetting should be a service that does not boot, not a
 * board's deliberation record on the open internet. Called from `index.ts`
 * before the server listens.
 */
export function assertConfiguredForProduction(): void {
  if (process.env.NODE_ENV !== 'production') return;
  if (membersFromEnv() || configFromEnv()) return;
  throw new Error(
    'Majlis holds a board record and will not start unauthenticated. Set MAJLIS_MEMBERS to give ' +
      'each member their own credential, which is what Stage Two needs, or BASIC_AUTH_USER and ' +
      'BASIC_AUTH_PASSWORD for shared read-only access. See DEPLOY.md section 5.',
  );
}

export interface AuthOptions {
  shared: BasicAuthConfig | null;
  members: Members | null;
}

export function authFromEnv(): AuthOptions {
  return { shared: configFromEnv(), members: membersFromEnv() };
}

/** Pull the username and password out of an Authorization header, or null. */
function credentials(header: string): { user: string; pass: string } | null {
  const [scheme, encoded] = header.split(' ');
  if (scheme?.toLowerCase() !== 'basic' || !encoded) return null;

  let decoded = '';
  try {
    decoded = Buffer.from(encoded, 'base64').toString('utf8');
  } catch {
    return null;
  }
  const idx = decoded.indexOf(':');
  if (idx <= 0) return null;
  return { user: decoded.slice(0, idx), pass: decoded.slice(idx + 1) };
}

export function basicAuth(options: AuthOptions | BasicAuthConfig | null) {
  // Accepts the old shape so existing callers and tests keep working.
  const opts: AuthOptions =
    options && 'user' in options ? { shared: options, members: null } : (options as AuthOptions | null) ?? { shared: null, members: null };

  const realm = opts.shared?.realm ?? 'Gravitas Majlis';

  return function authMiddleware(req: Request, res: Response, next: NextFunction) {
    // Nothing configured: development only. `assertConfiguredForProduction`
    // has already refused to start if this happens in production.
    if (!opts.shared && !opts.members) return next();
    if (EXEMPT.has(req.path)) return next();

    const supplied = credentials(req.get('authorization') ?? '');
    if (supplied) {
      if (opts.members) {
        const identity = opts.members.authenticate(supplied.user, supplied.pass);
        if (identity) {
          req.identity = identity;
          return next();
        }
      }

      if (opts.shared) {
        // Both compared unconditionally so a wrong username and a wrong
        // password take the same time.
        const userOk = safeEqual(supplied.user, opts.shared.user);
        const passOk = safeEqual(supplied.pass, opts.shared.password);
        if (userOk && passOk) {
          // The shared credential cannot say who is here, so it may only watch.
          req.identity = { scholarId: 'shared', role: 'observer' };
          return next();
        }
      }
    }

    res.setHeader('WWW-Authenticate', `Basic realm="${realm}", charset="UTF-8"`);
    // No detail: which of the two was wrong is not the caller's business.
    res.status(401).json({ error: 'unauthorized' });
  };
}

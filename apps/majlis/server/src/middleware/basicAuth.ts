import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

/**
 * Basic authentication across the whole application.
 *
 * Majlis is a board's internal record. The questions a board asks and the
 * matters it has open disclose the direction of its deliberation before it has
 * decided anything, so none of it should be world-readable. This covers every
 * route, including `/api/export/:boardId`, which was previously open.
 *
 * A shared credential is a stopgap, not a role model. Stage Two replaces it
 * with real roles — scholar, chair, technical liaison, institution
 * administrator, read-only auditor — and this middleware goes away with it.
 * It is here because "no auth at all" was the alternative.
 *
 * `/api/health` is exempt so the hosting platform's health check keeps working.
 * It returns no board data; see `app.ts` for exactly what it exposes.
 */

const EXEMPT = new Set(['/api/health']);

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
 * Refuse to start in production without credentials.
 *
 * The failure mode of forgetting to set them should be a service that does not
 * boot, not a board's deliberation record on the open internet. Called from
 * `index.ts` before the server listens.
 */
export function assertConfiguredForProduction(): void {
  if (process.env.NODE_ENV !== 'production') return;
  if (configFromEnv()) return;
  throw new Error(
    'BASIC_AUTH_USER and BASIC_AUTH_PASSWORD must both be set in production. ' +
      'Majlis holds a board record and will not start unauthenticated. ' +
      'See DEPLOY.md section 5.',
  );
}

export function basicAuth(config: BasicAuthConfig | null) {
  return function basicAuthMiddleware(req: Request, res: Response, next: NextFunction) {
    // Not configured: development only. `assertConfiguredForProduction` has
    // already refused to start if this happens in production.
    if (!config) return next();
    if (EXEMPT.has(req.path)) return next();

    const header = req.get('authorization') ?? '';
    const [scheme, encoded] = header.split(' ');

    if (scheme?.toLowerCase() === 'basic' && encoded) {
      let decoded = '';
      try {
        decoded = Buffer.from(encoded, 'base64').toString('utf8');
      } catch {
        decoded = '';
      }
      const idx = decoded.indexOf(':');
      if (idx > 0) {
        const user = decoded.slice(0, idx);
        const pass = decoded.slice(idx + 1);
        // Both compared unconditionally so a wrong username and a wrong
        // password take the same time.
        const userOk = safeEqual(user, config.user);
        const passOk = safeEqual(pass, config.password);
        if (userOk && passOk) return next();
      }
    }

    res.setHeader('WWW-Authenticate', `Basic realm="${config.realm}", charset="UTF-8"`);
    // No detail: which of the two was wrong is not the caller's business.
    res.status(401).json({ error: 'unauthorized' });
  };
}

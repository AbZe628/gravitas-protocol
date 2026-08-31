import type { NextFunction, Request, Response } from 'express';

/**
 * Throttles failed sign-in attempts, per address.
 *
 * Authentication here derives a scrypt hash on every attempt, including for a
 * member id that does not exist — deliberately, so that "no such member" and
 * "wrong password" take the same time and give nothing away. That property is
 * worth keeping and it has a cost: each attempt buys the caller a real amount
 * of CPU on this single instance, and nothing was counting them. A loop of
 * wrong passwords was a way to make the service unavailable to the board, using
 * a mechanism built to protect it.
 *
 * Only failures count. Someone working normally never sees this; someone
 * guessing runs out of attempts. The window is deliberately generous — a
 * scholar mistyping a credential from a piece of paper is the common case, and
 * locking them out would be a worse failure than the one being prevented.
 *
 * Held in memory, like the other limiter here, and correct only because
 * render.yaml pins this to one instance. Two instances keep two counts.
 */
export interface LoginLimitConfig {
  /** Failures from one address before it is refused outright. */
  maxFailures: number;
  /** How long failures are remembered. */
  windowMs: number;
}

export const DEFAULT_LOGIN_LIMIT: LoginLimitConfig = {
  maxFailures: 10,
  windowMs: 5 * 60_000,
};

export class LoginLimiter {
  private readonly failures = new Map<string, number[]>();

  constructor(private readonly cfg: LoginLimitConfig = DEFAULT_LOGIN_LIMIT) {}

  /** True when this address has spent its attempts. */
  blocked(key: string, now = Date.now()): boolean {
    return this.recent(key, now).length >= this.cfg.maxFailures;
  }

  /** How long until it may try again, in seconds. */
  retryAfter(key: string, now = Date.now()): number {
    const hits = this.recent(key, now);
    if (hits.length < this.cfg.maxFailures) return 0;
    return Math.max(1, Math.ceil((hits[0] + this.cfg.windowMs - now) / 1000));
  }

  fail(key: string, now = Date.now()): void {
    const hits = this.recent(key, now);
    hits.push(now);
    this.failures.set(key, hits);
  }

  /** A success clears the record: the caller has proved they are not guessing. */
  succeed(key: string): void {
    this.failures.delete(key);
  }

  private recent(key: string, now: number): number[] {
    const cutoff = now - this.cfg.windowMs;
    const hits = (this.failures.get(key) ?? []).filter((t) => t > cutoff);
    if (hits.length) this.failures.set(key, hits);
    else this.failures.delete(key);
    return hits;
  }
}

/**
 * Refuses an address that has spent its attempts, before authentication runs.
 *
 * It sits ahead of the credential check on purpose: the whole point is that the
 * expensive derivation never happens for a caller who is already known to be
 * guessing.
 */
export function loginThrottle(limiter: LoginLimiter) {
  return function throttle(req: Request, res: Response, next: NextFunction) {
    const key = req.ip ?? 'unknown';
    if (!limiter.blocked(key)) return next();

    const retry = limiter.retryAfter(key);
    res.setHeader('Retry-After', String(retry));
    res.status(429).json({
      error: 'too_many_attempts',
      message: `Too many failed sign-in attempts. Try again in ${retry} seconds.`,
    });
  };
}

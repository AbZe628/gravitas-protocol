import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { LoginLimiter, loginThrottle, DEFAULT_LOGIN_LIMIT } from '../src/middleware/loginLimit.js';
import { basicAuth } from '../src/middleware/basicAuth.js';

/**
 * Authentication derives a scrypt hash on every attempt, including for member
 * ids that do not exist — which is what keeps "no such member" and "wrong
 * password" indistinguishable, and is worth keeping.
 *
 * Nothing counted those attempts. A loop of wrong passwords was a way to spend
 * this single instance's CPU until the board could not use it, through the
 * mechanism built to protect them.
 */

const CREDENTIALS = { user: 'shared', password: 'correct-horse', realm: 'Test' };

function app(limiter: LoginLimiter) {
  const a = express();
  a.use(loginThrottle(limiter));
  a.use(basicAuth({ shared: CREDENTIALS, members: null }, limiter));
  a.get('/api/thing', (_req, res) => res.json({ ok: true }));
  return a;
}

const wrong = (a: express.Express) => request(a).get('/api/thing').auth('shared', 'nope');
const right = (a: express.Express) => request(a).get('/api/thing').auth('shared', 'correct-horse');

describe('failed sign-ins are throttled', () => {
  it('lets a correct credential through', async () => {
    const res = await right(app(new LoginLimiter()));
    expect(res.status).toBe(200);
  });

  it('refuses once the attempts are spent, and says for how long', async () => {
    const limiter = new LoginLimiter({ maxFailures: 3, windowMs: 60_000 });
    const a = app(limiter);

    for (let i = 0; i < 3; i++) expect((await wrong(a)).status).toBe(401);

    const res = await wrong(a);
    expect(res.status).toBe(429);
    expect(res.body.error).toBe('too_many_attempts');
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
  });

  /*
   * The point of the throttle: once someone is known to be guessing, the
   * expensive derivation must not run for them at all. If the credential were
   * still checked, the CPU would still be spent and the 429 would be decoration.
   */
  it('refuses before the credential is checked, so a correct one does not rescue it', async () => {
    const limiter = new LoginLimiter({ maxFailures: 2, windowMs: 60_000 });
    const a = app(limiter);

    await wrong(a);
    await wrong(a);

    expect((await right(a)).status).toBe(429);
  });

  it('forgets failures once the window passes', async () => {
    const limiter = new LoginLimiter({ maxFailures: 2, windowMs: 50 });
    const a = app(limiter);

    await wrong(a);
    await wrong(a);
    expect((await wrong(a)).status).toBe(429);

    await new Promise((r) => setTimeout(r, 70));
    expect((await right(a)).status).toBe(200);
  });

  /*
   * Someone working normally must never meet this. A scholar typing a
   * credential off a piece of paper mistypes it, gets it right, and should
   * arrive with a clean record.
   */
  it('a success clears what came before it', async () => {
    const limiter = new LoginLimiter({ maxFailures: 3, windowMs: 60_000 });
    const a = app(limiter);

    await wrong(a);
    await wrong(a);
    expect((await right(a)).status).toBe(200);

    await wrong(a);
    await wrong(a);
    expect((await right(a)).status).toBe(200);
  });

  it('counts each address separately', () => {
    const limiter = new LoginLimiter({ maxFailures: 2, windowMs: 60_000 });
    limiter.fail('1.1.1.1');
    limiter.fail('1.1.1.1');

    expect(limiter.blocked('1.1.1.1')).toBe(true);
    expect(limiter.blocked('2.2.2.2')).toBe(false);
  });

  it('leaves room for honest mistakes', () => {
    // Low enough to matter, high enough that a person retyping does not meet it.
    expect(DEFAULT_LOGIN_LIMIT.maxFailures).toBeGreaterThanOrEqual(5);
    expect(DEFAULT_LOGIN_LIMIT.maxFailures).toBeLessThanOrEqual(20);
  });
});

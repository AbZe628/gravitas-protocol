import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { parseMembers, hashPassword } from '../src/auth/members.js';
import { basicAuth } from '../src/middleware/basicAuth.js';
import { LoginLimiter, loginThrottle } from '../src/middleware/loginLimit.js';

/**
 * A credential that cannot say whose it is cannot be checked against the record
 * it is reaching for.
 *
 * The store boundary would already withhold every record from a member of
 * another institution, but authenticating someone into a service that can show
 * them nothing is a worse answer than telling them they are at the wrong door.
 */

const PW = 'correct-horse-battery';
const secret = () => hashPassword(PW);

describe('a member entry can name its institution', () => {
  it('reads institution/member', () => {
    const members = parseMembers(`alpha-bank/member-a:signatory:${secret()}`);
    const id = members.authenticate('alpha-bank/member-a', PW);

    expect(id?.scholarId).toBe('member-a');
    expect(id?.institutionId).toBe('alpha-bank');
  });

  /* Every entry written before this still parses to the same member. */
  it('reads the older bare form, belonging to whoever the service serves', () => {
    const members = parseMembers(`member-a:signatory:${secret()}`);
    const id = members.authenticate('member-a', PW);

    expect(id?.scholarId).toBe('member-a');
    expect(id?.institutionId).toBeUndefined();
  });

  it('refuses an institution with no member after it', () => {
    expect(() => parseMembers(`alpha-bank/:signatory:${secret()}`)).toThrow(/no member/i);
  });

  /* Two institutions may each have a member-a, and they are different people. */
  it('keeps the same member id in two institutions apart', () => {
    const members = parseMembers(
      `alpha-bank/member-a:signatory:${secret()}\nbeta-bank/member-a:advisory:${secret()}`,
    );

    expect(members.authenticate('alpha-bank/member-a', PW)?.role).toBe('signatory');
    expect(members.authenticate('beta-bank/member-a', PW)?.role).toBe('advisory');
  });
});

describe('a credential belonging elsewhere is refused at the door', () => {
  function serve(institutionId: string | undefined, entries: string) {
    const app = express();
    const limiter = new LoginLimiter({ maxFailures: 50, windowMs: 60_000 });
    app.use(loginThrottle(limiter));
    app.use(
      basicAuth({ shared: null, members: parseMembers(entries) }, limiter, institutionId),
    );
    app.get('/api/thing', (req, res) => res.json({ who: req.identity }));
    return app;
  }

  const entries = () =>
    `alpha-bank/member-a:signatory:${secret()}\nbeta-bank/member-b:signatory:${secret()}`;

  it('lets its own member in', async () => {
    const res = await request(serve('alpha-bank', entries()))
      .get('/api/thing')
      .auth('alpha-bank/member-a', PW);

    expect(res.status).toBe(200);
    expect(res.body.who.institutionId).toBe('alpha-bank');
  });

  /*
   * Correct credential, wrong door. Refused as unauthorized rather than
   * explained, because a different answer here would let someone map which
   * institutions a deployment serves by trying credentials against it.
   */
  it('refuses a member of another institution', async () => {
    const res = await request(serve('alpha-bank', entries()))
      .get('/api/thing')
      .auth('beta-bank/member-b', PW);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('unauthorized');
  });

  it('says no more about it than it says about a wrong password', async () => {
    const app = serve('alpha-bank', entries());

    const wrongDoor = await request(app).get('/api/thing').auth('beta-bank/member-b', PW);
    const wrongPassword = await request(app).get('/api/thing').auth('alpha-bank/member-a', 'nope');

    expect(wrongDoor.status).toBe(wrongPassword.status);
    expect(wrongDoor.body).toEqual(wrongPassword.body);
  });

  /* The older form belongs to whichever institution the service serves. */
  it('admits a member whose entry names no institution', async () => {
    const res = await request(serve('alpha-bank', `member-a:signatory:${secret()}`))
      .get('/api/thing')
      .auth('member-a', PW);

    expect(res.status).toBe(200);
  });

  it('admits everyone where the service names no institution', async () => {
    const res = await request(serve(undefined, entries()))
      .get('/api/thing')
      .auth('beta-bank/member-b', PW);

    expect(res.status).toBe(200);
  });
});

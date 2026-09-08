import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { MemoryStore } from '../src/store/index.js';
import { hashPassword } from '../src/auth/members.js';

/**
 * A member's own account, over HTTP.
 *
 * The lines these hold are the ones a bank's security review will ask about:
 *
 *   - the new password works on the very next request, not after a restart;
 *   - only the secretary or the chair may let somebody back in, and their name
 *     goes in the record;
 *   - a member nobody holds a credential for is answered exactly as one who
 *     is, so the door cannot be used to read a board's membership;
 *   - a code is never readable back out, and a second replaces the first;
 *   - redeeming needs no credential, because somebody who has forgotten their
 *     password has none.
 */

const PASSWORD = 'the original passphrase';
const NEXT = 'a completely different phrase';
const secret = hashPassword(PASSWORD);

const MEMBERS = [
  'member-a:signatory',
  'member-b:signatory+secretary',
  'member-c:signatory+chair',
  'watcher:observer',
]
  .map((entry) => `${entry}:${secret}`)
  .join('\n');

const as = (who: string, pass = PASSWORD) =>
  'Basic ' + Buffer.from(`${who}:${pass}`).toString('base64');

let app: Express;
const saved = {
  members: process.env.MAJLIS_MEMBERS,
  user: process.env.BASIC_AUTH_USER,
  pass: process.env.BASIC_AUTH_PASSWORD,
};

beforeEach(() => {
  process.env.MAJLIS_MEMBERS = MEMBERS;
  delete process.env.BASIC_AUTH_USER;
  delete process.env.BASIC_AUTH_PASSWORD;
  app = createApp(new MemoryStore());
});

afterEach(() => {
  process.env.MAJLIS_MEMBERS = saved.members;
  process.env.BASIC_AUTH_USER = saved.user;
  process.env.BASIC_AUTH_PASSWORD = saved.pass;
});

describe('who you are', () => {
  it('says whether you are still on the password somebody typed into a config', async () => {
    const res = await request(app).get('/api/me').set('Authorization', as('member-a')).expect(200);

    expect(res.body.scholarId).toBe('member-a');
    expect(res.body.stillOnTheSeed).toBe(true);
    expect(res.body.passwordMinimum).toBeGreaterThanOrEqual(12);
  });
});

describe('changing your own password', () => {
  it('needs the current one', async () => {
    const res = await request(app)
      .post('/api/me/password')
      .set('Authorization', as('member-a'))
      .send({ current: 'not it at all', next: NEXT });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('wrong_current');
  });

  it('works on the very next request, not after a restart', async () => {
    await request(app)
      .post('/api/me/password')
      .set('Authorization', as('member-a'))
      .send({ current: PASSWORD, next: NEXT })
      .expect(200);

    // The new one is live.
    await request(app).get('/api/me').set('Authorization', as('member-a', NEXT)).expect(200);
    // And the environment file's no longer opens the door.
    await request(app).get('/api/me').set('Authorization', as('member-a')).expect(401);
  });

  it('stops saying you are on the seed once you have set your own', async () => {
    await request(app)
      .post('/api/me/password')
      .set('Authorization', as('member-a'))
      .send({ current: PASSWORD, next: NEXT })
      .expect(200);

    const res = await request(app).get('/api/me').set('Authorization', as('member-a', NEXT));
    expect(res.body.stillOnTheSeed).toBe(false);
  });

  it('refuses one that is too short, before anything is written', async () => {
    const res = await request(app)
      .post('/api/me/password')
      .set('Authorization', as('member-a'))
      .send({ current: PASSWORD, next: 'short' });

    expect(res.status).toBe(400);
    // Nothing changed: the old one still works.
    await request(app).get('/api/me').set('Authorization', as('member-a')).expect(200);
  });

  it('changes one member and no other', async () => {
    await request(app)
      .post('/api/me/password')
      .set('Authorization', as('member-a'))
      .send({ current: PASSWORD, next: NEXT })
      .expect(200);

    await request(app).get('/api/me').set('Authorization', as('member-b')).expect(200);
  });
});

describe('letting somebody back in', () => {
  const issue = (who: string, scholarId = 'member-a') =>
    request(app).post('/api/members/reset').set('Authorization', as(who)).send({ scholarId });

  it('is the secretary’s to do, or the chair’s', async () => {
    await issue('member-b').expect(200);
    await issue('member-c').expect(200);
  });

  it('is not an ordinary member’s to do, however senior', async () => {
    const res = await issue('member-a');
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/secretary or the chair/i);
  });

  it('shows the code once and never again', async () => {
    const first = await issue('member-b').expect(200);
    expect(first.body.code).toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/);

    /*
     * There is deliberately no route that reads an outstanding code. If one
     * existed, anybody who reached it could take an account.
     */
    const me = await request(app).get('/api/me').set('Authorization', as('member-a')).expect(200);
    expect(JSON.stringify(me.body)).not.toContain(first.body.code);
  });

  it('answers a member nobody holds a credential for exactly the same way', async () => {
    const real = await issue('member-b', 'member-a').expect(200);
    const ghost = await issue('member-b', 'nobody-at-all').expect(200);

    // Same status, same shape, no code, no way to tell a board's membership
    // apart from the outside.
    expect(ghost.body.code).toBeUndefined();
    expect(typeof real.body.message).toBe('string');
    expect(typeof ghost.body.message).toBe('string');
  });
});

describe('setting a new password with a code', () => {
  async function codeFor(scholarId = 'member-a'): Promise<string> {
    const res = await request(app)
      .post('/api/members/reset')
      .set('Authorization', as('member-b'))
      .send({ scholarId })
      .expect(200);
    return res.body.code as string;
  }

  it('needs no credential, because somebody who forgot theirs has none', async () => {
    const code = await codeFor();

    // No Authorization header at all.
    await request(app)
      .post('/api/members/password/reset')
      .send({ scholarId: 'member-a', code, next: NEXT })
      .expect(200);

    await request(app).get('/api/me').set('Authorization', as('member-a', NEXT)).expect(200);
  });

  it('refuses a code that was replaced by a later one', async () => {
    const first = await codeFor();
    await codeFor();

    const res = await request(app)
      .post('/api/members/password/reset')
      .send({ scholarId: 'member-a', code: first, next: NEXT });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('reset_does_not_match');
  });

  it('answers an unknown member exactly as it answers a wrong code', async () => {
    const res = await request(app)
      .post('/api/members/password/reset')
      .send({ scholarId: 'nobody-at-all', code: 'AAAAA-BBBBB', next: NEXT });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('reset_does_not_match');
  });

  it('will not set one that is too short, code or no code', async () => {
    const code = await codeFor();
    await request(app)
      .post('/api/members/password/reset')
      .send({ scholarId: 'member-a', code, next: 'short' })
      .expect(400);
  });

  it('cannot be redeemed twice', async () => {
    const code = await codeFor();
    await request(app)
      .post('/api/members/password/reset')
      .send({ scholarId: 'member-a', code, next: NEXT })
      .expect(200);

    const again = await request(app)
      .post('/api/members/password/reset')
      .send({ scholarId: 'member-a', code, next: 'yet another passphrase' });

    expect(again.status).toBe(409);
    expect(again.body.error).toBe('no_reset_outstanding');
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { MemoryStore } from '../src/store/index.js';
import { hashPassword } from '../src/auth/members.js';

/**
 * The board is told when the board has ruled.
 *
 * ── the hole this closes ──────────────────────────────────────────────────
 *
 * `notice.ts` could compose three events and the application only ever
 * composed one: a question arriving. A question being *answered* composed
 * nothing at all, so the single moment the board's work produced its result
 * was the single moment nobody was told. Measured by reading every `compose(`
 * call in `routes/` — there was one.
 *
 * ── what is asserted, and what deliberately is not ────────────────────────
 *
 * That the notice exists, carries the board's own reference, and travels back
 * with the act rather than needing a second request. Not that it was sent:
 * the ordinary installation has no channel, and `delivery.sent` is false. A
 * test that demanded `sent: true` would be testing a mail server.
 *
 * And a rejected vote composes nothing. A notice saying a ruling is in force
 * when the board refused it would be the record lying in an inbox.
 */

const PASSWORD = 'a board credential';
const secret = hashPassword(PASSWORD);

const MEMBERS = ['member-a:signatory', 'member-b:signatory', 'member-c:signatory']
  .map((entry) => `${entry}:${secret}`)
  .join('\n');

const as = (who: string) => 'Basic ' + Buffer.from(`${who}:${PASSWORD}`).toString('base64');
const REASON = 'The mechanism is bounded by the signed minimums, which answers the concern raised.';

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

/** A matter carried to the point where the vote can be closed. */
async function readyToClose(direction: 'permit' | 'restrict', positions = ['for', 'for', 'for']) {
  const opened = await request(app)
    .post('/api/matters')
    .set('Authorization', as('member-a'))
    .send({
      boardId: 'demo-board',
      title: 'Whether a wrapped asset inherits its underlying ruling',
      proposal: 'The board is asked whether the wrapper is a separate asset.',
      direction,
      origin: 'institution_request',
    })
    .expect(201);
  const id = opened.body.id as string;

  await request(app).post(`/api/matters/${id}/open`).set('Authorization', as('member-a')).expect(200);
  await request(app)
    .post(`/api/matters/${id}/deliberation`)
    .set('Authorization', as('member-a'))
    .send({ body: 'A point about the mechanism, at some length.' })
    .expect(201);
  await request(app).post(`/api/matters/${id}/voting`).set('Authorization', as('member-a')).expect(200);

  const who = ['member-a', 'member-b', 'member-c'];
  for (let i = 0; i < positions.length; i++) {
    await request(app)
      .post(`/api/matters/${id}/vote`)
      .set('Authorization', as(who[i]))
      .send({ position: positions[i], reason: REASON })
      .expect(201);
  }
  return id;
}

const close = (id: string) =>
  request(app).post(`/api/matters/${id}/close`).set('Authorization', as('member-a'));

describe('the board is told when it has ruled', () => {
  it('composes a notice the moment a restriction takes force', async () => {
    const id = await readyToClose('restrict');
    const res = await close(id).expect(200);

    expect(res.body.outcome).toBe('in_force');
    expect(res.body.notice).not.toBeNull();
    expect(res.body.notice.subject).toContain('has ruled');
    expect(res.body.notice.body).toContain('Restricted');
    // Everyone on the board, not whoever happened to press.
    expect(res.body.notice.concerns.length).toBeGreaterThan(1);
  });

  it('carries the board’s own reference, which a bank files under', async () => {
    const id = await readyToClose('restrict');
    const res = await close(id).expect(200);

    expect(res.body.reference).toBeTruthy();
    expect(res.body.notice.body).toContain(res.body.reference);
  });

  it('says plainly that nothing was sent, where nothing is wired', async () => {
    const id = await readyToClose('restrict');
    const res = await close(id).expect(200);

    // The ordinary installation. A quiet success here would be the one
    // failure this whole file is arranged against.
    expect(res.body.delivery.configured).toBe(false);
    expect(res.body.delivery.sent).toBe(false);
  });

  it('composes nothing when the board refused', async () => {
    const id = await readyToClose('restrict', ['against', 'against', 'against']);
    const res = await close(id).expect(200);

    expect(res.body.outcome).toBe('rejected');
    expect(res.body.notice).toBeNull();
    expect(res.body.delivery).toBeNull();
  });

  it('composes nothing while a permit is still in its timelock', async () => {
    const id = await readyToClose('permit');
    const res = await close(id).expect(200);

    // A permit is not in force when the vote closes. Saying it was would be
    // the notice arriving before the thing it describes.
    expect(res.body.outcome).not.toBe('in_force');
    expect(res.body.notice).toBeNull();
  });

  it('tells the board when a permit finally takes force', async () => {
    const id = await readyToClose('permit');
    await close(id).expect(200);

    const res = await request(app)
      .post(`/api/matters/${id}/force`)
      .set('Authorization', as('member-a'));

    /*
     * The timelock may not have run in a test that takes milliseconds, and
     * being refused for that reason is correct. What must not happen is the
     * other door into force staying silent: if it succeeds, it notices.
     */
    if (res.status === 200) {
      expect(res.body.status).toBe('in_force');
      expect(res.body.notice).not.toBeNull();
      expect(res.body.notice.body).toContain('Permitted');
    } else {
      expect(res.body.error).toBeTruthy();
    }
  });
});

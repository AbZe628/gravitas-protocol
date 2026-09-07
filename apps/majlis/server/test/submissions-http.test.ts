import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { MemoryStore } from '../src/store/memory.js';
import { hashPassword } from '../src/auth/members.js';

/**
 * The way in, end to end.
 *
 * The thing being held to here is not that the routes work — it is that the
 * institution's own words survive the trip, that a board member cannot make it
 * look as though the bank withdrew a question the board turned down, and that
 * nothing anywhere claims to have sent an email.
 */

const PASSWORD = 'a-password-nobody-uses';

const as = (id: string) => 'Basic ' + Buffer.from(`${id}:${PASSWORD}`).toString('base64');

let app: Express;
let store: MemoryStore;

beforeEach(() => {
  const secret = hashPassword(PASSWORD);
  process.env.MAJLIS_MEMBERS = [
    `member-a:signatory:${secret}`,
    `member-b:advisory:${secret}`,
    `desk-treasury:institution:${secret}`,
    `desk-retail:institution:${secret}`,
    `watcher:observer:${secret}`,
  ].join('\n');

  store = new MemoryStore();
  app = createApp(store);
});

const QUESTION =
  'May we hold the wrapped form of a sukuk we already hold directly, where the wrapper mints one ' +
  'token per unit deposited and burns on redemption?';

async function board(): Promise<string> {
  const res = await request(app).get('/api/boards').set('Authorization', as('watcher')).expect(200);
  return (res.body.boards ?? res.body)[0].id;
}

async function put(who = 'desk-treasury', over: Record<string, unknown> = {}) {
  const boardId = await board();
  return request(app)
    .post('/api/submissions')
    .set('Authorization', as(who))
    .send({
      boardId,
      subject: 'Wrapped sukuk for the treasury desk',
      question: QUESTION,
      background: 'The counterparty will not take the direct form as collateral.',
      awaiting: 'Sign the collateral agreement, which is otherwise ready.',
      askedBy: 'Layla Haddad, Treasury',
      ...over,
    });
}

describe('an institution can put a question, which it could not before', () => {
  it('accepts one from a desk that is not on the board', async () => {
    const res = await put();
    expect(res.status).toBe(201);
    expect(res.body.submission.standing).toBe('waiting');
    expect(res.body.submission.onBehalf).toBe(false);
  });

  it('keeps the question in the words it was put in', async () => {
    const res = await put();
    expect(res.body.submission.question).toBe(QUESTION);
    expect(res.body.submission.askedBy).toBe('Layla Haddad, Treasury');
  });

  it('marks one a member entered for somebody with no access', async () => {
    const res = await put('member-a');
    expect(res.status).toBe(201);
    expect(res.body.submission.onBehalf).toBe(true);
    expect(res.body.submission.recordedBy).toBe('member-a');
    expect(res.body.submission.askedBy).toBe('Layla Haddad, Treasury');
  });

  it('refuses an observer, who reads and does not write', async () => {
    const res = await put('watcher');
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('role_not_permitted');
  });

  it('refuses a question too short for the board to answer', async () => {
    const res = await put('desk-treasury', { question: 'Is this ok?' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('question_too_short');
  });
});

describe('nothing claims to have sent anything', () => {
  it('composes the notice and says plainly that it was not sent', async () => {
    const res = await put();
    expect(res.body.notice.subject).toContain('Wrapped sukuk');
    expect(res.body.notice.concerns.length).toBeGreaterThan(0);
    expect(res.body.delivery).toMatchObject({ kind: 'none', configured: false, sent: false });
  });

  /*
   * A notice travels through whatever mail system a bank happens to use, and
   * the text of a compliance question about a named counterparty is not the
   * thing that should leak out of it.
   */
  it('leaves the substance of the question out of the notice', async () => {
    const res = await put();
    expect(res.body.notice.body).not.toContain('burns on redemption');
    expect(res.body.notice.body).not.toContain('counterparty will not take');
  });

  it('reports the channel in health, so an interface can say which it is', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body.notice).toBe('none');
  });
});

describe('one desk cannot see another’s', () => {
  it('leaves another desk’s question out of the list', async () => {
    await put('desk-treasury');
    const mine = await request(app)
      .get('/api/submissions')
      .set('Authorization', as('desk-retail'))
      .expect(200);
    expect(mine.body.submissions).toHaveLength(0);
  });

  it('answers another desk’s question as though it did not exist', async () => {
    const put1 = await put('desk-treasury');
    const res = await request(app)
      .get(`/api/submissions/${put1.body.submission.id}`)
      .set('Authorization', as('desk-retail'))
      .expect(404);
    expect(res.body.error).toBe('not_found');
  });

  it('shows the board the whole queue', async () => {
    await put('desk-treasury');
    await put('desk-retail', { subject: 'A retail question' });
    const res = await request(app)
      .get('/api/submissions')
      .set('Authorization', as('member-a'))
      .expect(200);
    expect(res.body.submissions).toHaveLength(2);
    expect(res.body.waiting).toHaveLength(2);
  });
});

describe('what the board does with it', () => {
  const opening = {
    title: 'Whether a wrapped holding inherits the ruling of its underlying',
    proposal:
      'The board is asked whether the wrapper is a separate asset for the whitelist, or the same ' +
      'asset in another form.',
    direction: 'permit' as const,
  };

  it('opens it as a matter, and the matter is the board’s own wording', async () => {
    const created = await put();
    const res = await request(app)
      .post(`/api/submissions/${created.body.submission.id}/open`)
      .set('Authorization', as('member-a'))
      .send(opening)
      .expect(201);

    expect(res.body.matter.title).toBe(opening.title);
    // Not the institution's subject line. The two are different acts.
    expect(res.body.matter.title).not.toBe(created.body.submission.subject);
    expect(res.body.submission.standing).toBe('opened');
    expect(res.body.submission.matterId).toBe(res.body.matter.id);
  });

  /*
   * `arrivedAt` on a matter had no way of being set, so every matter reported
   * its wait as partial. A matter that came in this way now knows.
   */
  it('starts the matter’s clock when the institution asked, not when the board looked', async () => {
    const asked = '2026-09-01T08:00:00.000Z';
    const created = await put('member-a', { arrivedAt: asked });
    const res = await request(app)
      .post(`/api/submissions/${created.body.submission.id}/open`)
      .set('Authorization', as('member-a'))
      .send(opening)
      .expect(201);

    expect(res.body.matter.arrivedAt).toBe(asked);
  });

  it('declines with a reason the institution can act on', async () => {
    const created = await put();
    const res = await request(app)
      .post(`/api/submissions/${created.body.submission.id}/decline`)
      .set('Authorization', as('member-a'))
      .send({ reason: 'Come back with the audit of the mint and burn; we cannot rule without it.' })
      .expect(200);

    expect(res.body.submission.standing).toBe('declined');
  });

  it('refuses a decline that tells them nothing', async () => {
    const created = await put();
    const res = await request(app)
      .post(`/api/submissions/${created.body.submission.id}/decline`)
      .set('Authorization', as('member-a'))
      .send({ reason: 'No.' })
      .expect(409);
    expect(res.body.error).toBe('reason_too_short');
  });

  it('refuses an institution trying to answer its own question', async () => {
    const created = await put();
    const res = await request(app)
      .post(`/api/submissions/${created.body.submission.id}/open`)
      .set('Authorization', as('desk-treasury'))
      .send(opening)
      .expect(403);
    expect(res.body.message).toContain('puts questions to the board');
  });

  it('leaves no matter behind when opening is refused', async () => {
    const created = await put();
    const id = created.body.submission.id;

    await request(app)
      .post(`/api/submissions/${id}/open`)
      .set('Authorization', as('member-a'))
      .send(opening)
      .expect(201);

    const before = (await store.matters()).length;
    await request(app)
      .post(`/api/submissions/${id}/open`)
      .set('Authorization', as('member-a'))
      .send(opening)
      .expect(409);

    expect((await store.matters()).length).toBe(before);
  });
});

describe('withdrawal belongs to whoever asked', () => {
  it('lets the desk take its own question back', async () => {
    const created = await put();
    const res = await request(app)
      .post(`/api/submissions/${created.body.submission.id}/withdraw`)
      .set('Authorization', as('desk-treasury'))
      .send({ reason: 'The counterparty accepted the direct form.' })
      .expect(200);
    expect(res.body.submission.standing).toBe('withdrawn');
  });

  /*
   * Otherwise the record would later read as though the bank had changed its
   * mind, when in fact the board turned it down.
   */
  it('refuses a board member withdrawing somebody else’s question', async () => {
    const created = await put();
    const res = await request(app)
      .post(`/api/submissions/${created.body.submission.id}/withdraw`)
      .set('Authorization', as('member-a'))
      .send({ reason: 'Not for us.' })
      .expect(403);

    expect(res.body.error).toBe('not_yours');
    expect(res.body.message).toContain('it declines it, and says why');
  });
});

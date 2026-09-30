import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { MemoryStore } from '../src/store/index.js';
import { hashPassword } from '../src/auth/members.js';
import { boards, incidents, matters, rules } from '../src/data/seed.js';
import { submissions, undertakings } from '../src/data/seed-work.js';

/**
 * A matter that needs the board in a room, and the agenda that follows.
 *
 * ── the fault this holds shut ─────────────────────────────────────────────
 *
 * The chair typed the agenda into a box, one item to a line, from memory.
 * Nothing in the application knew which matters wanted a sitting, so the ones
 * that got one were the ones the chair thought of on the day — and a member
 * who believed something could not be settled in writing had nowhere to say
 * so except by asking the chair outside the record.
 *
 * And the typed line lost the link. `AgendaItem` carries a `matterId`, the
 * convene route refuses one that is not before this board, and the seeded
 * meetings have them — but the form built `{ item }` from each line and never
 * a `matterId`. The link worked in the demonstration data and in nothing the
 * application itself ever made. Found by pressing *convene a meeting* and
 * looking at the form.
 */

const PASSWORD = 'a board credential';
const secret = hashPassword(PASSWORD);

const MEMBERS = [
  'member-a:signatory+chair',
  'member-b:signatory+secretary',
  'member-c:signatory',
  'advisor-1:advisory',
  'liaison-1:liaison',
]
  .map((entry) => `${entry}:${secret}`)
  .join('\n');

const as = (who: string) => 'Basic ' + Buffer.from(`${who}:${PASSWORD}`).toString('base64');

let app: Express;
const saved = { members: process.env.MAJLIS_MEMBERS };

beforeEach(() => {
  process.env.MAJLIS_MEMBERS = MEMBERS;
  app = createApp(
    new MemoryStore({ boards, matters, rules, incidents, submissions, undertakings, briefings: [] }),
  );
});

afterEach(() => {
  process.env.MAJLIS_MEMBERS = saved.members;
});

/** A matter still open, so there is something a sitting could take. */
const OPEN = 'matter-2026-07-03';

const WHY = 'The two readings turn on the same clause and neither of us is moving in writing.';

const ask = (who: string, body: Record<string, unknown>, matter = OPEN) =>
  request(app).post(`/api/matters/${matter}/room`).set('Authorization', as(who)).send(body);

type Waiting = {
  matterId: string;
  title: string;
  asked: string[];
  reason: string;
  since: string;
  convenedFor: string | null;
};

const waitingNow = async (who = 'member-a'): Promise<Waiting[]> => {
  const res = await request(app).get('/api/meetings').set('Authorization', as(who));
  expect(res.status).toBe(200);
  return res.body.waiting as Waiting[];
};

describe('what is waiting for a room', () => {
  it('is empty before anybody asks, or this proves nothing', async () => {
    expect(await waitingNow()).toEqual([]);
  });

  it('carries the matter, everyone whose ask stands, and why the last of them asked', async () => {
    expect((await ask('member-c', { wanted: true, reason: WHY })).status).toBe(200);

    const waiting = await waitingNow();
    expect(waiting).toHaveLength(1);
    expect(waiting[0].matterId).toBe(OPEN);
    expect(waiting[0].asked).toEqual(['member-c']);
    expect(waiting[0].reason).toBe(WHY);
    expect(waiting[0].title.length).toBeGreaterThan(0);
    expect(waiting[0].convenedFor).toBeNull();
  });

  it('counts each member once however often they change their mind', async () => {
    await ask('member-c', { wanted: true, reason: WHY });
    await ask('member-c', { wanted: false, reason: 'We have settled it in the thread after all.' });
    expect(await waitingNow(), 'the withdrawal did not take it off').toEqual([]);

    await ask('member-c', { wanted: true, reason: 'It has come apart again on the same clause.' });
    await ask('advisor-1', { wanted: true, reason: 'I would want to hear both readings put in person.' });

    const waiting = await waitingNow();
    expect(waiting).toHaveLength(1);
    // Four entries on the record, two people standing.
    expect(waiting[0].asked).toEqual(['member-c', 'advisor-1']);
  });

  it('keeps every entry, so why it came off is as readable as why it went on', async () => {
    await ask('member-c', { wanted: true, reason: WHY });
    const res = await ask('member-c', { wanted: false, reason: 'We have settled it in the thread after all.' });

    expect(res.body.wantsTheRoom).toHaveLength(2);
    expect(res.body.wantsTheRoom[0]).toMatchObject({ wanted: true, by: 'member-c', reason: WHY });
    expect(res.body.wantsTheRoom[1].wanted).toBe(false);
    expect(res.body.wantsTheRoom[1].reason).toContain('settled it in the thread');
  });

  it('says where it is already down for a sitting, rather than dropping it', async () => {
    await ask('member-c', { wanted: true, reason: WHY });

    const when = new Date(Date.now() + 14 * 86_400_000).toISOString();
    const convened = await request(app)
      .post('/api/meetings')
      .set('Authorization', as('member-a'))
      .send({
        boardId: 'demo-board',
        at: when,
        agenda: [{ matterId: OPEN, item: 'The two readings of the same clause' }],
      });
    expect(convened.status, JSON.stringify(convened.body)).toBe(201);

    const waiting = await waitingNow();
    // Still listed: a chair who cannot see it is down is a chair who convenes
    // twice for the same thing.
    expect(waiting).toHaveLength(1);
    expect(waiting[0].convenedFor).toBe(when);
  });
});

describe('what the sitting is convened around', () => {
  it('carries the matter on the agenda item, not only its title', async () => {
    await ask('member-c', { wanted: true, reason: WHY });

    const res = await request(app)
      .post('/api/meetings')
      .set('Authorization', as('member-a'))
      .send({
        boardId: 'demo-board',
        at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
        agenda: [{ matterId: OPEN, item: 'The two readings of the same clause' }],
      });

    expect(res.status).toBe(201);
    // Without this the agenda is a list of titles and the sitting links to
    // nothing — which is what the form made for as long as it existed.
    expect(res.body.agenda[0].matterId).toBe(OPEN);
  });

  /*
   * The hour the notice says, and which hour it is.
   *
   * A chair typed 14:00 into the form, pressed convene, and the words the
   * screen offered to copy read *2026-11-12 13:00* — the instant in UTC,
   * printed raw beside nothing. A board told the wrong hour arrives at the
   * wrong hour. Found by convening a sitting and reading the notice.
   */
  it('says which zone the hour is in, or a board arrives at the wrong one', async () => {
    const at = '2026-11-12T13:00:00.000Z';
    const res = await request(app)
      .post('/api/meetings')
      .set('Authorization', as('member-a'))
      .send({ boardId: 'demo-board', at, agenda: [{ item: 'One thing to settle' }] });

    expect(res.status).toBe(201);
    const body = res.body.notice?.body as string;
    expect(body, 'no notice was composed, so this proves nothing').toBeTruthy();
    expect(body).toContain('13:00');
    expect(body, 'the hour is printed with no zone beside it').toContain('13:00 UTC');
  });
});

describe('who may ask, and what may not be asked about', () => {
  it('refuses the liaison, who is the institution’s person here', async () => {
    const res = await ask('liaison-1', { wanted: true, reason: WHY });
    expect(res.status).toBe(403);
  });

  it('allows an advisory member, who does not vote but does advise', async () => {
    const res = await ask('advisor-1', { wanted: true, reason: WHY });
    expect(res.status).toBe(200);
  });

  it('refuses a reason too short to prepare from', async () => {
    const res = await ask('member-c', { wanted: true, reason: 'needs discussion' });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(await waitingNow()).toEqual([]);
  });

  it('refuses asking twice, and withdrawing what was never asked', async () => {
    expect((await ask('member-c', { wanted: false, reason: WHY })).status).toBeGreaterThanOrEqual(400);
    await ask('member-c', { wanted: true, reason: WHY });
    expect((await ask('member-c', { wanted: true, reason: WHY })).status).toBeGreaterThanOrEqual(400);
  });

  it('refuses a matter that is settled, because a sitting cannot reopen one', async () => {
    const all = await request(app).get('/api/matters').set('Authorization', as('member-a'));
    const settled = (all.body as { id: string; status: string }[]).find((m) =>
      ['in_force', 'rejected', 'withdrawn', 'lapsed'].includes(m.status),
    );
    expect(settled, 'the seed has no settled matter, so this proves nothing').toBeTruthy();

    const res = await ask('member-c', { wanted: true, reason: WHY }, settled!.id);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

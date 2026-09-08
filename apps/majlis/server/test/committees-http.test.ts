import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { MemoryStore } from '../src/store/index.js';
import { hashPassword } from '../src/auth/members.js';
import type { Board, Matter } from '../src/types.js';

/**
 * Committees over HTTP, and the one thing they must never do.
 *
 * **A referral changes nothing about how a matter is decided.** The status,
 * the threshold and the waiting period are exactly where they were, and these
 * tests check the matter before and after to say so. A board's threshold is
 * the number of signatures that bind the institution; if three of nine could
 * settle something inside a committee, the institution would be bound by
 * three while its own governance document says five, and nobody reading the
 * record afterwards would see that it had happened.
 */

const PASSWORD = 'a board credential';
const secret = hashPassword(PASSWORD);

const MEMBERS = [
  'member-a:signatory',
  'member-b:signatory',
  'member-c:signatory',
  'member-d:signatory',
  'watcher:observer',
]
  .map((entry) => `${entry}:${secret}`)
  .join('\n');

const as = (who: string) => 'Basic ' + Buffer.from(`${who}:${PASSWORD}`).toString('base64');

const board: Board = {
  id: 'demo-board',
  institutionId: 'demo-institution',
  name: 'Board',
  quorumPermit: 3,
  quorumRestrict: 2,
  totalSignatories: 4,
  ratificationWindowHours: 168,
  members: ['a', 'b', 'c', 'd'].map((x) => ({
    id: 'member-' + x,
    name: 'Board Member ' + x.toUpperCase(),
    title: '',
    board: 'demo-board',
    signatory: true,
  })),
};

const matter = (id: string): Matter => ({
  id,
  boardId: 'demo-board',
  title: 'A matter',
  origin: 'protocol_change',
  direction: 'permit',
  status: 'deliberation',
  openedAt: '2026-08-11T00:00:00.000Z',
  proposal: 'That something be permitted on stated conditions.',
  notDecided: [],
  mechanism: '',
  interactsWith: [],
  proposedRule: {
    id: 'rule-' + id,
    boardId: 'demo-board',
    title: '',
    statement: '',
    parameters: [],
    parameterHash: '',
    version: 1,
    inForceFrom: null,
    supersededBy: null,
    supersedes: null,
    sources: [],
  },
  simulation: null,
  deliberation: [],
  reasoning: [],
  objections: [],
  inForceAt: null,
  sources: [],
});

let app: Express;
let store: MemoryStore;
const saved = {
  members: process.env.MAJLIS_MEMBERS,
  user: process.env.BASIC_AUTH_USER,
  pass: process.env.BASIC_AUTH_PASSWORD,
};

beforeEach(() => {
  process.env.MAJLIS_MEMBERS = MEMBERS;
  delete process.env.BASIC_AUTH_USER;
  delete process.env.BASIC_AUTH_PASSWORD;
  store = new MemoryStore({
    boards: [board],
    matters: [matter('matter-founding'), matter('matter-1')],
    rules: [],
    briefings: [],
  });
  app = createApp(store);
});

afterEach(() => {
  process.env.MAJLIS_MEMBERS = saved.members;
  process.env.BASIC_AUTH_USER = saved.user;
  process.env.BASIC_AUTH_PASSWORD = saved.pass;
});

const FORM = {
  boardId: 'demo-board',
  name: 'The contracts committee',
  remit: 'Read the contract shapes before they come to the board, and say what is unclear.',
  members: ['member-a', 'member-b', 'member-c'],
  convenor: 'member-a',
  formedIn: 'matter-founding',
};

const formOne = (over: Record<string, unknown> = {}, who = 'member-a') =>
  request(app).post('/api/committees').set('Authorization', as(who)).send({ ...FORM, ...over });

const referOne = async (over: Record<string, unknown> = {}, who = 'member-d') => {
  const made = await formOne();
  return {
    committeeId: made.body.committee.id,
    res: await request(app)
      .post('/api/referrals')
      .set('Authorization', as(who))
      .send({
        committeeId: made.body.committee.id,
        matterId: 'matter-1',
        asking: 'Whether the wording reaches a fund that borrows at its own level.',
        ...over,
      }),
  };
};

describe('forming a committee', () => {
  it('keeps the board’s own name and remit, and the matter it was formed in', async () => {
    const res = await formOne();
    expect(res.status).toBe(201);
    expect(res.body.committee.name).toBe('The contracts committee');
    expect(res.body.committee.formedIn).toBe('matter-founding');
  });

  it('refuses a founding matter that is not a matter of this board', async () => {
    const res = await formOne({ formedIn: 'matter-that-does-not-exist' });
    expect(res.status).toBe(404);
  });

  it('refuses somebody not on the board', async () => {
    const res = await formOne({ members: ['member-a', 'a-stranger'] });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('not_on_this_board');
  });

  it('refuses an observer', async () => {
    const res = await formOne({}, 'watcher');
    expect(res.status).toBe(403);
  });

  it('lists what each committee is carrying, and says so when a board keeps none', async () => {
    const empty = await request(app).get('/api/committees').set('Authorization', as('watcher'));
    expect(empty.body.keepsNone).toBe(true);

    await formOne();
    const res = await request(app).get('/api/committees').set('Authorization', as('watcher'));
    expect(res.body.keepsNone).toBe(false);
    expect(res.body.committees[0].memberNames).toContain('Board Member A');
    expect(res.body.committees[0].summary).toEqual({
      waiting: 0,
      reported: 0,
      withdrawn: 0,
      notUnanimous: 0,
    });
  });
});

describe('referring a matter', () => {
  it('records the question and leaves the matter exactly where it was', async () => {
    const before = await store.matter('matter-1');
    const { res } = await referOne();

    expect(res.status).toBe(201);
    expect(res.body.referral.asking).toContain('borrows at its own level');

    const after = await store.matter('matter-1');
    expect(after).toEqual(before);
  });

  it('says on every read that a referral changes nothing about deciding', async () => {
    await referOne();
    const res = await request(app)
      .get('/api/matters/matter-1/referrals')
      .set('Authorization', as('watcher'));

    expect(res.body.note).toContain('unchanged by a referral');
    expect(res.body.referrals[0].state).toBe('waiting');
  });

  it('refuses an observer', async () => {
    const { res } = await referOne({}, 'watcher');
    expect(res.status).toBe(403);
  });
});

describe('reporting', () => {
  const FOUND =
    'The wording reaches borrowing inside the index only. A fund borrowing at its own level ' +
    'is outside it, and that is a separate question.';

  it('names who stood behind the account and who did not, with what they said', async () => {
    const { committeeId, res: made } = await referOne();
    const res = await request(app)
      .post(`/api/referrals/${made.body.referral.id}/report`)
      .set('Authorization', as('member-a'))
      .send({
        found: FOUND,
        standing: [
          { scholarId: 'member-a', agrees: true },
          { scholarId: 'member-b', agrees: true },
          { scholarId: 'member-c', agrees: false, said: 'The same exposure is reached either way.' },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.stood.unanimous).toBe(false);
    expect(res.body.stood.dissented[0].scholarId).toBe('member-c');

    const back = await request(app)
      .get('/api/matters/matter-1/referrals')
      .set('Authorization', as('watcher'));
    expect(back.body.referrals[0].state).toBe('reported');
    expect(back.body.referrals[0].stood.dissentedNames[0].name).toBe('Board Member C');
    expect(back.body.referrals[0].committee.id).toBe(committeeId);
  });

  it('refuses an account from somebody who did not sit on the committee', async () => {
    const { res: made } = await referOne();
    const res = await request(app)
      .post(`/api/referrals/${made.body.referral.id}/report`)
      .set('Authorization', as('member-d'))
      .send({ found: FOUND, standing: [] });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('not_on_this_committee');
  });

  it('refuses dissent recorded as a mark', async () => {
    const { res: made } = await referOne();
    const res = await request(app)
      .post(`/api/referrals/${made.body.referral.id}/report`)
      .set('Authorization', as('member-a'))
      .send({ found: FOUND, standing: [{ scholarId: 'member-c', agrees: false }] });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('dissent_needs_words');
  });

  /*
   * The whole point, stated as a test. Reporting is not a decision, so the
   * matter that was referred is byte-for-byte what it was.
   */
  it('leaves the matter untouched even when the committee is of one mind', async () => {
    const before = await store.matter('matter-1');
    const { res: made } = await referOne();
    await request(app)
      .post(`/api/referrals/${made.body.referral.id}/report`)
      .set('Authorization', as('member-a'))
      .send({
        found: FOUND,
        standing: [
          { scholarId: 'member-a', agrees: true },
          { scholarId: 'member-b', agrees: true },
          { scholarId: 'member-c', agrees: true },
        ],
      });

    expect(await store.matter('matter-1')).toEqual(before);
  });

  it('takes a referral back with a reason, and refuses one without', async () => {
    const { res: made } = await referOne();

    const bare = await request(app)
      .post(`/api/referrals/${made.body.referral.id}/withdraw`)
      .set('Authorization', as('member-d'))
      .send({});
    expect(bare.status).toBe(400);

    const res = await request(app)
      .post(`/api/referrals/${made.body.referral.id}/withdraw`)
      .set('Authorization', as('member-d'))
      .send({ why: 'The board decided to read it in the room after all.' });
    expect(res.status).toBe(200);
    expect(res.body.referral.withdrawn.why).toContain('read it in the room');
    // It stays, with what was asked.
    expect(res.body.referral.asking).toContain('borrows at its own level');
  });
});

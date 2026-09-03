import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { MemoryStore } from '../src/store/index.js';
import { hashPassword } from '../src/auth/members.js';

/**
 * The whole of Stage Two, over HTTP, with real credentials.
 *
 * The board here is the seeded demonstration board: quorumPermit 3,
 * quorumRestrict 2, seven members of whom five are signatories.
 */

const PASSWORD = 'a board credential';
const secret = hashPassword(PASSWORD);

const MEMBERS = [
  'member-a:signatory',
  'member-b:signatory',
  'member-c:signatory',
  'member-d:signatory',
  'liaison-1:liaison',
  'advisor-1:advisory',
  'watcher:observer',
]
  .map((entry) => `${entry}:${secret}`)
  .join('\n');

const as = (who: string) => 'Basic ' + Buffer.from(`${who}:${PASSWORD}`).toString('base64');
const REASON = 'The mechanism is bounded by the owner signed minimums, which answers the concern raised.';

let app: Express;
const saved = { members: process.env.MAJLIS_MEMBERS, user: process.env.BASIC_AUTH_USER, pass: process.env.BASIC_AUTH_PASSWORD };

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

async function openMatter(who = 'member-a', over: Record<string, unknown> = {}) {
  const res = await request(app)
    .post('/api/matters')
    .set('Authorization', as(who))
    .send({
      boardId: 'demo-board',
      title: 'Whether a wrapped asset inherits its underlying ruling',
      proposal: 'The board is asked whether the wrapper is a separate asset for the purpose of the whitelist.',
      direction: 'permit',
      origin: 'institution_request',
      ...over,
      leaveAsDraft: undefined,
    });
  expect(res.status).toBe(201);
  const id = res.body.id as string;

  // A matter is created as a draft: the proposer writes it before the board is
  // asked to look. Opening deliberation is the separate, deliberate act of
  // saying it is ready, so almost every test needs both.
  if (over.leaveAsDraft !== true) {
    await request(app).post(`/api/matters/${id}/open`).set('Authorization', as(who)).expect(200);
  }
  return id;
}

function say(id: string, who: string, body = 'A point about the mechanism, at some length.') {
  return request(app).post(`/api/matters/${id}/deliberation`).set('Authorization', as(who)).send({ body });
}

function vote(id: string, who: string, position = 'for', reason = REASON) {
  return request(app).post(`/api/matters/${id}/vote`).set('Authorization', as(who)).send({ position, reason });
}

// ── the identity a vote is recorded under ─────────────────────────────────

describe('a request cannot say whose vote it carries', () => {
  it('the body cannot name a different member', async () => {
    const id = await openMatter();
    await say(id, 'member-a');
    await request(app).post(`/api/matters/${id}/voting`).set('Authorization', as('member-a'));

    await request(app)
      .post(`/api/matters/${id}/vote`)
      .set('Authorization', as('member-a'))
      // A forged attribution. If this were honoured, one password would let a
      // member vote as the whole board.
      .send({ scholarId: 'member-b', position: 'for', reason: REASON })
      .expect(201);

    const matter = (await request(app).get(`/api/matters/${id}`).set('Authorization', as('member-a'))).body;
    expect(matter.reasoning).toHaveLength(1);
    expect(matter.reasoning[0].scholarId).toBe('member-a');
  });

  it('an unauthenticated request writes nothing', async () => {
    await request(app).post('/api/matters').send({ boardId: 'demo-board' }).expect(401);
  });
});

// ── who may do what ───────────────────────────────────────────────────────

describe('roles', () => {
  it('an observer may read and may not write', async () => {
    await request(app).get('/api/matters').set('Authorization', as('watcher')).expect(200);
    const res = await request(app).post('/api/matters').set('Authorization', as('watcher')).send({
      boardId: 'demo-board', title: 'A matter', proposal: 'x', direction: 'permit', origin: 'protocol_change',
    });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('role_not_permitted');
  });

  it('an advisory member deliberates but does not vote', async () => {
    const id = await openMatter();
    await say(id, 'advisor-1').expect(201);
    await request(app).post(`/api/matters/${id}/voting`).set('Authorization', as('member-a'));

    const res = await vote(id, 'advisor-1');
    expect(res.status).toBe(403);
  });

  it('a liaison answer is marked by the role, not claimed in the body', async () => {
    const id = await openMatter();
    await say(id, 'liaison-1', 'The registry reverts rather than returning false when paused.');
    await say(id, 'member-b', 'A question about that, at sufficient length to be a point.');

    const matter = (await request(app).get(`/api/matters/${id}`).set('Authorization', as('member-a'))).body;
    const byLiaison = matter.deliberation.find((d: { scholarId: string }) => d.scholarId === 'liaison-1');
    const byMember = matter.deliberation.find((d: { scholarId: string }) => d.scholarId === 'member-b');
    expect(byLiaison.liaisonAnswer).toBe(true);
    expect(byMember.liaisonAnswer).toBe(false);
  });
});

// ── the process, end to end ───────────────────────────────────────────────

describe('permitting takes the slow path', () => {
  it('open, deliberate, vote to quorum, close into a timelock', async () => {
    const id = await openMatter();

    // Voting will not open on an unread proposal.
    const early = await request(app).post(`/api/matters/${id}/voting`).set('Authorization', as('member-a'));
    expect(early.status).toBe(409);
    expect(early.body.error).toBe('no_deliberation');

    await say(id, 'member-a');
    await request(app).post(`/api/matters/${id}/voting`).set('Authorization', as('member-a')).expect(200);

    await vote(id, 'member-a').expect(201);
    await vote(id, 'member-b').expect(201);

    // Two of three. Closing now is a rejection, so check the tally instead.
    const short = (await request(app).get(`/api/matters/${id}/tally`).set('Authorization', as('member-a'))).body;
    expect(short).toMatchObject({ for: 2, required: 3, met: false });
    expect(short.outstanding.sort()).toEqual(['member-c', 'member-d', 'member-e']);

    await vote(id, 'member-c').expect(201);

    const closed = await request(app).post(`/api/matters/${id}/close`).set('Authorization', as('member-a'));
    expect(closed.status).toBe(200);
    expect(closed.body.outcome).toBe('timelock_started');
    expect(closed.body.status).toBe('timelock');
    expect(closed.body.inForceAt).toBeNull();
  });

  it('the timelock cannot be shortened', async () => {
    const id = await openMatter();
    await say(id, 'member-a');
    await request(app).post(`/api/matters/${id}/voting`).set('Authorization', as('member-a'));
    for (const m of ['member-a', 'member-b', 'member-c']) await vote(id, m);
    await request(app).post(`/api/matters/${id}/close`).set('Authorization', as('member-a'));

    const early = await request(app).post(`/api/matters/${id}/force`).set('Authorization', as('member-a'));
    expect(early.status).toBe(409);
    expect(early.body.error).toBe('timelock_running');
  });

  it('one objection halts it', async () => {
    const id = await openMatter();
    await say(id, 'member-a');
    await request(app).post(`/api/matters/${id}/voting`).set('Authorization', as('member-a'));
    for (const m of ['member-a', 'member-b', 'member-c']) await vote(id, m);
    await request(app).post(`/api/matters/${id}/close`).set('Authorization', as('member-a'));

    const objected = await request(app)
      .post(`/api/matters/${id}/object`)
      .set('Authorization', as('member-d'))
      .send({ reason: 'The simulation did not cover positions opened before the window.' });

    expect(objected.status).toBe(200);
    expect(objected.body.status).toBe('rejected');
    expect(objected.body.objections).toHaveLength(1);
    expect(objected.body.objections[0].scholarId).toBe('member-d');
  });

  it('a short quorum is rejected rather than left open', async () => {
    const id = await openMatter();
    await say(id, 'member-a');
    await request(app).post(`/api/matters/${id}/voting`).set('Authorization', as('member-a'));
    await vote(id, 'member-a');

    const closed = await request(app).post(`/api/matters/${id}/close`).set('Authorization', as('member-a'));
    expect(closed.body.outcome).toBe('rejected');
    expect(closed.body.status).toBe('rejected');
  });
});

describe('restricting takes the fast path', () => {
  it('two signatures put it in force at once', async () => {
    const id = await openMatter('member-a', { direction: 'restrict' });
    await say(id, 'member-a');
    await request(app).post(`/api/matters/${id}/voting`).set('Authorization', as('member-a'));
    await vote(id, 'member-a');
    await vote(id, 'member-b');

    const closed = await request(app).post(`/api/matters/${id}/close`).set('Authorization', as('member-a'));
    expect(closed.body.outcome).toBe('in_force');
    expect(closed.body.status).toBe('in_force');
    expect(closed.body.inForceAt).not.toBeNull();
    expect(closed.body.timelockEndsAt).toBeNull();
  });
});

// ── what a vote has to carry ──────────────────────────────────────────────

describe('a vote without reasoning is refused', () => {
  it('an empty reason is a bad request, not a stored blank', async () => {
    const id = await openMatter();
    await say(id, 'member-a');
    await request(app).post(`/api/matters/${id}/voting`).set('Authorization', as('member-a'));

    const empty = await request(app)
      .post(`/api/matters/${id}/vote`)
      .set('Authorization', as('member-a'))
      .send({ position: 'for', reason: '' });
    expect(empty.status).toBe(400);

    const tooShort = await vote(id, 'member-a', 'for', 'yes');
    expect(tooShort.status).toBe(400);
    expect(tooShort.body.error).toBe('no_reason_given');
  });

  it('a member cannot vote twice', async () => {
    const id = await openMatter();
    await say(id, 'member-a');
    await request(app).post(`/api/matters/${id}/voting`).set('Authorization', as('member-a'));
    await vote(id, 'member-a').expect(201);

    const again = await vote(id, 'member-a', 'against');
    expect(again.status).toBe(409);
    expect(again.body.error).toBe('already_voted');
  });
});

// ── threads ───────────────────────────────────────────────────────────────

describe('deliberation threads', () => {
  it('a reply points at the entry it answers', async () => {
    const id = await openMatter();
    const first = await say(id, 'member-a', 'Does the wrapper hold the underlying, or a claim on it?');
    const parent = first.body.deliberation[0].id;

    const reply = await request(app)
      .post(`/api/matters/${id}/deliberation`)
      .set('Authorization', as('liaison-1'))
      .send({ body: 'It holds the underlying; the wrapper is a receipt.', replyTo: parent });

    expect(reply.status).toBe(201);
    const entries = reply.body.deliberation;
    expect(entries[1].replyTo).toBe(parent);
    expect(entries[1].liaisonAnswer).toBe(true);
  });

  it('a reply to nothing is refused', async () => {
    const id = await openMatter();
    const res = await request(app)
      .post(`/api/matters/${id}/deliberation`)
      .set('Authorization', as('member-a'))
      .send({ body: 'Answering something that is not here.', replyTo: 'd-does-not-exist' });
    expect(res.status).toBe(409);
  });
});

// ── withdrawal ────────────────────────────────────────────────────────────

describe('withdrawal', () => {
  it('a live matter can be taken back', async () => {
    const id = await openMatter();
    const res = await request(app).post(`/api/matters/${id}/withdraw`).set('Authorization', as('member-a'));
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('withdrawn');
  });

  it('and cannot then be carried on with', async () => {
    const id = await openMatter();
    await request(app).post(`/api/matters/${id}/withdraw`).set('Authorization', as('member-a'));
    const res = await say(id, 'member-a');
    expect(res.status).toBe(409);
  });
});

describe('a matter that is not there', () => {
  it('is a 404, not a new one', async () => {
    const res = await request(app).post('/api/matters/ghost/withdraw').set('Authorization', as('member-a'));
    expect(res.status).toBe(404);
  });
});

// ── what needs looking at ─────────────────────────────────────────────────

describe('attention is personal and derived', () => {
  it('asks the member who has not spoken, and stops once they have', async () => {
    const id = await openMatter();

    const before = await request(app).get('/api/attention').set('Authorization', as('member-b'));
    expect(before.status).toBe(200);
    expect(before.body.scholarId).toBe('member-b');
    expect(before.body.items.some((i: { matterId: string }) => i.matterId === id)).toBe(true);

    await say(id, 'member-b');

    const after = await request(app).get('/api/attention').set('Authorization', as('member-b'));
    expect(after.body.items.some((i: { matterId: string }) => i.matterId === id)).toBe(false);
  });

  it('two members are told different things about the same matter', async () => {
    const id = await openMatter();
    await say(id, 'member-a');
    await request(app).post(`/api/matters/${id}/voting`).set('Authorization', as('member-a'));
    await vote(id, 'member-a');

    const voted = await request(app).get('/api/attention').set('Authorization', as('member-a'));
    const notYet = await request(app).get('/api/attention').set('Authorization', as('member-b'));

    expect(voted.body.items.find((i: { matterId: string }) => i.matterId === id)).toBeUndefined();
    expect(notYet.body.items.find((i: { matterId: string }) => i.matterId === id)?.kind).toBe(
      'awaiting_your_vote',
    );
  });

  it('a timelock carries its deadline, so it cannot pass unnoticed', async () => {
    const id = await openMatter();
    await say(id, 'member-a');
    await request(app).post(`/api/matters/${id}/voting`).set('Authorization', as('member-a'));
    for (const m of ['member-a', 'member-b', 'member-c']) await vote(id, m);
    await request(app).post(`/api/matters/${id}/close`).set('Authorization', as('member-a'));

    const res = await request(app).get('/api/attention').set('Authorization', as('member-d'));
    const found = res.body.items.find((i: { matterId: string }) => i.matterId === id);
    expect(found.kind).toBe('objection_window_open');
    expect(found.deadline).not.toBeNull();
    expect(found.hoursRemaining).toBeGreaterThan(47);
  });

  it('an observer is asked for nothing', async () => {
    await openMatter();
    const res = await request(app).get('/api/attention').set('Authorization', as('watcher'));
    expect(res.status).toBe(200);
    // Not on the board, so nothing is outstanding for them.
    expect(res.body.items).toEqual([]);
  });
});

describe('the pace of the board, over HTTP', () => {
  const pace = async (who = 'member-a') =>
    (await request(app).get('/api/pace').set('Authorization', as(who)).expect(200)).body;

  it('answers for the seeded board and dates its answer', async () => {
    const body = await pace();
    expect(body.boards).toHaveLength(1);
    expect(body.boards[0].boardId).toBe('demo-board');
    expect(body.asOf).toBeTruthy();
  });

  it('counts a newly opened matter as one more thing waiting', async () => {
    const before = await pace();
    const id = await openMatter();
    const after = await pace();

    expect(after.boards[0].open).toBe(before.boards[0].open + 1);
    expect(after.waiting.some((w: { matterId: string }) => w.matterId === id)).toBe(true);

    const mine = after.waiting.find((w: { matterId: string }) => w.matterId === id);
    expect(mine.phase).toBe('deliberation');
    // Nothing recorded when the institution first asked, so the figure is
    // honest about covering only the part this system witnessed.
    expect(mine.partial).toBe(true);
  });

  it('stops counting a matter once the board is done with it', async () => {
    const id = await openMatter();
    const openWhileLive = (await pace()).boards[0].open;

    await request(app).post(`/api/matters/${id}/withdraw`).set('Authorization', as('member-a')).expect(200);

    const after = await pace();
    expect(after.boards[0].open).toBe(openWhileLive - 1);
    expect(after.waiting.some((w: { matterId: string }) => w.matterId === id)).toBe(false);
  });

  it('orders what is waiting with the longest first', async () => {
    await openMatter();
    await openMatter();
    const { waiting } = await pace();
    const hours = waiting.map((w: { hours: number }) => w.hours);
    expect([...hours].sort((a: number, b: number) => b - a)).toEqual(hours);
  });

  it('is open to an observer, who could not otherwise report on the board', async () => {
    await pace('watcher');
  });

  it('refuses anonymously, like every other read', async () => {
    await request(app).get('/api/pace').expect(401);
  });

  it('says so when asked about a board that does not exist', async () => {
    const res = await request(app)
      .get('/api/pace?board=no-such-board')
      .set('Authorization', as('member-a'))
      .expect(404);
    expect(res.body.error).toBe('not_found');
  });
});

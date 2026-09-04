import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { MemoryStore } from '../src/store/index.js';
import { hashPassword } from '../src/auth/members.js';
import { structures } from '../src/data/structures.js';

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

  /**
   * A refusal should diagnose the credential in front of it, not recite the
   * rulebook. The earlier message listed all four rules at once, so the
   * sentence a reader's eye landed on first was often not the reason.
   */
  it('says what this credential is, rather than what every other one may do', async () => {
    const refused = async (who: string) => {
      const res = await request(app)
        .post('/api/matters')
        .set('Authorization', as(who))
        .send({ boardId: 'demo-board', title: 'A matter', proposal: 'x', direction: 'permit', origin: 'protocol_change' });
      return res.body.message as string;
    };

    const observer = await refused('watcher');
    expect(observer).toContain('may not open a matter');
    expect(observer).toContain('reads and does not write');
    // Not told about voting, which is not why they were refused.
    expect(observer).not.toContain('belong to signatories');
  });

  it('tells an advisory member the rule that actually applies to them', async () => {
    const id = await openMatter();
    await say(id, 'member-a');
    await request(app).post(`/api/matters/${id}/voting`).set('Authorization', as('member-a'));

    const res = await vote(id, 'advisor-1');
    expect(res.status).toBe(403);
    expect(res.body.message).toContain('may not vote');
    expect(res.body.message).toContain('An advisory member deliberates');
    expect(res.body.message).toContain('belong to signatories');
  });

  it('tells a signatory why an act of the institution is not theirs', async () => {
    // The one case where a signatory is refused: it is not a matter of rank.
    const reported = await request(app)
      .post('/api/incidents')
      .set('Authorization', as('member-a'))
      .send({
        boardId: 'demo-board',
        reference: 'SNC-2026-009',
        title: 'Something the institution reported',
        report: 'An account of what happened.',
      })
      .expect(201);

    const res = await request(app)
      .post(`/api/incidents/${reported.body.id}/directors`)
      .set('Authorization', as('member-a'));

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('must not be able to record them by deciding to');
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

describe('reviews and screening, over HTTP', () => {
  it('reports the seeded rules that nothing will ever raise', async () => {
    const res = await request(app)
      .get('/api/reviews')
      .set('Authorization', as('member-a'))
      .expect(200);

    // The seed predates review intervals, so every rule in force is
    // unscheduled — which the list says rather than reporting all clear.
    expect(res.body.unscheduled).toBeGreaterThan(0);
    expect(res.body.items.every((i: { state: string }) => i.state === 'unscheduled')).toBe(true);
    expect(res.body.items[0].note).toContain('Nothing will bring this back');
  });

  it('says where one rule stands, and 404s for one that is not there', async () => {
    const rules = (await request(app).get('/api/rules').set('Authorization', as('member-a'))).body;
    const id = (Array.isArray(rules) ? rules : rules.rules)[0].id;

    const res = await request(app)
      .get(`/api/rules/${id}/review`)
      .set('Authorization', as('member-a'))
      .expect(200);
    expect(res.body.ruleId).toBe(id);

    await request(app).get('/api/rules/no-such-rule/review').set('Authorization', as('member-a')).expect(404);
  });

  it('computes the three ratios and shows the arithmetic', async () => {
    const res = await request(app)
      .post('/api/screening')
      .set('Authorization', as('member-a'))
      .send({
        figures: {
          asOf: '2026-06-30', source: 'Treasury', currency: 'USD',
          marketCapitalisation: '1000', interestBearingDebt: '200',
          cashAndInterestBearingSecurities: '100',
          totalRevenue: '500', nonPermissibleIncome: '10',
        },
      })
      .expect(200);

    expect(res.body.assessment.ratios).toHaveLength(3);
    expect(res.body.assessment.ratios[0].workings).toContain('200 ÷ 1000');
    expect(res.body.assessment.note).toContain('ruling for the board');
    expect(res.body.crossings).toEqual([]);
  });

  it('names the field it could not read rather than guessing at a figure', async () => {
    const res = await request(app)
      .post('/api/screening')
      .set('Authorization', as('member-a'))
      .send({
        figures: {
          asOf: '2026-06-30', source: 'Treasury', currency: 'USD',
          marketCapitalisation: 'about four billion', interestBearingDebt: '200',
          cashAndInterestBearingSecurities: '100',
          totalRevenue: '500', nonPermissibleIncome: '10',
        },
      })
      .expect(400);

    expect(res.body.error).toBe('bad_figure');
    expect(res.body.field).toBe('marketCapitalisation');
  });

  it('asks the drift question when a ratio has changed side', async () => {
    const send = (debt: string) =>
      request(app).post('/api/screening').set('Authorization', as('member-a')).send({
        figures: {
          asOf: '2026-06-30', source: 'Treasury', currency: 'USD',
          marketCapitalisation: '1000', interestBearingDebt: debt,
          cashAndInterestBearingSecurities: '100',
          totalRevenue: '500', nonPermissibleIncome: '10',
        },
      });

    const march = (await send('200')).body.assessment;
    const july = await request(app)
      .post('/api/screening')
      .set('Authorization', as('member-a'))
      .send({
        previous: march,
        figures: {
          asOf: '2026-09-30', source: 'Treasury', currency: 'USD',
          marketCapitalisation: '1000', interestBearingDebt: '340',
          cashAndInterestBearingSecurities: '100',
          totalRevenue: '500', nonPermissibleIncome: '10',
        },
      })
      .expect(200);

    expect(july.body.crossings).toHaveLength(1);
    expect(july.body.crossings[0].direction).toBe('into_breach');
    expect(july.body.crossings[0].questionForBoard).toContain('?');
  });

  it('refuses a screening request with no figures at all', async () => {
    const res = await request(app)
      .post('/api/screening')
      .set('Authorization', as('member-a'))
      .send({})
      .expect(400);
    expect(res.body.error).toBe('no_figures');
  });
});

describe('the document, over HTTP', () => {
  it('refuses to produce one for a matter still being decided', async () => {
    const id = await openMatter();
    const res = await request(app)
      .get(`/api/matters/${id}/fatwa`)
      .set('Authorization', as('member-a'))
      .expect(409);
    expect(res.body.error).toBe('wrong_status');
    expect(res.body.message).toContain('will be acted on');
  });

  it('serves a whole printable page once the board has decided', async () => {
    const id = await openMatter();
    await say(id, 'member-a');
    await request(app).post(`/api/matters/${id}/voting`).set('Authorization', as('member-a')).expect(200);
    for (const who of ['member-a', 'member-b', 'member-c']) await vote(id, who).expect(201);
    await request(app).post(`/api/matters/${id}/close`).set('Authorization', as('member-a')).expect(200);

    const res = await request(app)
      .get(`/api/matters/${id}/fatwa`)
      .set('Authorization', as('member-a'))
      .expect(200);

    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text.startsWith('<!doctype html>')).toBe(true);
    expect(res.text).toContain('What this does not decide');
    expect(res.text).toContain('@page');
    expect(res.text).not.toContain('<script');
  });

  it('returns the same document as data for a bank rendering its own template', async () => {
    const id = await openMatter();
    await request(app).post(`/api/matters/${id}/withdraw`).set('Authorization', as('member-a')).expect(200);

    const res = await request(app)
      .get(`/api/matters/${id}/fatwa?format=json`)
      .set('Authorization', as('member-a'))
      .expect(200);

    expect(res.body.kind).toBe('withdrawn');
    expect(res.body.reference).toBe(id);
    expect(Array.isArray(res.body.notDecided)).toBe(true);
  });

  it('is open to an observer, who is who it is for', async () => {
    const id = await openMatter();
    await request(app).post(`/api/matters/${id}/withdraw`).set('Authorization', as('member-a')).expect(200);
    await request(app).get(`/api/matters/${id}/fatwa`).set('Authorization', as('watcher')).expect(200);
  });

  it('404s for a matter that is not there', async () => {
    await request(app).get('/api/matters/no-such/fatwa').set('Authorization', as('member-a')).expect(404);
  });
});

describe('the compliance manual, over HTTP', () => {
  it('describes the seeded rules and names what each is missing', async () => {
    const res = await request(app)
      .get('/api/manual?format=json')
      .set('Authorization', as('watcher'))
      .expect(200);

    expect(res.body.entries.length).toBeGreaterThan(0);

    // The record holds both states, which is the point of the manual. The
    // pool ruling was recorded with its steps, its limits, its sources and a
    // review interval, so it is complete; the rest predate all four and the
    // manual says so rather than reporting all well.
    expect(res.body.incomplete).toBeGreaterThan(0);
    expect(res.body.incomplete).toBeLessThan(res.body.entries.length);

    const incomplete = res.body.entries.filter((e: { gaps: string[] }) => e.gaps.length > 0);
    expect(incomplete[0].gaps.join(' ')).toContain('GN-6');

    const complete = res.body.entries.find((e: { gaps: string[] }) => e.gaps.length === 0);
    expect(complete.implementationSteps.length).toBeGreaterThan(0);
  });

  it('serves a printable page', async () => {
    const res = await request(app).get('/api/manual').set('Authorization', as('member-a')).expect(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('Shariah compliance manual');
    expect(res.text).toContain('Conditions every transaction must meet');
    expect(res.text).not.toContain('<script');
  });

  it('404s for a board that does not exist', async () => {
    await request(app).get('/api/manual?board=nope').set('Authorization', as('member-a')).expect(404);
  });

  it('carries implementation steps into both the manual and the fatwa', async () => {
    // A restriction takes effect the moment the vote closes; a permit would
    // still be in its timelock and so not yet part of the manual.
    const id = await openMatter('member-a', { direction: 'restrict' });
    await request(app)
      .post(`/api/matters/${id}/implementation`)
      .set('Authorization', as('member-a'))
      .send({ steps: ['Confirm the address against the registry.', 'Cap the position at the recorded limit.'] })
      .expect(200);

    await say(id, 'member-a');
    await request(app).post(`/api/matters/${id}/voting`).set('Authorization', as('member-a')).expect(200);
    for (const who of ['member-a', 'member-b']) await vote(id, who).expect(201);
    await request(app).post(`/api/matters/${id}/close`).set('Authorization', as('member-a')).expect(200);

    const fatwa = await request(app).get(`/api/matters/${id}/fatwa`).set('Authorization', as('member-a')).expect(200);
    expect(fatwa.text).toContain('How it is implemented');
    expect(fatwa.text).toContain('Confirm the address against the registry.');

    const manual = await request(app).get('/api/manual?format=json').set('Authorization', as('member-a')).expect(200);
    const entry = manual.body.entries.find((e: { decidedIn: string }) => e.decidedIn === id);
    expect(entry.implementationSteps).toHaveLength(2);
    expect(entry.gaps.join(' ')).not.toContain('No implementation steps');
  });

  it('refuses to change the steps once the vote has opened', async () => {
    const id = await openMatter();
    await say(id, 'member-a');
    await request(app).post(`/api/matters/${id}/voting`).set('Authorization', as('member-a')).expect(200);

    const res = await request(app)
      .post(`/api/matters/${id}/implementation`)
      .set('Authorization', as('member-a'))
      .send({ steps: ['A late addition nobody voted on.'] })
      .expect(409);
    expect(res.body.error).toBe('wrong_status');
  });

  it('refuses an observer setting steps', async () => {
    const id = await openMatter();
    await request(app)
      .post(`/api/matters/${id}/implementation`)
      .set('Authorization', as('watcher'))
      .send({ steps: ['Something.'] })
      .expect(403);
  });
});

describe('the annual report, over HTTP', () => {
  const year = () => new Date().getUTCFullYear();

  it('assembles the year and leaves the opinion null', async () => {
    const res = await request(app)
      .get(`/api/annual?year=${year()}&format=json`)
      .set('Authorization', as('watcher'))
      .expect(200);

    expect(res.body.opinion).toBeNull();
    expect(res.body.opinionMustAddress.length).toBeGreaterThan(3);
    expect(res.body.boardId).toBe('demo-board');
  });

  it('serves a printable draft with a blank where the opinion goes', async () => {
    const res = await request(app).get('/api/annual').set('Authorization', as('member-a')).expect(200);

    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('The board’s opinion goes here.');
    expect(res.text).toContain('What this draft cannot state');
    expect(res.text).not.toContain('<script');
  });

  it('counts a decision taken this year', async () => {
    const id = await openMatter('member-a', { direction: 'restrict' });
    await say(id, 'member-a');
    await request(app).post(`/api/matters/${id}/voting`).set('Authorization', as('member-a')).expect(200);
    for (const who of ['member-a', 'member-b']) await vote(id, who).expect(201);
    await request(app).post(`/api/matters/${id}/close`).set('Authorization', as('member-a')).expect(200);

    const res = await request(app)
      .get(`/api/annual?year=${year()}&format=json`)
      .set('Authorization', as('member-a'))
      .expect(200);

    expect(res.body.activity.approved).toBeGreaterThanOrEqual(1);
    expect(res.body.decisions.some((d: { reference: string }) => d.reference === id)).toBe(true);
  });

  it('reports an empty year without inventing figures', async () => {
    const res = await request(app)
      .get('/api/annual?year=2020&format=json')
      .set('Authorization', as('member-a'))
      .expect(200);

    expect(res.body.activity.decided).toBe(0);
    expect(res.body.pace.medianDays).toBeNull();
    expect(res.body.nonCompliance.count).toBe(0);
  });

  it('always names what it cannot state', async () => {
    const res = await request(app)
      .get('/api/annual?format=json')
      .set('Authorization', as('member-a'))
      .expect(200);

    const gaps = res.body.gaps.join(' ');
    expect(gaps).toContain('meetings');
    // Named while nothing has been noted, and only while.
    expect(gaps).toContain('No zakat calculation was noted');
  });

  it('stops naming zakat once a board has noted one, and carries the figure', async () => {
    await request(app)
      .post('/api/computations')
      .set('Authorization', as('member-a'))
      .send({
        kind: 'zakat',
        boardId: 'demo-board',
        periodFrom: '2026-01-01',
        periodTo: '2026-12-31',
        method: 'net_assets',
        methodStated: 'Zakatable assets less liabilities falling due within the year.',
        currency: 'AED',
        source: 'Audited financial statements',
        figures: { cash: '4000000' },
        headline: 'Due',
        amount: '200000',
        steps: [{ label: 'At 2.5%', working: '2.5% of 8000000', value: '200000 AED' }],
        note: 'Whether the base is the right one is not answered here.',
      })
      .expect(201);

    const res = await request(app)
      .get('/api/annual?year=2026&format=json')
      .set('Authorization', as('member-a'))
      .expect(200);

    expect(res.body.gaps.join(' ')).not.toContain('No zakat calculation was noted');
    expect(res.body.calculations.map((c: { amount: string }) => c.amount)).toEqual(['200000']);
    // And the opinion is still the board's to write.
    expect(res.body.opinion).toBeNull();
  });

  it('refuses a year that is not one, and a board that is not there', async () => {
    await request(app).get('/api/annual?year=soon').set('Authorization', as('member-a')).expect(400);
    await request(app).get('/api/annual?board=nope').set('Authorization', as('member-a')).expect(404);
  });
});

describe('the register, over HTTP', () => {
  it('shows the universe with the never-examined first', async () => {
    const res = await request(app).get('/api/register').set('Authorization', as('watcher')).expect(200);

    expect(res.body.total).toBeGreaterThan(0);
    // The seed links two matters to two assets; the rest have never been put to
    // anybody, which is the ordinary condition of a register.
    expect(res.body.neverExamined).toBeGreaterThan(0);
    expect(res.body.assets[0].status).toBe('never_examined');
  });

  it('derives a status from what the board actually did', async () => {
    const res = await request(app).get('/api/register').set('Authorization', as('member-a')).expect(200);
    const byId = new Map(res.body.assets.map((a: { asset: { id: string } }) => [a.asset.id, a]));

    // matter-2026-07-03 is in deliberation and names the pool.
    expect((byId.get('asset-mixed-pool') as { status: string }).status).toBe('under_consideration');
    // matter-2026-06-19 is a restriction in force and names the token. It
    // becomes 'lapsed' only once the sweep finds its ratification window
    // closed, which has not run against a store this fresh.
    expect((byId.get('asset-restructured-token') as { status: string }).status).toBe('restricted');
  });

  it('reads out one asset with its composition, and never a verdict', async () => {
    const res = await request(app)
      .get('/api/assets/asset-mixed-pool')
      .set('Authorization', as('member-a'))
      .expect(200);

    expect(res.body.asset.name).toContain('Mixed pool');
    expect(res.body.composition.byKind.find((k: { kind: string }) => k.kind === 'tangible').percent).toBe('50.00');
    expect(JSON.stringify(res.body).toLowerCase()).not.toContain('permissible');
  });

  it('says so for an asset with nothing to read out', async () => {
    const res = await request(app)
      .get('/api/assets/asset-cash-backed')
      .set('Authorization', as('member-a'))
      .expect(200);
    expect(res.body.composition).toBeNull();
    expect(res.body.status).toBe('never_examined');
  });

  it('404s for an asset that is not there', async () => {
    await request(app).get('/api/assets/no-such-asset').set('Authorization', as('member-a')).expect(404);
  });

  it('lets a member add one, and records that a person did', async () => {
    const res = await request(app)
      .post('/api/assets')
      .set('Authorization', as('member-a'))
      .send({ kind: 'token', name: 'A token nobody entered', identifiers: [{ scheme: 'ticker', value: 'NEW' }] })
      .expect(201);

    expect(res.body.source).toBe('member');
    expect(res.body.addedBy).toBe('member-a');
    expect(res.body.retiredAt).toBeNull();
  });

  it('refuses an observer adding to the register', async () => {
    await request(app)
      .post('/api/assets')
      .set('Authorization', as('watcher'))
      .send({ kind: 'token', name: 'Something', identifiers: [{ scheme: 'ticker', value: 'X' }] })
      .expect(403);
  });

  it('refuses an asset with no identifier at all', async () => {
    await request(app)
      .post('/api/assets')
      .set('Authorization', as('member-a'))
      .send({ kind: 'token', name: 'Nameless', identifiers: [] })
      .expect(400);
  });

  it('retires rather than deletes, and keeps the reason', async () => {
    const res = await request(app)
      .post('/api/assets/asset-leveraged-index/retire')
      .set('Authorization', as('member-a'))
      .send({ reason: 'Delisted by the issuer on 1 September.' })
      .expect(200);

    expect(res.body.retiredAt).toBeTruthy();
    expect(res.body.retiredReason).toContain('Delisted');

    // Still in the register, under its own state.
    const reg = await request(app).get('/api/register').set('Authorization', as('member-a')).expect(200);
    const found = reg.body.assets.find((a: { asset: { id: string } }) => a.asset.id === 'asset-leveraged-index');
    expect(found.status).toBe('retired');
  });

  it('needs a reason to retire one', async () => {
    await request(app)
      .post('/api/assets/asset-sukuk-ijara/retire')
      .set('Authorization', as('member-a'))
      .send({ reason: 'no' })
      .expect(400);
  });
});

describe('judging is one click', () => {
  it('opens a matter that already names the asset, and the register sees it', async () => {
    const res = await request(app)
      .post('/api/matters')
      .set('Authorization', as('member-a'))
      .send({
        boardId: 'demo-board',
        title: 'Treatment of the cash-backed settlement token',
        proposal: 'The board is asked to rule on this holding.',
        direction: 'permit',
        origin: 'institution_request',
        assetIds: ['asset-cash-backed'],
      })
      .expect(201);

    expect(res.body.assetIds).toEqual(['asset-cash-backed']);

    // The asset moves out of never-examined without anything else being done.
    const reg = await request(app).get('/api/register').set('Authorization', as('member-a')).expect(200);
    const found = reg.body.assets.find(
      (a: { asset: { id: string } }) => a.asset.id === 'asset-cash-backed',
    );
    expect(found.status).toBe('under_consideration');
    expect(found.openMatters).toEqual([res.body.id]);
  });

  it('accepts a matter about nothing in the register, which is a real thing a board does', async () => {
    const res = await request(app)
      .post('/api/matters')
      .set('Authorization', as('member-a'))
      .send({
        boardId: 'demo-board',
        title: 'Whether the board may sit with fewer than three members',
        proposal: 'A question about the process rather than about a holding.',
        direction: 'permit',
        origin: 'protocol_change',
      })
      .expect(201);

    expect(res.body.assetIds).toEqual([]);
  });

  it('carries the asset into the document once the board has decided', async () => {
    const id = await openMatter('member-a', {
      direction: 'restrict',
      assetIds: ['asset-staking-wrapper'],
    });
    await say(id, 'member-a');
    await request(app).post(`/api/matters/${id}/voting`).set('Authorization', as('member-a')).expect(200);
    for (const who of ['member-a', 'member-b']) await vote(id, who).expect(201);
    await request(app).post(`/api/matters/${id}/close`).set('Authorization', as('member-a')).expect(200);

    const reg = await request(app).get('/api/register').set('Authorization', as('member-a')).expect(200);
    const found = reg.body.assets.find(
      (a: { asset: { id: string } }) => a.asset.id === 'asset-staking-wrapper',
    );
    expect(found.status).toBe('restricted');
    expect(found.governedBy).toBe(id);
  });
});

describe('the structures, over HTTP', () => {
  it('offers the library as a draft rather than as an authority', async () => {
    const res = await request(app).get('/api/structures').set('Authorization', as('watcher')).expect(200);

    // Not a frozen list: the library grows, and a test pinning its exact
    // contents would fail on every addition while checking nothing. What the
    // route owes a caller is the whole library and the sentence about it.
    const ids = res.body.structures.map((s: { id: string }) => s.id);
    expect(ids).toEqual(structures.map((s) => s.id));
    expect(ids).toContain('murabaha');
    expect(ids).toContain('sukuk');
    expect(res.body.note).toContain('nothing here is binding');
  });

  it('sends every condition with its reason and its source, not only the headings', async () => {
    const res = await request(app).get('/api/structures').set('Authorization', as('watcher')).expect(200);

    for (const s of res.body.structures) {
      expect(s.conditions.length).toBeGreaterThan(0);
      for (const c of s.conditions) {
        expect(c.requirement.length).toBeGreaterThan(10);
        expect(c.why.length).toBeGreaterThan(40);
        expect(c.authority.length).toBeGreaterThan(3);
      }
    }
  });

  it('walks a product approval through its conditions', async () => {
    const id = await openMatter('member-a', { direction: 'restrict' });

    await request(app)
      .put(`/api/matters/${id}/structure`)
      .set('Authorization', as('member-a'))
      .send({ structureId: 'murabaha' })
      .expect(200);

    const before = await request(app)
      .get(`/api/matters/${id}/checklist`)
      .set('Authorization', as('member-a'))
      .expect(200);
    expect(before.body.total).toBe(6);
    expect(before.body.answered).toBe(0);

    await request(app)
      .post(`/api/matters/${id}/findings`)
      .set('Authorization', as('member-a'))
      .send({
        conditionId: 'ownership-before-sale',
        holds: 'met',
        reason: 'The sale file shows the bank on title before the onward sale to the client.',
      })
      .expect(201);

    const after = await request(app)
      .get(`/api/matters/${id}/checklist`)
      .set('Authorization', as('member-a'))
      .expect(200);
    expect(after.body.answered).toBe(1);
    expect(after.body.conditions[0].finding.holds).toBe('met');
  });

  it('refuses a finding with no reasoning behind it', async () => {
    const id = await openMatter();
    await request(app).put(`/api/matters/${id}/structure`).set('Authorization', as('member-a')).send({ structureId: 'mudaraba' }).expect(200);

    const res = await request(app)
      .post(`/api/matters/${id}/findings`)
      .set('Authorization', as('member-a'))
      .send({ conditionId: 'no-guarantee', holds: 'met', reason: 'fine' })
      .expect(400);
    expect(res.body.error).toBe('no_reason_given');
  });

  it('lets an advisory member record one, and refuses an observer', async () => {
    const id = await openMatter();
    await request(app).put(`/api/matters/${id}/structure`).set('Authorization', as('member-a')).send({ structureId: 'mudaraba' }).expect(200);

    await request(app)
      .post(`/api/matters/${id}/findings`)
      .set('Authorization', as('advisor-1'))
      .send({
        conditionId: 'no-guarantee',
        holds: 'not_met',
        reason: 'The liquidity undertaking from the affiliate is a guarantee in substance.',
      })
      .expect(201);

    await request(app)
      .post(`/api/matters/${id}/findings`)
      .set('Authorization', as('watcher'))
      .send({ conditionId: 'no-guarantee', holds: 'met', reason: 'A reason of sufficient length here.' })
      .expect(403);
  });

  it('says so when a matter is judged against nothing', async () => {
    const id = await openMatter();
    const res = await request(app)
      .get(`/api/matters/${id}/checklist`)
      .set('Authorization', as('member-a'))
      .expect(409);
    expect(res.body.message).toContain('not being judged against a contract shape');
  });

  it('refuses a shape that is not in the library', async () => {
    const id = await openMatter();
    await request(app)
      .put(`/api/matters/${id}/structure`)
      .set('Authorization', as('member-a'))
      .send({ structureId: 'nonesuch' })
      .expect(409);
  });
});

describe('purification from a holding, over HTTP', () => {
  const figures = {
    periodFrom: '2026-01-01',
    periodTo: '2026-12-31',
    currency: 'USD',
    source: 'Issuer annual report, audited',
    basis: 'Income only, gross',
    unitsHeld: '10000',
    nonPermissibleIncome: '3200000',
    totalIncome: '100000000',
    incomeReceived: '25000',
  };

  it('applies the method the board approved and shows the sum', async () => {
    const res = await request(app)
      .post('/api/purification')
      .set('Authorization', as('member-a'))
      .send({ ...figures, method: 'per_dividend' })
      .expect(200);

    expect(res.body.amount).toBe('800');
    expect(res.body.steps[0].working).toBe('3200000 ÷ 100000000');
    expect(res.body.note).toContain('the board’s to decide');
  });

  it('refuses to pick a method, and names the three', async () => {
    const res = await request(app)
      .post('/api/purification')
      .set('Authorization', as('member-a'))
      .send(figures)
      .expect(400);

    expect(res.body.error).toBe('no_method');
    expect(res.body.methods).toEqual(['per_share', 'per_dividend', 'per_unit']);
    expect(res.body.message).toContain('choosing among');
  });

  it('refuses a missing figure rather than purifying nothing', async () => {
    const res = await request(app)
      .post('/api/purification')
      .set('Authorization', as('member-a'))
      .send({ ...figures, method: 'per_unit' })
      .expect(400);

    expect(res.body.message).toContain('discharge an obligation nobody computed');
  });

  it('refuses anonymously, like every other route', async () => {
    await request(app).post('/api/purification').send({}).expect(401);
  });

  // Before this was answered in one place, a figure a bank's spreadsheet had
  // typed as text came back a 500 saying the change was not made — a fault
  // that did not happen, about a change that was not being made.
  it("answers a figure that is not a figure as the caller’s mistake", async () => {
    const res = await request(app)
      .post('/api/purification')
      .set('Authorization', as('member-a'))
      .send({ ...figures, method: 'per_dividend', unitsHeld: 'ten thousand' })
      .expect(400);

    expect(res.body.error).toBe('bad_figure');
    expect(res.body.field).toBe('unitsHeld');
  });
});

describe('profit distribution, over HTTP', () => {
  const figures = {
    periodFrom: '2026-01-01',
    periodTo: '2026-03-31',
    currency: 'AED',
    source: 'Treasury, unaudited management accounts',
    grossProfit: '1000000',
    mudaribShareBps: 3000,
    perDeductionBps: 500,
    perBalance: '0',
    perCap: '10000000',
    irrDeductionBps: 200,
    irrBalance: '0',
    irrCap: '10000000',
    depositorFunds: '100000000',
  };

  const post = (body: Record<string, unknown>) =>
    request(app).post('/api/distribution').set('Authorization', as('member-a')).send(body);

  it('takes PER before the split and IRR after it, and shows the order', async () => {
    const res = await post(figures).expect(200);

    expect(res.body.distributableProfit).toBe('950000');
    expect(res.body.mudaribShare).toBe('285000');
    expect(res.body.depositorsShare).toBe('665000');
    expect(res.body.paidToDepositors).toBe('651700');
    expect(res.body.method).toContain('before the split');
    expect(res.body.method).toContain('after the split');
  });

  it('states what smoothing did to the payout rather than hiding it in a rate', async () => {
    const res = await post(figures).expect(200);

    expect(res.body.smoothing.direction).toBe('lowered');
    expect(res.body.smoothing.withoutSmoothing).toBe('700000');
    expect(res.body.smoothing.paid).toBe('651700');
  });

  it('refuses without a source, because the annual report rests on this', async () => {
    const res = await post({ ...figures, source: '' }).expect(400);

    expect(res.body.error).toBe('no_figures');
    expect(res.body.missing).toEqual(['source']);
    expect(res.body.message).toContain('somebody typed');
  });

  it('has no default for the approved ratio, because a default is a decision', async () => {
    const res = await post({ ...figures, mudaribShareBps: undefined }).expect(400);

    expect(res.body.error).toBe('no_ratio');
    expect(res.body.message).toContain('nothing here has a default');
  });

  it('answers a figure that is not a figure as the caller’s mistake', async () => {
    const res = await post({ ...figures, grossProfit: 'a million or so' }).expect(400);
    expect(res.body.error).toBe('bad_figure');
  });

  it('refuses anonymously, like every other route', async () => {
    await request(app).post('/api/distribution').send({}).expect(401);
  });
});

describe('zakat, over HTTP', () => {
  const figures = {
    year: 'lunar',
    borneBy: 'institution',
    hawlEndsOn: '2026-12-31',
    currency: 'AED',
    source: 'Audited financial statements',
    cash: '4000000',
    receivables: '2500000',
    tradeGoods: '1500000',
    zakatableInvestments: '2000000',
    shortTermLiabilities: '2000000',
  };

  const post = (body: Record<string, unknown>) =>
    request(app).post('/api/zakat').set('Authorization', as('member-a')).send(body);

  it('applies the base and the rate the board approved, and shows every sum', async () => {
    const res = await post({ ...figures, method: 'net_assets' }).expect(200);

    expect(res.body.base).toBe('8000000');
    expect(res.body.due).toBe('200000');
    expect(res.body.rateStated).toBe('2.5%');
    expect(res.body.steps.map((s: { label: string }) => s.label)).toContain('Zakatable assets');
  });

  it('holds the solar rate exactly rather than rounding it into basis points', async () => {
    const res = await post({ ...figures, method: 'net_assets', year: 'solar' }).expect(200);
    // 258 basis points would give 206 400. The rate is 2.577%, not 2.58%.
    expect(res.body.due).toBe('206160');
  });

  it('refuses to pick the base, and names both', async () => {
    const res = await post(figures).expect(400);

    expect(res.body.error).toBe('no_method');
    expect(res.body.methods).toEqual(['net_assets', 'net_invested_funds']);
    expect(res.body.message).toContain('do not have to agree');
  });

  it('refuses to guess which year the institution keeps', async () => {
    const res = await post({ ...figures, method: 'net_assets', year: undefined }).expect(400);

    expect(res.body.error).toBe('no_year');
    expect(res.body.years).toEqual(['lunar', 'solar']);
  });

  it('refuses a figure without saying whether anyone owes it', async () => {
    const res = await post({ ...figures, method: 'net_assets', borneBy: undefined }).expect(400);

    expect(res.body.error).toBe('no_bearer');
    expect(res.body.message).toContain('does not say whether anyone owes it');
  });

  it('says plainly that computing it discharges nothing for the shareholders', async () => {
    const res = await post({ ...figures, method: 'net_assets', borneBy: 'shareholders' }).expect(200);
    expect(res.body.borneByStated).toContain('discharges nothing');
  });

  it('refuses a missing figure rather than treating the gap as a zero', async () => {
    const res = await post({ ...figures, method: 'net_assets', cash: undefined }).expect(400);
    expect(res.body.message).toContain('understates an obligation nobody checked');
  });

  it("answers a figure that is not a figure as the caller’s mistake", async () => {
    const res = await post({ ...figures, method: 'net_assets', cash: 'about four million' }).expect(400);

    expect(res.body.error).toBe('bad_figure');
    expect(res.body.field).toBe('cash');
  });

  it('is nothing due rather than a negative obligation', async () => {
    const res = await post({
      ...figures,
      method: 'net_assets',
      shortTermLiabilities: '15000000',
    }).expect(200);

    expect(res.body.due).toBe('0');
    expect(res.body.baseIsNegative).toBe(true);
  });

  it('refuses anonymously, like every other route', async () => {
    await request(app).post('/api/zakat').send({}).expect(401);
  });
});

describe('drift, over HTTP', () => {
  it('finds the pool that has fallen below the threshold its own ruling set', async () => {
    const res = await request(app).get('/api/drift').set('Authorization', as('watcher')).expect(200);

    const found = res.body.drifting.find((d: { assetId: string }) => d.assetId === 'asset-mixed-pool');
    expect(found).toBeTruthy();
    expect(found.observed.percent).toBe('50.00');
    expect(found.term.value).toBe('5100');
    expect(found.matterId).toBe('matter-2026-04-02');
  });

  it('asks a question and states both figures, rather than concluding', async () => {
    const res = await request(app).get('/api/drift').set('Authorization', as('member-a')).expect(200);
    const q = res.body.drifting[0].questionForBoard;

    expect(q).toContain('50.00%');
    expect(q).toContain('51.00%');
    expect(q).toContain('Does the standing ruling still hold?');
    expect(q.toLowerCase()).not.toContain('impermissible');
  });

  it('changes nothing: the holding keeps the status the board gave it', async () => {
    await request(app).get('/api/drift').set('Authorization', as('member-a')).expect(200);

    const reg = await request(app).get('/api/register').set('Authorization', as('member-a')).expect(200);
    const pool = reg.body.assets.find((a: { asset: { id: string } }) => a.asset.id === 'asset-mixed-pool');
    // A ruling that expired because a number moved would be compliance lapsing
    // by arithmetic, which is worse than the problem.
    expect(pool.status).toBe('under_consideration');
  });

  it('reports a term nothing is checking as its own finding', async () => {
    const res = await request(app).get('/api/drift').set('Authorization', as('member-a')).expect(200);
    // onBreach says nothing about a composition, and is reported rather than
    // silently ignored.
    const found = res.body.unwatched.find((u: { key: string }) => u.key === 'onBreach');
    expect(found).toBeTruthy();
    expect(found.reason).toContain('nothing checks it');
  });

  it('refuses anonymously, like every other read', async () => {
    await request(app).get('/api/drift').expect(401);
  });
});

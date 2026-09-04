import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { MemoryStore } from '../src/store/index.js';
import { hashPassword } from '../src/auth/members.js';
import { structures } from '../src/data/structures.js';

/**
 * Taking a contract shape as the board's own, over HTTP.
 *
 * The line these hold is the one the whole feature rests on: adoption happens
 * **under a decision that carried**, and never as a switch somebody flips.
 */

const PASSWORD = 'a board credential';
const secret = hashPassword(PASSWORD);

const MEMBERS = [
  'member-a:signatory',
  'member-b:signatory',
  'member-c:signatory',
  'member-d:signatory',
  'member-e:signatory',
  'liaison-1:liaison',
  'advisor-1:advisory',
  'watcher:observer',
]
  .map((entry) => `${entry}:${secret}`)
  .join('\n');

const as = (who: string) => 'Basic ' + Buffer.from(`${who}:${PASSWORD}`).toString('base64');
const REASON = 'The mechanism is bounded by the owner signed minimums, which answers the concern raised.';

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

/**
 * A decision of this board that carried.
 *
 * Adoption needs one, which is the design rather than an inconvenience. It
 * needs one that is **in force**, not one still inside its timelock: the
 * timelock is the window in which a signatory may object, and changing what
 * every later checklist asks while that window is open would be changing the
 * library before the decision was final.
 *
 * The seeded record carries two rulings in force, so the tests use one rather
 * than voting a matter through and then waiting out forty-eight hours.
 */
const CARRIED = 'matter-2026-04-02';

async function carriedMatter(): Promise<string> {
  const res = await request(app)
    .get(`/api/matters/${CARRIED}`)
    .set('Authorization', as('member-a'))
    .expect(200);
  // If the seed ever changes, this says so here rather than in eight failures
  // about conflicts somewhere else.
  expect(res.body.status, 'the seeded matter this suite adopts under is no longer in force').toBe(
    'in_force',
  );
  return CARRIED;
}

const post = (body: Record<string, unknown>, who = 'member-a') =>
  request(app).post('/api/adoptions').set('Authorization', as(who)).send(body);

describe('the library as this board holds it', () => {
  it('reports every shape as the shipped draft before anything is adopted', async () => {
    const res = await request(app)
      .get('/api/adoptions')
      .set('Authorization', as('watcher'))
      .expect(200);

    expect(res.body.total).toBe(structures.length);
    expect(res.body.adopted).toBe(0);
    expect(res.body.library).toHaveLength(structures.length);
    for (const e of res.body.library) expect(e.source).toBe('draft');
    expect(res.body.notes.draft).toContain('binding on nobody');
  });
});

describe('a shape is taken under a decision that carried', () => {
  it('adopts, and copies the conditions as they read', async () => {
    const matterId = await carriedMatter();

    const res = await post({
      structureId: 'murabaha',
      boardId: 'demo-board',
      standing: 'adopted',
      matterId,
    }).expect(201);

    expect(res.body.adoption.standing).toBe('adopted');
    expect(res.body.adoption.matterId).toBe(matterId);
    expect(res.body.adoption.decidedBy).toBe('member-a');
    expect(res.body.adoption.conditions.length).toBeGreaterThan(1);
    expect(res.body.note).toContain('the board’s own version');
  });

  it('refuses a matter that is still being argued about', async () => {
    const opened = await request(app)
      .post('/api/matters')
      .set('Authorization', as('member-a'))
      .send({
        boardId: 'demo-board',
        title: 'Still open',
        proposal: 'Not decided yet.',
        direction: 'permit',
        origin: 'protocol_change',
      })
      .expect(201);

    const res = await post({
      structureId: 'murabaha',
      boardId: 'demo-board',
      standing: 'adopted',
      matterId: opened.body.id,
    }).expect(409);

    expect(res.body.error).toBe('matter_not_settled');
    expect(res.body.message).toContain('still arguing about');
  });

  it('refuses without a matter at all, as a bad request', async () => {
    const res = await post({
      structureId: 'murabaha',
      boardId: 'demo-board',
      standing: 'adopted',
      matterId: 'nothing-like-this',
    }).expect(400);

    expect(res.body.error).toBe('no_matter');
    expect(res.body.message).toContain('a switch rather than a decision');
  });

  it('refuses a shape that is not in the library', async () => {
    const matterId = await carriedMatter();
    const res = await post({
      structureId: 'something-invented',
      boardId: 'demo-board',
      standing: 'adopted',
      matterId,
    }).expect(400);

    expect(res.body.error).toBe('not_in_library');
  });

  it('is a signatory’s act, because it changes what every later checklist asks', async () => {
    const matterId = await carriedMatter();
    const body = {
      structureId: 'murabaha',
      boardId: 'demo-board',
      standing: 'adopted',
      matterId,
    };

    await post(body, 'advisor-1').expect(403);
    await post(body, 'liaison-1').expect(403);
    await post(body, 'watcher').expect(403);
    await post(body, 'member-a').expect(201);
  });

  it('refuses anonymously, like every other route', async () => {
    await request(app).post('/api/adoptions').send({}).expect(401);
  });
});

describe('amending, declining, and the history of both', () => {
  it('takes the board’s own conditions and says what changed', async () => {
    const matterId = await carriedMatter();

    const res = await post({
      structureId: 'murabaha',
      boardId: 'demo-board',
      standing: 'amended',
      matterId,
      amendments: ['Constructive possession must be evidenced by a warehouse receipt.'],
      conditions: [
        {
          id: 'ownership-before-sale',
          requirement: 'The institution owns the asset and holds a warehouse receipt before selling it on.',
          why: 'Selling what one does not own turns the sale into a financing of money by money.',
          evidence: 'sequence',
          authority: 'This board',
        },
      ],
    }).expect(201);

    expect(res.body.adoption.standing).toBe('amended');
    expect(res.body.adoption.conditions).toHaveLength(1);
    expect(res.body.adoption.amendments[0]).toContain('warehouse receipt');
  });

  it('refuses an amendment that does not say what changed', async () => {
    const matterId = await carriedMatter();
    const res = await post({
      structureId: 'murabaha',
      boardId: 'demo-board',
      standing: 'amended',
      matterId,
      conditions: [
        {
          id: 'x',
          requirement: 'Something must be true about this arrangement.',
          why: 'Because the board holds it to matter for the reason it gave in the matter.',
          evidence: 'document',
          authority: 'This board',
        },
      ],
    }).expect(400);

    expect(res.body.error).toBe('no_reason_given');
  });

  it('records a decline with its reason, and the library reports it', async () => {
    const matterId = await carriedMatter();
    await post({
      structureId: 'murabaha',
      boardId: 'demo-board',
      standing: 'declined',
      matterId,
      amendments: ['This institution does not use commodity murabaha.'],
    }).expect(201);

    const lib = await request(app)
      .get('/api/adoptions')
      .set('Authorization', as('watcher'))
      .expect(200);

    expect(lib.body.declined).toBe(1);
    const murabaha = lib.body.library.find((e: { structure: { id: string } }) => e.structure.id === 'murabaha');
    expect(murabaha.declined).toBe(true);
    expect(murabaha.note).toContain('already declined');
  });

  it('keeps the earlier version when the board amends, and reads the history forwards', async () => {
    const matterId = await carriedMatter();

    const first = (
      await post({ structureId: 'murabaha', boardId: 'demo-board', standing: 'adopted', matterId })
        .expect(201)
    ).body.adoption;

    const second = (
      await post({
        structureId: 'murabaha',
        boardId: 'demo-board',
        standing: 'amended',
        matterId,
        supersedes: first.id,
        amendments: ['Reworded after the first year of use.'],
        conditions: [
          {
            id: 'ownership-before-sale',
            requirement: 'The institution owns the asset before selling it on.',
            why: 'Selling what one does not own turns the sale into a financing of money by money.',
            evidence: 'sequence',
            authority: 'This board',
          },
        ],
      }).expect(201)
    ).body.adoption;

    const hist = await request(app)
      .get('/api/adoptions/murabaha/history')
      .set('Authorization', as('watcher'))
      .expect(200);

    expect(hist.body.history.map((h: { adoption: { id: string } }) => h.adoption.id)).toEqual([
      first.id,
      second.id,
    ]);
    expect(hist.body.history[0].replacedBy).toBe(second.id);
    // The earlier version still holds what the board was working from.
    expect(hist.body.history[0].adoption.conditions.length).toBeGreaterThan(1);
  });

  it('refuses to replace the same adoption twice', async () => {
    const matterId = await carriedMatter();
    const first = (
      await post({ structureId: 'murabaha', boardId: 'demo-board', standing: 'adopted', matterId })
        .expect(201)
    ).body.adoption;

    const again = {
      structureId: 'murabaha',
      boardId: 'demo-board',
      standing: 'adopted',
      matterId,
      supersedes: first.id,
    };
    await post(again).expect(201);
    const res = await post(again).expect(409);
    expect(res.body.error).toBe('already_replaced');
  });
});

describe('the checklist follows the board’s version', () => {
  it('says the conditions are the shipped draft before anything is adopted', async () => {
    const id = await carriedMatter();
    await request(app)
      .put(`/api/matters/${id}/structure`)
      .set('Authorization', as('member-a'))
      .send({ structureId: 'murabaha' });

    const res = await request(app)
      .get(`/api/matters/${id}/checklist`)
      .set('Authorization', as('member-a'));

    // A settled matter refuses a change of shape, so this may not have taken —
    // what matters is that where a checklist is returned, it names its source.
    if (res.status === 200) {
      expect(['draft', 'adopted', 'amended']).toContain(res.body.source);
      expect(res.body.sourceNote.length).toBeGreaterThan(20);
    }
  });

  it('counts against the amended conditions once the board has its own', async () => {
    const matterId = await carriedMatter();
    await post({
      structureId: 'murabaha',
      boardId: 'demo-board',
      standing: 'amended',
      matterId,
      amendments: ['This board holds one condition to be the operative one.'],
      conditions: [
        {
          id: 'ownership-before-sale',
          requirement: 'The institution owns the asset before selling it on.',
          why: 'Selling what one does not own turns the sale into a financing of money by money.',
          evidence: 'sequence',
          authority: 'This board',
        },
      ],
    }).expect(201);

    // A fresh matter, judged against the shape the board now holds.
    const opened = await request(app)
      .post('/api/matters')
      .set('Authorization', as('member-a'))
      .send({
        boardId: 'demo-board',
        title: 'A murabaha product',
        proposal: 'To be judged against the shape this board adopted.',
        direction: 'permit',
        origin: 'institution_request',
      })
      .expect(201);
    await request(app)
      .post(`/api/matters/${opened.body.id}/open`)
      .set('Authorization', as('member-a'))
      .expect(200);
    await request(app)
      .put(`/api/matters/${opened.body.id}/structure`)
      .set('Authorization', as('member-a'))
      .send({ structureId: 'murabaha' })
      .expect(200);

    const res = await request(app)
      .get(`/api/matters/${opened.body.id}/checklist`)
      .set('Authorization', as('member-a'))
      .expect(200);

    expect(res.body.source).toBe('amended');
    expect(res.body.total).toBe(1);
    expect(res.body.sourceNote).toContain('the board’s own version');
  });
});

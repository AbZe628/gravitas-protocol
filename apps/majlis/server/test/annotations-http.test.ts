import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { MemoryStore } from '../src/store/index.js';
import { hashPassword } from '../src/auth/members.js';
import type { Board, Matter } from '../src/types.js';

/**
 * Notes in the margin, over HTTP.
 *
 * The line these hold: **the server finds the words, the client never sends
 * them.** A caller that supplied the document a passage was found in could
 * attach a note to words that are not in the papers at all, and it would then
 * be shown beside a passage the board never read. So the request names what is
 * being read and the route fetches those words from the record.
 *
 * And who may write: whoever may deliberate. An observer reads the margins and
 * does not write in them, and the institution's desk does not reach them at
 * all — a note is one member's reading, before the board has agreed anything.
 */

const PASSWORD = 'a board credential';
const secret = hashPassword(PASSWORD);

const MEMBERS = ['member-a:signatory', 'member-b:signatory', 'watcher:observer']
  .map((entry) => `${entry}:${secret}`)
  .join('\n');

const as = (who: string) => 'Basic ' + Buffer.from(`${who}:${PASSWORD}`).toString('base64');

const PROPOSAL = [
  'That the desk take no new position in an index instrument whose exposure is',
  'obtained through borrowing inside the index, where that borrowing exceeds the',
  'limit below.',
].join('\n');

const board: Board = {
  id: 'demo-board',
  name: 'Board',
  quorumPermit: 2,
  quorumRestrict: 2,
  totalSignatories: 2,
  ratificationWindowHours: 168,
  members: [
    { id: 'member-a', name: 'Board Member A', title: '', board: 'demo-board', signatory: true },
    { id: 'member-b', name: 'Board Member B', title: '', board: 'demo-board', signatory: true },
  ],
};

const matter: Matter = {
  id: 'matter-1',
  boardId: 'demo-board',
  title: 'Suspension of leveraged index instruments',
  origin: 'protocol_change',
  direction: 'restrict',
  status: 'deliberation',
  openedAt: '2026-08-11T00:00:00.000Z',
  proposal: PROPOSAL,
  notDecided: [],
  mechanism: '',
  interactsWith: [],
  proposedRule: {
    id: 'rule-1',
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
};

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
  app = createApp(new MemoryStore({ boards: [board], matters: [matter], rules: [], briefings: [] }));
});

afterEach(() => {
  process.env.MAJLIS_MEMBERS = saved.members;
  process.env.BASIC_AUTH_USER = saved.user;
  process.env.BASIC_AUTH_PASSWORD = saved.pass;
});

const write = (body: Record<string, unknown>, who = 'member-a') =>
  request(app).post('/api/annotations').set('Authorization', as(who)).send(body);

const NOTE = {
  on: 'proposal',
  subjectId: 'matter-1',
  quote: 'borrowing inside the index',
  said: 'Inside the index, or inside the fund? The two are not the same exposure.',
};

describe('writing in the margin', () => {
  it('keeps the words that were marked and where they are', async () => {
    const res = await write(NOTE);
    expect(res.status).toBe(201);
    expect(res.body.annotation.quote).toBe('borrowing inside the index');
    expect(res.body.annotation.by).toBe('member-a');
    expect(res.body.annotation.at).toBeGreaterThan(0);
  });

  it('refuses a passage that is not in the proposal', async () => {
    const res = await write({ ...NOTE, quote: 'the desk may hedge with options' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('passage_not_in_the_document');
  });

  /*
   * The whole reason the client does not send the text. If it did, this note
   * would be stored and then shown beside a passage the board never read.
   */
  it('ignores any document the caller sends and uses the record', async () => {
    const res = await write({
      ...NOTE,
      quote: 'the desk may hedge with options',
      text: 'the desk may hedge with options',
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('passage_not_in_the_document');
  });

  it('refuses an observer, who reads the margins and does not write in them', async () => {
    const res = await write(NOTE, 'watcher');
    expect(res.status).toBe(403);
  });

  it('answers 404 for something there is nothing to write on', async () => {
    const res = await write({ ...NOTE, subjectId: 'matter-that-does-not-exist' });
    expect(res.status).toBe(404);
  });
});

describe('reading the margin', () => {
  it('gives back each note with the passage found in the text as it stands', async () => {
    await write(NOTE);
    const res = await request(app)
      .get('/api/annotations/proposal/matter-1')
      .set('Authorization', as('watcher'));

    expect(res.status).toBe(200);
    expect(res.body.threads).toHaveLength(1);
    expect(res.body.threads[0].note.adrift).toBe(false);
    expect(res.body.text.slice(res.body.threads[0].note.at)).toContain('borrowing inside the index');
    // Named, so a board can see who has read the papers.
    expect(res.body.threads[0].whoName).toBe('Board Member A');
    expect(res.body.summary.standing).toBe(1);
  });

  it('puts a reply under the note it answers, carrying the same passage', async () => {
    const first = await write(NOTE);
    const reply = await write(
      { on: 'proposal', subjectId: 'matter-1', said: 'Inside the index.', replyTo: first.body.annotation.id },
      'member-b',
    );
    expect(reply.status).toBe(201);
    expect(reply.body.annotation.quote).toBe('borrowing inside the index');

    const res = await request(app)
      .get('/api/annotations/proposal/matter-1')
      .set('Authorization', as('member-a'));
    expect(res.body.threads).toHaveLength(1);
    expect(res.body.threads[0].replies).toHaveLength(1);
    expect(res.body.threads[0].replies[0].whoName).toBe('Board Member B');
  });
});

describe('withdrawing', () => {
  it('keeps the note, marked, with what it said', async () => {
    const made = await write(NOTE);
    const res = await request(app)
      .post(`/api/annotations/${made.body.annotation.id}/withdraw`)
      .set('Authorization', as('member-a'))
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.annotation.withdrawn.by).toBe('member-a');
    expect(res.body.annotation.said).toContain('Inside the index, or inside the fund');

    const back = await request(app)
      .get('/api/annotations/proposal/matter-1')
      .set('Authorization', as('member-a'));
    expect(back.body.threads).toHaveLength(1);
    expect(back.body.summary.standing).toBe(0);
    expect(back.body.summary.withdrawn).toBe(1);
  });

  it('refuses somebody else, who would be editing what a colleague read', async () => {
    const made = await write(NOTE);
    const res = await request(app)
      .post(`/api/annotations/${made.body.annotation.id}/withdraw`)
      .set('Authorization', as('member-b'))
      .send({});

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('not_your_note');
  });
});

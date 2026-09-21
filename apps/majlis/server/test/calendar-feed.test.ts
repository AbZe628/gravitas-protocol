import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { MemoryStore } from '../src/store/index.js';
import { hashPassword } from '../src/auth/members.js';
import { fingerprintOf, issue, revoke, whose } from '../src/services/feed-token.js';
import type { Board } from '../src/types.js';

/**
 * The one address in this application that opens a door without a password.
 *
 * ── why it exists ─────────────────────────────────────────────────────────
 *
 * No calendar client can answer a password prompt. It fetches an address
 * every few hours and takes what comes back. So the only way a board's dates
 * reach the calendar a scholar already keeps is an address that carries its
 * own secret — and that is a bearer credential, which is a cost rather than
 * a detail.
 *
 * ── so what these hold is the boundary ────────────────────────────────────
 *
 * Everything below is the fence around it: the feed refuses without a token,
 * refuses a wrong one, refuses a withdrawn one, and — the one that matters
 * most — **a valid token opens nothing else**. A secret that travels in a
 * URL will end up in a log, a proxy and somebody's bookmarks; what keeps
 * that survivable is that the worst it yields is a list of dates.
 */

const PASSWORD = 'a board credential';
const secret = hashPassword(PASSWORD);
const MEMBERS = ['member-a:signatory', 'watcher:observer']
  .map((entry) => `${entry}:${secret}`)
  .join('\n');
const as = (who: string) => 'Basic ' + Buffer.from(`${who}:${PASSWORD}`).toString('base64');

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

/** Ask for an address, the way the screen does. */
async function anAddress(): Promise<string> {
  const res = await request(app)
    .post('/api/me/calendar-feed')
    .set('authorization', as('member-a'));
  expect(res.status).toBe(201);
  return (res.body as { token: string }).token;
}

describe('the feed refuses everything but its own token', () => {
  it('refuses with no token at all', async () => {
    const res = await request(app).get('/api/calendar.ics');
    expect(res.status).toBe(401);
  });

  it('refuses a token nobody was given', async () => {
    const res = await request(app).get('/api/calendar.ics?feed=' + 'x'.repeat(43));
    expect(res.status).toBe(401);
  });

  it('answers the address it issued', async () => {
    const token = await anAddress();

    const res = await request(app).get('/api/calendar.ics?feed=' + token);
    expect(res.status).toBe(200);
    expect(res.text).toContain('BEGIN:VCALENDAR');
  });

  it('stops answering the moment it is withdrawn', async () => {
    const token = await anAddress();
    expect((await request(app).get('/api/calendar.ics?feed=' + token)).status).toBe(200);

    const gone = await request(app)
      .delete('/api/me/calendar-feed')
      .set('authorization', as('member-a'));
    expect(gone.status).toBe(204);

    expect((await request(app).get('/api/calendar.ics?feed=' + token)).status).toBe(401);
  });

  it('drops the old one when a new one is issued', async () => {
    const first = await anAddress();
    const second = await anAddress();

    expect(second).not.toBe(first);
    expect((await request(app).get('/api/calendar.ics?feed=' + first)).status).toBe(401);
    expect((await request(app).get('/api/calendar.ics?feed=' + second)).status).toBe(200);
  });
});

describe('and it opens nothing else', () => {
  /*
   * The whole reason a secret in a URL is survivable. Each of these is a
   * route that answers freely to a member's password; none of them may
   * answer to a calendar address.
   */
  const elsewhere = [
    '/api/matters',
    '/api/adoptions',
    '/api/meetings',
    '/api/me',
    '/api/register',
    '/api/calendar',
    '/api/rules',
  ];

  it('refuses every other route the token might be tried on', async () => {
    const token = await anAddress();

    const answered: string[] = [];
    for (const path of elsewhere) {
      const res = await request(app).get(`${path}?feed=${token}`);
      if (res.status !== 401) answered.push(`${path} → ${res.status}`);
    }

    expect(answered, `these answered a calendar address:\n  ${answered.join('\n  ')}`).toEqual([]);
  });

  it('refuses it on a write, even the one that made it', async () => {
    const token = await anAddress();

    const res = await request(app).post(`/api/me/calendar-feed?feed=${token}`);
    expect(res.status).toBe(401);
  });

  it('refuses it as a password', async () => {
    const token = await anAddress();

    const res = await request(app)
      .get('/api/matters')
      .set('authorization', 'Basic ' + Buffer.from(`member-a:${token}`).toString('base64'));
    expect(res.status).toBe(401);
  });
});

describe('what the record keeps', () => {
  it('keeps a fingerprint and never the token', async () => {
    const token = await anAddress();

    const boards = await request(app).get('/api/boards').set('authorization', as('member-a'));
    const everything = JSON.stringify(boards.body);
    expect(everything).not.toContain(token);
  });

  it('tells a member that one stands, without handing it back', async () => {
    await anAddress();

    const me = await request(app).get('/api/me').set('authorization', as('member-a'));
    expect(me.body.calendarFeed).not.toBeNull();
    expect(me.body.calendarFeed.issuedAt).toMatch(/^\d{4}-\d{2}-\d{2}/);
    expect(JSON.stringify(me.body)).not.toMatch(/"token"/);
  });

  it('says nothing where the member never asked for one', async () => {
    const me = await request(app).get('/api/me').set('authorization', as('member-a'));
    expect(me.body.calendarFeed).toBeNull();
  });
});

describe('the token itself, without a server', () => {
  const board = (): Board =>
    ({
      id: 'b1',
      institutionId: 'i1',
      name: 'A board',
      quorumPermit: 3,
      quorumRestrict: 2,
      totalSignatories: 3,
      ratificationWindowHours: 72,
      members: [
        { id: 's1', name: 'One', title: '', board: 'b1', signatory: true },
        { id: 's2', name: 'Two', title: '', board: 'b1', signatory: true },
      ],
    }) as Board;

  it('is found by its holder and by nobody else', () => {
    const { board: after, token } = issue(board(), 's2', '2026-09-21T00:00:00.000Z');

    expect(whose([after], token)).toEqual({ boardId: 'b1', scholarId: 's2' });
    expect(whose([after], token + 'a')).toBeNull();
    expect(whose([after], '')).toBeNull();
  });

  it('is kept as a fingerprint of itself, not as itself', () => {
    const { board: after, token } = issue(board(), 's1', '2026-09-21T00:00:00.000Z');
    const held = after.members.find((m) => m.id === 's1')!.calendarFeed!;

    expect(held.fingerprint).toBe(fingerprintOf(token));
    expect(held.fingerprint).not.toBe(token);
  });

  it('leaves the other members alone, both when issued and when withdrawn', () => {
    const { board: after } = issue(board(), 's1', '2026-09-21T00:00:00.000Z');
    expect(after.members.find((m) => m.id === 's2')!.calendarFeed).toBeUndefined();

    const gone = revoke(after, 's1');
    expect(gone.members.find((m) => m.id === 's1')!.calendarFeed).toBeUndefined();
    expect(gone.members).toHaveLength(2);
  });

  it('refuses to make one for somebody who is not on the board', () => {
    expect(() => issue(board(), 'nobody', '2026-09-21T00:00:00.000Z')).toThrow();
  });
});

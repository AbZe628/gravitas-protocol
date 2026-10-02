import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { MemoryStore } from '../src/store/index.js';
import { hashPassword } from '../src/auth/members.js';
import { boards, incidents, matters, meetings, rules } from '../src/data/seed.js';
import { submissions, undertakings } from '../src/data/seed-work.js';
import { buildCalendar } from '../src/services/calendar.js';
import { isYours } from '../src/services/yours.js';
import { whereWeAre } from '../src/services/where.js';
import type { Notice, Notifier, Delivery } from '../src/services/notice.js';
import type { QueueRow } from '../src/services/queue.js';

/**
 * Being told, without having opened it.
 *
 * ── the gap ───────────────────────────────────────────────────────────────
 *
 * Majlis answers *what needs you* perfectly well, and only to somebody
 * already looking at it. A question from the institution can sit for a week
 * because nobody happened to open the application, and the pace figure this
 * product is sold on carries every one of those days.
 *
 * ── and the gap could not be closed where the rule lived ──────────────────
 *
 * Whose a waiting thing was had been decided in the browser, in one component.
 * Nothing on the server could answer it, so a summary would have had to work
 * it out a second time and would have disagreed with the screen the first time
 * either changed. `services/yours.ts` is that rule, once.
 *
 * ── what these hold ───────────────────────────────────────────────────────
 *
 * That the rule is right; that the summary carries the count, the kinds, the
 * clocks and the addresses and **not one title and not one holder**; that a
 * GET sends nothing; that a member gets their own and nobody else's; and that
 * a sitting the chair called is in the calendar as an appointment with an
 * alarm, rather than mentioned in the prose of a deadline four months out.
 *
 * Every confidentiality check is made against a queue that is first shown to
 * hold the thing being looked for. A test that scanned an empty body for a
 * title would pass by not looking.
 */

const PASSWORD = 'a board credential';
const secret = hashPassword(PASSWORD);
const MEMBERS = [
  'member-a:signatory+chair',
  'member-b:signatory',
  'member-c:signatory',
  'advisor-1:advisory',
  'desk-treasury:institution',
]
  .map((e) => `${e}:${secret}`)
  .join('\n');
const as = (who: string) => 'Basic ' + Buffer.from(`${who}:${PASSWORD}`).toString('base64');

/** A relay that records rather than sends, so what left can be read. */
class Wired implements Notifier {
  readonly kind = 'smtp' as const;
  readonly seen: Notice[] = [];
  async deliver(notice: Notice, at: string): Promise<Delivery> {
    this.seen.push(notice);
    return { kind: 'smtp', configured: true, sent: true, at, reached: notice.concerns.length };
  }
}

let app: Express;
let relay: Wired;

const saved = {
  members: process.env.MAJLIS_MEMBERS,
  user: process.env.BASIC_AUTH_USER,
  origin: process.env.MAJLIS_ORIGIN,
};

function boot(origin?: string) {
  process.env.MAJLIS_MEMBERS = MEMBERS;
  delete process.env.BASIC_AUTH_USER;
  if (origin === undefined) delete process.env.MAJLIS_ORIGIN;
  else process.env.MAJLIS_ORIGIN = origin;
  relay = new Wired();
  app = createApp(
    new MemoryStore({
      boards,
      matters,
      rules,
      incidents,
      submissions,
      undertakings,
      meetings,
      briefings: [],
    }),
    undefined,
    undefined,
    undefined,
    undefined,
    relay,
  );
}

beforeEach(() => boot());

afterEach(() => {
  process.env.MAJLIS_MEMBERS = saved.members;
  if (saved.user !== undefined) process.env.BASIC_AUTH_USER = saved.user;
  if (saved.origin === undefined) delete process.env.MAJLIS_ORIGIN;
  else process.env.MAJLIS_ORIGIN = saved.origin;
});

const get = (who: string, path: string) => request(app).get(path).set('Authorization', as(who));
const queue = async (who: string): Promise<QueueRow[]> =>
  (await get(who, '/api/queue')).body.rows as QueueRow[];
const digest = async (who: string): Promise<Notice | null> =>
  (await get(who, '/api/notices/waiting')).body.notice as Notice | null;

// ── the rule, on its own ──────────────────────────────────────────────────

describe('whose a waiting thing is', () => {
  const row = (over: Partial<QueueRow>) =>
    ({ whose: null, ...over }) as Pick<QueueRow, 'who' | 'holder' | 'whose' | 'heard'>;
  const sig = { scholarId: 'member-b', role: 'signatory' as const };
  const adv = { scholarId: 'advisor-1', role: 'advisory' as const };

  it('is one person’s where the step carries a name', () => {
    expect(isYours(row({ who: 'member-b', whose: 'board' }), sig)).toBe(true);
    /* And the board clause must not rescue everybody else out of it. */
    expect(isYours(row({ who: 'member-b', whose: 'board' }), adv)).toBe(false);
  });

  it('is every member’s where it is the board’s', () => {
    expect(isYours(row({ whose: 'board' }), sig)).toBe(true);
    expect(isYours(row({ whose: 'board' }), adv)).toBe(true);
  });

  it('is every signatory’s where it is reserved to them, and no one else’s', () => {
    expect(isYours(row({ whose: 'signatory' }), sig)).toBe(true);
    expect(isYours(row({ whose: 'signatory' }), adv)).toBe(false);
    /* Unless they are carrying the thing the step belongs to. */
    expect(isYours(row({ whose: 'signatory', holder: 'advisor-1' }), adv)).toBe(true);
  });

  it('is nobody on the board’s where it waits on the bank or a clock', () => {
    for (const whose of ['institution', 'liaison', 'software', 'clock', null] as const) {
      expect(isYours(row({ whose }), sig), String(whose)).toBe(false);
    }
  });

  /*
   * The fault this clause was written for: a vote this member had already cast
   * sat under *yours* as a vote to cast, fifty-five days old, because the step
   * stays open until the others have said theirs.
   */
  it('stops being yours once you have said yours on it', () => {
    expect(isYours(row({ whose: 'signatory', heard: ['member-b'] }), sig)).toBe(false);
    /* And the same row without that is the one that makes this mean anything. */
    expect(isYours(row({ whose: 'signatory', heard: ['member-c'] }), sig)).toBe(true);
  });
});

describe('where this installation is', () => {
  it('is what the operator set, without a trailing slash', () => {
    expect(whereWeAre({ MAJLIS_ORIGIN: 'https://majlis.bank.test/' })).toBe('https://majlis.bank.test');
    expect(whereWeAre({ MAJLIS_ORIGIN: 'https://majlis.bank.test///' })).toBe('https://majlis.bank.test');
  });

  it('is null where nobody set it, rather than a guess', () => {
    expect(whereWeAre({})).toBeNull();
    expect(whereWeAre({ MAJLIS_ORIGIN: '   ' })).toBeNull();
  });
});

// ── the row says whose it is ──────────────────────────────────────────────

describe('the queue says whose each row is', () => {
  it('marks some of them, and not all of them', async () => {
    const rows = await queue('member-a');
    expect(rows.length).toBeGreaterThan(3);

    const mine = rows.filter((r) => r.yours);
    expect(mine.length).toBeGreaterThan(0);
    /*
     * The screen is called *what needs you* and ten rows answered it. A field
     * that marked every row would be the same screen with a new name on it.
     */
    expect(mine.length).toBeLessThan(rows.length);
  });

  it('agrees with the rule, row for row', async () => {
    const rows = await queue('member-a');
    for (const r of rows) {
      expect(r.yours, `${r.kind}:${r.id}`).toBe(
        isYours(r, { scholarId: 'member-a', role: 'signatory' }),
      );
    }
  });

  it('answers differently for a different reader', async () => {
    const mine = (await queue('member-a')).filter((r) => r.yours).map((r) => r.id);
    const theirs = (await queue('advisor-1')).filter((r) => r.yours).map((r) => r.id);
    expect(mine).not.toEqual(theirs);
  });

  it('marks nothing as a board member’s for a bank desk', async () => {
    const rows = await queue('desk-treasury');
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some((r) => r.yours)).toBe(false);
  });
});

// ── the summary ───────────────────────────────────────────────────────────

describe('the summary of what is waiting', () => {
  it('says how many, and has a line for each', async () => {
    const rows = await queue('member-a');
    const mine = rows.filter((r) => r.yours);
    const notice = await digest('member-a');

    expect(notice).not.toBeNull();
    expect(notice!.subject).toContain(String(mine.length));
    expect(notice!.body.split('\n').filter((l) => l.startsWith('  · '))).toHaveLength(mine.length);
  });

  it('concerns the member alone', async () => {
    expect((await digest('member-a'))!.concerns).toEqual(['member-a']);
    expect((await digest('member-c'))!.concerns).toEqual(['member-c']);
  });

  /*
   * The whole reason this carries kinds instead of titles. The titles in the
   * record are the institution's compliance position — *Profit paid on a
   * deposit before the underlying settled* — and a mail system is not where
   * those belong.
   */
  it('carries not one title of anything waiting', async () => {
    const rows = await queue('member-a');
    const mine = rows.filter((r) => r.yours);
    const titles = mine.map((r) => r.title).filter((t) => t.length > 8);

    /* The measure first: a body scanned for titles nobody has proves nothing. */
    expect(titles.length).toBeGreaterThan(0);

    const said = (await digest('member-a'))!.body;
    for (const title of titles) expect(said, title).not.toContain(title);
  });

  /*
   * A board whose members can be approached one at a time about work in their
   * hands is not independent in the way the bank is paying for, so a summary
   * says nothing about who holds anything.
   *
   * Written the obvious way first — place one thing, then scan — this proved
   * nothing: placing work puts a name on the next step, which takes the row
   * out of everybody else's *yours*, so the summary that was scanned had no
   * held row in it at all. The measure has to find a row that is still this
   * member's **and** carried by somebody else before it can mean anything.
   */
  it('says nothing about who is carrying what', async () => {
    const rows = await queue('member-a');
    for (const r of rows.filter((r) => r.holdable)) {
      await request(app)
        .post('/api/assignments')
        .set('Authorization', as('member-a'))
        .send({ ofKind: r.kind, ofId: r.id, to: 'member-b' });
    }

    const after = await queue('member-a');
    const leakable = after.filter((r) => r.yours && r.holder && r.holder !== 'member-a');
    expect(leakable.length, 'nothing in the summary is held by anybody else').toBeGreaterThan(0);

    const said = (await digest('member-a'))!.body;
    expect(said).not.toContain('member-b');
  });

  it('gives each line its kind, its age and where to open it', async () => {
    const rows = await queue('member-a');
    const mine = rows.filter((r) => r.yours);
    const said = (await digest('member-a'))!.body;

    for (const r of mine) {
      expect(said, r.to).toContain(r.to);
      /*
       * `0 days` is what the figure says and is not what anybody would write.
       * Three rulings came due on one morning and the summary read *a ruling
       * due to come back — 0 days*, three times.
       */
      expect(said, String(r.days)).toContain(r.days === 0 ? 'today' : `${r.days} day`);
    }

    /* And both forms were actually reached, or this asserted one of them. */
    expect(mine.some((r) => r.days === 0), 'nothing came due today').toBe(true);
    expect(mine.some((r) => r.days > 0), 'nothing has stood a day').toBe(true);
  });

  it('is nothing at all to a bank desk', async () => {
    const res = await get('desk-treasury', '/api/notices/waiting');
    expect(res.status).toBe(200);
    expect(res.body.notice).toBeNull();
  });
});

describe('the addresses in it', () => {
  it('are links where the installation has been told where it is', async () => {
    boot('https://majlis.bank.test/');
    const said = (await digest('member-a'))!.body;

    const lines = said.split('\n').filter((l) => l.trim().startsWith('/') || l.includes('://'));
    expect(lines.length).toBeGreaterThan(0);
    for (const l of lines) expect(l.trim().startsWith('https://majlis.bank.test/'), l).toBe(true);
    expect(said).not.toContain('MAJLIS_ORIGIN');
  });

  it('are paths, and say so, where it has not been', async () => {
    const said = (await digest('member-a'))!.body;
    expect(said).toContain('MAJLIS_ORIGIN');
    expect(said).not.toContain('localhost');
  });
});

describe('what a member has set aside', () => {
  it('leaves the summary, and stays in the queue', async () => {
    const mine = (await queue('member-a')).filter((r) => r.yours);
    const put = mine[0];
    const before = (await digest('member-a'))!;

    const res = await request(app)
      .post('/api/put-off')
      .set('Authorization', as('member-a'))
      .send({
        ofKind: put.kind,
        ofId: put.id,
        until: '2027-12-01T00:00:00.000Z',
        reason: 'Waiting on the auditor’s confirmation before this can move.',
      });
    expect(res.status, JSON.stringify(res.body)).toBe(201);

    /* Still waiting, and still on the board’s list. */
    const after = await queue('member-a');
    expect(after.some((r) => r.kind === put.kind && r.id === put.id)).toBe(true);

    const now = (await digest('member-a'))!;
    expect(now.body.split('\n').filter((l) => l.startsWith('  · ')).length).toBe(
      before.body.split('\n').filter((l) => l.startsWith('  · ')).length - 1,
    );
  });

  it('is still news to everybody else', async () => {
    const mine = (await queue('member-c')).filter((r) => r.yours);
    const put = mine[0];
    const before = (await digest('member-a'))!.body.split('\n').filter((l) => l.startsWith('  · ')).length;

    await request(app)
      .post('/api/put-off')
      .set('Authorization', as('member-c'))
      .send({
        ofKind: put.kind,
        ofId: put.id,
        until: '2027-12-01T00:00:00.000Z',
        reason: 'Waiting on the auditor’s confirmation before this can move.',
      });

    const after = (await digest('member-a'))!.body.split('\n').filter((l) => l.startsWith('  · ')).length;
    expect(after).toBe(before);
  });
});

describe('composing is not sending', () => {
  it('sends nothing when the summary is only read', async () => {
    const res = await get('member-a', '/api/notices/waiting');
    expect(res.body.notice).not.toBeNull();
    /* A wired relay, and it saw nothing: a GET that posted mail would. */
    expect(relay.seen).toHaveLength(0);
    expect(res.body.channel).toBe('smtp');
  });

  it('hands the relay the same words the screen shows, when it is sent', async () => {
    const res = await request(app)
      .post('/api/notices/waiting')
      .set('Authorization', as('member-a'))
      .send({});

    expect(res.status).toBe(200);
    expect(relay.seen).toHaveLength(1);
    expect(relay.seen[0].body).toBe((res.body.notice as Notice).body);
    expect((res.body.delivery as Delivery).sent).toBe(true);
    /* And it went to the member who asked, nobody else. */
    expect(relay.seen[0].concerns).toEqual(['member-a']);
  });
});

// ── placing work with somebody ────────────────────────────────────────────

describe('work placed with a member', () => {
  const place = (by: string, row: QueueRow, to: string | null) =>
    request(app)
      .post('/api/assignments')
      .set('Authorization', as(by))
      .send({ ofKind: row.kind, ofId: row.id, to });

  const holdable = async () => (await queue('member-a')).find((r) => r.holdable)!;

  it('tells the person it was placed with, and only them', async () => {
    const row = await holdable();
    const res = await place('member-a', row, 'member-c');
    expect(res.status).toBe(201);

    const notice = res.body.notice as Notice;
    expect(notice).toBeTruthy();
    expect(notice.concerns).toEqual(['member-c']);
    expect(notice.body).toContain(row.to);
  });

  it('carries no title of what was placed', async () => {
    const row = await holdable();
    expect(row.title.length).toBeGreaterThan(8);

    const res = await place('member-a', row, 'member-c');
    expect((res.body.notice as Notice).body).not.toContain(row.title);
  });

  it('says nothing to anybody when a member takes something on themselves', async () => {
    const row = await holdable();
    const res = await place('member-a', row, 'member-a');
    expect(res.status).toBe(201);
    expect(res.body.notice).toBeUndefined();
    expect(relay.seen).toHaveLength(0);
  });

  it('says nothing when it is put back to the room', async () => {
    const row = await holdable();
    await place('member-a', row, 'member-c');
    relay.seen.length = 0;

    const res = await place('member-a', row, null);
    expect(res.status).toBe(201);
    expect(res.body.notice).toBeUndefined();
    expect(relay.seen).toHaveLength(0);
  });
});

// ── and the sitting is in the calendar ────────────────────────────────────

describe('a sitting the chair has called', () => {
  const convene = (at: string) =>
    request(app)
      .post('/api/meetings')
      .set('Authorization', as('member-a'))
      .send({ boardId: boards[0].id, at, agenda: [{ item: 'The murabaha conditions' }] });

  /* Far enough out that it is still ahead whenever this is run. */
  const AHEAD = '2099-03-04T09:00:00.000Z';

  it('is on the calendar as its own entry, at its own hour', async () => {
    const res = await convene(AHEAD);
    expect(res.status).toBe(201);

    const cal = await get('member-a', '/api/calendar');
    const entry = (cal.body.entries as { kind: string; at: string; subject: string }[]).find(
      (e) => e.kind === 'meeting_convened' && e.subject === res.body.id,
    );
    expect(entry, 'the sitting is nowhere on the calendar').toBeTruthy();
    /* The hour it was called for, not the day it falls on. */
    expect(entry!.at).toBe(AHEAD);
  });

  it('is not there once it has been held', async () => {
    const cal = await get('member-a', '/api/calendar');
    const listed = (cal.body.entries as { kind: string; subject: string }[])
      .filter((e) => e.kind === 'meeting_convened')
      .map((e) => e.subject);

    /*
     * The record holds both kinds, so this separates them rather than finding
     * an empty list and calling it a pass: one sitting still to come, and one
     * closed on the day it was held.
     */
    const held = meetings.find((m) => m.closedAt)!;
    const coming = meetings.find((m) => !m.closedAt)!;
    expect(held).toBeTruthy();
    expect(coming).toBeTruthy();

    expect(listed).toContain(coming.id);
    expect(listed).not.toContain(held.id);
  });

  /*
   * And it is the closing that takes it off, not the date. The two are
   * together in every sitting the record happens to hold, so they are pulled
   * apart here: a sitting still ahead, and closed.
   */
  it('is not there once it is closed, whatever its date', () => {
    const coming = meetings.find((m) => !m.closedAt)!;
    const ahead = { ...coming, id: 'm-ahead', at: AHEAD, closedAt: null };
    const shut = { ...ahead, id: 'm-shut', closedAt: '2026-01-01T00:00:00.000Z' };

    const of = (ms: typeof meetings) =>
      buildCalendar({ boards, matters, rules, incidents, meetings: ms, now: '2026-10-01T00:00:00.000Z' })
        .entries.filter((e) => e.kind === 'meeting_convened')
        .map((e) => e.subject);

    expect(of([ahead])).toContain('m-ahead');
    expect(of([shut])).not.toContain('m-shut');
  });

  it('is an appointment in the feed, with a day’s warning on it', async () => {
    const called = await convene(AHEAD);
    const issued = await request(app)
      .post('/api/me/calendar-feed')
      .set('Authorization', as('member-a'))
      .send({});
    expect(issued.status, JSON.stringify(issued.body)).toBe(201);

    const feed = await request(app).get(`/api/calendar.ics?feed=${issued.body.token}`);
    expect(feed.status).toBe(200);

    const events = feed.text.split('BEGIN:VEVENT').slice(1);
    const sitting = events.find((e) => e.includes(`UID:sitting:${called.body.id}@`));
    expect(sitting, 'no sitting in the feed').toBeTruthy();

    /* An hour, not a whole day. */
    expect(sitting!).toContain('DTSTART:2099');
    expect(sitting!).not.toContain('DTSTART;VALUE=DATE');
    expect(sitting!).toContain('TRANSP:OPAQUE');
    expect(sitting!).toContain('BEGIN:VALARM');
    expect(sitting!).toContain('TRIGGER:-PT24H');

    /*
     * And the measure looked at something that is not a sitting: a deadline is
     * still a whole day with no alarm, or this would be asserting that every
     * entry in the feed got an appointment.
     */
    const deadline = events.find((e) => e.includes('Review due') || e.includes('due to meet'));
    expect(deadline, 'no deadline in the feed to compare against').toBeTruthy();
    expect(deadline!).toContain('DTSTART;VALUE=DATE');
    expect(deadline!).not.toContain('BEGIN:VALARM');
  });
});

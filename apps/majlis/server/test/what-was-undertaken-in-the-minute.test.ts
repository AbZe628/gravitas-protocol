import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { MemoryStore } from '../src/store/index.js';
import { hashPassword } from '../src/auth/members.js';
import { boards, incidents, matters, meetings, rules } from '../src/data/seed.js';
import { submissions, undertakings } from '../src/data/seed-work.js';
import { dateIn, undertookIn, type Undertook } from '../src/services/undertakings-in-a-minute.js';
import type { Scholar } from '../src/types.js';

/**
 * What members undertook, read out of the minute they are written in.
 *
 * ── the gap ───────────────────────────────────────────────────────────────
 *
 * A sitting produces two things: a minute, which is prose, and undertakings,
 * which are the board's own clocks. The minute is written once, at the end,
 * and the undertakings were then typed in again from it by hand, by the person
 * who had just finished writing the prose. What is lost there is lost
 * silently: an obligation nobody re-typed has no date on it and nothing that
 * will ever raise it.
 *
 * ── and the two lines it must not cross ───────────────────────────────────
 *
 * It **records nothing**: a GET that reads the minute already in the record
 * and hands back sentences. No clock of this board is started by a machine
 * reading prose.
 *
 * It **names nobody the board has not**. The only names it can return are the
 * board's own, matched against its member list. A line about the auditor or
 * the treasury desk carries no member and is not offered at all, because
 * guessing whose undertaking it is would be the one mistake worth more than
 * the whole reading.
 */

const MEMBERS: Scholar[] = [
  { id: 'm-a', name: 'Amina Chair', title: '', board: 'b', signatory: true },
  { id: 'm-b', name: 'Bilal Rahman', title: '', board: 'b', signatory: true },
  { id: 'm-c', name: 'Căsim Ode', title: '', board: 'b', signatory: true },
] as Scholar[];

const of = (minute: string): Undertook[] => undertookIn(minute, MEMBERS);

// ── the reading itself ────────────────────────────────────────────────────

describe('what a minute says somebody undertook', () => {
  it('takes a sentence with a member and a commitment in it', () => {
    const found = of('Bilal Rahman will circulate the revised schedule to the board.');
    expect(found).toHaveLength(1);
    expect(found[0].who).toBe('m-b');
    expect(found[0].what).toContain('circulate the revised schedule');
  });

  /*
   * The difference between minuting a question and minuting an obligation.
   * Without this, an hour's discussion naming five people forty times comes
   * back as forty undertakings and the secretary stops reading them.
   */
  it('leaves a sentence that only records what somebody said', () => {
    expect(of('Bilal Rahman asked whether the auditor had replied.')).toEqual([]);
    expect(of('Amina Chair noted that the position was unchanged.')).toEqual([]);
  });

  it('offers nothing for a commitment by somebody who is not on this board', () => {
    expect(of('The treasury desk will confirm the position before the next sitting.')).toEqual([]);
    expect(of('The external auditor undertakes to reply within the week.')).toEqual([]);
  });

  /*
   * Two names in one sentence is one undertaking shared or two separate ones,
   * and which it is, is the secretary's to say. Offering it as one member's
   * would put a colleague's name on nothing, or theirs on both.
   */
  it('offers nothing where a sentence names two members', () => {
    expect(of('Bilal Rahman and Căsim Ode will prepare the note together.')).toEqual([]);
  });

  it('keeps the minute’s own order, and where each was found', () => {
    const minute =
      'The board sat at nine. Căsim Ode will confirm the auditor position. ' +
      'Bilal Rahman will circulate the schedule.';
    const found = of(minute);
    expect(found.map((f) => f.who)).toEqual(['m-c', 'm-b']);
    expect(minute.slice(found[0].at)).toMatch(/^Căsim Ode will confirm/);
    expect(minute.slice(found[1].at)).toMatch(/^Bilal Rahman will circulate/);
  });
});

// ── the date, and the ones that are not dates ─────────────────────────────

describe('a date in the sentence', () => {
  it('reads one written out, and one written as digits', () => {
    expect(dateIn('Bilal Rahman will reply by 20 November 2026.')).toBe('2026-11-20T00:00:00.000Z');
    expect(dateIn('Bilal Rahman will reply by 2026-11-20.')).toBe('2026-11-20T00:00:00.000Z');
    expect(dateIn('due on the 3rd December 2027')).toBe('2027-12-03T00:00:00.000Z');
  });

  /*
   * A minute may be read a month after the sitting. A relative date resolved
   * against the wrong day is a clock set wrong with nothing on the screen to
   * show it, so none of these is a date and the secretary types the day.
   */
  it('is absent for anything that means a day this file does not know', () => {
    expect(dateIn('Bilal Rahman will reply next Tuesday.')).toBeUndefined();
    expect(dateIn('Bilal Rahman will reply within two weeks.')).toBeUndefined();
    expect(dateIn('Bilal Rahman will reply before the quarter ends.')).toBeUndefined();
    /* A year is required: 20 November is two possible days. */
    expect(dateIn('Bilal Rahman will reply by 20 November.')).toBeUndefined();
  });

  it('is absent for a day the calendar does not have', () => {
    expect(dateIn('due 31 November 2026')).toBeUndefined();
    expect(dateIn('due 2026-13-40')).toBeUndefined();
  });

  it('is carried on the undertaking where the sentence has one, and not where it has none', () => {
    const dated = of('Bilal Rahman will circulate the schedule by 20 November 2026.');
    expect(dated[0].dueAt).toBe('2026-11-20T00:00:00.000Z');

    const undated = of('Bilal Rahman will circulate the schedule.');
    expect(undated[0].dueAt).toBeUndefined();
  });
});

// ── over the wire, and that it changes nothing ────────────────────────────

const PASSWORD = 'a board credential';
const secret = hashPassword(PASSWORD);
const CREDENTIALS = ['member-a:signatory+chair', 'member-b:signatory+secretary']
  .map((e) => `${e}:${secret}`)
  .join('\n');
const as = (who: string) => 'Basic ' + Buffer.from(`${who}:${PASSWORD}`).toString('base64');

let app: Express;
let store: MemoryStore;
const saved = { members: process.env.MAJLIS_MEMBERS, user: process.env.BASIC_AUTH_USER };

const SITTING = meetings[0];

beforeEach(async () => {
  process.env.MAJLIS_MEMBERS = CREDENTIALS;
  delete process.env.BASIC_AUTH_USER;
  store = new MemoryStore({
    boards,
    matters,
    rules,
    incidents,
    submissions,
    undertakings,
    meetings,
    briefings: [],
  });
  app = createApp(store);

  const named = boards[0].members[2].name;
  await store.updateMeeting(SITTING.id, (m) => ({
    ...m,
    minute:
      'The board sat at nine and considered the pool reclassification. ' +
      `${named} will confirm the custodian position by 20 November 2026. ` +
      'The external auditor will reply in due course.',
  }));
});

afterEach(() => {
  process.env.MAJLIS_MEMBERS = saved.members;
  if (saved.user !== undefined) process.env.BASIC_AUTH_USER = saved.user;
});

describe('reading a sitting’s minute for undertakings', () => {
  it('names a member of this board and the day, from the minute as written', async () => {
    const res = await request(app)
      .get(`/api/meetings/${SITTING.id}/undertook`)
      .set('Authorization', as('member-b'));

    expect(res.status).toBe(200);
    expect(res.body.readBy).toBe('words');

    const found = res.body.found as Undertook[];
    expect(found).toHaveLength(1);
    expect(found[0].who).toBe(boards[0].members[2].id);
    expect(found[0].dueAt).toBe('2026-11-20T00:00:00.000Z');
    /* And the auditor's line, which names nobody on the board, is not in it. */
    expect(found.some((f) => f.what.includes('auditor'))).toBe(false);
  });

  /*
   * The half that matters most. Reading is reading: the sitting is as it was,
   * and no undertaking exists until a person minutes one under their name.
   */
  it('records nothing at all', async () => {
    const before = (await store.undertakings()).length;
    const sitting = await store.meeting(SITTING.id);

    await request(app)
      .get(`/api/meetings/${SITTING.id}/undertook`)
      .set('Authorization', as('member-b'));

    expect((await store.undertakings()).length).toBe(before);
    expect(await store.meeting(SITTING.id)).toEqual(sitting);
  });

  it('answers nothing for a sitting that is not there', async () => {
    const res = await request(app)
      .get('/api/meetings/no-such-sitting/undertook')
      .set('Authorization', as('member-b'));
    expect(res.status).toBe(404);
  });

  it('gives an empty reading for a sitting with no minute yet', async () => {
    await store.updateMeeting(SITTING.id, (m) => ({ ...m, minute: '' }));
    const res = await request(app)
      .get(`/api/meetings/${SITTING.id}/undertook`)
      .set('Authorization', as('member-b'));

    expect(res.status).toBe(200);
    expect(res.body.found).toEqual([]);
  });
});

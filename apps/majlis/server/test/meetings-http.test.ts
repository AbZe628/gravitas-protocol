import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { MemoryStore } from '../src/store/index.js';
import { hashPassword } from '../src/auth/members.js';

/**
 * A meeting over HTTP, and who may do each part of it.
 *
 * The line these hold: a meeting **decides nothing**. Its agenda links to the
 * matters where decisions live, and the minute is an account of the
 * discussion. Once closed it does not move.
 */

const PASSWORD = 'a board credential';
const secret = hashPassword(PASSWORD);

const MEMBERS = [
  'member-a:signatory+chair',
  'member-b:signatory',
  'clerk:advisory+secretary',
  'liaison-1:liaison',
  'advisor-1:advisory',
  'watcher:observer',
]
  .map((entry) => `${entry}:${secret}`)
  .join('\n');

const as = (who: string) => 'Basic ' + Buffer.from(`${who}:${PASSWORD}`).toString('base64');

const MINUTE =
  'The board read the sukuk conditions and asked the liaison how the tangible ratio is measured.';

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

const PAST = '2026-01-15T09:00:00.000Z';

const convene = (body: Record<string, unknown> = {}, who = 'member-a') =>
  request(app)
    .post('/api/meetings')
    .set('Authorization', as(who))
    .send({
      boardId: 'demo-board',
      at: PAST,
      agenda: [{ item: 'The sukuk conditions' }],
      ...body,
    });

/** Convened, attended and minuted — everything but closed. */
async function ready(): Promise<string> {
  const id = (await convene().expect(201)).body.id as string;

  await request(app)
    .put(`/api/meetings/${id}/attendance`)
    .set('Authorization', as('clerk'))
    .send({ attendance: [{ scholarId: 'member-a', present: true }, { scholarId: 'member-b', present: false, note: 'Travelling.' }] })
    .expect(200);

  await request(app)
    .put(`/api/meetings/${id}/minute`)
    .set('Authorization', as('clerk'))
    .send({ minute: MINUTE })
    .expect(200);

  return id;
}

describe('convening is the chair’s act', () => {
  it('records the agenda and who convened it', async () => {
    const res = await convene().expect(201);
    expect(res.body.agenda).toHaveLength(1);
    expect(res.body.recordedBy).toBe('member-a');
    expect(res.body.closedAt).toBeNull();
  });

  it('refuses everyone who is not the chair, including other signatories', async () => {
    await convene({}, 'member-b').expect(403);
    await convene({}, 'clerk').expect(403);
    await convene({}, 'watcher').expect(403);
  });

  it('refuses an empty agenda as the caller’s to fix', async () => {
    const res = await convene({ agenda: [] }).expect(400);
    expect(res.body.error).toBe('no_agenda');
    expect(res.body.message).toContain('nobody could prepare for');
  });

  it('refuses an agenda naming a matter not before this board', async () => {
    const res = await convene({
      agenda: [{ item: 'Something', matterId: 'not-a-matter' }],
    }).expect(400);
    expect(res.body.error).toBe('no_such_matter');
  });

  it('links an agenda item to a matter that is', async () => {
    const res = await convene({
      agenda: [{ item: 'The tangible ratio', matterId: 'matter-2026-07-03' }],
    }).expect(201);
    expect(res.body.agenda[0].matterId).toBe('matter-2026-07-03');
  });

  it('refuses anonymously, like every other route', async () => {
    await request(app).post('/api/meetings').send({}).expect(401);
  });
});

describe('the minute is kept by the chair or the secretary', () => {
  it('lets the secretary record attendance and write the minute', async () => {
    const id = await ready();
    const res = await request(app)
      .get(`/api/meetings/${id}`)
      .set('Authorization', as('watcher'))
      .expect(200);

    expect(res.body.meeting.attendance).toHaveLength(2);
    expect(res.body.meeting.minute).toBe(MINUTE);
    expect(res.body.state).toBe('minuted');
  });

  it('refuses an ordinary signatory, because a rewritable record is worth nothing', async () => {
    const id = (await convene().expect(201)).body.id;
    await request(app)
      .put(`/api/meetings/${id}/minute`)
      .set('Authorization', as('member-b'))
      .send({ minute: MINUTE })
      .expect(403);
  });

  it('refuses a minute that records only that a date passed', async () => {
    const id = (await convene().expect(201)).body.id;
    const res = await request(app)
      .put(`/api/meetings/${id}/minute`)
      .set('Authorization', as('clerk'))
      .send({ minute: 'The board met.' })
      .expect(400);

    expect(res.body.error).toBe('no_minute');
  });

  it('refuses attendance for somebody who does not sit on the board', async () => {
    const id = (await convene().expect(201)).body.id;
    const res = await request(app)
      .put(`/api/meetings/${id}/attendance`)
      .set('Authorization', as('clerk'))
      .send({ attendance: [{ scholarId: 'a-stranger', present: true }] })
      .expect(403);

    expect(res.body.error).toBe('not_on_this_board');
  });

  it('reports who was not accounted for rather than marking them absent', async () => {
    const id = await ready();
    const res = await request(app)
      .get(`/api/meetings/${id}`)
      .set('Authorization', as('watcher'))
      .expect(200);

    // The board named two of its members; the rest are reported, not assumed.
    expect(res.body.unaccountedFor.length).toBeGreaterThan(0);
    expect(res.body.unaccountedFor).not.toContain('member-a');
  });
});

describe('closing, and what stops afterwards', () => {
  it('is the chair’s act and freezes the meeting', async () => {
    const id = await ready();

    await request(app).post(`/api/meetings/${id}/close`).set('Authorization', as('clerk')).expect(403);
    const closed = await request(app)
      .post(`/api/meetings/${id}/close`)
      .set('Authorization', as('member-a'))
      .expect(200);
    expect(closed.body.closedAt).toBeTruthy();

    // Nothing about it moves after that. There is no route to amend one.
    const again = await request(app)
      .put(`/api/meetings/${id}/minute`)
      .set('Authorization', as('clerk'))
      .send({ minute: MINUTE + ' And one more thing.' })
      .expect(409);
    expect(again.body.error).toBe('already_closed');
    expect(again.body.message).toContain('nobody can rely on');
  });

  it('refuses to close with nothing recorded', async () => {
    const id = (await convene().expect(201)).body.id;
    const res = await request(app)
      .post(`/api/meetings/${id}/close`)
      .set('Authorization', as('member-a'))
      .expect(409);

    expect(res.body.error).toBe('nothing_recorded');
    expect(res.body.message).toContain('with nothing behind it');
  });

  it('refuses to close one that has not been held yet', async () => {
    const ahead = (await convene({ at: '2099-01-01T09:00:00.000Z' }).expect(201)).body.id;
    await request(app)
      .put(`/api/meetings/${ahead}/attendance`)
      .set('Authorization', as('clerk'))
      .send({ attendance: [{ scholarId: 'member-a', present: true }] })
      .expect(200);
    await request(app)
      .put(`/api/meetings/${ahead}/minute`)
      .set('Authorization', as('clerk'))
      .send({ minute: MINUTE })
      .expect(200);

    const res = await request(app)
      .post(`/api/meetings/${ahead}/close`)
      .set('Authorization', as('member-a'))
      .expect(409);
    expect(res.body.error).toBe('not_yet_held');
  });
});

describe('the sixth clock, once there is something to count from', () => {
  it('says there is nothing to count from before any meeting is held', async () => {
    const res = await request(app).get('/api/meetings').set('Authorization', as('watcher')).expect(200);

    expect(res.body.meetings).toEqual([]);
    expect(res.body.cadence.dueBy).toBeNull();
    expect(res.body.cadence.note).toContain('rather than a finding about the board');
  });

  it('counts from the last meeting held, and puts it on the calendar', async () => {
    const id = await ready();
    await request(app).post(`/api/meetings/${id}/close`).set('Authorization', as('member-a')).expect(200);

    const meetings = await request(app).get('/api/meetings').set('Authorization', as('watcher')).expect(200);
    expect(meetings.body.cadence.lastHeldAt).toBe(PAST);
    expect(meetings.body.cadence.dueBy?.slice(0, 7)).toBe('2026-07');

    const calendar = await request(app).get('/api/calendar').set('Authorization', as('watcher')).expect(200);
    const due = calendar.body.entries.filter((e: { kind: string }) => e.kind === 'meeting_due');
    expect(due).toHaveLength(1);
    expect(calendar.body.gaps.join(' ')).not.toContain('nothing to count the cadence from');
  });
});

describe('the annual report stops naming meetings as a gap', () => {
  it('counts the meetings held and each member’s attendance', async () => {
    const id = await ready();
    await request(app).post(`/api/meetings/${id}/close`).set('Authorization', as('member-a')).expect(200);

    const res = await request(app)
      .get('/api/annual?year=2026&format=json')
      .set('Authorization', as('member-a'))
      .expect(200);

    expect(res.body.meetings.held).toBe(1);
    expect(res.body.gaps.join(' ')).not.toContain('No meeting was recorded');

    const attended = res.body.meetings.attendance.find(
      (a: { scholarId: string }) => a.scholarId === 'member-a',
    );
    expect(attended).toMatchObject({ attended: 1, of: 1 });

    // And the reason the board gave for an absence travels with the figure.
    const away = res.body.meetings.attendance.find(
      (a: { scholarId: string }) => a.scholarId === 'member-b',
    );
    expect(away.notes).toEqual(['Travelling.']);
  });

  it('puts the attendance on the printed page, per member rather than averaged', async () => {
    const id = await ready();
    await request(app).post(`/api/meetings/${id}/close`).set('Authorization', as('member-a')).expect(200);

    const page = (
      await request(app).get('/api/annual?year=2026').set('Authorization', as('member-a')).expect(200)
    ).text;

    expect(page).toContain('Meetings and attendance');
    expect(page).toContain('1 of 1');
    expect(page).toContain('Travelling.');
  });

  it('says a member attended none, which may be right and may be unrecorded', async () => {
    const id = (await convene().expect(201)).body.id;
    await request(app)
      .put(`/api/meetings/${id}/attendance`)
      .set('Authorization', as('clerk'))
      .send({ attendance: [{ scholarId: 'member-a', present: true }] })
      .expect(200);
    await request(app)
      .put(`/api/meetings/${id}/minute`)
      .set('Authorization', as('clerk'))
      .send({ minute: MINUTE })
      .expect(200);
    await request(app).post(`/api/meetings/${id}/close`).set('Authorization', as('member-a')).expect(200);

    const res = await request(app)
      .get('/api/annual?year=2026&format=json')
      .set('Authorization', as('member-a'))
      .expect(200);

    expect(res.body.gaps.join(' ')).toContain('attended none of this year’s meetings');
    expect(res.body.gaps.join(' ')).toContain('the report cannot tell which');
  });
});

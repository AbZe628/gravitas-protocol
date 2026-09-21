import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { MemoryStore } from '../src/store/index.js';
import { hashPassword } from '../src/auth/members.js';
import { compose, type Notice, type Notifier, type Delivery } from '../src/services/notice.js';

/**
 * A sitting nobody was told about.
 *
 * ── the one event where late is the same as never ─────────────────────────
 *
 * Four events composed a notice — a question arriving, a matter opening, a
 * vote opening, a ruling coming into force — and the fifth did not. A
 * sitting called for Tuesday is of no use to a member who opens Majlis on
 * Wednesday, and being told inside the application is only being told if
 * you happen to look.
 *
 * ── and it is composed, not sent ──────────────────────────────────────────
 *
 * The ordinary installation has no mail relay, so the words are written and
 * handed back with `sent: false`. That is not a stub: a screen that said
 * nothing would let a chair believe the board had been written to. What
 * these hold is that the notice exists, that it carries the two things a
 * member needs, and that the failure to send is stated rather than implied.
 *
 * ── and that notifying never masquerades as convening ─────────────────────
 *
 * A relay that throws must not make it look as though no sitting was
 * called. The meeting is in the record either way.
 */

const PASSWORD = 'a board credential';
const secret = hashPassword(PASSWORD);
/* `id:role+office:secret`, the form the credential file uses. */
const MEMBERS = ['chair-a:signatory+chair', 'member-b:signatory']
  .map((entry) => `${entry}:${secret}`)
  .join('\n');
const as = (who: string) => 'Basic ' + Buffer.from(`${who}:${PASSWORD}`).toString('base64');

let app: Express;
let boardId: string;

const saved = {
  members: process.env.MAJLIS_MEMBERS,
  user: process.env.BASIC_AUTH_USER,
  pass: process.env.BASIC_AUTH_PASSWORD,
};

/** A relay that records rather than sends, so the words can be read. */
class Wired implements Notifier {
  readonly kind = 'smtp' as const;
  readonly seen: Notice[] = [];
  async deliver(notice: Notice, at: string): Promise<Delivery> {
    this.seen.push(notice);
    return { kind: 'smtp', configured: true, sent: true, at, reached: notice.concerns.length };
  }
}

/** A relay that is wired and broken, which is not the same as absent. */
class Broken implements Notifier {
  readonly kind = 'smtp' as const;
  async deliver(): Promise<Delivery> {
    throw new Error('the relay refused the connection');
  }
}

async function boot(notifier?: Notifier) {
  process.env.MAJLIS_MEMBERS = MEMBERS;
  delete process.env.BASIC_AUTH_USER;
  delete process.env.BASIC_AUTH_PASSWORD;
  app = createApp(
    new MemoryStore(),
    undefined,
    undefined,
    undefined,
    undefined,
    notifier,
  );
  const boards = await request(app).get('/api/boards').set('authorization', as('chair-a'));
  boardId = boards.body[0].id;
}

const convene = () =>
  request(app)
    .post('/api/meetings')
    .set('authorization', as('chair-a'))
    .send({
      boardId,
      at: '2027-03-04T09:00:00.000Z',
      agenda: [{ item: 'The murabaha conditions as amended' }, { item: 'The late payment charge' }],
    });

beforeEach(() => boot());

afterEach(() => {
  process.env.MAJLIS_MEMBERS = saved.members;
  process.env.BASIC_AUTH_USER = saved.user;
  process.env.BASIC_AUTH_PASSWORD = saved.pass;
});

describe('convening composes a notice', () => {
  it('carries when the board sits and what it is about', async () => {
    const res = await convene();
    expect(res.status).toBe(201);

    const notice = res.body.notice as Notice;
    expect(notice.subject).toContain('2027-03-04');
    expect(notice.body).toContain('The murabaha conditions as amended');
    expect(notice.body).toContain('The late payment charge');
  });

  it('concerns every member, because a sitting is the whole board’s', async () => {
    const res = await convene();
    expect((res.body.notice as Notice).concerns.length).toBeGreaterThan(1);
  });

  it('says plainly that nothing was sent, where nothing can be', async () => {
    const res = await convene();

    const delivery = res.body.delivery as Delivery;
    expect(delivery.kind).toBe('none');
    expect(delivery.configured).toBe(false);
    expect(delivery.sent).toBe(false);
  });

  it('still convenes: the sitting is in the record either way', async () => {
    const res = await convene();

    const listed = await request(app).get('/api/meetings').set('authorization', as('chair-a'));
    const found = (listed.body.meetings as { meeting: { id: string } }[]).some(
      (m) => m.meeting.id === res.body.id,
    );
    expect(found).toBe(true);
  });
});

describe('where a relay is wired', () => {
  it('hands it the same words the screen would show', async () => {
    const relay = new Wired();
    await boot(relay);

    const res = await convene();
    expect((res.body.delivery as Delivery).sent).toBe(true);
    expect(relay.seen).toHaveLength(1);
    /*
     * The same words either way. Two wordings for one event is how a record
     * and a mailbox start disagreeing.
     */
    expect(relay.seen[0].body).toBe((res.body.notice as Notice).body);
  });
});

describe('the words themselves, without a server', () => {
  const board = {
    id: 'b1',
    name: 'A board',
    members: [{ id: 's1' }, { id: 's2' }],
  } as never;

  it('says nothing about an agenda where there is none to say', () => {
    const notice = compose(board, {
      kind: 'meeting_convened',
      meetingId: 'm1',
      at: '2027-03-04T09:00:00.000Z',
      agenda: [],
      convenedBy: 's1',
    });

    expect(notice.body).not.toContain('Before the board');
    expect(notice.body).toContain('2027-03-04');
  });

  it('keeps the agenda as the board wrote it, one heading to a line', () => {
    const notice = compose(board, {
      kind: 'meeting_convened',
      meetingId: 'm1',
      at: '2027-03-04T09:00:00.000Z',
      agenda: ['One', 'Two'],
      convenedBy: 's1',
    });

    expect(notice.body).toContain('  · One');
    expect(notice.body).toContain('  · Two');
  });
});

describe('a relay that is wired and broken', () => {
  it('does not make it look as though no sitting was called', async () => {
    await boot(new Broken());

    const res = await convene();
    /*
     * Whatever the route does with the throw, the one outcome that must not
     * happen is the board believing it never convened. Either the reply
     * carries the meeting, or the meeting is in the record — and here both
     * are checked, because a 500 with the sitting saved is survivable and a
     * 201 with nothing saved is not.
     */
    const listed = await request(app).get('/api/meetings').set('authorization', as('chair-a'));
    const saved = (listed.body.meetings as { meeting: { at: string } }[]).some((m) =>
      m.meeting.at.startsWith('2027-03-04'),
    );
    expect(saved, `status was ${res.status}`).toBe(true);
  });
});

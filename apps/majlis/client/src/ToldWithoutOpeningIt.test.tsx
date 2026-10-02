import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Queue from './pages/Queue.js';
import { I18nProvider } from './lib/i18n.js';
import en from './locales/en.js';
import { forgetIdentity } from './lib/identity.js';
import { forgetMembers } from './lib/members.js';
import type { QueueRow } from './lib/api.js';

/**
 * What a member would be told, shown to them before they rely on it.
 *
 * ── why this is on the screen at all ──────────────────────────────────────
 *
 * A board is being asked to trust that a summary carrying its queue through a
 * bank's mail system gives nothing away. That is not a thing to take on
 * assurance, so the words are shown in full — and so is the other half, which
 * is that on most installations nothing is sent to anybody and this
 * application has no clock of its own.
 *
 * ── and what each of these holds shut ─────────────────────────────────────
 *
 *   - the words are shown, not described;
 *   - *nothing was sent* is said where nothing was, rather than a nicely
 *     formatted message that reads as a receipt;
 *   - the act to send it is absent where there is no channel to send it on,
 *     which is this application's rule for every control;
 *   - and nothing opens it where nothing is standing with the member.
 */

const NOTICE = {
  subject: '3 things are waiting on you at Demonstration Board',
  body:
    'This is what stands with you now.\n\n' +
    '  · A question from the institution — 78 days, past its date\n    /questions/q1\n\n' +
    'The longest has waited 78 days.\n',
  concerns: ['member-a'],
};

let channel: 'none' | 'smtp' = 'none';
let sent = 0;

const json = (body: unknown) =>
  Promise.resolve(
    new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }),
  );

const row = (over: Partial<QueueRow> = {}): QueueRow => ({
  kind: 'matter',
  id: 'm1',
  to: '/matters/m1',
  title: 'A matter',
  phase: 'deciding',
  next: { key: 'step.conditions.act' },
  whose: 'board',
  days: 3,
  overdue: false,
  ...over,
});

/**
 * Two rows, one of them this member's.
 *
 * Not one: the control that opens this is drawn only where something is
 * standing with the member, and a list where everything is theirs does not
 * draw the whose-filter at all — so a fixture of one row could not tell the
 * two states apart.
 */
function wire(rows: QueueRow[]) {
  sent = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/api/notices/waiting')) {
        if (init?.method === 'POST') {
          sent += 1;
          return json({
            asOf: '2026-10-01T00:00:00Z',
            notice: NOTICE,
            delivery: { kind: 'smtp', configured: true, sent: true, at: '2026-10-01T00:00:00Z', reached: 1 },
          });
        }
        return json({ asOf: '2026-10-01T00:00:00Z', notice: rows.some((r) => r.yours) ? NOTICE : null, channel });
      }
      if (url.includes('/api/attention'))
        return json({ scholarId: 'member-a', role: 'signatory', office: null, items: [] });
      if (url.includes('/api/settings')) return json({ members: [] });
      if (url.includes('/api/queue'))
        return json({ asOf: '2026-10-01T00:00:00Z', rows, waiting: rows.length, overdue: 0 });
      return json({});
    }),
  );
}

const show = () =>
  render(
    <I18nProvider>
      <MemoryRouter>
        <Queue />
      </MemoryRouter>
    </I18nProvider>,
  );

const open = async () => {
  fireEvent.click(await screen.findByRole('button', { name: en['waiting.whatWouldBeSent'] }));
};

beforeEach(() => {
  forgetIdentity();
  forgetMembers();
  channel = 'none';
});
afterEach(() => vi.unstubAllGlobals());

const MINE = [row({ id: 'mine', title: 'Yours to do', yours: true }), row({ id: 'theirs', title: 'With Bilal', who: 'member-b' })];

describe('what would be sent to you', () => {
  it('shows the words themselves, not a description of them', async () => {
    wire(MINE);
    show();
    await open();

    const said = await screen.findByText(NOTICE.subject, { exact: false });
    expect(said).toBeTruthy();
    expect(said.textContent).toContain('A question from the institution');
    expect(said.textContent).toContain('/questions/q1');
  });

  /* One member is not ‘members’, and this one concerns exactly one, always. */
  it('counts the one member it concerns in the singular', async () => {
    wire(MINE);
    show();
    await open();

    const counted = await screen.findByText(en['notice.concerns'], { exact: false });
    expect(counted.textContent).toBe(`${en['notice.concerns']} 1 ${en['notice.member']}`);
  });

  it('says nothing has been sent, where nothing has', async () => {
    wire(MINE);
    show();
    await open();

    expect(await screen.findByText(en['notice.notSent'])).toBeTruthy();
    expect(screen.getByText(en['waiting.noChannel'])).toBeTruthy();
  });

  /*
   * A control that cannot be honoured is absent, not disabled. With no relay
   * there is nothing for *send it to me now* to do, and a button that fails
   * when pressed is worse than one that was never there.
   */
  it('offers no act to send it where there is nothing to send it on', async () => {
    wire(MINE);
    show();
    await open();

    await screen.findByText(en['notice.notSent']);
    expect(screen.queryByRole('button', { name: en['waiting.sendToMe'] })).toBeNull();
  });

  it('offers it, and sends it, where a channel is wired', async () => {
    channel = 'smtp';
    wire(MINE);
    show();
    await open();

    fireEvent.click(await screen.findByRole('button', { name: en['waiting.sendToMe'] }));
    await waitFor(() => expect(sent).toBe(1));
    /* And then says so, rather than leaving the member to assume. */
    expect(await screen.findByText(en['notice.sentTo'] + ' 1')).toBeTruthy();
    expect(screen.queryByText(en['notice.notSent'])).toBeNull();
    expect(screen.getByText(en['waiting.noClock'])).toBeTruthy();
  });

  it('is not offered at all where nothing is standing with the member', async () => {
    wire([row({ id: 'theirs', title: 'With Bilal', who: 'member-b' })]);
    show();

    /* The list opens on *yours*, and nothing is. The screen says so. */
    await screen.findByText(en['needs.noneMine']);
    expect(screen.queryByRole('button', { name: en['waiting.whatWouldBeSent'] })).toBeNull();
  });
});

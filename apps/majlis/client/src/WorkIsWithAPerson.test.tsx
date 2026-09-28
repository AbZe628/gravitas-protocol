import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Queue from './pages/Queue.js';
import Holding from './components/Holding.js';
import Person, { initialsOf } from './components/Person.js';
import { whatToDoNow } from './components/NextAct.js';
import { I18nProvider } from './lib/i18n.js';
import { forgetIdentity, type Identity } from './lib/identity.js';
import { forgetMembers } from './lib/members.js';
import type { Matter, Passage, PassageStep, QueueRow } from './lib/api.js';

/**
 * Work placed with a person, as the screens show it.
 *
 * ── the faults these hold shut ────────────────────────────────────────────
 *
 *   - **the column that says who is holding something up said `member-a`.**
 *     The server names people by scholar id; drawn as it came, the column a
 *     board reads to see who has it showed a string from a configuration
 *     file.
 *   - **the card said *do this* to everybody** on a step placed with one
 *     member, which is how two people end up answering the same condition.
 *   - **what needs you** has to read the holder: a board step placed with a
 *     colleague is not yours, and a vote on something you carry is.
 *   - **the control offered what the server refuses** — taking work out of
 *     a colleague's hands.
 */

const MEMBERS = [
  { scholarId: 'member-a', name: 'Amina Chair', title: '', signatory: true, role: 'signatory', office: 'chair' },
  { scholarId: 'member-b', name: 'Bilal Rahman', title: '', signatory: true, role: 'signatory', office: null },
  { scholarId: 'member-c', name: 'Căsim Ode', title: '', signatory: true, role: 'signatory', office: null },
  { scholarId: 'advisor-1', name: 'Dunya Advises', title: '', signatory: false, role: 'advisory', office: null },
  { scholarId: 'liaison-1', name: 'Liaison Person', title: '', signatory: false, role: 'liaison', office: null },
];

function json(body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }),
  );
}

let posted: unknown[] = [];

function wire(me: Partial<Identity> & { scholarId: string }, rows: QueueRow[] = []) {
  posted = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === 'POST' && url.includes('/api/assignments')) {
        posted.push(JSON.parse(String(init.body)));
        return json({ assignment: {}, how: 'taken' });
      }
      if (url.includes('/api/attention'))
        return json({ role: 'signatory', office: null, items: [], ...me });
      if (url.includes('/api/settings')) return json({ members: MEMBERS });
      if (url.includes('/api/queue'))
        return json({ asOf: '2026-09-20T00:00:00Z', rows, waiting: rows.length, overdue: 0 });
      return json({});
    }),
  );
}

beforeEach(() => {
  forgetIdentity();
  forgetMembers();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const row = (over: Partial<QueueRow>): QueueRow => ({
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

describe('the queue', () => {
  it('names the person, never the scholar id', async () => {
    // Yours, so it is on the list the screen opens with.
    wire({ scholarId: 'member-b' }, [row({ who: 'member-b' })]);
    render(
      <I18nProvider>
        <MemoryRouter>
          <Queue />
        </MemoryRouter>
      </I18nProvider>,
    );
    await waitFor(() => expect(screen.getByText('Bilal Rahman')).toBeTruthy());
    expect(screen.queryByText('member-b')).toBeNull();
  });

  it('keeps a board step placed with a colleague off your list, and puts what you carry on it', async () => {
    wire({ scholarId: 'advisor-1', role: 'advisory' }, [
      row({ id: 'theirs', title: 'Placed with Bilal', who: 'member-b' }),
      row({ id: 'carried', title: 'Carried by you', whose: 'signatory', holder: 'advisor-1' }),
      row({ id: 'everyones', title: 'The board’s', whose: 'board' }),
    ]);
    render(
      <I18nProvider>
        <MemoryRouter>
          <Queue />
        </MemoryRouter>
      </I18nProvider>,
    );
    await waitFor(() => expect(screen.getByText('Carried by you')).toBeTruthy());
    expect(screen.getByText('The board’s')).toBeTruthy();
    expect(screen.queryByText('Placed with Bilal')).toBeNull();
  });
});

describe('the card that says what now', () => {
  const step = (over: Partial<PassageStep>): PassageStep => ({
    key: 'conditions',
    act: { key: 'step.conditions.act' },
    whose: 'board',
    state: 'open',
    at: null,
    standing: null,
    enforced: false,
    why: { key: 'x' },
    ...over,
  });
  const passage = (next: PassageStep): Passage => ({
    of: { kind: 'matter', id: 'm1' },
    groups: [{ key: 'shaping', order: 'set', steps: [next] }],
    next,
    waiting: null,
    settled: null,
  });
  const input = (next: PassageStep, scholarId: string) => ({
    passage: passage(next),
    matter: { status: 'deliberation', reasoning: [] } as unknown as Matter,
    identity: { scholarId, role: 'signatory', office: null } as Identity,
    doc: null,
    t: (k: string) => k,
    say: (s: { key: string } | null | undefined) => s?.key ?? '',
    go: () => undefined,
  });

  it('is quiet, and names the colleague, on a step placed with somebody else', () => {
    const doing = whatToDoNow(input(step({ who: 'member-b' }), 'member-c'))!;
    expect(doing.tone).toBe('waiting');
    expect(doing.act).toBeUndefined();
    expect(doing.who).toBe('member-b');
  });

  it('still says do this to the person it was placed with', () => {
    const doing = whatToDoNow(input(step({ who: 'member-c' }), 'member-c'))!;
    expect(doing.tone).toBe('act');
    expect(doing.act).toBeTruthy();
  });
});

describe('the control', () => {
  const p = (holder: string | null, holdable = true): Passage => ({
    of: { kind: 'breach', id: 'b1' },
    groups: [],
    next: null,
    waiting: null,
    settled: null,
    holder: holder ? { to: holder, by: holder, at: '2026-09-20T00:00:00Z' } : null,
    holdable,
  });

  const draw = async (who: Partial<Identity> & { scholarId: string }, passage: Passage) => {
    wire(who);
    const onChanged = vi.fn();
    const r = render(
      <I18nProvider>
        <Holding passage={passage} onChanged={onChanged} />
      </I18nProvider>,
    );
    // Settled once the list of members has been read.
    await waitFor(() => expect(r.container.textContent).not.toBe(''));
    await new Promise((ok) => setTimeout(ok, 0));
    return { ...r, onChanged };
  };

  it('offers taking what nobody holds, and writes it for you', async () => {
    const { onChanged } = await draw({ scholarId: 'member-c' }, p(null));
    fireEvent.click(await screen.findByRole('button', { name: /take this on/i }));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(posted).toEqual([{ ofKind: 'breach', ofId: 'b1', to: 'member-c' }]);
  });

  it('offers nothing to press on work in a colleague’s hands, and says whom to ask', async () => {
    const { container } = await draw({ scholarId: 'member-c' }, p('member-b'));
    await waitFor(() => expect(container.textContent).toContain('Bilal Rahman'));
    expect(within(container).queryAllByRole('button')).toHaveLength(0);
    expect(container.textContent).toMatch(/ask them/i);
  });

  it('lets the holder hand on or put back, and never lists the bank’s liaison', async () => {
    const { container } = await draw({ scholarId: 'member-b' }, p('member-b'));
    await waitFor(() => expect(screen.getByRole('button', { name: /put back/i })).toBeTruthy());
    const options = within(container)
      .getAllByRole('option')
      .map((o) => o.textContent);
    expect(options).toContain('Căsim Ode');
    expect(options).toContain('Dunya Advises');
    expect(options).not.toContain('Liaison Person');
    expect(options).not.toContain('Bilal Rahman');
  });

  it('lets the chair move work out of anybody’s hands', async () => {
    await draw({ scholarId: 'member-a', office: 'chair' }, p('member-b'));
    await waitFor(() => expect(screen.getByRole('button', { name: /put back/i })).toBeTruthy());
    expect(screen.getAllByRole('option').length).toBeGreaterThan(1);
  });

  it('is not drawn where there is nothing left to hold', async () => {
    wire({ scholarId: 'member-c' });
    const { container } = render(
      <I18nProvider>
        <Holding passage={p(null, false)} onChanged={() => undefined} />
      </I18nProvider>,
    );
    expect(container.textContent).toBe('');
  });
});

describe('a person, drawn', () => {
  it('is their name, and what the record holds where the board does not know them', async () => {
    wire({ scholarId: 'member-c' });
    const { container } = render(
      <I18nProvider>
        <p>
          <Person id="member-b" /> | <Person id="Treasury desk" />
        </p>
      </I18nProvider>,
    );
    await waitFor(() => expect(container.textContent).toContain('Bilal Rahman'));
    expect(container.textContent).toContain('Treasury desk');
    expect(container.textContent).not.toContain('member-b');
  });

  it('gives an avatar the initials of the name, not the first letter of the id', () => {
    expect(initialsOf('Bilal Rahman')).toBe('BR');
    expect(initialsOf('Amina')).toBe('A');
    expect(initialsOf('  ')).toBe('?');
    // The fault: every id on the demonstration board begins `member-`.
    expect(initialsOf('member-b')).toBe('M');
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Meetings from './pages/Meetings.js';
import { I18nProvider } from './lib/i18n.js';

/**
 * Meetings, as a record rather than a room.
 *
 * What these hold to: the page **decides nothing**, an agenda item that names
 * a matter links to it, and once a meeting is approved nothing on the screen
 * offers to change it.
 */

const NOTHING_TO_COUNT =
  'No meeting has been recorded for this board, so there is nothing to count the cadence from. ' +
  'That is an absence in this record rather than a finding about the board.';

const MINUTE = 'The board read the sukuk conditions and asked how the tangible ratio is measured.';

const meeting = (over: Record<string, unknown> = {}) => ({
  id: 'mt1',
  boardId: 'demo-board',
  at: '2026-01-15T09:00:00.000Z',
  joinUrl: null,
  agenda: [{ item: 'The sukuk conditions' }, { item: 'The tangible ratio', matterId: 'matter-2026-07-03' }],
  attendance: [
    { scholarId: 'member-a', present: true },
    { scholarId: 'member-b', present: false, note: 'Travelling.' },
  ],
  minute: MINUTE,
  recordedBy: 'clerk',
  closedAt: null,
  ...over,
});

const row = (over: Record<string, unknown> = {}, m: Record<string, unknown> = {}) => ({
  meeting: meeting(m),
  state: 'minuted',
  unaccountedFor: ['advisor-1'],
  ...over,
});

const data = (over: Record<string, unknown> = {}) => ({
  boardId: 'demo-board',
  meetings: [row()],
  attendance: [
    { scholarId: 'member-a', name: 'Mufti One', attended: 1, of: 1, notes: [] },
    { scholarId: 'member-b', name: 'Shaykh Two', attended: 0, of: 1, notes: ['Travelling.'] },
  ],
  cadence: {
    lastHeldAt: '2026-01-15T09:00:00.000Z',
    dueBy: '2026-07-15T09:00:00.000Z',
    overdue: false,
    nextConvenedAt: null,
    note: 'Counted as 6 months from the last meeting held.',
  },
  ...over,
});

const board = {
  id: 'demo-board',
  name: 'Board',
  quorumPermit: 3,
  quorumRestrict: 2,
  totalSignatories: 2,
  ratificationWindowHours: 168,
  members: [
    { id: 'member-a', name: 'Mufti One', title: 'Chair', signatory: true },
    { id: 'member-b', name: 'Shaykh Two', title: 'Member', signatory: true },
  ],
};

const posted: { url: string; method: string; body: unknown }[] = [];
let identity: Record<string, unknown> = { scholarId: 'member-a', role: 'signatory', office: 'chair' };

/*
 * The second argument is what a write answers with. Convening now comes
 * back carrying the notice it composed, and a stub that answered {} would
 * let the screen pass while telling a chair nothing about whether the
 * board was written to.
 */
function stub(body: unknown, wroteBack: unknown = {}) {
  posted.length = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const json = (b: unknown, status = 200) =>
        new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } });

      if (init?.method && init.method !== 'GET') {
        posted.push({ url, method: init.method, body: init.body ? JSON.parse(String(init.body)) : null });
        return json(wroteBack, 200);
      }
      if (url.includes('/api/attention')) return json(identity);
      if (url.includes('/api/boards/')) return json(board);
      return json(body);
    }),
  );
}

const show = () =>
  render(
    <I18nProvider>
      <MemoryRouter>
        <Meetings />
      </MemoryRouter>
    </I18nProvider>,
  );

afterEach(() => {
  vi.unstubAllGlobals();
  identity = { scholarId: 'member-a', role: 'signatory', office: 'chair' };
});

describe('the page leads with the clock', () => {
  it('shows when the board last met and when it is next due', async () => {
    stub(data());
    show();

    await waitFor(() => expect(screen.getByText('Last held')).toBeInTheDocument());
    expect(screen.getByText('Next due by')).toBeInTheDocument();
    expect(screen.getByText(/Counted as 6 months/)).toBeInTheDocument();
  });

  it('carries the server’s sentence where there is nothing to count from', async () => {
    stub(
      data({
        meetings: [],
        attendance: [],
        cadence: { lastHeldAt: null, dueBy: null, overdue: false, nextConvenedAt: null, note: NOTHING_TO_COUNT },
      }),
    );
    show();

    // An absence in this record rather than a finding about the board.
    await waitFor(() => expect(screen.getByText(NOTHING_TO_COUNT)).toBeInTheDocument());
    expect(screen.queryByText('Next due by')).toBeNull();
  });

  it('says plainly when nothing has been recorded, and why recording one helps', async () => {
    stub(data({ meetings: [], attendance: [] }));
    show();
    await waitFor(() =>
      expect(screen.getByText(/gives the clock something to count from/)).toBeInTheDocument(),
    );
  });
});

describe('a meeting decides nothing', () => {
  it('links an agenda item that names a matter to that matter', async () => {
    stub(data());
    show();

    await waitFor(() => expect(screen.getByText('The tangible ratio')).toBeInTheDocument());
    expect(screen.getByText('The tangible ratio').closest('a')).toHaveAttribute(
      'href',
      '/matters/matter-2026-07-03',
    );
    // An item that is not a matter is not a link to nowhere.
    expect(screen.getByText('The sukuk conditions').closest('a')).toBeNull();
  });

  it('offers no control that approves anything', async () => {
    stub(data());
    show();

    await waitFor(() => screen.getByText('The sukuk conditions'));
    const labels = screen.queryAllByRole('button').map((b) => b.textContent ?? '');
    for (const word of ['Approve the product', 'Vote', 'Ratify']) {
      expect(labels.join(' ')).not.toContain(word);
    }
  });

  it('reaches no verdict anywhere', async () => {
    stub(data());
    show();

    await waitFor(() => screen.getByText('The sukuk conditions'));
    const text = (document.body.textContent ?? '').toLowerCase();
    for (const claim of ['halal', 'haram', 'is compliant', 'resolved that']) {
      expect(text).not.toContain(claim);
    }
  });
});

describe('attendance is recorded, never assumed', () => {
  it('names who was not accounted for rather than marking them absent', async () => {
    stub(data());
    show();

    await waitFor(() => expect(screen.getByText(/Not accounted for/)).toBeInTheDocument());
    expect(screen.getByText(/advisor-1/)).toBeInTheDocument();
  });

  it('sends only the members the board answered for', async () => {
    stub(data());
    show();

    await waitFor(() => screen.getByRole('button', { name: /Record attendance/ }));
    fireEvent.click(screen.getByRole('button', { name: /Record attendance/ }));

    /*
     * The press opens the window that says what attendance is: the thing a
     * quorum is counted from, read by anybody later checking the board was
     * properly constituted. The act is the press inside it.
     */
    {
      const w = await screen.findByRole('dialog');
      expect(w.textContent).toContain('quorum is counted from');
      fireEvent.click(within(w).getByRole('button', { name: /Record attendance/ }));
    }

    await waitFor(() => expect(posted).toHaveLength(1));
    const body = posted[0].body as { attendance: { scholarId: string }[] };
    expect(body.attendance.map((a) => a.scholarId).sort()).toEqual(['member-a', 'member-b']);
    // advisor-1 was never answered for, and is not sent as absent.
    expect(body.attendance.map((a) => a.scholarId)).not.toContain('advisor-1');
  });

  it('carries the reason the board gave for an absence', async () => {
    stub(data());
    show();

    await waitFor(() => screen.getByRole('button', { name: /Record attendance/ }));
    fireEvent.click(screen.getByRole('button', { name: /Record attendance/ }));

    /*
     * The press opens the window that says what attendance is: the thing a
     * quorum is counted from, read by anybody later checking the board was
     * properly constituted. The act is the press inside it.
     */
    {
      const w = await screen.findByRole('dialog');
      expect(w.textContent).toContain('quorum is counted from');
      fireEvent.click(within(w).getByRole('button', { name: /Record attendance/ }));
    }

    await waitFor(() => expect(posted).toHaveLength(1));
    const body = posted[0].body as { attendance: { scholarId: string; note?: string }[] };
    expect(body.attendance.find((a) => a.scholarId === 'member-b')?.note).toBe('Travelling.');
  });
});

describe('once approved, nothing offers to change it', () => {
  it('shows the record and no controls', async () => {
    stub(data({ meetings: [row({ state: 'closed' }, { closedAt: '2026-01-15T12:00:00.000Z' })] }));
    show();

    // A closed meeting starts collapsed: twenty of them all open is a wall.
    await waitFor(() => expect(screen.getByText('Approved')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Show the record/ }));

    expect(screen.queryByRole('button', { name: /Record attendance/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Save the minute/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Approve the minute/ })).toBeNull();
    // The minute is still readable.
    expect(screen.getByText(MINUTE)).toBeInTheDocument();
  });

  it('says what approving the minute means before offering it', async () => {
    stub(data());
    show();
    await waitFor(() =>
      expect(screen.getByText(/nothing about the meeting changes/)).toBeInTheDocument(),
    );
  });
});

describe('who is offered what', () => {
  it('lets only the chair convene', async () => {
    identity = { scholarId: 'clerk', role: 'advisory', office: 'secretary' };
    stub(data());
    show();

    await waitFor(() => screen.getByText('The sukuk conditions'));
    expect(screen.queryByRole('button', { name: /Convene a meeting/ })).toBeNull();
    // The secretary still keeps the minute.
    expect(screen.getByRole('button', { name: /Save the minute/ })).toBeInTheDocument();
  });

  it('offers an ordinary signatory nothing to press', async () => {
    identity = { scholarId: 'member-b', role: 'signatory', office: null };
    stub(data());
    show();

    await waitFor(() => screen.getByText('The sukuk conditions'));
    expect(screen.queryByRole('button', { name: /Convene a meeting/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Save the minute/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Record attendance/ })).toBeNull();
  });

  it('sends the agenda as one item per line', async () => {
    stub(data());
    show();

    await waitFor(() => screen.getByRole('button', { name: /Convene a meeting/ }));
    fireEvent.click(screen.getByRole('button', { name: /Convene a meeting/ }));

    fireEvent.change(screen.getByLabelText(/When/i), { target: { value: '2026-09-10T09:00' } });
    fireEvent.change(screen.getByLabelText(/Agenda, one item per line/i), {
      target: { value: 'The sukuk conditions\n\nThe tangible ratio\n' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Convene it/ }));

    /*
     * Convening sets the date everything else counts from, so the press
     * opens the window that says so. The act is the press inside it.
     */
    {
      const w = await screen.findByRole('dialog');
      expect(w.textContent).toContain('counted from the last one held');
      fireEvent.click(within(w).getByRole('button', { name: /Convene it/ }));
    }

    await waitFor(() => expect(posted).toHaveLength(1));
    const body = posted[0].body as { agenda: { item: string }[] };
    // Blank lines are not agenda items.
    expect(body.agenda.map((a) => a.item)).toEqual(['The sukuk conditions', 'The tangible ratio']);
  });
});

describe('attendance across the year', () => {
  it('reports each member separately rather than averaging them', async () => {
    stub(data());
    show();

    await waitFor(() => expect(screen.getByText(/Attendance across/)).toBeInTheDocument());
    // Named twice on purpose: once in the attendance controls, once in the
    // summary across the year.
    expect(screen.getAllByText('Mufti One').length).toBeGreaterThan(0);
    // The count and the reason sit in separate elements, so they are read off
    // the row together rather than matched as one string.
    const rowsFor = (name: string) =>
      screen.getAllByText(name).map((el) => el.closest('li')?.textContent ?? '');

    expect(rowsFor('Shaykh Two').some((text) => text.includes('0 of 1'))).toBe(true);
    expect(rowsFor('Shaykh Two').some((text) => text.includes('Travelling.'))).toBe(true);
    expect(rowsFor('Mufti One').some((text) => text.includes('1 of 1'))).toBe(true);
  });

  it('does not crash on a payload that is not a listing', async () => {
    stub([]);
    show();
    await waitFor(() => expect(screen.queryByText('Last held')).toBeNull());
  });
});

/**
 * The form a chair arrives at, and why it looked broken.
 *
 * *"Kad odes u coming i stisnes convene meeting ne desi se nista."* From
 * where the chair was standing that was true. Coming sends them here with
 * the form already open; the act is greyed out because there is no date;
 * and nothing on the screen says so. A disabled button with no sentence
 * beside it is indistinguishable from a broken one.
 *
 * The agenda was the worse of the two. It was not gated at all, so a chair
 * with a date and no agenda pressed, waited, and got a refusal from the
 * server — the right rule, learned in the wrong place.
 */
describe('convening says what it still needs', () => {
  const open = async () => {
    stub(data());
    show();
    await waitFor(() => screen.getByRole('button', { name: /Convene a meeting/ }));
    fireEvent.click(screen.getByRole('button', { name: /Convene a meeting/ }));
  };

  it('names both, on a form that has just opened', async () => {
    await open();

    expect(screen.getByRole('button', { name: /Convene it/ })).toBeDisabled();
    expect(screen.getByText(/Set the day and time/)).toBeInTheDocument();
    expect(screen.getByText(/one item to a line/)).toBeInTheDocument();
  });

  it('still refuses on a date alone, which is the half that reached the server', async () => {
    await open();
    fireEvent.change(screen.getByLabelText(/When/i), { target: { value: '2026-09-10T09:00' } });

    expect(screen.getByRole('button', { name: /Convene it/ })).toBeDisabled();
    expect(screen.queryByText(/Set the day and time/)).not.toBeInTheDocument();
    expect(screen.getByText(/one item to a line/)).toBeInTheDocument();
  });

  it('opens once the sitting has a day and something to sit about', async () => {
    await open();
    fireEvent.change(screen.getByLabelText(/When/i), { target: { value: '2026-09-10T09:00' } });
    fireEvent.change(screen.getByLabelText(/Agenda, one item per line/i), {
      target: { value: 'The sukuk conditions' },
    });

    expect(screen.getByRole('button', { name: /Convene it/ })).toBeEnabled();
    expect(screen.queryByText(/one item to a line/)).not.toBeInTheDocument();
  });

  it('counts blank lines as nothing, like the agenda itself does', async () => {
    await open();
    fireEvent.change(screen.getByLabelText(/When/i), { target: { value: '2026-09-10T09:00' } });
    fireEvent.change(screen.getByLabelText(/Agenda, one item per line/i), {
      target: { value: '\n   \n' },
    });

    expect(screen.getByRole('button', { name: /Convene it/ })).toBeDisabled();
  });
});

/**
 * A sitting nobody was told about.
 *
 * Convening is the one act on this screen that asks people to be somewhere,
 * and being told inside the application is only being told if you happen to
 * look. The server composes the words; under the ordinary installation
 * nothing carries them, and a chair who leaves this screen believing the
 * board has been written to is the failure.
 */
describe('convening shows what the board would be told', () => {
  it('shows the words, and that they did not go', async () => {
    stub(data(), {
      notice: {
        subject: 'A board will sit on 2027-03-04',
        body: 'chair called a sitting.\n\n  · The sukuk conditions',
        concerns: ['s1', 's2'],
      },
      delivery: { kind: 'none', configured: false, sent: false, at: '2026-09-21T10:00:00.000Z' },
    });
    show();

    await waitFor(() => screen.getByRole('button', { name: /Convene a meeting/ }));
    fireEvent.click(screen.getByRole('button', { name: /Convene a meeting/ }));
    fireEvent.change(screen.getByLabelText(/When/i), { target: { value: '2027-03-04T09:00' } });
    fireEvent.change(screen.getByLabelText(/Agenda, one item per line/i), {
      target: { value: 'The sukuk conditions' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Convene it/ }));
    {
      const w = await screen.findByRole('dialog');
      fireEvent.click(within(w).getByRole('button', { name: /Convene it/ }));
    }

    // The words themselves, as they would be pasted into an email.
    await waitFor(() =>
      expect(screen.getByText(/A board will sit on 2027-03-04/)).toBeInTheDocument(),
    );
    // And the fact that nothing carried them.
    expect(screen.getByText(/Majlis has not sent this/i)).toBeInTheDocument();
    expect(screen.getByText(/Nobody has been told yet/i)).toBeInTheDocument();
  });
});

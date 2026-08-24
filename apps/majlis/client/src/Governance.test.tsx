import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App.js';
import { I18nProvider } from './lib/i18n.js';

/**
 * The Stage Two interface: threads, the tally, the vote form, the actions.
 *
 * What these hold to is that the interface never offers what the server would
 * refuse, and that when the server does refuse it says so in the server's own
 * words rather than replacing them with a generic apology.
 */

const T0 = '2026-08-24T09:00:00.000Z';

type Matter = Record<string, unknown>;

function matter(over: Partial<Matter> = {}): Matter {
  return {
    id: 'm1',
    boardId: 'demo-board',
    title: 'Whether a wrapper inherits its underlying ruling',
    origin: 'institution_request',
    direction: 'permit',
    status: 'deliberation',
    openedAt: T0,
    proposal: 'The board is asked whether the wrapper is a separate asset.',
    notDecided: [],
    mechanism: '',
    interactsWith: [],
    proposedRule: {
      id: 'r1', boardId: 'demo-board', title: '', statement: '', parameters: [],
      parameterHash: '', version: 1, inForceFrom: null, sources: [],
    },
    simulation: null,
    deliberation: [],
    reasoning: [],
    timelockStartedAt: null,
    timelockEndsAt: null,
    objections: [],
    inForceAt: null,
    sources: [],
    ...over,
  };
}

interface Setup {
  role?: string;
  scholarId?: string;
  matter?: Matter;
  tally?: Record<string, unknown>;
  /** Refuse the next POST with this. */
  refuse?: { status: number; error: string; message: string };
}

const posted: { url: string; body: unknown }[] = [];

function stub(setup: Setup = {}) {
  const current = setup.matter ?? matter();

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const json = (body: unknown, status = 200) =>
        new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

      if (init?.method === 'POST') {
        posted.push({ url, body: init.body ? JSON.parse(String(init.body)) : null });
        if (setup.refuse) {
          return json({ error: setup.refuse.error, message: setup.refuse.message }, setup.refuse.status);
        }
        return json(current);
      }

      if (url.includes('/api/attention')) {
        return json({
          scholarId: setup.scholarId ?? 'member-a',
          role: setup.role ?? 'signatory',
          outstanding: 0,
          overdue: 0,
          items: [],
        });
      }
      if (url.includes('/tally')) {
        return json(setup.tally ?? { for: 1, against: 0, abstain: 0, required: 3, met: false, outstanding: ['member-b'] });
      }
      if (url.includes('/api/matters/')) return json(current);
      if (url.includes('/api/matters')) return json([]);
      if (url.includes('/api/registry')) return json({ address: '0x0', chainId: 421614, readAt: T0, reachable: false });
      return json([]);
    }),
  );
}

function renderMatter() {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={['/matters/m1']}>
        <App />
      </MemoryRouter>
    </I18nProvider>,
  );
}

beforeEach(() => posted.splice(0));
afterEach(() => vi.unstubAllGlobals());

// ── threads ───────────────────────────────────────────────────────────────

describe('the deliberation reads as a thread', () => {
  it('shows a reply under the point it answers', async () => {
    stub({
      matter: matter({
        deliberation: [
          { id: 'd1', scholarId: 'member-a', body: 'Does the wrapper hold the underlying?', at: T0, replyTo: null, liaisonAnswer: false },
          { id: 'd2', scholarId: 'liaison-1', body: 'It holds the underlying.', at: T0, replyTo: 'd1', liaisonAnswer: true },
        ],
      }),
    });
    renderMatter();

    const question = await screen.findByText(/Does the wrapper hold/);
    const answer = await screen.findByText(/It holds the underlying/);
    // The answer sits inside the entry it answers, not beside it.
    expect(question.closest('li')?.contains(answer)).toBe(true);
  });

  it('still shows a reply whose parent is gone', async () => {
    // Otherwise it would vanish from the record entirely.
    stub({
      matter: matter({
        deliberation: [
          { id: 'd2', scholarId: 'member-b', body: 'An orphaned reply.', at: T0, replyTo: 'missing', liaisonAnswer: false },
        ],
      }),
    });
    renderMatter();
    expect(await screen.findByText('An orphaned reply.')).toBeInTheDocument();
  });
});

// ── what is offered to whom ───────────────────────────────────────────────

describe('the interface does not offer what would be refused', () => {
  it('an observer is given no way to speak or vote', async () => {
    stub({ role: 'observer', matter: matter({ status: 'voting' }) });
    renderMatter();

    await screen.findByText(/Whether a wrapper/);
    expect(screen.queryByText('Add to the deliberation')).toBeNull();
    expect(screen.queryByText('Record my position')).toBeNull();
    expect(screen.queryByText('Close the vote')).toBeNull();
  });

  it('an advisory member may speak and not vote', async () => {
    stub({ role: 'advisory', matter: matter({ status: 'voting' }) });
    renderMatter();

    await waitFor(() => expect(screen.getByText('Add to the deliberation')).toBeInTheDocument());
    expect(screen.queryByText('Record my position')).toBeNull();
  });

  it('a signatory who has already voted is not asked again', async () => {
    stub({
      scholarId: 'member-a',
      matter: matter({
        status: 'voting',
        reasoning: [{ scholarId: 'member-a', position: 'for', reason: 'Long enough to be a reason.', at: T0 }],
      }),
    });
    renderMatter();

    await waitFor(() => expect(screen.getByText('Your position is recorded.')).toBeInTheDocument());
    expect(screen.queryByText('Record my position')).toBeNull();
  });
});

// ── a vote carries reasoning ──────────────────────────────────────────────

describe('a vote cannot be cast without reasoning', () => {
  it('the button stays disabled until something is written', async () => {
    stub({ matter: matter({ status: 'voting' }) });
    renderMatter();

    const submit = (await screen.findByText('Record my position')) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);

    const box = document.querySelectorAll('textarea');
    fireEvent.change(box[box.length - 1], { target: { value: 'short' } });
    expect((screen.getByText('Record my position') as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(box[box.length - 1], {
      target: { value: 'The mechanism is bounded by the signed minimums, which answers the concern.' },
    });
    await waitFor(() =>
      expect((screen.getByText('Record my position') as HTMLButtonElement).disabled).toBe(false),
    );
  });

  it('says why it is required rather than only refusing', async () => {
    stub({ matter: matter({ status: 'voting' }) });
    renderMatter();
    expect(await screen.findByText(/cannot be reviewed, cited or disagreed with later/)).toBeInTheDocument();
  });
});

// ── the tally and the clock ───────────────────────────────────────────────

describe('where the vote stands', () => {
  it('shows the count against the threshold and who is missing', async () => {
    stub({
      matter: matter({ status: 'voting' }),
      tally: { for: 2, against: 1, abstain: 0, required: 3, met: false, outstanding: ['member-c', 'member-d'] },
    });
    renderMatter();

    expect(await screen.findByText('2 / 3')).toBeInTheDocument();
    expect(screen.getByText('Threshold not met')).toBeInTheDocument();
    expect(screen.getByText(/member-c, member-d/)).toBeInTheDocument();
  });

  it('a running timelock says one signatory can still halt it', async () => {
    const ends = new Date(Date.now() + 12 * 3_600_000).toISOString();
    stub({ matter: matter({ status: 'timelock', timelockEndsAt: ends }) });
    renderMatter();

    expect(await screen.findByText('In its timelock')).toBeInTheDocument();
    expect(screen.getByText(/Any one signatory can halt this/)).toBeInTheDocument();
    // Not yet ready, so it is not offered.
    expect(screen.queryByText('Bring into force')).toBeNull();
  });

  it('an elapsed timelock offers to bring it into force', async () => {
    const ended = new Date(Date.now() - 3_600_000).toISOString();
    stub({ matter: matter({ status: 'timelock', timelockEndsAt: ended }) });
    renderMatter();

    expect(await screen.findByText('The timelock has run')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Bring into force')).toBeInTheDocument());
  });
});

// ── refusals ──────────────────────────────────────────────────────────────

describe('when the server refuses', () => {
  it('the reason it gives is what the reader sees', async () => {
    stub({
      matter: matter({ status: 'deliberation' }),
      refuse: {
        status: 409,
        error: 'no_deliberation',
        message: 'Nothing has been said on this matter yet. Voting opens after deliberation, not instead of it.',
      },
    });
    renderMatter();

    const open = await screen.findByText('Open the vote');
    fireEvent.click(open);

    // Verbatim. Replacing it with "something went wrong" throws away the only
    // part that helps.
    expect(await screen.findByText(/Voting opens after deliberation, not instead of it/)).toBeInTheDocument();
  });
});

// ── what is sent ──────────────────────────────────────────────────────────

describe('what the interface sends', () => {
  it('a reply carries the id of the entry it answers', async () => {
    stub({
      matter: matter({
        deliberation: [
          { id: 'd1', scholarId: 'member-a', body: 'A question about the mechanism.', at: T0, replyTo: null, liaisonAnswer: false },
        ],
      }),
    });
    renderMatter();

    fireEvent.click(await screen.findByText('Reply'));
    const boxes = document.querySelectorAll('textarea');
    fireEvent.change(boxes[0], { target: { value: 'An answer to it.' } });
    fireEvent.click(screen.getAllByText('Add to the deliberation')[0]);

    await waitFor(() => expect(posted.length).toBeGreaterThan(0));
    expect(posted[0].url).toContain('/deliberation');
    expect((posted[0].body as { replyTo: string }).replyTo).toBe('d1');
  });

  it('never sends a scholarId — the server takes it from the credential', async () => {
    stub({ matter: matter({ status: 'voting' }) });
    renderMatter();

    // The identity arrives asynchronously, so the form is not there on first paint.
    await screen.findByText('Record my position');
    const boxes = document.querySelectorAll('textarea');
    fireEvent.change(boxes[boxes.length - 1], {
      target: { value: 'The mechanism is bounded by the signed minimums, which answers this.' },
    });
    await waitFor(() =>
      expect((screen.getByText('Record my position') as HTMLButtonElement).disabled).toBe(false),
    );
    fireEvent.click(screen.getByText('Record my position'));

    await waitFor(() => expect(posted.length).toBeGreaterThan(0));
    expect(posted[0].body).not.toHaveProperty('scholarId');
  });
});

// ── raising a matter ──────────────────────────────────────────────────────

describe('raising a matter', () => {
  function renderDashboard() {
    return render(
      <I18nProvider>
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
      </I18nProvider>,
    );
  }

  it('is offered to anyone who deliberates and not to an observer', async () => {
    stub({ role: 'observer' });
    renderDashboard();
    await waitFor(() => expect(screen.queryByText('Raise a matter')).toBeNull());

    vi.unstubAllGlobals();
    stub({ role: 'advisory' });
    renderDashboard();
    await waitFor(() => expect(screen.getAllByText('Raise a matter').length).toBeGreaterThan(0));
  });

  it('will not submit until the direction has been chosen', async () => {
    stub({ role: 'signatory' });
    renderDashboard();

    fireEvent.click(await screen.findByText('Raise a matter'));

    const input = document.querySelector('input') as HTMLInputElement;
    const areas = document.querySelectorAll('textarea');
    fireEvent.change(input, { target: { value: 'Whether a wrapper inherits its ruling' } });
    fireEvent.change(areas[0], { target: { value: 'The board is asked to decide.' } });

    // Direction decides how the whole process runs, so it is not defaulted.
    expect((screen.getByText('Open as a draft') as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByText(/It restricts something/));
    await waitFor(() =>
      expect((screen.getByText('Open as a draft') as HTMLButtonElement).disabled).toBe(false),
    );
  });

  it('sends what was chosen, and splits the not-decided lines', async () => {
    stub({ role: 'signatory' });
    renderDashboard();

    fireEvent.click(await screen.findByText('Raise a matter'));
    const input = document.querySelector('input') as HTMLInputElement;
    const areas = document.querySelectorAll('textarea');
    fireEvent.change(input, { target: { value: 'A question for the board' } });
    fireEvent.change(areas[0], { target: { value: 'What is proposed.' } });
    fireEvent.change(areas[1], { target: { value: 'Not the underlying asset\n\nNot other wrappers' } });
    fireEvent.click(screen.getByText(/It permits something/));

    await waitFor(() =>
      expect((screen.getByText('Open as a draft') as HTMLButtonElement).disabled).toBe(false),
    );
    fireEvent.click(screen.getByText('Open as a draft'));

    await waitFor(() => expect(posted.length).toBeGreaterThan(0));
    const body = posted[0].body as { direction: string; notDecided: string[]; boardId: string };
    expect(body.direction).toBe('permit');
    expect(body.notDecided).toEqual(['Not the underlying asset', 'Not other wrappers']);
    expect(body.boardId).toBe('demo-board');
  });
});

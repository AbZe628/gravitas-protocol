import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from './lib/i18n.js';
import Ask from './pages/Ask.js';

/**
 * A link that leads to a refusal is a link that lied.
 *
 * ── what it did ───────────────────────────────────────────────────────────
 *
 * A bank whose question had been taken up was offered *see the matter this
 * became*, pointing at `/matters/:id` — the board's own working screen. An
 * institution opening it is told *this one is the board's; you have nothing
 * to do on it*, and given three other places to go. So the one path the
 * product is sold on ended, for the customer, at a door that shuts.
 *
 * Found by walking it as the bank, after the board had decided: the desk had
 * a ruling waiting for it and a link to somewhere it could not stand.
 *
 * ── what a desk may read ──────────────────────────────────────────────────
 *
 * The written ruling, and only once there is one. The route says so itself —
 * *a document is produced when the board has decided, and not before* — and
 * refuses with 409 on anything earlier. So:
 *
 *   decided → the document, named and offered;
 *   not decided → a sentence saying the board has it, and no link at all.
 *
 * Both are true at every moment, which the old link never was.
 */

const submission = (over: Record<string, unknown> = {}) => ({
  id: 'sub-1',
  boardId: 'demo-board',
  institutionId: 'demo-institution',
  arrivedAt: '2026-09-21T16:55:23.834Z',
  recordedAt: '2026-09-21T16:55:23.834Z',
  askedBy: 'desk-treasury',
  recordedBy: 'desk-treasury',
  onBehalf: false,
  subject: 'Interbank liquidity through a commodity murabaha',
  question: 'Whether the attached master agreement may be used for interbank placements.',
  background: '',
  awaiting: '',
  attachments: [],
  draft: null,
  dispositions: [],
  standing: 'opened',
  matterId: 'm1',
  waitedHours: 2,
  ...over,
});

function stub(status: string) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const json = (b: unknown) =>
        new Response(JSON.stringify(b), { status: 200, headers: { 'Content-Type': 'application/json' } });

      if (url.includes('/api/submissions')) return json({ submissions: [submission()] });
      if (url.includes('/api/matters/m1'))
        return json({ id: 'm1', boardId: 'demo-board', title: 'A matter', status });
      if (url.includes('/api/attention'))
        return json({ scholarId: 'desk-treasury', role: 'institution', office: null, outstanding: 0, overdue: 0, items: [] });
      if (url.includes('/api/health'))
        return json({
          ok: true,
          stage: 2,
          governanceWrites: true,
          signingAuthority: false,
          recordSince: null,
          enforcement: 'none',
          assistantKind: 'off',
          documents: 'none',
          reading: 'off',
          notice: 'none',
        });
      return json({});
    }),
  );
}

const show = () =>
  render(
    <MemoryRouter>
      <I18nProvider>
        <Ask boardId="demo-board" />
      </I18nProvider>
    </MemoryRouter>,
  );

const intoTheBoardsScreen = () =>
  [...document.querySelectorAll('a')].filter((a) => /^\/matters\//.test(a.getAttribute('href') ?? ''));

afterEach(() => vi.unstubAllGlobals());

describe('a question the board has decided', () => {
  it('offers the desk the ruling itself', async () => {
    stub('timelock');
    show();

    await waitFor(() => {
      const doc = [...document.querySelectorAll('a')].find((a) =>
        (a.getAttribute('href') ?? '').endsWith('/fatwa'),
      );
      expect(doc, 'a link to the written ruling').toBeTruthy();
    });
  });

  it('and does not send it to the board’s own screen', async () => {
    stub('in_force');
    show();

    await waitFor(() =>
      expect(
        [...document.querySelectorAll('a')].some((a) => (a.getAttribute('href') ?? '').endsWith('/fatwa')),
      ).toBe(true),
    );
    expect(intoTheBoardsScreen()).toHaveLength(0);
  });
});

describe('a question still being argued', () => {
  it('says the board has it, rather than offering a document that does not exist', async () => {
    stub('deliberation');
    show();

    await screen.findByText(/The board has it/);
    expect(
      [...document.querySelectorAll('a')].some((a) => (a.getAttribute('href') ?? '').endsWith('/fatwa')),
    ).toBe(false);
  });

  it('and sends the desk nowhere it will be turned away from', async () => {
    stub('voting');
    show();

    await screen.findByText(/The board has it/);
    expect(intoTheBoardsScreen()).toHaveLength(0);
  });
});

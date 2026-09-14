import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VotePanel from './components/VotePanel.js';
import { I18nProvider } from './lib/i18n.js';
import type { Matter } from './lib/api.js';

/**
 * A vote that cannot be opened is not offered.
 *
 * ── the rule this keeps ───────────────────────────────────────────────────
 *
 * The server refuses to open a vote while a condition of the shape has no
 * answer. A button that leads to a refusal is a button that lied, and this
 * application's rule everywhere else is that a control which cannot be
 * honoured is **absent, not disabled**.
 *
 * The gate went in first and the button stayed lit for a day, which is how a
 * chair learns to distrust the screen: press, read a refusal, press again
 * tomorrow. What stands in its place says how many conditions are left, so the
 * missing button is explained rather than merely missing.
 *
 * ── and it comes back ─────────────────────────────────────────────────────
 *
 * The half worth guarding hardest. A screen that hid the vote and never
 * returned it would stop the board dead, and a test that only checked the
 * hiding would pass on exactly that.
 */

const matter = (over: Partial<Matter> = {}): Matter =>
  ({
    id: 'matter-1',
    boardId: 'demo-board',
    title: 'Whether this arrangement may be offered',
    status: 'deliberation',
    direction: 'permit',
    origin: 'institution_request',
    openedAt: '2026-09-01T00:00:00Z',
    timelockEndsAt: null,
    inForceAt: null,
    notDecided: [],
    reasoning: [],
    deliberation: [],
    objections: [],
    sources: [],
    interactsWith: [],
    mechanism: '',
    proposedRule: { parameters: [], sources: [] },
    simulation: null,
    ...over,
  }) as unknown as Matter;

function show(stepsOutstanding: number, status = 'deliberation') {
  return render(
    <I18nProvider>
      <MemoryRouter>
        <VotePanel
          matter={matter({ status: status as Matter['status'] })}
          role="signatory"
          scholarId="member-a"
          onChanged={() => undefined}
          stepsOutstanding={stepsOutstanding}
        />
      </MemoryRouter>
    </I18nProvider>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('while a condition has no answer', () => {
  it('does not offer to open the vote', async () => {
    show(6);
    await waitFor(() =>
      expect(screen.getByText(/have no answer yet/)).toBeInTheDocument(),
    );
    expect(screen.queryByRole('button', { name: /open the vote/i })).toBeNull();
  });

  it('says how many are left, so the missing button is explained', async () => {
    show(3);
    await waitFor(() => expect(screen.getByText(/^3 /)).toBeInTheDocument());
  });
});

describe('once every condition is answered', () => {
  it('offers the vote again', async () => {
    show(0);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /open the vote/i })).toBeInTheDocument(),
    );
    expect(screen.queryByText(/have no answer yet/)).toBeNull();
  });

  /*
   * A matter judged against no shape reports zero, which is the same state as
   * every condition answered and is treated the same. Most of a board's work
   * is this, and a gate that held it up would be the rule applied where it
   * does not belong.
   */
  it('offers it on a matter that is judged against no shape at all', async () => {
    show(0);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /open the vote/i })).toBeInTheDocument(),
    );
  });
});

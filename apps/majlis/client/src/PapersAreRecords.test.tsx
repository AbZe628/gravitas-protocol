import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Briefings from './pages/Briefings.js';
import BriefingDetail from './pages/BriefingDetail.js';
import { I18nProvider } from './lib/i18n.js';

/**
 * A briefing is a record, and can be sent to somebody.
 *
 * The screen used to print every briefing in full — the account, the rules it
 * touches, the question addressed to the board and the form for opening a
 * matter — one under the other. Three of them made a page a member scrolled
 * through to reach the third, and there was no address for any single one, so
 * a chair could not say *read this one* to anybody.
 *
 * What these hold to is the split: the list names each briefing and points at
 * it, and the question addressed to the board is on the briefing's own page
 * where it can be answered.
 */

const briefing = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  publishedAt: '2026-05-04T00:00:00Z',
  title: id === 'b1' ? 'Settlement finality moved to two blocks' : 'Standing approvals withdrawn',
  whatChanged: 'The settlement window changed.',
  whyChanged: 'The network shortened its finality.',
  touchesRules: ['rule-stablecoin-par'],
  questionForBoard: 'Does the shortened window change what the board ruled about deferred payment?',
  sources: [],
  raisedBy: 'technical_team',
  ...over,
});

let items: unknown[] = [briefing('b1'), briefing('b2')];

function stub() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const json = (b: unknown) =>
        new Response(JSON.stringify(b), { status: 200, headers: { 'Content-Type': 'application/json' } });
      if (url.includes('/api/attention')) return json({ scholarId: 'member-a', role: 'signatory' });
      if (url.includes('/api/briefings')) return json(items);
      return json([]);
    }),
  );
}

const showList = () =>
  render(
    <I18nProvider>
      <MemoryRouter>
        <Briefings />
      </MemoryRouter>
    </I18nProvider>,
  );

const showOne = (id: string) =>
  render(
    <I18nProvider>
      <MemoryRouter initialEntries={[`/briefings/${id}`]}>
        <Routes>
          <Route path="/briefings/:id" element={<BriefingDetail />} />
        </Routes>
      </MemoryRouter>
    </I18nProvider>,
  );

afterEach(() => {
  vi.unstubAllGlobals();
  items = [briefing('b1'), briefing('b2')];
});

describe('the list points at each briefing', () => {
  it('gives every briefing an address of its own', async () => {
    stub();
    showList();

    await waitFor(() =>
      expect(screen.getByText('Settlement finality moved to two blocks')).toBeInTheDocument(),
    );
    expect(screen.getByText('Settlement finality moved to two blocks').closest('a')).toHaveAttribute(
      'href',
      '/briefings/b1',
    );
    expect(screen.getByText('Standing approvals withdrawn').closest('a')).toHaveAttribute(
      'href',
      '/briefings/b2',
    );
  });

  it('does not print the whole paper on the list', async () => {
    stub();
    showList();

    await waitFor(() => screen.getByText('Standing approvals withdrawn'));
    // The heading a briefing's account sits under belongs on the briefing.
    expect(screen.queryByText('What changed, and why')).toBeNull();
  });
});

describe('the briefing itself', () => {
  it('carries the question addressed to the board', async () => {
    stub();
    showOne('b1');

    await waitFor(() => expect(screen.getByText('Question for the board')).toBeInTheDocument());
    expect(screen.getByText(/shortened window/)).toBeInTheDocument();
  });

  it('offers the act that answers it', async () => {
    stub();
    showOne('b1');

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /Put this question to the board/ }),
      ).toBeInTheDocument(),
    );
  });

  it('says so plainly when there is no briefing at that address', async () => {
    stub();
    showOne('b-missing');

    await waitFor(() =>
      expect(screen.getByText('No briefing with that reference.')).toBeInTheDocument(),
    );
  });
});

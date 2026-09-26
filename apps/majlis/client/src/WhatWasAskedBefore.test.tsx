import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Assistant from './pages/Assistant.js';
import Record from './pages/Record.js';
import { I18nProvider } from './lib/i18n.js';

/**
 * Everything ever asked of the assistant, on the assistant's own screen.
 *
 * It used to stand at the foot of the record screen, beneath the board's
 * decisions and three other boxes — a second record under the first, on a
 * screen nobody opens wondering what the assistant was asked. Moving it is
 * only safe if it is still drawn, and drawn with its entries, which is what
 * these hold to. The record screen is checked from the other side: it must
 * no longer be the place the log lives.
 */

const exchange = (id: string, question: string, over: Record<string, unknown> = {}) => ({
  id,
  at: '2026-08-11T09:20:00Z',
  question,
  answer: 'The waiting period runs from the vote, not from the sitting.',
  sources: [],
  declinedAsRuling: false,
  escalated: false,
  ...over,
});

let log: unknown[] = [
  exchange('x1', 'What does the cooldown actually do?'),
  exchange('x2', 'How is a restriction ratified?', { escalated: true }),
];

function stub() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const json = (b: unknown) =>
        new Response(JSON.stringify(b), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      if (url.includes('/api/attention')) return json({ scholarId: 'member-a', role: 'signatory' });
      if (url.includes('/api/assistant/log')) return json(log);
      if (url.includes('/api/health')) return json({ assistantKind: 'anthropic' });
      return json([]);
    }),
  );
}

const show = (what: 'assistant' | 'record') =>
  render(
    <I18nProvider>
      <MemoryRouter>{what === 'assistant' ? <Assistant /> : <Record />}</MemoryRouter>
    </I18nProvider>,
  );

afterEach(() => {
  vi.unstubAllGlobals();
  log = [
    exchange('x1', 'What does the cooldown actually do?'),
    exchange('x2', 'How is a restriction ratified?', { escalated: true }),
  ];
});

describe('what was asked before', () => {
  it('is on the assistant screen, with every exchange', async () => {
    stub();
    show('assistant');

    await waitFor(() => {
      expect(screen.getByText('What does the cooldown actually do?')).toBeTruthy();
    });
    expect(screen.getByText('How is a restriction ratified?')).toBeTruthy();
  });

  /*
   * A section that says "none" where nothing was ever asked is a heading
   * with an apology under it. The screen already says what it is for.
   */
  it('says nothing at all when nothing has been asked', async () => {
    log = [];
    stub();
    show('assistant');

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
    });
    expect(screen.queryByText(/asked of the assistant/i)).toBeNull();
  });

  it('is no longer on the record screen', async () => {
    stub();
    show('record');

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
    });
    expect(screen.queryByText('What does the cooldown actually do?')).toBeNull();
  });
});

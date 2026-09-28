import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { NewsProvider } from './lib/news.js';
import { I18nProvider } from './lib/i18n.js';
import { forgetIdentity } from './lib/identity.js';

/**
 * The news behind the bell is not read for a bank desk.
 *
 * The bell and the announcement are hidden from a desk, and the news behind
 * them read the board's whole queue for it anyway, on every change to the
 * record: every matter and breach, and other desks' questions — the board's
 * work shipped to the bank for nothing. This holds that the news does not ask
 * for a desk, and that it still asks for a member, which is what makes the
 * first mean anything.
 *
 * It is not the boundary. The arrival screen still sends one queue request in
 * the half second before it knows a desk is reading (see `Arrival` in
 * App.tsx), and a browser can send anything it likes. What holds is the server,
 * which answers a desk with its own questions only —
 * server/test/the-desk-is-not-told.test.ts.
 */

function wire(role: string) {
  const asked: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      asked.push(url);
      const body = url.includes('/api/attention')
        ? { scholarId: role === 'institution' ? 'desk-treasury' : 'member-b', role, office: null, items: [] }
        : url.includes('/api/queue')
          ? { asOf: '', rows: [], waiting: 0, overdue: 0 }
          : {};
      return Promise.resolve(
        new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }),
      );
    }),
  );
  return asked;
}

const draw = () =>
  render(
    <I18nProvider>
      <NewsProvider>
        <span>the screen</span>
      </NewsProvider>
    </I18nProvider>,
  );

beforeEach(() => forgetIdentity());
afterEach(() => vi.unstubAllGlobals());

describe('the news behind the bell', () => {
  it('is not read for a bank desk', async () => {
    const asked = wire('institution');
    draw();
    await screen.findByText('the screen');
    await waitFor(() => expect(asked.some((u) => u.includes('/api/attention'))).toBe(true));
    await new Promise((ok) => setTimeout(ok, 50));
    expect(asked.filter((u) => u.includes('/api/queue'))).toEqual([]);
  });

  it('is read for a member of the board', async () => {
    const asked = wire('signatory');
    draw();
    await waitFor(() => expect(asked.some((u) => u.includes('/api/queue'))).toBe(true));
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from './lib/i18n.js';
import Shell from './components/Shell.js';

/**
 * What a bank's own installation cannot do, said on the face of it.
 *
 * Faza 10 is three things this application needs from outside — a key for
 * the reading assistant, a relay to tell anybody, and the owner's signature
 * to write to the registry — and one rule: **while a capability is absent
 * there is no button for it, and the screen says what is missing.**
 *
 * The first half held. The second was half-kept: signing, the chain and
 * the assistant were each named on the status bar, and the relay was not.
 * A notice composed and carried by nobody is visible only to whoever
 * happened to be looking at the screen that wrote it — so a board could
 * run for months believing the institution had been told.
 */

function stub(over: Record<string, unknown> = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const json = (b: unknown) =>
        new Response(JSON.stringify(b), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });

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
          ...over,
        });
      if (url.includes('/api/attention'))
        return json({ scholarId: 'member-a', role: 'signatory', office: null, outstanding: 0, overdue: 0, items: [] });
      return json({});
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

const show = () =>
  render(
    <MemoryRouter>
      <I18nProvider>
        <Shell>
          <div />
        </Shell>
      </I18nProvider>
    </MemoryRouter>,
  );

describe('the bare installation, which is the ordinary one', () => {
  it('says that nobody outside is told', async () => {
    stub();
    show();
    await screen.findByText(/Nobody outside is told/);
  });

  it('says the other three too, so the bar is the whole answer', async () => {
    stub();
    show();

    await screen.findByText(/Nothing here signs/);
    expect(screen.getByText(/carried out elsewhere/)).toBeInTheDocument();
    expect(screen.getByText(/No assistant/)).toBeInTheDocument();
  });
});

describe('an installation that has wired things', () => {
  it('says notices are sent, and stops saying nobody is told', async () => {
    stub({ notice: 'smtp' });
    show();

    await screen.findByText(/Notices are sent/);
    expect(screen.queryByText(/Nobody outside is told/)).not.toBeInTheDocument();
  });
});

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

/*
 * Each fact is written in two places — the bar along the foot of a window,
 * and the list at the end of the page that a phone and a tablet get. Only
 * one of the two is ever visible, by width, but a stylesheet is what hides
 * the other and jsdom applies none, so both are in the document here.
 *
 * That is why these count rather than fetch: **two** is the right answer,
 * and one would mean a screen size had been left with nothing.
 */
const bothPlaces = (says: RegExp) => screen.getAllByText(says);

describe('the bare installation, which is the ordinary one', () => {
  it('says that nobody outside is told', async () => {
    stub();
    show();
    await screen.findAllByText(/Nobody outside is told/);
    expect(bothPlaces(/Nobody outside is told/)).toHaveLength(2);
  });

  it('says the other three too, so the bar is the whole answer', async () => {
    stub();
    show();

    await screen.findAllByText(/Nothing here signs/);
    expect(bothPlaces(/carried out elsewhere/)).toHaveLength(2);
    expect(bothPlaces(/No assistant/)).toHaveLength(2);
  });

  it('tells a phone exactly what it tells a desk', async () => {
    stub();
    show();

    /*
     * The invariant the two copies exist to keep. What a bank is told about
     * its own installation must not depend on the width of the screen it is
     * told on — and two lists written separately are two lists that drift.
     */
    await screen.findAllByText(/Nothing here signs/);
    for (const says of [
      /Nothing here signs/,
      /carried out elsewhere/,
      /No assistant/,
      /Nobody outside is told/,
    ]) {
      expect(bothPlaces(says), String(says)).toHaveLength(2);
    }
  });
});

describe('an installation that has wired things', () => {
  it('says notices are sent, and stops saying nobody is told', async () => {
    stub({ notice: 'smtp' });
    show();

    await screen.findAllByText(/Notices are sent/);
    expect(bothPlaces(/Notices are sent/)).toHaveLength(2);
    expect(screen.queryByText(/Nobody outside is told/)).not.toBeInTheDocument();
  });
});

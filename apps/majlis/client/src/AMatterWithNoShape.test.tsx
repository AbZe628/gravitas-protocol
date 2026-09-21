import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nProvider } from './lib/i18n.js';
import MatterFlow from './pages/MatterFlow.js';

/**
 * Having no shape, and the shape not arriving, are opposite facts.
 *
 * ── what happened ─────────────────────────────────────────────────────────
 *
 * A matter made from a bank's question has no contract shape: nobody has
 * decided yet what kind of contract it is. The route says so plainly, with a
 * refusal — *this matter is not being judged against a contract shape* — and
 * the screen turned every failure of that fetch, refusals included, into one
 * state and printed the other sentence: *the shape did not arrive… reload
 * before recording anything here.*
 *
 * So on the one path the product is sold on — a bank asks, the board takes it
 * up — the board arrived at a screen telling it the application had failed,
 * on a matter where reloading would never change anything, with no way to
 * choose a shape and therefore no work to do. Found by walking it, not by a
 * test: the file already carried a comment saying the two must be told apart,
 * written before anything told them apart.
 *
 * ── what each one has to say ──────────────────────────────────────────────
 *
 * No shape: the route's own words, and the library, so the next thing a
 * member does is choose one. Lost: that the steps could not be read, because
 * the remedy there really is to try again.
 */

const MATTER = {
  id: 'm1',
  boardId: 'demo-board',
  title: 'Whether a commodity murabaha may be used for interbank placements',
  origin: 'institution_request',
  direction: 'permit',
  status: 'deliberation',
  openedAt: '2026-09-21T16:56:57.346Z',
  notDecided: [],
  mechanism: '',
  interactsWith: [],
  assetIds: [],
  findings: [],
  deliberation: [],
  sources: [],
  votes: [],
};

const LIBRARY = [
  { id: 'murabaha', name: 'Murabaha, including commodity murabaha and tawarruq', family: 'sale' },
  { id: 'ijara', name: 'Ijara — lease of an asset or a service', family: 'lease' },
];

/** `kako` decides what the checklist route answers. */
function stub(kako: 'refused' | 'broken') {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const json = (b: unknown, status = 200) =>
        new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } });

      if (url.includes('/checklist')) {
        return kako === 'refused'
          ? json(
              {
                error: 'not_found',
                message: 'This matter is not being judged against a contract shape.',
              },
              409,
            )
          : json({ error: 'server', message: 'nope' }, 500);
      }
      if (url.includes('/structures')) return json({ structures: LIBRARY, note: '' });
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
      if (url.includes('/api/attention'))
        return json({ scholarId: 'member-a', role: 'signatory', office: null, outstanding: 0, overdue: 0, items: [] });
      if (url.includes('/api/matters/m1')) return json(MATTER);
      return json({});
    }),
  );
}

const show = () =>
  render(
    <MemoryRouter initialEntries={['/matters/m1']}>
      <I18nProvider>
        <Routes>
          <Route path="/matters/:id" element={<MatterFlow />} />
        </Routes>
      </I18nProvider>
    </MemoryRouter>,
  );

afterEach(() => vi.unstubAllGlobals());

describe('a matter the board has not yet given a shape', () => {
  it('says so in the route’s own words, and not that something failed', async () => {
    stub('refused');
    show();

    await screen.findByText(/not being judged against a contract shape/);
    expect(screen.queryByText(/The steps could not be read/)).toBeNull();
    expect(screen.queryByText(/did not arrive/)).toBeNull();
  });

  it('offers the library, because choosing one is the next thing to do', async () => {
    stub('refused');
    show();

    await waitFor(() =>
      expect(screen.getByText(/Murabaha, including commodity murabaha/)).toBeInTheDocument(),
    );
    expect(screen.getByText(/Ijara/)).toBeInTheDocument();
  });

  it('says it once', async () => {
    /*
     * The sentence the route sends and the sentence above the library both
     * used to open by saying the matter has no shape — the same words a
     * hand's width apart, which is the thing this application keeps having
     * to be caught doing.
     */
    stub('refused');
    show();

    await screen.findByText(/not being judged against a contract shape/);
    expect(screen.getAllByText(/not being judged against a contract shape/)).toHaveLength(1);
  });
});

describe('a matter whose shape could not be read', () => {
  it('says the steps were lost, and offers no library', async () => {
    stub('broken');
    show();

    await screen.findByText(/The steps could not be read/);
    expect(screen.queryByText(/Murabaha, including commodity murabaha/)).toBeNull();
  });
});

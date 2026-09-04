import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Evidence from './components/Evidence.js';
import { I18nProvider } from './lib/i18n.js';

/**
 * An installation with nowhere to keep a document.
 *
 * Its own file rather than its own test. Health is cached at module level —
 * it describes how the server was started and does not change while anyone is
 * looking — and vitest isolates a module graph per file, so one file per
 * installation shape is how a test gets a different one. The alternative was a
 * way to clear the cache, which would be a test-only export sitting in shipped
 * code for the sake of one assertion.
 *
 * What it holds: the upload control is **absent**, not disabled and not
 * present-then-refusing. A scholar should not be put through choosing a
 * document to be told this deployment cannot keep it — and the citation
 * control stays, because a board with no volume can still cite a standard.
 */

function stub() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const json = (b: unknown) =>
        new Response(JSON.stringify(b), { status: 200, headers: { 'Content-Type': 'application/json' } });

      if (url.includes('/api/health')) return json({ ok: true, stage: 2, documents: 'none' });
      return json({});
    }),
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const matter = (): any => ({
  id: 'm1',
  boardId: 'b',
  title: 'A matter',
  origin: 'institution_request',
  direction: 'permit',
  status: 'deliberation',
  openedAt: '2026-09-04T08:00:00.000Z',
  timelockEndsAt: null,
  affected: null,
  deliberationCount: 0,
  proposal: '',
  notDecided: [],
  mechanism: '',
  interactsWith: [],
  proposedRule: {
    id: 'r', boardId: 'b', title: '', statement: '', parameters: [],
    parameterHash: '0x0', version: 1, inForceFrom: null, sources: [],
  },
  simulation: null,
  deliberation: [],
  reasoning: [],
  objections: [],
  inForceAt: null,
  sources: [],
});

afterEach(() => vi.unstubAllGlobals());

describe('nowhere to keep a document', () => {
  it('does not offer the upload at all', async () => {
    stub();
    render(
      <I18nProvider>
        <MemoryRouter>
          <Evidence matter={matter()} scholarId="member-a" canAttach onChanged={() => undefined} />
        </MemoryRouter>
      </I18nProvider>,
    );

    // The citation control is there, so the absence below is about documents
    // rather than about the panel having failed to render.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Cite something/ })).toBeInTheDocument(),
    );
    expect(screen.queryByRole('button', { name: /Attach a document/ })).toBeNull();
    expect(document.querySelector('input[type="file"]')).toBeNull();
  });
});

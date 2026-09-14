import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HowThisIsHeld from './components/HowThisIsHeld.js';
import { I18nProvider } from './lib/i18n.js';
import type { Asset } from './lib/api.js';
import { forgetHealth } from './lib/health.js';

/**
 * Conventional or tokenised, on the holding.
 *
 * ── the line that must not appear ─────────────────────────────────────────
 *
 * On an installation with nothing attached there is no distinction to draw.
 * Every holding is carried out by people and every ruling is a record, and the
 * handbook is explicit that the tokenised column *does not appear in the
 * software* there. A badge reading "conventional" on every row would make an
 * ordinary installation look like the reduced version of something — which is
 * the impression this whole chapter exists to prevent.
 *
 * ── and the one that must ─────────────────────────────────────────────────
 *
 * Where a chain is attached, the answer and **where it came from**. "The board
 * marked this" and "this has a contract address, so it is read as one" are
 * different answers, and a board that was never asked has to be able to see
 * that it was never asked.
 */

const originalFetch = globalThis.fetch;

/** What /api/health says about this installation. */
/* The health read is cached for the life of the module, so it is forgotten
 * before each case: otherwise the second installation would be shown the
 * first one answer and pass on data it never asked for. */
function attached(enforcement: 'none' | 'gravitas-registry') {
  forgetHealth();
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const body = url.includes('/api/health')
      ? { enforcement, governanceWrites: true, signingAuthority: true, recordSince: null }
      : {};
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as unknown as typeof fetch;
}

const asset = (over: Partial<Asset> = {}): Asset =>
  ({
    id: 'asset-1',
    institutionId: 'demo-institution',
    kind: 'fund',
    name: 'A holding',
    identifiers: [],
    source: 'institution',
    addedAt: '2026-01-01T00:00:00Z',
    addedBy: null,
    composition: null,
    retiredAt: null,
    retiredReason: null,
    ...over,
  }) as unknown as Asset;

const show = (a: Asset) =>
  render(
    <I18nProvider>
      <MemoryRouter>
        <HowThisIsHeld asset={a} />
      </MemoryRouter>
    </I18nProvider>,
  );

afterEach(() => {
  vi.unstubAllGlobals();
  globalThis.fetch = originalFetch;
});

describe('with nothing attached', () => {
  it('draws no distinction at all', async () => {
    attached('none');
    const { container } = show(asset({ identifiers: [{ scheme: 'chain', value: '0xabc' }] }));

    // Give the health call a chance to land and the panel a chance to appear.
    await new Promise((r) => setTimeout(r, 50));
    expect(container.textContent).toBe('');
    expect(screen.queryByText(/held as a token/i)).toBeNull();
  });
});

describe('with a registry attached', () => {
  it('reads a contract address as tokenised, and says it is reading', async () => {
    attached('gravitas-registry');
    show(asset({ identifiers: [{ scheme: 'chain', value: '0xabc', network: 'arbitrum' }] }));

    await waitFor(() => expect(screen.getByText(/held as a token/i)).toBeInTheDocument());
    expect(screen.getByText(/read from its contract address/i)).toBeInTheDocument();
    expect(screen.getByText(/does not execute/i)).toBeInTheDocument();
  });

  it('says when the board marked it, rather than claiming to have read it', async () => {
    attached('gravitas-registry');
    show(asset({ heldAs: 'conventional' }));

    await waitFor(() => expect(screen.getByText(/held conventionally/i)).toBeInTheDocument());
    expect(screen.getByText(/the board marked it/i)).toBeInTheDocument();
  });

  it('says nothing says otherwise where there is neither a mark nor an address', async () => {
    attached('gravitas-registry');
    show(asset());

    await waitFor(() => expect(screen.getByText(/held conventionally/i)).toBeInTheDocument());
    expect(screen.getByText(/nothing says otherwise/i)).toBeInTheDocument();
    // And what that means for a ruling: found at the next review, not refused.
    expect(screen.getByText(/found at the next review/i)).toBeInTheDocument();
  });

  it('never claims a contract refuses anything on a conventional holding', async () => {
    attached('gravitas-registry');
    show(asset({ heldAs: 'conventional', identifiers: [{ scheme: 'chain', value: '0xabc' }] }));

    await waitFor(() => expect(screen.getByText(/held conventionally/i)).toBeInTheDocument());
    // The mark wins over the address, and the sentence follows the mark.
    expect(screen.queryByText(/does not execute/i)).toBeNull();
  });
});

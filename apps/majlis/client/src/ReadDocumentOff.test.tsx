import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ReadDocument from './components/ReadDocument.js';
import { I18nProvider } from './lib/i18n.js';

/**
 * An installation that does not send documents to a model.
 *
 * Its own file for the same reason `DocumentsNoVolume.test.tsx` is: health is
 * cached at module level, and vitest isolates a module graph per file, so one
 * file per installation shape is how a test gets a different one.
 *
 * What it holds: the control is **absent**. Not greyed out, not present and
 * then refusing. A bank that will not send its accounts anywhere types the
 * figures in exactly as it always did, and a scholar there should never be
 * shown a button whose only possible outcome is a refusal — nor be left
 * wondering whether the institution is missing something it ought to have.
 *
 * This is also the default. Reading is off unless the installation turned it
 * on, and it is not inferred from a key being present, so this file describes
 * what almost every deployment looks like rather than an edge case.
 */

function stub() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const json = (b: unknown) =>
        new Response(JSON.stringify(b), { status: 200, headers: { 'Content-Type': 'application/json' } });

      if (url.includes('/api/health')) {
        return json({ ok: true, stage: 2, documents: 'disk', reading: 'off' });
      }
      if (url.includes('/api/attention')) {
        return json({ scholarId: 'member-a', role: 'signatory', office: null, outstanding: 0, overdue: 0, items: [] });
      }
      return json({ documents: [] });
    }),
  );
}

const show = () =>
  render(
    <I18nProvider>
      <ReadDocument fields={[{ key: 'cash', label: 'Cash' }]} onConfirm={() => {}} />
    </I18nProvider>,
  );

afterEach(() => vi.unstubAllGlobals());

describe('reading is off', () => {
  /*
   * One test, not two, and health is why.
   *
   * `useHealth` caches at module level and the cache outlives a test, so only
   * the first render in this file ever fetches. A second test asserting on its
   * own fetch mock would be asserting on a mock nothing called — which passes
   * or fails for reasons that have nothing to do with the component.
   */
  it('shows no control, and asks the server for nothing', async () => {
    stub();
    const { container } = show();

    // Waiting matters: asserting immediately would pass even if the panel
    // appeared a tick later, once health resolved.
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    await waitFor(() => expect(container).toBeEmptyDOMElement());
    expect(screen.queryByRole('button')).toBeNull();

    // A document list fetched for a panel nobody can see would be this
    // installation listing its own documents for no reason at all.
    const called = (fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls.map((c) => String(c[0]));
    expect(called.some((u) => u.includes('/api/documents'))).toBe(false);
  });
});

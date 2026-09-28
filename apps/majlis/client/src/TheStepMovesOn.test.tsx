import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nProvider } from './lib/i18n.js';
import MatterFlow from './pages/MatterFlow.js';

/**
 * After a condition is answered, the next one opens — without waiting on a
 * second read of the whole list.
 *
 * ── what was measured ─────────────────────────────────────────────────────
 *
 * *Met — next* waited for the write, and then for the checklist to be read
 * again, before the next step appeared: 811 ms from the press, live, on a
 * connection where every round trip was 300 ms. The write is the half that
 * has to be waited for. The other half only confirms what the screen already
 * knows — which step is still unanswered.
 *
 * So this holds the second read open for good. The next step can only appear
 * from what the write already told the screen.
 */

const condition = (id: string, requirement: string) => ({
  id,
  requirement,
  why: 'Because it is what the contract turns on.',
  evidence: 'document',
});
const ONE = condition('c1', 'The certificate holders own an undivided share in the assets.');
const TWO = condition('c2', 'The manager may not guarantee the capital.');

const MATTER = {
  id: 'm1',
  boardId: 'demo-board',
  title: 'Whether the sukuk may be traded',
  origin: 'board',
  direction: 'permit',
  status: 'deliberation',
  structureId: 'sukuk',
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

const CHECKLIST = {
  structure: { id: 'sukuk', name: 'Sukuk', family: 'certificates', calculations: [], conditions: [ONE, TWO] },
  conditions: [
    { condition: ONE, finding: null, history: [], answeredBy: [] },
    { condition: TWO, finding: null, history: [], answeredBy: [] },
  ],
  source: 'draft',
  declined: false,
  basis: null,
  sourceNote: '',
  unanswered: ['c1', 'c2'],
  contested: [],
  answered: 0,
  total: 2,
  note: '',
};

let reads = 0;
let wrote: unknown = null;

function stub() {
  reads = 0;
  wrote = null;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const json = (b: unknown, status = 200) =>
        new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } });
      if (init?.method === 'POST' && url.includes('/findings')) {
        wrote = JSON.parse(String(init.body));
        return json({ ...MATTER, findings: [{ ...(wrote as object), scholarId: 'member-a', at: '2026-09-22T00:00:00Z' }] });
      }
      if (url.includes('/checklist')) {
        reads++;
        // The first read draws the steps. Every read after it never answers.
        return reads === 1 ? json(CHECKLIST) : new Promise<Response>(() => undefined);
      }
      if (url.includes('/api/attention'))
        return json({ scholarId: 'member-a', role: 'signatory', office: null, outstanding: 0, overdue: 0, items: [] });
      if (url.includes('/api/matters/m1/passage')) return json({ of: { kind: 'matter', id: 'm1' }, groups: [], next: null, waiting: null, settled: null });
      if (url.includes('/api/matters/m1')) return json(MATTER);
      return json({});
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('the step window, after an answer', () => {
  it('opens the next condition before the list has been read again', async () => {
    stub();
    render(
      <MemoryRouter initialEntries={['/matters/m1']}>
        <I18nProvider>
          <Routes>
            <Route path="/matters/:id" element={<MatterFlow />} />
          </Routes>
        </I18nProvider>
      </MemoryRouter>,
    );

    await screen.findByText(/undivided share in the assets/);
    fireEvent.change(await screen.findByRole('textbox'), { target: { value: 'The trust deed transfers title to the holders.' } });
    fireEvent.click(screen.getByRole('button', { name: /Met — next/ }));

    await waitFor(() => expect(wrote).toMatchObject({ conditionId: 'c1', holds: 'met' }));
    expect(await screen.findByText(/may not guarantee the capital/)).toBeTruthy();
    expect(screen.getByText(/Step 2 of 2/i)).toBeTruthy();
    // The only way it got here: the list was not read a second time and answered.
    expect(reads).toBeGreaterThanOrEqual(1);
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import Queue from './pages/Queue.js';
import ListColumn from './components/ListColumn.js';
import { InTheColumn, Line, Sheet, type Column } from './components/sheet.js';
import { I18nProvider } from './lib/i18n.js';
import { listFor, rememberList } from './lib/split.js';
import { useLineKeys } from './lib/lineKeys.js';
import { useRef } from 'react';
import type { QueueRow } from './lib/api.js';
import { isYours } from '../../server/src/services/yours.js';

/**
 * A list, kept beside the thing opened from it.
 *
 * ── the faults these hold shut ────────────────────────────────────────────
 *
 *   - **opening a row threw the list away.** To look at the next thing a
 *     member went back, found their place, and pressed again.
 *   - **the list beside a matter answered the matter's keys.** The queue opens
 *     its first nine lines with `1`–`9`; beside a matter, `1` is *met*, and
 *     one press would have recorded a finding and left the screen.
 *   - **the list beside the work was not the list it came from.** A row picked
 *     from *everyone* is not on *yours*, and the list the queue opens with
 *     would have dropped the very line whose work is open.
 *   - **a table drew its columns wherever the window was a desk's.** At 1024
 *     pixels the list of breaches had 616 pixels and 512 of fixed columns, and
 *     every breach on it was a row with no name.
 */

function json(body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }),
  );
}

const row = (id: string, over: Partial<QueueRow> = {}): QueueRow => ({
  kind: 'matter',
  id,
  to: `/matters/${id}`,
  title: `Matter ${id}`,
  phase: 'deciding',
  next: { key: 'step.conditions.act' },
  whose: 'board',
  days: 3,
  overdue: false,
  ...over,
});

function wire(rows: QueueRow[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/attention')) return json({ role: 'signatory', office: null, items: [], scholarId: 'member-a' });
      if (url.includes('/api/settings')) return json({ members: [] });
      if (url.includes('/api/queue'))
        /*
         * `yours` through the server's own rule. The screen reads whose a row
         * is rather than working it out, so a fixture that left it out would
         * draw an empty list under *yours* and prove nothing about anything
         * else on the screen.
         */
        return json({
          asOf: '2026-09-20T00:00:00Z',
          rows: rows.map((r) => ({
            ...r,
            yours: isYours(r, { scholarId: 'member-a', role: 'signatory' }),
          })),
          waiting: rows.length,
          overdue: 0,
        });
      return json({});
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

/** Where the router is standing, written on the page for the assertions. */
function Here() {
  const at = useLocation();
  return <output data-testid="here">{at.pathname}</output>;
}

describe('which list stands beside a thing', () => {
  it('is the list the member came from, where that list holds this kind', () => {
    expect(listFor('/matters/m1')).toBe('/');
    rememberList('/record');
    expect(listFor('/matters/m1')).toBe('/record');
    // The record does not hold breaches: a breach keeps the list it belongs to.
    expect(listFor('/incidents/i1')).toBe('/');
    rememberList('/incidents');
    expect(listFor('/incidents/i1')).toBe('/incidents');
  });

  it('is nothing at all for a screen that is not a thing opened from a list', () => {
    expect(listFor('/')).toBeNull();
    expect(listFor('/settings')).toBeNull();
    expect(listFor('/matters/m1/anything')).toBeNull();
  });
});

describe('the queue, drawn beside a matter', () => {
  const rows = [row('m1'), row('m2'), row('m3')];

  function beside(at: string) {
    return render(
      <I18nProvider>
        <MemoryRouter initialEntries={[at]}>
          <InTheColumn.Provider value={true}>
            <Queue />
          </InTheColumn.Provider>
          <Here />
        </MemoryRouter>
      </I18nProvider>,
    );
  }

  it('lights the line whose work is open, and only that one', async () => {
    wire(rows);
    beside('/matters/m2');
    const open = await screen.findByRole('link', { name: 'Matter m2' });
    expect(open.getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Matter m1' }).getAttribute('aria-current')).toBeNull();
  });

  it('is one line of head, with no second title and no keys written on its lines', async () => {
    wire(rows);
    const { container } = beside('/matters/m2');
    await screen.findByRole('link', { name: 'Matter m2' });
    expect(container.querySelector('h1')).toBeNull();
    expect(container.querySelector('kbd')).toBeNull();
    expect(container.querySelector('[role="columnheader"]')).toBeNull();
  });

  it('leaves the number keys to the matter', async () => {
    wire(rows);
    beside('/matters/m2');
    await screen.findByRole('link', { name: 'Matter m2' });
    fireEvent.keyDown(window, { key: '1' });
    expect(screen.getByTestId('here').textContent).toBe('/matters/m2');
  });

  it('is narrowed the way the member left it', async () => {
    wire([row('m1', { whose: 'institution' }), row('m2')]);
    const first = render(
      <I18nProvider>
        <MemoryRouter>
          <Queue />
        </MemoryRouter>
      </I18nProvider>,
    );
    // Yours shows one; everyone's shows both.
    await screen.findByRole('link', { name: 'Matter m2' });
    expect(screen.queryByRole('link', { name: 'Matter m1' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { pressed: false, name: /everyone/i }));
    await screen.findByRole('link', { name: 'Matter m1' });
    first.unmount();

    beside('/matters/m1');
    const lit = await screen.findByRole('link', { name: 'Matter m1' });
    expect(lit.getAttribute('aria-current')).toBe('page');
  });
});

describe('the column', () => {
  it('moves to the next thing and back with j and k', async () => {
    wire([row('m1'), row('m2'), row('m3')]);
    render(
      <I18nProvider>
        <MemoryRouter initialEntries={['/matters/m1']}>
          <Routes>
            <Route path="*" element={<ListColumn list="/" railOpen={false} onRail={() => undefined} />} />
          </Routes>
          <Here />
        </MemoryRouter>
      </I18nProvider>,
    );
    await screen.findByRole('link', { name: 'Matter m2' });
    fireEvent.keyDown(window, { key: 'j' });
    await waitFor(() => expect(screen.getByTestId('here').textContent).toBe('/matters/m2'));
    fireEvent.keyDown(window, { key: 'j' });
    await waitFor(() => expect(screen.getByTestId('here').textContent).toBe('/matters/m3'));
    fireEvent.keyDown(window, { key: 'k' });
    await waitFor(() => expect(screen.getByTestId('here').textContent).toBe('/matters/m2'));
    // Past the end is nowhere.
    fireEvent.keyDown(window, { key: 'j' });
    fireEvent.keyDown(window, { key: 'j' });
    await waitFor(() => expect(screen.getByTestId('here').textContent).toBe('/matters/m3'));
  });

  it('takes no key from a box being typed in', async () => {
    wire([row('m1'), row('m2')]);
    render(
      <I18nProvider>
        <MemoryRouter initialEntries={['/matters/m1']}>
          <ListColumn list="/" railOpen={false} onRail={() => undefined} />
          <textarea aria-label="why" />
          <Here />
        </MemoryRouter>
      </I18nProvider>,
    );
    await screen.findByRole('link', { name: 'Matter m2' });
    fireEvent.keyDown(screen.getByLabelText('why'), { key: 'j' });
    expect(screen.getByTestId('here').textContent).toBe('/matters/m1');
  });
});

describe('a list that is the screen', () => {
  /* The pane the frame gives every screen, with the frame's keys on it. */
  function Pane() {
    const pane = useRef<HTMLElement>(null);
    useLineKeys(pane, { opens: false, on: true });
    return (
      <main ref={pane}>
        <Queue />
      </main>
    );
  }

  it('puts the member on a line with j and moves along with the arrows, opening nothing', async () => {
    wire([row('m1'), row('m2'), row('m3')]);
    render(
      <I18nProvider>
        <MemoryRouter initialEntries={['/']}>
          <Pane />
          <Here />
        </MemoryRouter>
      </I18nProvider>,
    );
    const first = await screen.findByRole('link', { name: 'Matter m1' });
    // Not yet on a line: the arrows are the pane's, to scroll what is read.
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(document.activeElement).not.toBe(first);
    fireEvent.keyDown(window, { key: 'j' });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Matter m2' }));
    fireEvent.keyDown(document.activeElement!, { key: 'k' });
    expect(document.activeElement).toBe(first);
    expect(screen.getByTestId('here').textContent).toBe('/');
  });
});

describe('a table', () => {
  /* The list of breaches' columns: a title sharing what is left, and 32rem fixed. */
  const COLS: readonly Column[] = [
    { head: 'What', width: 'minmax(0,3fr)', phone: 'lead' },
    { head: 'Stage', width: '12rem' },
    { head: 'Owed', width: '9rem' },
    { head: 'Reported', width: '6.5rem', end: true, phone: 'hide' },
    { head: 'Days', width: '4.5rem', end: true, phone: 'trailing' },
  ];

  function drawnAt(width: number) {
    const was = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => width });
    class Seen {
      constructor(private readonly call: () => void) {}
      observe() {
        this.call();
      }
      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', Seen);
    const drawn = render(
      <MemoryRouter>
        <Sheet columns={COLS}>
          <Line to="/incidents/i1" columns={COLS} cells={['A breach', 'Awaiting', null, '2026-08-14', '45']} />
        </Sheet>
      </MemoryRouter>,
    );
    if (was) Object.defineProperty(HTMLElement.prototype, 'clientWidth', was);
    return drawn;
  }

  it('draws its columns where it has room for them', () => {
    const { container } = drawnAt(1100);
    expect(container.querySelectorAll('[role="columnheader"]')).toHaveLength(5);
  });

  it('draws lines where it does not, whatever the window is', async () => {
    const { container } = drawnAt(616);
    await act(async () => undefined);
    expect(container.querySelector('[role="columnheader"]')).toBeNull();
    // The title is on the line, and the empty cell left no separator behind.
    expect(screen.getByRole('link', { name: 'A breach' })).toBeTruthy();
    expect(container.textContent).not.toMatch(/·\s*$/);
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import InTheMargin from './components/InTheMargin.js';
import { I18nProvider } from './lib/i18n.js';

/**
 * The papers, with what members wrote in the margin.
 *
 * What these hold to: **the mark sits on the words**, found in the text as the
 * server has it rather than at an offset kept from when the note was written;
 * **a note that has come loose says so** instead of being moved to somewhere
 * plausible; and **a member who cannot deliberate is not offered the control**,
 * because a control that cannot be honoured is absent rather than disabled.
 */

const TEXT =
  'That the desk take no new position in an index instrument whose exposure is obtained ' +
  'through borrowing inside the index, where that borrowing exceeds the limit below.';

const AT = TEXT.indexOf('borrowing inside the index');

const note = (over: Record<string, unknown> = {}) => ({
  id: 'note-1',
  boardId: 'demo-board',
  on: 'proposal',
  subjectId: 'matter-1',
  quote: 'borrowing inside the index',
  at: AT,
  said: 'Inside the index, or inside the fund holding it?',
  by: 'member-b',
  atTime: '2026-08-12T09:20:00Z',
  whoName: 'Board Member B',
  ...over,
});

const margin = (over: Record<string, unknown> = {}) => ({
  on: 'proposal',
  subjectId: 'matter-1',
  threads: [{ note: { annotation: note(), at: AT, adrift: false }, replies: [], whoName: 'Board Member B' }],
  summary: { standing: 1, withdrawn: 0, adrift: 0, by: ['member-b'] },
  text: TEXT,
  ...over,
});

const posted: { url: string; body: unknown }[] = [];

function serve(body: unknown, role = 'signatory') {
  posted.length = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const json = (b: unknown, status = 200) =>
        new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } });

      if (init?.method && init.method !== 'GET') {
        posted.push({ url, body: init.body ? JSON.parse(String(init.body)) : null });
        return json({ annotation: note({ id: 'note-2' }) }, 201);
      }
      if (url.includes('/api/attention')) {
        return json({ scholarId: 'member-a', role, office: null, outstanding: 0, overdue: 0, items: [] });
      }
      return json(body);
    }),
  );
}

const show = () =>
  render(
    <I18nProvider>
      <MemoryRouter>
        <InTheMargin on="proposal" subjectId="matter-1" />
      </MemoryRouter>
    </I18nProvider>,
  );

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the margin', () => {
  it('marks the passage where the words are, not where the note remembers', async () => {
    serve(margin());
    show();

    const marked = await waitFor(() => {
      const m = document.querySelectorAll('mark');
      expect(m).toHaveLength(1);
      return m[0];
    });
    expect(marked.textContent).toBe('borrowing inside the index');
  });

  it('shows the note, who wrote it, and the passage it was written on', async () => {
    serve(margin());
    show();

    expect(await screen.findByText(/Inside the index, or inside the fund/)).toBeTruthy();
    expect(screen.getByText('Board Member B')).toBeTruthy();
  });

  it('says a note has come loose rather than marking something else', async () => {
    serve(
      margin({
        threads: [
          { note: { annotation: note(), at: null, adrift: true }, replies: [], whoName: 'Board Member B' },
        ],
      }),
    );
    show();

    expect(await screen.findByText(/no longer in the text/i)).toBeTruthy();
    // Nothing is marked, because there is nothing to mark.
    expect(document.querySelectorAll('mark')).toHaveLength(0);
    // And the note is still there with what it was about.
    expect(screen.getByText('borrowing inside the index')).toBeTruthy();
  });

  it('offers no way to write to somebody who cannot deliberate', async () => {
    serve(margin(), 'observer');
    show();

    expect(await screen.findByText(/Inside the index, or inside the fund/)).toBeTruthy();
    expect(screen.queryByText(/Select any words above/i)).toBeNull();
  });

  it('tells a member who can deliberate how to write one', async () => {
    serve(margin());
    show();
    expect(await screen.findByText(/Select any words above/i)).toBeTruthy();
  });

  /*
   * The selection is the form. A member who has to retype the sentence they
   * just pointed at will do it once.
   */
  it('sends what the reader selected, never the text of the document', async () => {
    serve(margin());
    const { container } = show();
    await screen.findByText(/Select any words above/i);

    vi.spyOn(window, 'getSelection').mockReturnValue({
      toString: () => 'exceeds the limit below',
    } as unknown as Selection);

    fireEvent.mouseUp(container.querySelector('p') as Element);

    const box = await screen.findByLabelText(/Write the note/i);
    fireEvent.change(box, { target: { value: 'Which limit?' } });
    fireEvent.click(screen.getByRole('button', { name: /Write the note/i }));

    await waitFor(() => {
      expect(posted).toHaveLength(1);
    });
    expect(posted[0].url).toContain('/api/annotations');
    expect(posted[0].body).toMatchObject({
      on: 'proposal',
      subjectId: 'matter-1',
      quote: 'exceeds the limit below',
      said: 'Which limit?',
    });
    expect(Object.keys(posted[0].body as object)).not.toContain('text');
  });

  it('says the notes could not be read rather than showing none', async () => {
    serve({ nothing: 'of the expected shape' });
    show();
    expect(await screen.findByText(/could not be read/i)).toBeTruthy();
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Library from './pages/Library.js';
import { I18nProvider } from './lib/i18n.js';

/**
 * The library as one board holds it.
 *
 * What these hold to: **adoption happens under a decision**, and the page will
 * not offer to do it without one. A form that let a signatory pick a shape and
 * press a button would make the library binding by administration rather than
 * by decision, and skip the timelock a signatory objects inside.
 */

const DRAFT_NOTE =
  'This is the shipped draft. This board has not adopted this shape, so its conditions are a ' +
  'starting point offered for the board to rule beside. They are binding on nobody.';

const shape = (id: string, over: Record<string, unknown> = {}) => ({
  structure: {
    id,
    name: id === 'murabaha' ? 'Murabaha, including commodity murabaha and tawarruq' : 'Sukuk',
    family: id === 'murabaha' ? 'sale' : 'security',
    authority: 'AAOIFI Shariah Standard No. 8',
    calculations: [],
    conditions: [
      {
        id: 'ownership-before-sale',
        requirement: 'The institution owns the asset before selling it on.',
        why: 'Selling what one does not own turns the sale into a financing of money by money.',
        evidence: 'sequence',
        authority: 'SS 8',
      },
    ],
  },
  source: 'draft',
  adoption: null,
  declined: false,
  note: DRAFT_NOTE,
  ...over,
});

const library = (over: Record<string, unknown> = {}) => ({
  boardId: 'demo-board',
  library: [shape('murabaha'), shape('sukuk')],
  adopted: 0,
  declined: 0,
  total: 2,
  notes: { draft: DRAFT_NOTE, adopted: 'The board’s own version.', declined: 'Ruled against.' },
  ...over,
});

const posted: { url: string; body: unknown }[] = [];
let matters: unknown[] = [];
let identity: Record<string, unknown> = { scholarId: 'member-a', role: 'signatory' };

function stub(body: unknown) {
  posted.length = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const json = (b: unknown, status = 200) =>
        new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } });

      if (init?.method && init.method !== 'GET') {
        posted.push({ url, body: init.body ? JSON.parse(String(init.body)) : null });
        return json({ adoption: { id: 'a1' }, note: 'ok' }, 201);
      }
      // Identity comes from the attention endpoint, which is where the role a
      // page reads is actually served from.
      if (url.includes('/api/attention')) return json(identity);
      if (url.includes('/api/matters')) return json(matters);
      return json(body);
    }),
  );
}

const show = () =>
  render(
    <I18nProvider>
      <MemoryRouter>
        <Library />
      </MemoryRouter>
    </I18nProvider>,
  );

afterEach(() => {
  vi.unstubAllGlobals();
  matters = [];
  identity = { scholarId: 'member-a', role: 'signatory' };
});

describe('what the page leads with', () => {
  it('counts what nobody has looked at, because that is the state most shapes are in', async () => {
    stub(library());
    show();

    await waitFor(() => expect(screen.getByText('never looked at')).toBeInTheDocument());
    // Two shapes, none taken, none ruled against.
    expect(screen.getAllByText('Shipped draft')).toHaveLength(2);
  });

  it('says the shipped conditions bind nobody', async () => {
    stub(library());
    show();
    await waitFor(() => expect(screen.getAllByText(/binding on nobody/).length).toBeGreaterThan(0));
  });

  it('names the family and the source of each shape’s conditions', async () => {
    stub(library());
    show();

    await waitFor(() => expect(screen.getByText('Sale')).toBeInTheDocument());
    expect(screen.getByText('Securities')).toBeInTheDocument();
  });

  it('shows what the board said and the decision it said it under', async () => {
    stub(
      library({
        library: [
          shape('murabaha', {
            source: 'amended',
            note: 'The board’s own version.',
            adoption: {
              id: 'a1',
              boardId: 'demo-board',
              structureId: 'murabaha',
              standing: 'amended',
              conditions: [],
              amendments: ['Constructive possession must be evidenced by a warehouse receipt.'],
              matterId: 'matter-2026-04-02',
              decidedBy: 'member-a',
              decidedAt: '2026-05-01T00:00:00Z',
              supersedes: null,
            },
          }),
        ],
        adopted: 1,
        total: 1,
      }),
    );
    show();

    await waitFor(() => expect(screen.getByText('Taken with changes')).toBeInTheDocument());
    expect(screen.getByText(/warehouse receipt/)).toBeInTheDocument();
    expect(screen.getByText('matter-2026-04-02').closest('a')).toHaveAttribute(
      'href',
      '/matters/matter-2026-04-02',
    );
  });
});

describe('it will not adopt without a decision', () => {
  it('says so instead of offering a button', async () => {
    matters = [];
    stub(library());
    show();

    await waitFor(() => screen.getAllByText('Shipped draft'));
    fireEvent.click(screen.getAllByRole('button', { name: /Take this shape/ })[0]);

    await waitFor(() =>
      expect(screen.getByText(/no decision of this board in force/)).toBeInTheDocument(),
    );
    expect(screen.queryByRole('button', { name: /Take it as ours/ })).toBeNull();
    expect(posted).toHaveLength(0);
  });

  it('offers only decisions that are in force, never one still in its timelock', async () => {
    matters = [
      { id: 'm-live', title: 'A ruling in force', status: 'in_force' },
      { id: 'm-lock', title: 'Still in its timelock', status: 'timelock' },
      { id: 'm-open', title: 'Still being argued', status: 'deliberation' },
    ];
    stub(library());
    show();

    await waitFor(() => screen.getAllByText('Shipped draft'));
    fireEvent.click(screen.getAllByRole('button', { name: /Take this shape/ })[0]);

    await waitFor(() => expect(screen.getByText('A ruling in force')).toBeInTheDocument());
    expect(screen.queryByText('Still in its timelock')).toBeNull();
    expect(screen.queryByText('Still being argued')).toBeNull();
  });

  it('will not send until a decision is chosen', async () => {
    matters = [{ id: 'm-live', title: 'A ruling in force', status: 'in_force' }];
    stub(library());
    show();

    await waitFor(() => screen.getAllByText('Shipped draft'));
    fireEvent.click(screen.getAllByRole('button', { name: /Take this shape/ })[0]);

    await waitFor(() => screen.getByRole('button', { name: /Take it as ours/ }));
    expect(screen.getByRole('button', { name: /Take it as ours/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Rule against it/ })).toBeDisabled();
  });
});

describe('taking a shape, and ruling against one', () => {
  const openFirst = async () => {
    matters = [{ id: 'm-live', title: 'A ruling in force', status: 'in_force' }];
    stub(library());
    show();
    await waitFor(() => screen.getAllByText('Shipped draft'));
    fireEvent.click(screen.getAllByRole('button', { name: /Take this shape/ })[0]);
    await waitFor(() => screen.getByRole('button', { name: /Take it as ours/ }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'm-live' } });
  };

  it('sends the shape, the board and the decision it was made under', async () => {
    await openFirst();
    fireEvent.click(screen.getByRole('button', { name: /Take it as ours/ }));

    await waitFor(() => expect(posted).toHaveLength(1));
    expect(posted[0].url).toContain('/api/adoptions');
    expect(posted[0].body).toMatchObject({
      structureId: 'murabaha',
      boardId: 'demo-board',
      standing: 'adopted',
      matterId: 'm-live',
    });
  });

  it('sends a decline with the board’s reason', async () => {
    await openFirst();
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'This institution does not use commodity murabaha.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Rule against it/ }));

    await waitFor(() => expect(posted).toHaveLength(1));
    expect(posted[0].body).toMatchObject({
      standing: 'declined',
      amendments: ['This institution does not use commodity murabaha.'],
    });
  });

  it('shows a refusal in the server’s words', async () => {
    matters = [{ id: 'm-live', title: 'A ruling in force', status: 'in_force' }];
    posted.length = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const json = (b: unknown, status = 200) =>
          new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } });

        if (init?.method && init.method !== 'GET') {
          return json(
            {
              error: 'no_reason_given',
              message: 'Declining a shape needs the board’s reason.',
            },
            400,
          );
        }
        if (url.includes('/api/attention')) return json(identity);
        if (url.includes('/api/matters')) return json(matters);
        return json(library());
      }),
    );
    show();

    await waitFor(() => screen.getAllByText('Shipped draft'));
    fireEvent.click(screen.getAllByRole('button', { name: /Take this shape/ })[0]);
    await waitFor(() => screen.getByRole('button', { name: /Rule against it/ }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'm-live' } });
    fireEvent.click(screen.getByRole('button', { name: /Rule against it/ }));

    await waitFor(() => expect(screen.getByText(/needs the board’s reason/)).toBeInTheDocument());
  });

  it('says that rewording a condition belongs elsewhere', async () => {
    await openFirst();
    expect(screen.getByText(/Rewording a condition is drafting/)).toBeInTheDocument();
  });
});

describe('who is offered the act', () => {
  it('offers an advisory member nothing to press', async () => {
    identity = { scholarId: 'advisor-1', role: 'advisory' };
    matters = [{ id: 'm-live', title: 'A ruling in force', status: 'in_force' }];
    stub(library());
    show();

    await waitFor(() => screen.getAllByText('Shipped draft'));
    expect(screen.queryByRole('button', { name: /Take this shape/ })).toBeNull();
  });

  it('does not crash on a payload that is not a library', async () => {
    stub([]);
    show();
    await waitFor(() => expect(screen.queryByText('never looked at')).toBeNull());
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { I18nProvider } from './lib/i18n.js';
import WhichShape from './components/WhichShape.js';

/**
 * Choosing which conditions a draft is read against.
 *
 * ── what this replaced ────────────────────────────────────────────────────
 *
 * A screen of its own that reprinted all nineteen shapes as cards so one
 * could be pressed — the same nineteen the library had just listed, in a
 * second arrangement. *"otvori stranicu sa onim ugovorima bezveze … i jako
 * ruzna."* A list of names with one wanted is a dropdown.
 *
 * ── and the harder half ───────────────────────────────────────────────────
 *
 * A scholar holding a draft usually cannot name its shape; naming it is part
 * of what reading is for. So the ranking is the other way through, and what
 * these hold is that it stays a **suggestion**: it comes back with its
 * working, pressing a row only fills the dropdown, and the server's own
 * sentence about what the ranking is not travels with it.
 */

const SHAPES = [
  { id: 'murabaha', name: 'Murabaha', conditions: [1, 2, 3, 4, 5, 6] },
  { id: 'ijara', name: 'Ijara', conditions: [1, 2, 3] },
];

const LIBRARY = {
  total: 2,
  adopted: 1,
  declined: 0,
  notes: { draft: [] },
  library: SHAPES.map((s, i) => ({
    structure: { id: s.id, name: s.name, family: 'sale', conditions: s.conditions.map(() => ({})) },
    source: i === 0 ? 'adopted' : 'draft',
    declined: false,
    adoption: null,
  })),
};

const RANKING = {
  readAt: '2026-09-21T00:00:00.000Z',
  guesses: [
    {
      structureId: 'murabaha',
      name: 'Murabaha',
      found: 3,
      partly: 1,
      of: 6,
      matched: [],
      namedInTheDraft: 'murabaha',
    },
    { structureId: 'ijara', name: 'Ijara', found: 1, partly: 0, of: 3, matched: [], namedInTheDraft: null },
  ],
  note: 'This counts words. A shape at the top is where the most matching words are, which is not the same as being right.',
};

function stub() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const json = (b: unknown) =>
        new Response(JSON.stringify(b), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      if (url.includes('/api/adoptions')) return json(LIBRARY);
      if (url.includes('/api/recognise')) return json(RANKING);
      if (url.includes('/api/attention'))
        return json({ scholarId: 'member-a', role: 'signatory', office: null, outstanding: 0, overdue: 0, items: [] });
      return json({});
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

const DRAFT =
  'COMMODITY MURABAHA MASTER AGREEMENT. The Bank shall purchase the Commodity from the Supplier.';

function show(text: string, onChange = vi.fn(), value = '') {
  render(
    <I18nProvider>
      <WhichShape value={value} onChange={onChange} text={text} />
    </I18nProvider>,
  );
  return onChange;
}

describe('the shape is chosen from a dropdown', () => {
  it('lists every shape the board holds, with whose conditions they are', async () => {
    stub();
    show(DRAFT);

    const picker = await screen.findByRole('combobox');
    await waitFor(() => expect(within(picker).getAllByRole('option').length).toBe(3));

    const options = within(picker).getAllByRole('option');
    expect(options[0]).toHaveTextContent(/Choose a contract shape/);
    expect(options[1]).toHaveTextContent(/Murabaha/);
    // Whose conditions these are, on the line that names the shape.
    expect(options[1].textContent).toMatch(/Taken as the board|Shipped draft/i);
    expect(options[1].textContent).toMatch(/6/);
  });

  it('reports the choice as it is made', async () => {
    stub();
    const onChange = show(DRAFT);
    fireEvent.change(await screen.findByRole('combobox'), { target: { value: 'ijara' } });
    expect(onChange).toHaveBeenCalledWith('ijara');
  });
});

describe('comparing them all', () => {
  it('waits for a draft, and says so rather than sitting dead', async () => {
    stub();
    show('');

    const compare = await screen.findByRole('button', { name: /Compare them all/ });
    expect(compare).toBeDisabled();
    expect(screen.getByText(/Put the draft in below/)).toBeInTheDocument();
  });

  it('ranks the shapes with its working', async () => {
    stub();
    show(DRAFT);

    fireEvent.click(await screen.findByRole('button', { name: /Compare them all/ }));

    // The reason it is where it is, not a score.
    await screen.findByText(/murabaha/);
    await waitFor(() => expect(screen.getByText(/1/)).toBeInTheDocument());
    expect(screen.getByText(/not the same as being right/)).toBeInTheDocument();
  });

  it('only fills the dropdown, so the choice stays the scholar’s', async () => {
    stub();
    const onChange = show(DRAFT);

    fireEvent.click(await screen.findByRole('button', { name: /Compare them all/ }));
    const row = await screen.findByRole('button', { name: /Murabaha/ });
    fireEvent.click(row);

    expect(onChange).toHaveBeenCalledWith('murabaha');
  });

  it('drops a ranking the moment the draft changes under it', async () => {
    stub();
    const { rerender } = render(
      <I18nProvider>
        <WhichShape value="" onChange={() => {}} text={DRAFT} />
      </I18nProvider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Compare them all/ }));
    await screen.findByText(/not the same as being right/);

    /*
     * A ranking is about the draft it was made against. Left standing over an
     * edited one, it would have a scholar choosing a shape on the strength of
     * words that are no longer there.
     */
    rerender(
      <I18nProvider>
        <WhichShape value="" onChange={() => {}} text={DRAFT + ' An additional clause.'} />
      </I18nProvider>,
    );

    await waitFor(() =>
      expect(screen.queryByText(/not the same as being right/)).not.toBeInTheDocument(),
    );
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Checklist from './components/Checklist.js';
import { I18nProvider } from './lib/i18n.js';

/**
 * The panel must not become a tick list, a score, or a resolution of
 * disagreement. These are the tests that hold it to that.
 */

const condition = (over: Record<string, unknown> = {}) => ({
  id: 'ownership-before-sale',
  requirement: 'The institution owns the asset and has taken possession of it before selling it on.',
  why: 'Selling what one does not own turns the sale into a financing of money by money.',
  evidence: 'sequence',
  authority: 'SS 8; SS 18 on possession',
  ...over,
});

const checklist = (over: Record<string, unknown> = {}) => ({
  structure: {
    id: 'murabaha',
    name: 'Murabaha, including commodity murabaha and tawarruq',
    family: 'sale',
    authority: 'AAOIFI Shariah Standard No. 8',
    calculations: ['late_payment'],
    conditions: [condition()],
  },
  conditions: [
    { condition: condition(), finding: null, history: [], answeredBy: [] },
  ],
  // Whose conditions these are. The server always says; a fixture that left it
  // out would let a test pass against a shape nobody had taken.
  source: 'draft',
  declined: false,
  sourceNote:
    'This is the shipped draft. This board has not adopted this shape, so its conditions are a starting point offered for the board to rule beside. They are binding on nobody.',
  unanswered: ['ownership-before-sale'],
  contested: [],
  answered: 0,
  total: 1,
  note: 'This counts what the board has answered. Whether the conditions are satisfied is the board’s to decide.',
  ...over,
});

const posted: { url: string; body: unknown }[] = [];

/** A slice of the library, enough to have more than one family in it. */
let library: { id: string; name: string; family: string }[] = [];


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
        return json({});
      }
      if (url.includes('/structures')) return json({ structures: library, note: '' });
      return json(body);
    }),
  );
}

const show = (canRule = true) =>
  render(
    <I18nProvider>
      <Checklist matterId="m1" canRule={canRule} />
    </I18nProvider>,
  );

afterEach(() => vi.unstubAllGlobals());

describe('it shows the shape, not a score', () => {
  it('states how many conditions are answered, with no bar and no percentage', async () => {
    stub(checklist({ answered: 3, total: 6, unanswered: [] }));
    show();

    await waitFor(() => expect(screen.getByText(/3/)).toBeInTheDocument());
    expect(document.body.textContent).not.toMatch(/\d+%/);
    expect(document.querySelector('progress')).toBeNull();
    expect(document.querySelector('[role="progressbar"]')).toBeNull();
  });

  it('gives every condition its reason as well as its citation', async () => {
    stub(checklist());
    show();

    await waitFor(() =>
      expect(screen.getByText(/turns the sale into a financing of money by money/)).toBeInTheDocument(),
    );
    expect(screen.getByText(/SS 8; SS 18 on possession/)).toBeInTheDocument();
  });

  it('carries the sentence saying it is not a conclusion', async () => {
    stub(checklist());
    show();
    await waitFor(() => expect(screen.getByText(/the board’s to decide/)).toBeInTheDocument());
  });
});

describe('a finding needs a reason, in every direction', () => {
  it('will not submit until one of the three is chosen and a reason written', async () => {
    stub(checklist());
    show();

    await waitFor(() => screen.getByRole('button', { name: /Record a finding/ }));
    fireEvent.click(screen.getByRole('button', { name: /Record a finding/ }));

    const record = screen.getByRole('button', { name: /^Record it$/ });
    expect(record).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /^Does not apply$/ }));
    expect(record).not.toBeDisabled();
  });

  it('offers "does not apply" as an equal answer rather than as a way out', async () => {
    stub(checklist());
    show();

    await waitFor(() => screen.getByRole('button', { name: /Record a finding/ }));
    fireEvent.click(screen.getByRole('button', { name: /Record a finding/ }));

    for (const label of ['Met', 'Not met', 'Does not apply']) {
      expect(screen.getByRole('button', { name: new RegExp(`^${label}$`) })).toBeInTheDocument();
    }
  });

  it('sends what the member chose and wrote', async () => {
    stub(checklist());
    show();

    await waitFor(() => screen.getByRole('button', { name: /Record a finding/ }));
    fireEvent.click(screen.getByRole('button', { name: /Record a finding/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Not met$/ }));
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'The sale file shows no transfer of title before the onward sale.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Record it$/ }));

    await waitFor(() => expect(posted).toHaveLength(1));
    expect(posted[0].body).toMatchObject({
      conditionId: 'ownership-before-sale',
      holds: 'not_met',
    });
  });
});

describe('disagreement is shown, not resolved', () => {
  it('marks a contested condition and keeps both readings', async () => {
    stub(
      checklist({
        contested: ['ownership-before-sale'],
        answered: 1,
        unanswered: [],
        conditions: [
          {
            condition: condition(),
            finding: null,
            answeredBy: ['s1', 's2'],
            history: [
              { conditionId: 'ownership-before-sale', holds: 'met', reason: 'Title passed on the same day.', scholarId: 's1', at: 'x', supersededAt: null },
              { conditionId: 'ownership-before-sale', holds: 'not_met', reason: 'The transfer is dated after the onward sale.', scholarId: 's2', at: 'x', supersededAt: null },
            ],
          },
        ],
      }),
    );
    show();

    await waitFor(() => expect(screen.getByText(/Read differently/)).toBeInTheDocument());

    fireEvent.click(screen.getByText(/have answered this/));
    expect(screen.getByText(/Title passed on the same day/)).toBeInTheDocument();
    expect(screen.getByText(/dated after the onward sale/)).toBeInTheDocument();
  });
});

describe('what it does when it cannot show a checklist', () => {
  it('treats a matter judged against no shape as a state, not a failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) =>
        String(input).includes('/structures')
          ? new Response(JSON.stringify({ structures: [], note: '' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
          : new Response(JSON.stringify({ error: 'not_found' }), { status: 409, headers: { 'Content-Type': 'application/json' } }),
      ),
    );
    show();
    await waitFor(() => expect(screen.getByText(/not being judged against a contract shape/)).toBeInTheDocument());
  });

  it('does not crash on a payload that is not a checklist', async () => {
    // The failure this guards: an unexpected response taking the whole matter
    // page down, and the deliberation and the vote with it.
    stub([]);
    show();
    await waitFor(() => expect(screen.getByText(/not being judged against a contract shape/)).toBeInTheDocument());
  });

  it('offers an observer no way to record anything', async () => {
    stub(checklist());
    show(false);

    await waitFor(() => expect(screen.getByText(/turns the sale into a financing/)).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /Record a finding/ })).toBeNull();
  });
});

/**
 * The library grew from three shapes to nineteen. A flat row of nineteen
 * buttons is a wall, so the picker groups them the way a scholar already
 * thinks: whatever this arrangement is, it is a sale, or a lease, or a
 * partnership, and the question is which one.
 */
describe('choosing the shape, out of a library that is no longer short', () => {
  const someOfEach = [
    { id: 'murabaha', name: 'Murabaha', family: 'sale' },
    { id: 'salam', name: 'Salam', family: 'sale' },
    { id: 'ijara', name: 'Ijara', family: 'lease' },
    { id: 'sukuk', name: 'Sukuk', family: 'security' },
    { id: 'combining-contracts', name: 'Combining contracts in one arrangement', family: 'combination' },
  ];

  it('groups the shapes by family, with the family named', async () => {
    library = someOfEach;
    stub([]);
    show();

    await waitFor(() => expect(screen.getByText('Sale')).toBeInTheDocument());
    expect(screen.getByText('Lease')).toBeInTheDocument();
    expect(screen.getByText('Securities')).toBeInTheDocument();
    // Its own family, not a footnote under the others: most arrangements that
    // fail do so as a combination. The family heading and the shape are named
    // separately, so a board sees a group and a choice rather than one word twice.
    expect(screen.getByText('Combining contracts')).toBeInTheDocument();
    expect(screen.getByText('Combining contracts in one arrangement')).toBeInTheDocument();
  });

  it('shows a family only when the library has something in it', async () => {
    library = [{ id: 'murabaha', name: 'Murabaha', family: 'sale' }];
    stub([]);
    show();

    await waitFor(() => expect(screen.getByText('Sale')).toBeInTheDocument());
    expect(screen.queryByText('Lease')).toBeNull();
    expect(screen.queryByText('Protection')).toBeNull();
  });

  it('still shows a shape whose family the picker has never heard of', async () => {
    // The failure this guards: the library gains a family, this list does not
    // catch up, and a shape quietly disappears from the only place it can be
    // chosen.
    library = [{ id: 'novel', name: 'Something new', family: 'not-in-the-list' }];
    stub([]);
    show();

    await waitFor(() => expect(screen.getByText('Something new')).toBeInTheDocument());
  });

  it('sets the shape the board picked and asks for the checklist again', async () => {
    library = someOfEach;
    stub([]);
    show();

    await waitFor(() => screen.getByText('Sukuk'));
    fireEvent.click(screen.getByText('Sukuk'));

    await waitFor(() => expect(posted).toHaveLength(1));
    expect(posted[0].url).toContain('/matters/m1/structure');
    expect(posted[0].body).toEqual({ structureId: 'sukuk' });
  });

  it('offers an observer no shape to pick, because setting one is deliberating', async () => {
    library = someOfEach;
    stub([]);
    show(false);

    await waitFor(() =>
      expect(screen.getByText(/not being judged against a contract shape/)).toBeInTheDocument(),
    );
    expect(screen.queryByText('Sukuk')).toBeNull();
  });
});

/**
 * A checklist built against the shipped draft and one built against what the
 * board adopted are different acts. An interface that showed them identically
 * would let the first be mistaken for the second.
 */
describe('the checklist says whose conditions it is counting', () => {
  it('says plainly when they are the shipped draft, and that they bind nobody', async () => {
    stub(checklist());
    show();

    await waitFor(() => expect(screen.getByText('Shipped draft')).toBeInTheDocument());
    expect(screen.getByText(/binding on nobody/)).toBeInTheDocument();
  });

  it('says when they are the board’s own', async () => {
    stub(
      checklist({
        source: 'adopted',
        sourceNote: 'This is the board’s own version, taken under the decision named.',
      }),
    );
    show();

    await waitFor(() => expect(screen.getByText('Taken as the board’s')).toBeInTheDocument());
    expect(screen.getByText(/the board’s own version/)).toBeInTheDocument();
  });

  it('says when they are the board’s own with changes', async () => {
    stub(checklist({ source: 'amended', sourceNote: 'The board amended this shape.' }));
    show();
    await waitFor(() => expect(screen.getByText('Taken with changes')).toBeInTheDocument());
  });

  it('warns on the checklist itself where the board ruled against the shape', async () => {
    stub(
      checklist({
        declined: true,
        sourceNote:
          'This board considered this shape and ruled against using it. A matter judged against it is being judged against something the board has already declined.',
      }),
    );
    show();

    await waitFor(() => expect(screen.getByText('Ruled against')).toBeInTheDocument());
    expect(screen.getByText(/already declined/)).toBeInTheDocument();
    // And the conditions are still shown: a board should see both facts at once.
    expect(screen.getByText(/turns the sale into a financing/)).toBeInTheDocument();
  });
});

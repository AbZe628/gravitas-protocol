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
  unanswered: ['ownership-before-sale'],
  contested: [],
  answered: 0,
  total: 1,
  note: 'This counts what the board has answered. Whether the conditions are satisfied is the board’s to decide.',
  ...over,
});

const posted: { url: string; body: unknown }[] = [];

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
      if (url.includes('/structures')) return json({ structures: [], note: '' });
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

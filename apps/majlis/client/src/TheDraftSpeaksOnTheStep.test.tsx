import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useState } from 'react';
import { I18nProvider } from './lib/i18n.js';
import ReadTheContract from './components/ReadTheContract.js';
import WhatTheDraftSays, { cite } from './components/WhatTheDraftSays.js';
import type { ContractReading } from './lib/api.js';
import en from './locales/en.js';

/**
 * The sentence from the draft, on the step the sentence is about.
 *
 * ── the gap ───────────────────────────────────────────────────────────────
 *
 * The reading exists and is good: it says where each condition is answered in
 * the text, quotes the sentence, and refuses to call anything met. It lives in
 * the matter's papers, and the conditions are answered one to a step, each on
 * a screen of its own — so a member who read the draft on the way in answered
 * condition four from memory, or went back, found the reading, scrolled to the
 * fourth row, read the sentence, came forward again and typed it out.
 *
 * ── and the line that must not move ───────────────────────────────────────
 *
 * *Answered* is not *met*. A clause can be present and wrong, contradicted
 * three pages later, or written in words that do not mean what the condition
 * means. So nothing here preselects a finding, nothing records, and the only
 * thing it carries across is the quoted sentence — into the reason, where it
 * is evidence a member is citing rather than an answer a machine gave. That
 * is the whole difference from the products that return *compliant*.
 */

const READING: ContractReading = {
  structureId: 'murabaha',
  structureName: 'Murabaha',
  adopted: true,
  charactersRead: 820,
  readBy: 'words',
  readAt: '2026-10-04T09:00:00.000Z',
  limits: ['It reads words, not meaning.'],
  conditions: [
    {
      conditionId: 'c1',
      requirement: 'The certificate holders own an undivided share in the assets.',
      standing: 'found',
      passages: [
        { text: 'The Seller shall take actual or constructive possession before selling it on.', at: 42 },
      ],
      note: 'The text addresses this in one place.',
      needsAPerson: true,
    },
    {
      conditionId: 'c2',
      requirement: 'The manager may not guarantee the capital.',
      standing: 'absent',
      passages: [],
      note: 'None of the words this condition is about appear together anywhere.',
      needsAPerson: true,
    },
  ],
};

// ── the panel on its own ──────────────────────────────────────────────────

describe('what the draft says about one condition', () => {
  const draw = (over: Partial<Parameters<typeof WhatTheDraftSays>[0]> = {}) =>
    render(
      <I18nProvider>
        <WhatTheDraftSays
          reading={READING}
          conditionId="c1"
          onQuote={() => undefined}
          {...over}
        />
      </I18nProvider>,
    );

  it('quotes the sentence and says which reader found it', () => {
    draw();
    expect(screen.getByText(/actual or constructive possession/)).toBeInTheDocument();
    expect(screen.getByText(en['read.found'])).toBeInTheDocument();
    expect(screen.getByText(new RegExp(en['read.byWords']))).toBeInTheDocument();
  });

  /*
   * The line. A reading says where the words are; it says nothing about
   * whether the condition is met, and the screen must not let it look as
   * though it did.
   */
  it('says it is not a finding', () => {
    draw();
    expect(screen.getByText(en['draft.says.notAFinding'])).toBeInTheDocument();
  });

  it('offers no verdict at all — only the sentence', () => {
    draw();
    const acts = screen.getAllByRole('button').map((b) => b.textContent ?? '');
    expect(acts).toEqual([en['draft.says.quote']]);
    for (const verdict of ['met', 'not_met', 'not_applicable'] as const) {
      expect(screen.queryByText(en[`chk.${verdict}`]), verdict).toBeNull();
    }
  });

  it('draws the standing where nothing was found, and no quote to carry', () => {
    draw({ conditionId: 'c2' });
    expect(screen.getByText(en['read.absent'])).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: en['draft.says.quote'] })).toBeNull();
  });

  /*
   * Nothing is kept — a draft pasted in is not a document of the record — so
   * on a matter nobody read one for there is nothing to draw. Not an empty
   * panel advertising a feature on every one of twenty steps.
   */
  it('is absent where no draft has been read', () => {
    const { container } = render(
      <I18nProvider>
        <WhatTheDraftSays reading={null} conditionId="c1" />
      </I18nProvider>,
    );
    expect(container.textContent).toBe('');
  });

  it('is absent for a condition the reading does not cover', () => {
    const { container } = render(
      <I18nProvider>
        <WhatTheDraftSays reading={READING} conditionId="c9" />
      </I18nProvider>,
    );
    expect(container.textContent).toBe('');
  });

  /* A reader who may not rule is offered nothing to carry into a box they have not got. */
  it('offers no way to quote where the reader may not rule', () => {
    draw({ onQuote: undefined });
    expect(screen.queryByRole('button', { name: en['draft.says.quote'] })).toBeNull();
    expect(screen.getByText(/actual or constructive possession/)).toBeInTheDocument();
  });
});

// ── and that it travels from the papers to the step ───────────────────────

/**
 * The seam, with the page's own two halves in it.
 *
 * `MatterFlow` reads the draft in the papers and asks the condition on a step
 * of its own; what joins them is that the reading is handed up and held for
 * the walk. This is that join, with a parent that holds it exactly as the
 * matter does — rather than the whole matter screen, which would need a
 * fixture for every pane it draws and would be measuring those instead.
 *
 * The walk itself was measured by doing it: a murabaha draft pasted into the
 * papers of a live matter, then all six conditions in turn, each carrying its
 * own sentence — *Answered*, *Not clear*, *Not there*.
 */

function Papers() {
  const [reading, setReading] = useState<ContractReading | null>(null);
  const [why, setWhy] = useState('');
  return (
    <I18nProvider>
      <MemoryRouter>
        <ReadTheContract structureId="murabaha" canRead onRead={setReading} onItsOwnScreen />
        <WhatTheDraftSays
          reading={reading}
          conditionId="c1"
          /* The same one the matter calls, not a copy of it. */
          onQuote={(sentence) => setWhy((was) => cite(was, sentence))}
        />
        <textarea aria-label="why" value={why} onChange={(e) => setWhy(e.target.value)} />
      </MemoryRouter>
    </I18nProvider>
  );
}

/**
 * Reading a draft is an act with a window in front of it, like every other
 * act here: the press opens the window that says what the reading does and
 * does not do, and the control inside it performs. Both presses, so the test
 * walks it the way a member does.
 */
async function readIt() {
  fireEvent.click(screen.getByRole('button', { name: en['read.doIt'] }));
  const windowed = await screen.findByRole('dialog');
  fireEvent.click(within(windowed).getByRole('button', { name: en['read.doIt'] }));
  await waitFor(() => expect(asked).toBe(1));
}

let asked = 0;

function stub() {
  asked = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const json = (b: unknown) =>
        new Response(JSON.stringify(b), { status: 200, headers: { 'Content-Type': 'application/json' } });
      if (init?.method === 'POST' && url.includes('/reading')) {
        asked += 1;
        return json(READING);
      }
      return json({});
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('a draft read in the papers', () => {
  it('is drawn on the condition it is about, with nothing recorded by it', async () => {
    stub();
    render(<Papers />);

    /* Before anything is read, the condition has nothing to show. */
    expect(screen.queryByRole('region', { name: en['draft.says.title'] })).toBeNull();

    fireEvent.change(screen.getByPlaceholderText(en['read.placeholder']), {
      target: { value: 'A'.repeat(200) },
    });
    await readIt();

    const panel = await screen.findByRole('region', { name: en['draft.says.title'] });
    expect(panel.textContent).toContain('actual or constructive possession');
  });

  /*
   * Added to what the member has written, never over it: a reason already
   * typed is theirs, and a quote is something they are citing in it.
   */
  it('carries the sentence into the reason without taking it over', async () => {
    stub();
    render(<Papers />);

    fireEvent.change(screen.getByPlaceholderText(en['read.placeholder']), {
      target: { value: 'A'.repeat(200) },
    });
    await readIt();
    await screen.findByRole('region', { name: en['draft.says.title'] });

    const why = screen.getByLabelText('why') as HTMLTextAreaElement;
    fireEvent.change(why, { target: { value: 'My own reading of clause 3.' } });
    fireEvent.click(screen.getByRole('button', { name: en['draft.says.quote'] }));

    await waitFor(() => expect(why.value).toContain('actual or constructive possession'));
    expect(why.value).toContain('My own reading of clause 3.');
  });
});

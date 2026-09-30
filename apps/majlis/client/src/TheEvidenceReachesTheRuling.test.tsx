import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nProvider } from './lib/i18n.js';
import { forgetIdentity } from './lib/identity.js';
import { forgetMembers } from './lib/members.js';
import RuleDetail from './pages/RuleDetail.js';
import en from './locales/en.js';

/**
 * From the ruling to the evidence about it, on the ruling's own page.
 *
 * ── what a board could not see ────────────────────────────────────────────
 *
 * The pool ruling answers six questions — what was decided, how it is
 * measured, whether it moves, when it is checked, what happens if it fails,
 * who is told. All mechanism, all correct, and not one word about the fact
 * that it **did** fail: three transfers executed at 50.4% in June, found by an
 * examination, sitting in the record, and invisible on the page for the rule
 * they breached. Under it the panel read *this stands. Nothing is waiting on
 * the board.*
 *
 * Rulings on one screen, the register on a second, examinations on a third.
 * The examinations read as bolted on because the chain was cut between them.
 */

const RULE = {
  id: 'rule-pool-trading',
  boardId: 'demo-board',
  title: 'Secondary trading of a mixed pool at market price',
  statement: 'Units may be traded at market price only while tangible assets are the majority.',
  parameters: [],
  parameterHash: '0x0',
  parameterHashVerified: true,
  version: 1,
  inForceFrom: '2026-04-02T00:00:00.000Z',
  supersededBy: null,
  supersedes: null,
  sources: [],
};

const OWNED = {
  against: 'ownership',
  kind: 'condition',
  asks: 'Certificate holders own an undivided share in the underlying assets.',
  why: 'Holders who own nothing hold a debt against the originator.',
  shownBy: 'document',
  lastLooked: null,
  timesLooked: 0,
  exceptions: 0,
};

const RATIO = {
  against: 'term:minTangibleRatioBps',
  kind: 'term',
  asks: 'Tangible assets and usufructs must be at least 51.00% of pool value.',
  why: null,
  shownBy: null,
  lastLooked: {
    examinationId: 'examination-2026-07-31',
    from: '2026-04-01',
    to: '2026-06-30',
    recordedAt: '2026-07-31T16:30:00.000Z',
    held: 'exceptions',
    exceptions: 3,
    note: 'Three transfers executed on 12 and 13 June while the ratio stood at 50.4%.',
    againstTheseTerms: true,
  },
  timesLooked: 2,
  exceptions: 3,
};

const CHAIN = {
  ruleId: RULE.id,
  matterId: 'matter-2026-04-02',
  links: [OWNED, RATIO],
  neverLooked: 1,
  exceptions: 3,
  examinations: 2,
};

function stub(chain: unknown = CHAIN, rule: Record<string, unknown> = RULE) {
  forgetIdentity();
  forgetMembers();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const json = (b: unknown) =>
        new Response(JSON.stringify(b), { status: 200, headers: { 'Content-Type': 'application/json' } });

      if (url.includes('/chain')) return json(chain);
      if (url.includes('/rested-on')) return json({ ruleId: RULE.id, supersededBy: null, items: [] });
      if (url.includes('/api/attention')) {
        return json({ scholarId: 'member-a', role: 'signatory', office: null, outstanding: 0, overdue: 0, items: [] });
      }
      if (url.includes('/api/settings')) return json({ members: [] });
      if (url.includes('/api/reviews')) return json({ asOf: '2026-10-01T00:00:00Z', due: 0, unscheduled: 0, items: [] });
      if (url.includes('/api/passages/review/')) return json({});
      /*
       * A review that is not due, deliberately. An overdue or unscheduled one
       * puts the page in its work window and says whose step it is, which is a
       * different sentence from the one under test.
       */
      if (url.endsWith('/review')) {
        return json({ ruleId: RULE.id, state: 'scheduled', dueAt: '2027-04-02T00:00:00Z', overdue: false, note: '' });
      }
      if (url.includes('/api/rules')) return json([rule]);
      return json({});
    }),
  );
}

const show = () =>
  render(
    <I18nProvider>
      <MemoryRouter initialEntries={[`/rules/${RULE.id}`]}>
        <Routes>
          <Route path="/rules/:id" element={<RuleDetail />} />
        </Routes>
      </MemoryRouter>
    </I18nProvider>,
  );

afterEach(() => vi.unstubAllGlobals());

describe('a ruling the examinations found something against', () => {
  it('says what was found, in the examiner’s own words', async () => {
    stub();
    show();
    await screen.findByText(RATIO.lastLooked.note);
    expect(screen.getByText(RATIO.asks)).toBeTruthy();
  });

  /*
   * *This stands. Nothing is waiting on the board.* was printed an inch above
   * three recorded exceptions. The sentence was written when no screen joined
   * a ruling to the evidence about it, so nothing on the page could contradict
   * it.
   */
  it('does not say nothing is waiting on the board', async () => {
    stub();
    show();
    await screen.findByText(RATIO.lastLooked.note);
    expect(screen.queryByText(en['rule.nextStands'])).toBeNull();
    expect(
      screen.getByText(en['rule.nextFound'].replace('{n}', String(CHAIN.exceptions))),
    ).toBeTruthy();
  });

  /*
   * The valuable half is the silence. A board reading *one of these two has
   * never been examined* is being told something no summary tells it, and a
   * condition nobody examined has to be a row with nothing in it rather than a
   * row that is not drawn.
   */
  it('draws the condition nobody has ever examined, and says so in the row', async () => {
    stub();
    show();
    await screen.findByText(OWNED.asks);
    expect(screen.getByText(en['evid.never'])).toBeTruthy();
    expect(
      screen.getByText(en['evid.neverLooked'].replace('{n}', '1').replace('{of}', '2')),
    ).toBeTruthy();
  });

  it('says what the institution must produce to show a condition, and invents none for a term', async () => {
    stub();
    show();
    await screen.findByText(OWNED.asks);
    // One sentence, one element: *Shown by a document*.
    const shown = `${en['evid.shownBy']} ${en['evid.shown.document']}`;
    expect(screen.getAllByText(shown)).toHaveLength(1);
    /*
     * Two rows, and only the condition carries one. A term is shown by the
     * figure itself, and nothing is invented to fill the gap.
     */
    expect(screen.queryAllByText((text) => text.startsWith(en['evid.shownBy']))).toHaveLength(1);
  });

  /*
   * Read inside the section, not over the whole page.
   *
   * Over the page it caught the section's own lead — *nothing here is a
   * verdict* — so the measure failed on the one sentence that exists to say it
   * never reaches one. The disclaimer is taken out and the rest is scanned.
   */
  it('reaches no verdict anywhere in what it says was found', async () => {
    stub();
    show();
    await screen.findByText(RATIO.lastLooked.note);

    const section = screen.getByLabelText(en['evid.title']);
    const said = section.textContent!.toLowerCase().replace(en['evid.lead'].toLowerCase(), '');
    // And it looked at something, rather than scanning an empty string.
    expect(said).toContain('50.4%');
    for (const word of ['compliant', 'passed', 'failed', 'verdict', 'score', 'clean']) {
      expect(said, `the section reached for the word "${word}"`).not.toContain(word);
    }
  });
});

/*
 * *1 exceptions*, on the first examination that found exactly one.
 *
 * The application says *chased once*, *one mismatch* and *standing since
 * yesterday* everywhere else. This was the one count with no singular, and it
 * only shows on a finding of exactly one — which no seeded examination had.
 */
describe('a finding of exactly one', () => {
  it('says exception, not exceptions', async () => {
    stub({
      ...CHAIN,
      links: [{ ...RATIO, exceptions: 1, lastLooked: { ...RATIO.lastLooked, exceptions: 1 } }],
      neverLooked: 0,
      exceptions: 1,
    });
    show();
    await screen.findByText(RATIO.lastLooked.note);

    const section = screen.getByLabelText(en['evid.title']);
    expect(section.textContent).toContain(`1 ${en['exam.exception']}`);
    expect(section.textContent).not.toContain(`1 ${en['exam.exceptions']}`);
  });

  it('still says exceptions for more than one', async () => {
    stub();
    show();
    await screen.findByText(RATIO.lastLooked.note);
    const section = screen.getByLabelText(en['evid.title']);
    expect(section.textContent).toContain(`3 ${en['exam.exceptions']}`);
  });
});

describe('a look taken against terms that have since moved', () => {
  it('says so, so a clean finding is not read as being about today’s rule', async () => {
    stub({
      ...CHAIN,
      links: [{ ...RATIO, lastLooked: { ...RATIO.lastLooked, againstTheseTerms: false } }],
      neverLooked: 0,
    });
    show();
    await screen.findByText(en['evid.olderTerms']);
  });

  it('says nothing of the kind where the terms are the ones that stand', async () => {
    stub();
    show();
    await screen.findByText(RATIO.lastLooked.note);
    expect(screen.queryByText(en['evid.olderTerms'])).toBeNull();
  });
});

describe('a ruling with nothing to show', () => {
  it('draws no heading where the ruling asks nothing at all', async () => {
    stub({ ...CHAIN, links: [], neverLooked: 0, exceptions: 0, examinations: 0 });
    show();
    await screen.findByText(RULE.statement);
    expect(screen.queryByText(en['evid.title'])).toBeNull();
  });

  /*
   * A read that failed takes nothing off the page. The ruling renders without
   * the evidence rather than the page refusing to load — and it must not then
   * claim the ruling is quiet, which it cannot know.
   */
  it('renders the ruling when the chain cannot be read', async () => {
    stub(null);
    show();
    await screen.findByText(RULE.statement);
    expect(screen.queryByText(en['evid.title'])).toBeNull();
  });
});

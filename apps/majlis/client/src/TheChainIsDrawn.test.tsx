import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nProvider } from './lib/i18n.js';
import { forgetIdentity } from './lib/identity.js';
import { forgetMembers } from './lib/members.js';
import RuleDetail from './pages/RuleDetail.js';
import en from './locales/en.js';

/**
 * What replaced what, drawn where the page has always promised it.
 *
 * ── the promise and the emptiness behind it ───────────────────────────────
 *
 * *In force today* says, in its own words, **the chain of what replaced what
 * is drawn, not implied** — and nothing in the application had ever replaced
 * anything. No route wrote a rule at all; `supersededBy` was read in five
 * services and set by none; two seeded rulings claimed to be version 3 and
 * version 2 with no predecessor in existence. The client type did not even
 * carry the two fields, so no screen could have drawn the chain had there
 * been one.
 *
 * ── three found by replacing a ruling and reading the page ────────────────
 *
 * It drew the id — *Replaced by rule-matter-20260930173714-sex2hi* — which is
 * the key the record files a ruling under, printed where its name belongs.
 *
 * The header went on saying **version 3** and **in force** while the section
 * beneath it said *replaced by*: the page disagreeing with itself about
 * whether the thing still stands.
 *
 * And beside the facts it read *no review scheduled* — the sentence for a
 * ruling nobody has decided about, on one the board had already moved past.
 */

const REPLACED = {
  id: 'rule-tangible-ratio',
  boardId: 'demo-board',
  title: 'Tangible asset ratio for secondary trading of mixed pools',
  statement: 'Tangible assets must be the majority of the value of the pool.',
  parameters: [],
  parameterHash: '0x0',
  parameterHashVerified: true,
  version: 3,
  inForceFrom: '2026-04-02T00:00:00.000Z',
  supersededBy: 'rule-restated',
  supersedes: null,
  sources: [],
};

const SUCCESSOR = {
  ...REPLACED,
  id: 'rule-restated',
  title: 'Tangible asset ratio, restated with the restoration window inside it',
  version: 4,
  supersededBy: null,
  supersedes: 'rule-tangible-ratio',
};

const RESTED = {
  ruleId: REPLACED.id,
  supersededBy: REPLACED.supersededBy,
  items: [
    {
      kind: 'examination',
      id: 'exam-1',
      title: '2026-04-01 — 2026-06-30',
      at: '2026-06-30T00:00:00.000Z',
      againstTheseTerms: true,
    },
    {
      kind: 'matter',
      id: 'matter-restated',
      title: 'Tangible asset ratio, restated with the restoration window inside it',
      at: '2026-09-30T00:00:00.000Z',
      againstTheseTerms: null,
    },
  ],
};

function stub(rule: Record<string, unknown>, rested: unknown = RESTED) {
  forgetIdentity();
  forgetMembers();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const json = (b: unknown) =>
        new Response(JSON.stringify(b), { status: 200, headers: { 'Content-Type': 'application/json' } });

      if (url.includes('/rested-on')) return json(rested);
      if (url.includes('/api/attention')) {
        return json({ scholarId: 'member-a', role: 'signatory', office: null, outstanding: 0, overdue: 0, items: [] });
      }
      if (url.includes('/api/settings')) return json({ members: [] });
      if (url.includes('/api/reviews')) return json({ asOf: '2026-09-30T00:00:00Z', due: 0, unscheduled: 0, items: [] });
      if (url.includes('/api/passages/review/')) return json({});
      if (url.endsWith('/review')) {
        return json({
          ruleId: REPLACED.id,
          state: 'not_applicable',
          dueAt: null,
          overdue: false,
          note: 'Superseded. The rule that replaced it carries the review.',
        });
      }
      /*
        Each ruling under its own id.
        
        Returning the page's own record for every id made the chain name the
        page after itself — which is what a screen holding an id and no way to
        read it does, and is the thing being tested.
      */
      if (url.endsWith(`/api/rules/${SUCCESSOR.id}`)) {
        return json(rule.id === SUCCESSOR.id ? rule : SUCCESSOR);
      }
      if (url.endsWith(`/api/rules/${REPLACED.id}`)) {
        return json(rule.id === REPLACED.id ? rule : REPLACED);
      }
      if (url.includes('/api/rules')) return json([rule]);
      return json({});
    }),
  );
}

const show = (id = REPLACED.id) =>
  render(
    <I18nProvider>
      <MemoryRouter initialEntries={[`/rules/${id}`]}>
        <Routes>
          <Route path="/rules/:id" element={<RuleDetail />} />
        </Routes>
      </MemoryRouter>
    </I18nProvider>,
  );

afterEach(() => vi.unstubAllGlobals());

describe('a ruling that was replaced', () => {
  /*
   * Twice, and the count is the measure.
   *
   * The same sentence belongs in two places on this page — the chip beside
   * the title, and beside the facts where *next review* used to read *no
   * review scheduled*. Written as *at least one*, it passed with the chip
   * deleted, because the fact alone satisfied it. A third place would fail
   * this too, which is right: somebody adding one should say so here.
   */
  it('says so at the top and beside the facts, in both places', async () => {
    stub(REPLACED);
    show();
    await waitFor(() => expect(screen.getAllByText(en['chain.superseded'])).toHaveLength(2));
  });

  it('names what replaced it, and never the key it is filed under', async () => {
    stub(REPLACED);
    show();

    const link = await screen.findByRole('link', { name: SUCCESSOR.title });
    expect(link).toHaveAttribute('href', `/rules/${SUCCESSOR.id}`);
    expect(screen.queryByText(SUCCESSOR.id), 'the id is on the screen where a title belongs').toBeNull();
  });

  it('does not say a review is unscheduled on a ruling nobody will review', async () => {
    stub(REPLACED);
    show();
    await screen.findByRole('link', { name: SUCCESSOR.title });
    expect(screen.queryByText(en['review.unscheduled'])).toBeNull();
  });

  /*
   * *This stands. Nothing is waiting on the board* — printed two inches under
   * a chip reading **replaced — no longer in force**. The three sentences
   * beside the acts were written when nothing in the application could
   * replace a ruling, so that one was true of every record that could exist.
   */
  it('does not say it stands', async () => {
    stub(REPLACED);
    show();
    await screen.findByRole('link', { name: SUCCESSOR.title });
    expect(screen.queryByText(en['rule.nextStands'])).toBeNull();
    expect(screen.queryByText(en['review.unscheduledNote'])).toBeNull();
  });

  it('lists what rested on it, and marks what tested the terms that went', async () => {
    stub(REPLACED);
    show();

    await screen.findByText(en['chain.restedOn']);
    // The examination's own period, which the list carries as its title.
    await screen.findByText(RESTED.items[0].title);
    // Said, never judged: there is no verdict on the screen and no field for one.
    expect(screen.getAllByText(en['chain.sameTerms']).length).toBe(1);
  });
});

describe('a ruling that replaced one', () => {
  it('names the one it replaced', async () => {
    stub(SUCCESSOR);
    show(SUCCESSOR.id);

    const link = await screen.findByRole('link', { name: REPLACED.title });
    expect(link).toHaveAttribute('href', `/rules/${REPLACED.id}`);
  });

  it('does not say it was itself replaced', async () => {
    stub(SUCCESSOR);
    show(SUCCESSOR.id);
    await screen.findByText(REPLACED.title);
    expect(screen.queryByText(en['chain.superseded'])).toBeNull();
  });
});

describe('a ruling in no chain at all', () => {
  it('draws no heading over an empty list', async () => {
    stub({ ...REPLACED, supersededBy: null, supersedes: null }, { ...RESTED, items: [] });
    show();
    await screen.findByText(REPLACED.statement);
    expect(screen.queryByText(en['chain.title'])).toBeNull();
  });
});

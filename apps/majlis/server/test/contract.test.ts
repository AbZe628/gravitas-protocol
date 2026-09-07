import { describe, it, expect } from 'vitest';
import { Refused } from '../src/services/lifecycle.js';
import { LIMITS, assemble, render } from '../src/services/contract.js';
import type { AdoptedStructure, Board, Matter } from '../src/types.js';

/**
 * The draft has one job and one temptation.
 *
 * The job is to save a lawyer from starting at a blank page. The temptation is
 * to produce something that looks finished, which would get sent — so most of
 * what is tested here is what it refuses to invent.
 */

const NOW = '2026-09-07T09:00:00.000Z';

const board: Board = {
  id: 'board-1',
  institutionId: 'inst-1',
  name: 'Shariah Supervisory Board',
  quorumPermit: 3,
  quorumRestrict: 2,
  totalSignatories: 3,
  ratificationWindowHours: 720,
  members: [
    { id: 's1', name: 'Mufti One', title: 'Chair', board: 'board-1', signatory: true },
    { id: 's2', name: 'Shaykh Two', title: 'Member', board: 'board-1', signatory: true },
  ],
};

const matter = (over: Partial<Matter> = {}): Matter =>
  ({
    id: 'matter-2026-050',
    boardId: 'board-1',
    title: 'A murabaha for the trade desk',
    origin: 'institution_request',
    direction: 'permit',
    status: 'in_force',
    openedAt: '2026-08-01T09:00:00.000Z',
    proposal: 'The board is asked to approve the murabaha as documented.',
    notDecided: ['This does not approve any onward sale of the commodity to a related party.'],
    mechanism: '',
    interactsWith: [],
    assetIds: [],
    structureId: 'murabaha',
    findings: [
      {
        conditionId: 'ownership-before-sale',
        holds: 'met',
        reason: 'The sale file shows the bank on title before the onward sale.',
        scholarId: 's1',
        at: NOW,
      },
      {
        conditionId: 'cost-disclosed',
        holds: 'not_met',
        reason: 'The schedule discloses the mark-up but not the original cost.',
        scholarId: 's2',
        at: NOW,
      },
    ],
    proposedRule: {
      id: 'rule-1',
      boardId: 'board-1',
      title: 'A murabaha for the trade desk',
      statement: 'The murabaha is permitted on the terms below.',
      parameters: [
        {
          key: 'maxTenorMonths',
          value: '24',
          unit: 'months',
          meaning: 'The deferred price is payable within two years of delivery.',
        },
      ],
      parameterHash: '0xabc',
      version: 1,
      inForceFrom: NOW,
      supersededBy: null,
      supersedes: null,
      sources: [],
    },
    simulation: null,
    deliberation: [],
    reasoning: [],
    timelockStartedAt: null,
    timelockEndsAt: null,
    objections: [],
    inForceAt: NOW,
    sources: [],
    ...over,
  }) as Matter;

const adoption = (over: Partial<AdoptedStructure> = {}): AdoptedStructure => ({
  id: 'adopt-1',
  boardId: 'board-1',
  structureId: 'murabaha',
  standing: 'adopted',
  conditions: [],
  amendments: [],
  matterId: 'matter-x',
  decidedBy: 's1',
  decidedAt: NOW,
  supersedes: null,
  ...over,
});

const code = (fn: () => unknown): string | null => {
  try {
    fn();
    return null;
  } catch (e) {
    return e instanceof Refused ? e.code : `threw ${String(e)}`;
  }
};

describe('what it refuses to draft', () => {
  it('refuses a matter the board has not decided', () => {
    expect(code(() => assemble(board, matter({ status: 'deliberation' }), NOW))).toBe('wrong_status');
    expect(code(() => assemble(board, matter({ status: 'voting' }), NOW))).toBe('wrong_status');
  });

  /*
   * The board said no. A draft of the thing it refused is the single most
   * dangerous document this file could produce.
   */
  it('refuses a ruling the board did not approve', () => {
    expect(code(() => assemble(board, matter({ status: 'rejected' }), NOW))).toBe('wrong_status');
    expect(code(() => assemble(board, matter({ status: 'lapsed' }), NOW))).toBe('wrong_status');
  });

  it('draws for a decision in its timelock, which is decided but not yet in effect', () => {
    expect(code(() => assemble(board, matter({ status: 'timelock' }), NOW))).toBeNull();
  });

  it('refuses where the matter was never judged against a shape', () => {
    expect(code(() => assemble(board, matter({ structureId: undefined }), NOW))).toBe('no_structure');
  });

  it('refuses a shape this board ruled against using', () => {
    const declined = adoption({ standing: 'declined' });
    expect(code(() => assemble(board, matter(), NOW, declined))).toBe('shape_declined');
  });
});

describe('every clause traces to something a member wrote', () => {
  it('turns a met condition into a clause in the member’s own words', () => {
    const d = assemble(board, matter(), NOW);
    const clause = d.clauses.find((c) => c.text.includes('bank on title'));
    expect(clause).toBeDefined();
    expect(clause?.from).toBe('finding');
    expect(clause?.by).toBe('s1');
  });

  /*
   * The board permitted the structure and recorded that something about it does
   * not hold. Dropping that clause would remove exactly the line the
   * institution most needs to see.
   */
  it('keeps a condition the board found not met, and marks it as a gap', () => {
    const d = assemble(board, matter(), NOW);
    const clause = d.clauses.find((c) => c.text.includes('not the original cost'));
    expect(clause).toBeDefined();
    expect(clause?.text).toContain('does not presently hold');
    expect(clause?.gap).toContain('must provide for this');
  });

  it('drafts a term from its plain meaning, with the figure to check it against', () => {
    const d = assemble(board, matter(), NOW);
    const clause = d.clauses.find((c) => c.from === 'term');
    // The sentence the scholar approved is the heading; the figure is the body,
    // so a reader can check one against the other without reading it twice.
    expect(clause?.heading).toBe('The deferred price is payable within two years of delivery.');
    expect(clause?.text).toContain('24 months');
    expect(clause?.text).toContain('maxTenorMonths');
    expect(clause?.text).not.toContain('within two years of delivery');
  });

  it('carries what the board held outside the question as a clause of its own', () => {
    const d = assemble(board, matter(), NOW);
    const held = d.clauses.find((c) => c.from === 'outside');
    expect(held?.heading).toContain('onward sale of the commodity');
    expect(held?.text).toContain('needs its own ruling');
  });

  it('names the conditions nobody answered rather than dropping them', () => {
    const d = assemble(board, matter(), NOW);
    // Murabaha has more conditions than the two answered above.
    expect(d.unanswered.length).toBeGreaterThan(0);
    expect(render(d)).toContain('Conditions the board did not answer');
  });

  it('leaves out a condition the board ruled does not apply', () => {
    const d = assemble(
      board,
      matter({
        findings: [
          {
            conditionId: 'ownership-before-sale',
            holds: 'not_applicable',
            reason: 'There is no commodity leg in this arrangement.',
            scholarId: 's1',
            at: NOW,
          },
        ],
      }),
      NOW,
    );
    expect(d.clauses.some((c) => c.from === 'finding')).toBe(false);
  });

  it('numbers the clauses in one sequence a reader can cite', () => {
    const d = assemble(board, matter(), NOW);
    expect(d.clauses.map((c) => c.number)).toEqual(
      d.clauses.map((_, i) => String(i + 1)),
    );
  });
});

describe('what it says about itself', () => {
  it('carries the limits in the object, not only in the page', () => {
    expect(assemble(board, matter(), NOW).limits).toEqual(LIMITS);
  });

  it('says it is not a contract, before the clauses rather than after them', () => {
    const html = render(assemble(board, matter(), NOW));
    expect(html).toContain('It is not a contract');
    expect(html.indexOf('It is not a contract')).toBeLessThan(html.indexOf('Clauses'));
  });

  it('says what a Shariah ruling does not cover', () => {
    const html = render(assemble(board, matter(), NOW));
    expect(html).toContain('governing law');
    expect(html).toContain('none of it was put to the board');
  });

  it('names no standard where the board named none', () => {
    const d = assemble(board, matter(), NOW);
    expect(d.basis).toBeNull();
    expect(render(d)).toContain('has not stated what these conditions rest on');
    expect(render(d).toLowerCase()).not.toContain('aaoifi');
  });

  it('prints the board’s own basis where it gave one', () => {
    const d = assemble(board, matter(), NOW, adoption({ basis: 'Our own view, minuted 12 March' }));
    expect(d.basis).toBe('Our own view, minuted 12 March');
    expect(render(d)).toContain('Our own view, minuted 12 March');
  });

  it('says whose conditions these are', () => {
    expect(render(assemble(board, matter(), NOW))).toContain('has not adopted this shape');
    expect(render(assemble(board, matter(), NOW, adoption()))).toContain('this board’s own version');
  });

  it('escapes what it prints, since every word of it comes from a person', () => {
    const d = assemble(
      board,
      matter({ notDecided: ['<script>alert(1)</script> is not approved.'] }),
      NOW,
    );
    const html = render(d);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

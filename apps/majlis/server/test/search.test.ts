import { describe, it, expect } from 'vitest';
import type { Matter, Rule } from '../src/types.js';
import { search, terms } from '../src/services/search.js';
import { relatedTo } from '../src/services/precedent.js';

/**
 * A board that has decided two hundred matters and cannot find the one it
 * decided last year has lost the thing this application exists to accumulate.
 */

const T0 = '2026-03-04T09:00:00.000Z';

function rule(over: Partial<Rule> = {}): Rule {
  return {
    id: 'rule-x', boardId: 'b', title: '', statement: '', parameters: [],
    parameterHash: '', version: 1, inForceFrom: null,
    supersededBy: null, supersedes: null, sources: [],
    ...over,
  };
}

function matter(over: Partial<Matter> = {}): Matter {
  return {
    id: 'm', boardId: 'b', title: 'A matter', origin: 'protocol_change',
    direction: 'permit', status: 'deliberation', openedAt: T0,
    proposal: '', notDecided: [], mechanism: '', interactsWith: [],
    proposedRule: rule(), simulation: null,
    deliberation: [], reasoning: [],
    timelockStartedAt: null, timelockEndsAt: null, objections: [],
    inForceAt: null, sources: [],
    ...over,
  };
}

const say = (scholarId: string, body: string) => ({
  id: 'd-' + scholarId, scholarId, body, at: T0, replyTo: null, liaisonAnswer: false,
});

const vote = (scholarId: string, reason: string) => ({
  scholarId, position: 'for' as const, reason, at: T0,
});

const cite = (label: string, ref: string, addedBy = 's1') => ({
  id: 'src-' + ref, kind: 'standard' as const, label, ref, addedBy, at: T0, withdrawnAt: null,
});

// ── how a query is read ───────────────────────────────────────────────────

describe('a query is read as words that narrow it', () => {
  it('drops the words that match everything', () => {
    expect(terms('the treatment of a tangible asset')).toEqual(['treatment', 'tangible', 'asset']);
  });

  it('keeps identifiers whole', () => {
    expect(terms('AAOIFI SS-21 clause 3/1')).toEqual(['aaoifi', 'ss-21', 'clause', '3/1']);
  });

  /* Every word must appear, or narrowing a search would widen it. */
  it('requires every term', () => {
    const m = [matter({ id: 'a', title: 'Tangible asset ratio' })];
    expect(search(m, 'tangible ratio')).toHaveLength(1);
    expect(search(m, 'tangible sukuk')).toHaveLength(0);
  });
});

// ── where it looks ────────────────────────────────────────────────────────

describe('it searches everywhere the words could be', () => {
  const corpus = [
    matter({ id: 'title', title: 'Sukuk treatment on drift' }),
    matter({ id: 'proposal', proposal: 'Permit the sukuk for a cure period.' }),
    matter({ id: 'rule', proposedRule: rule({ statement: 'A sukuk may be held while curing.' }) }),
    matter({
      id: 'param',
      proposedRule: rule({ parameters: [{ key: 'sukuk_ratio', value: '30', meaning: 'The floor.' }] }),
    }),
    matter({ id: 'source', sources: [cite('AAOIFI on sukuk', 'SS 21')] }),
    matter({ id: 'reason', reasoning: [vote('s1', 'The sukuk is separable from its coupon.')] }),
    matter({ id: 'talk', deliberation: [say('s2', 'What happens to a sukuk mid-quarter?')] }),
  ];

  it('finds the word wherever it is', () => {
    const found = search(corpus, 'sukuk').map((h) => h.matterId);
    expect(found).toHaveLength(7);
  });

  /*
   * Explainable ranking matters more than a good one here: a scholar has to be
   * able to see why a result came up and disagree with it.
   */
  it('ranks a title above the discussion around it', () => {
    const ranked = search(corpus, 'sukuk').map((h) => h.matterId);
    expect(ranked[0]).toBe('title');
    expect(ranked.indexOf('talk')).toBeGreaterThan(ranked.indexOf('rule'));
  });

  it('says which field matched, and shows the text', () => {
    const [hit] = search([corpus[5]], 'separable');
    expect(hit.matches[0].field).toBe('reasoning');
    expect(hit.matches[0].snippet).toContain('separable');
    expect(hit.matches[0].by).toBe('s1');
  });

  it('a matter matching in two places outranks one matching in one', () => {
    const one = matter({ id: 'one', title: 'Sukuk' });
    const two = matter({ id: 'two', title: 'Sukuk', reasoning: [vote('s1', 'On the sukuk.')] });
    expect(search([one, two], 'sukuk')[0].matterId).toBe('two');
  });

  /* A withdrawn citation is not what the board is arguing from. */
  it('ignores a withdrawn source', () => {
    const m = matter({ id: 'w', sources: [{ ...cite('Withdrawn standard', 'SS 99'), withdrawnAt: T0 }] });
    expect(search([m], 'withdrawn standard')).toHaveLength(0);
  });
});

// ── narrowing ─────────────────────────────────────────────────────────────

describe('filters narrow without words', () => {
  const corpus = [
    matter({ id: 'a', status: 'in_force', direction: 'permit', reasoning: [vote('s1', 'Yes.')] }),
    matter({ id: 'b', status: 'deliberation', direction: 'restrict', deliberation: [say('s2', 'Hm.')] }),
    matter({ id: 'c', status: 'in_force', direction: 'restrict', boardId: 'other' }),
  ];

  it('a query of only filters is a valid question', () => {
    expect(search(corpus, '', { status: ['in_force'] }).map((h) => h.matterId)).toEqual(['a', 'c']);
  });

  it('by direction', () => {
    expect(search(corpus, '', { direction: 'restrict' }).map((h) => h.matterId).sort()).toEqual(['b', 'c']);
  });

  it('by board, because plurality is assumed', () => {
    expect(search(corpus, '', { boardId: 'other' }).map((h) => h.matterId)).toEqual(['c']);
  });

  /* "Everything I said something in" is the question a member actually asks. */
  it('by the member who took part', () => {
    expect(search(corpus, '', { scholarId: 's2' }).map((h) => h.matterId)).toEqual(['b']);
    expect(search(corpus, '', { scholarId: 's1' }).map((h) => h.matterId)).toEqual(['a']);
  });

  it('by date', () => {
    const old = matter({ id: 'old', openedAt: '2025-01-01T00:00:00.000Z' });
    expect(search([...corpus, old], '', { from: '2026-01-01' }).map((h) => h.matterId)).not.toContain('old');
  });
});

// ── precedent ─────────────────────────────────────────────────────────────

/*
 * Every relation is a fact in the record, never a resemblance. Offering a
 * scholar a coincidence as a precedent invites them to treat it as one, and a
 * precedent is a serious claim.
 */
describe('precedent is a fact in the record, not a resemblance', () => {
  const subject = matter({
    id: 'now',
    sources: [cite('AAOIFI Shariah Standard No. 21', 'SS 21 clause 3/1')],
    proposedRule: rule({ id: 'rule-now', parameters: [{ key: 'tangible_ratio_min', value: '30', meaning: 'Floor.' }] }),
    interactsWith: ['rule-old'],
  });

  it('finds a matter citing the same reference, and names it', () => {
    const other = matter({
      id: 'cited-same',
      sources: [cite('AAOIFI Shariah Standard No. 21', 'SS 21 clause 3/1', 's2')],
    });
    const [rel] = relatedTo(subject, [subject, other]);

    expect(rel.matterId).toBe('cited-same');
    expect(rel.relations[0].kind).toBe('same_source');
    expect(rel.relations[0].shared).toContain('AAOIFI');
  });

  it('finds a declared interaction, either way round', () => {
    const named = matter({ id: 'old', proposedRule: rule({ id: 'rule-old' }) });
    const naming = matter({ id: 'names-us', interactsWith: ['rule-now'] });

    const ids = relatedTo(subject, [subject, named, naming]).map((r) => r.matterId);
    expect(ids).toContain('old');
    expect(ids).toContain('names-us');
  });

  it('finds a matter setting the same operative term', () => {
    const other = matter({
      id: 'same-term',
      proposedRule: rule({ id: 'r2', parameters: [{ key: 'tangible_ratio_min', value: '33', meaning: 'A different floor.' }] }),
    });
    const [rel] = relatedTo(subject, [subject, other]);
    expect(rel.relations[0].kind).toBe('same_parameter');
    expect(rel.relations[0].shared).toBe('tangible_ratio_min');
  });

  it('offers nothing on a mere resemblance', () => {
    const lookalike = matter({ id: 'similar', title: 'Another matter about tangible assets and ratios' });
    expect(relatedTo(subject, [subject, lookalike])).toHaveLength(0);
  });

  it('never returns the matter itself, or another board', () => {
    const elsewhere = matter({ id: 'other-board', boardId: 'z', sources: [cite('Same', 'SS 21 clause 3/1')] });
    const ids = relatedTo(subject, [subject, elsewhere]).map((r) => r.matterId);
    expect(ids).not.toContain('now');
    expect(ids).not.toContain('other-board');
  });

  /* A decided matter carries more weight as precedent than an open one. */
  it('puts a settled matter above an open one with the same claim', () => {
    const settled = matter({ id: 'settled', status: 'in_force', sources: [cite('A', 'SS 21 clause 3/1')] });
    const open = matter({ id: 'open', status: 'deliberation', sources: [cite('A', 'SS 21 clause 3/1')] });

    expect(relatedTo(subject, [subject, open, settled])[0].matterId).toBe('settled');
  });

  it('counts one shared thing once', () => {
    const twice = matter({
      id: 'twice',
      sources: [cite('A', 'SS 21 clause 3/1'), cite('A again', 'SS 21 clause 3/1')],
    });
    const [rel] = relatedTo(subject, [subject, twice]);
    expect(rel.relations.filter((r) => r.kind === 'same_source')).toHaveLength(1);
  });
});

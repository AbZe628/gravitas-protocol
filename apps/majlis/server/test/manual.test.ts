import { describe, it, expect } from 'vitest';
import type { Matter, Rule } from '../src/types.js';
import { buildManual, renderManual } from '../src/services/manual.js';

const NOW = '2026-09-02T09:00:00.000Z';
const T0 = '2026-01-15T09:00:00.000Z';

const terms = [
  { key: 'maxExposureBps', value: '2500', unit: 'bps', meaning: 'At most 25% of net asset value.' },
];

function rule(over: Partial<Rule> = {}): Rule {
  return {
    id: 'r1', boardId: 'b', title: 'Wrapped staking tokens',
    statement: 'The wrapper inherits the ruling of its underlying, subject to the limit below.',
    parameters: terms, parameterHash: '0xabc', version: 1,
    inForceFrom: T0, supersededBy: null, supersedes: null,
    sources: [{ kind: 'standard', label: 'AAOIFI SS 21', ref: 'Standard 21' }],
    reviewEveryMonths: 6,
    ...over,
  };
}

function matter(over: Partial<Matter> = {}): Matter {
  return {
    id: 'matter-1', boardId: 'b', title: 'Wrapped staking tokens',
    origin: 'institution_request', direction: 'permit', status: 'in_force', openedAt: T0,
    proposal: 'Whether the wrapper is a separate asset.',
    notDecided: ['Does not approve other wrappers.'],
    mechanism: 'Mints one token per unit deposited.',
    implementationSteps: ['Confirm the wrapper address against the registry.', 'Cap the position at the recorded limit.'],
    interactsWith: [],
    proposedRule: rule(), simulation: null, deliberation: [], reasoning: [],
    timelockStartedAt: null, timelockEndsAt: null, objections: [],
    inForceAt: T0, settledAt: T0,
    sources: [{ kind: 'standard', label: 'AAOIFI SS 21', ref: 'Standard 21' }],
    ...over,
  };
}

describe('it is derived, so it cannot drift', () => {
  it('builds an entry from the matter that produced the rule', () => {
    const m = buildManual([], [matter()], NOW);
    expect(m.entries).toHaveLength(1);

    const e = m.entries[0];
    expect(e.title).toBe('Wrapped staking tokens');
    expect(e.implementationSteps).toHaveLength(2);
    expect(e.terms).toHaveLength(1);
    expect(e.notDecided).toEqual(['Does not approve other wrappers.']);
    expect(e.decidedIn).toBe('matter-1');
    expect(e.gaps).toEqual([]);
  });

  it('includes a standing rule with no decision behind it, and says so', () => {
    const m = buildManual([rule({ id: 'seeded' })], [], NOW);
    expect(m.entries).toHaveLength(1);
    expect(m.entries[0].decidedIn).toBeNull();
    expect(m.entries[0].gaps.join(' ')).toContain('does not hold the decision');
  });

  it('does not list the same rule twice when both sources carry it', () => {
    const m = buildManual([rule()], [matter()], NOW);
    expect(m.entries).toHaveLength(1);
    expect(m.entries[0].decidedIn).toBe('matter-1');
  });

  it('leaves out a rule that never took effect', () => {
    expect(buildManual([rule({ inForceFrom: null })], [], NOW).entries).toEqual([]);
  });

  it('leaves out a matter that is not in force', () => {
    for (const status of ['draft', 'deliberation', 'voting', 'timelock', 'rejected'] as const) {
      expect(buildManual([], [matter({ status })], NOW).entries).toEqual([]);
    }
  });

  it('scopes to one board when asked', () => {
    const mine = matter();
    const theirs = matter({ id: 'm2', boardId: 'other', proposedRule: rule({ id: 'r2', boardId: 'other' }) });
    expect(buildManual([], [mine, theirs], NOW, 'b').entries).toHaveLength(1);
    expect(buildManual([], [mine, theirs], NOW).entries).toHaveLength(2);
  });

  it('orders entries by title, so the same record produces the same document', () => {
    const a = matter({ id: 'm1', title: 'Zeta', proposedRule: rule({ id: 'ra' }) });
    const b = matter({ id: 'm2', title: 'Alpha', proposedRule: rule({ id: 'rb' }) });
    expect(buildManual([], [a, b], NOW).entries.map((e) => e.title)).toEqual(['Alpha', 'Zeta']);
  });
});

describe('live and superseded never mix', () => {
  const dead = rule({ id: 'old', title: 'An earlier treatment', supersededBy: 'r1' });

  it('keeps a superseded rule out of the rules in force', () => {
    const m = buildManual([rule(), dead], [], NOW);
    expect(m.entries.map((e) => e.ruleId)).toEqual(['r1']);
    expect(m.superseded.map((e) => e.ruleId)).toEqual(['old']);
  });

  it('warns in the document that nothing below governs anything', () => {
    const page = renderManual(buildManual([rule(), dead], [], NOW), 'The Board');
    expect(page).toContain('No longer in force');
    expect(page).toContain('no\n  activity should be checked against it');
  });

  it('says nothing about superseded rules when there are none', () => {
    expect(renderManual(buildManual([rule()], [], NOW), 'The Board')).not.toContain('No longer in force');
  });
});

describe('gaps are named, not smoothed over', () => {
  it('names a missing implementation step in terms of what it costs', () => {
    const e = buildManual([], [matter({ implementationSteps: [] })], NOW).entries[0];
    expect(e.gaps.join(' ')).toContain('GN-6');
    expect(e.gaps.join(' ')).toContain('cannot check a desk against prose');
  });

  it('names missing terms, limits, sources and review interval', () => {
    const bare = matter({
      implementationSteps: [],
      notDecided: [],
      sources: [],
      proposedRule: rule({ parameters: [], sources: [], reviewEveryMonths: undefined }),
    });
    const e = buildManual([], [bare], NOW).entries[0];
    const text = e.gaps.join(' ');

    expect(text).toContain('No operative terms');
    expect(text).toContain('Nothing is recorded as outside this ruling');
    expect(text).toContain('No sources are attached');
    expect(text).toContain('No review interval is set');
  });

  it('counts the incomplete entries and the unscheduled ones', () => {
    const good = matter();
    const bad = matter({
      id: 'm2', title: 'Bare', implementationSteps: [],
      proposedRule: rule({ id: 'r2', reviewEveryMonths: undefined }),
    });
    const m = buildManual([], [good, bad], NOW);
    expect(m.incomplete).toBe(1);
    expect(m.unscheduled).toBe(1);
  });

  it('says so plainly when nothing is missing', () => {
    const page = renderManual(buildManual([], [matter()], NOW), 'The Board');
    expect(page).toContain('Every entry carries its terms');
    expect(page).not.toContain('This entry is incomplete');
  });

  it('leaves out a source the board withdrew', () => {
    const m = matter({
      sources: [
        { kind: 'standard', label: 'Kept', ref: 'a' },
        { kind: 'standard', label: 'Withdrawn', ref: 'b', withdrawnAt: T0 },
      ],
    });
    expect(buildManual([], [m], NOW).entries[0].evidence.map((s) => s.label)).toEqual(['Kept']);
  });
});

describe('the page', () => {
  const page = (m = buildManual([], [matter()], NOW)) => renderManual(m, 'Shariah Supervisory Board');

  it('is a whole document with nothing fetched from a network', () => {
    const html = page();
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('@page');
    expect(html).not.toContain('<script');
    expect(html).not.toMatch(/https?:\/\//);
  });

  it('carries the conditions, the steps and the limits under their own headings', () => {
    const html = page();
    expect(html).toContain('Conditions every transaction must meet');
    expect(html).toContain('How it is implemented');
    expect(html).toContain('Outside this ruling');
    expect(html).toContain('Confirm the wrapper address against the registry.');
  });

  it('has an honest answer for a board with nothing in force', () => {
    const html = page(buildManual([], [], NOW));
    expect(html).toContain('nothing to describe yet');
  });

  it('says it is computed rather than maintained by hand', () => {
    expect(page()).toContain('computed each\n    time it is asked for');
  });

  it('escapes anything anyone typed', () => {
    const m = matter({ title: 'Wrapped <script>alert(1)</script>' });
    const html = page(buildManual([], [m], NOW));
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

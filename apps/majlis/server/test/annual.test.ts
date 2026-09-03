import { describe, it, expect } from 'vitest';
import type { Board, Incident, Matter, Rule } from '../src/types.js';
import { assembleAnnualReport, renderAnnualReport } from '../src/services/annual.js';

const board: Board = {
  id: 'b', institutionId: 'inst', name: 'Shariah Supervisory Board',
  quorumPermit: 3, quorumRestrict: 2, totalSignatories: 3, ratificationWindowHours: 168,
  members: [
    { id: 's1', name: 'Mufti One', title: 'Chair', board: 'b', signatory: true },
    { id: 's2', name: 'Shaykh Two', title: 'Member', board: 'b', signatory: true },
    { id: 's3', name: 'Dr Three', title: 'Member', board: 'b', signatory: true },
    { id: 'adv', name: 'Advisor', title: 'Advisory', board: 'b', signatory: false },
  ],
};

const NOW = '2027-01-15T09:00:00.000Z';
const inYear = (d: string) => `2026-${d}T09:00:00.000Z`;

function rule(over: Partial<Rule> = {}): Rule {
  return {
    id: 'r1', boardId: 'b', title: 'A rule', statement: '', parameters: [],
    parameterHash: '0x0', version: 1, inForceFrom: inYear('03-01'),
    supersededBy: null, supersedes: null, sources: [], reviewEveryMonths: 6,
    ...over,
  };
}

function matter(over: Partial<Matter> = {}): Matter {
  return {
    id: 'm1', boardId: 'b', title: 'A matter', origin: 'institution_request',
    direction: 'permit', status: 'in_force', openedAt: inYear('02-01'),
    proposal: '', notDecided: [], mechanism: '', interactsWith: [],
    proposedRule: rule(), simulation: null, deliberation: [], reasoning: [],
    timelockStartedAt: null, timelockEndsAt: null, objections: [],
    inForceAt: inYear('03-01'), settledAt: inYear('02-08'),
    arrivedAt: inYear('02-01'), sources: [],
    ...over,
  };
}

function incident(over: Partial<Incident> = {}): Incident {
  return {
    id: 'i1', boardId: 'b', reference: 'SNC-2026-001', title: 'Retail deposit mispricing',
    report: '', reportedBy: 'x', reportedAt: inYear('05-01'),
    stage: 'determined', concurrences: [], determinedAt: inYear('05-04'), actual: true,
    stopped: [], plans: [], directorsApprovedAt: null, submittedToRegulatorAt: null,
    purification: null, closedAt: null, sources: [],
    ...over,
  };
}

const build = (over: Partial<Parameters<typeof assembleAnnualReport>[0]> = {}) =>
  assembleAnnualReport({
    year: 2026, board, matters: [], rules: [], incidents: [], generatedAt: NOW, ...over,
  });

describe('the opinion is the board’s and nothing here may write it', () => {
  it('is null, always', () => {
    expect(build().opinion).toBeNull();
    expect(build({ matters: [matter()], incidents: [incident()] }).opinion).toBeNull();
  });

  it('states what the opinion has to address instead of drafting it', () => {
    const r = build();
    expect(r.opinionMustAddress.length).toBeGreaterThanOrEqual(4);
    expect(r.opinionMustAddress.join(' ')).toContain('zakat');
    expect(r.opinionMustAddress.join(' ')).toContain('disposed of to charity');
  });

  it('leaves a labelled blank in the document rather than a sentence', () => {
    const page = renderAnnualReport(build());
    expect(page).toContain('The board’s opinion goes here.');
    expect(page).toContain('Nothing above drafts it.');
    expect(page).toContain('is not produced by this system');
  });

  it('carries no wording anywhere that could be mistaken for a verdict', () => {
    const page = renderAnnualReport(build({ matters: [matter()] })).toLowerCase();
    for (const phrase of ['in our opinion', 'we are of the view', 'the board is satisfied', 'complies with']) {
      expect(page).not.toContain(phrase);
    }
  });
});

describe('what the board did', () => {
  it('counts a matter in the year it was settled, not the year it was raised', () => {
    const spanning = matter({ openedAt: '2025-11-01T09:00:00.000Z', settledAt: inYear('02-08') });
    expect(build({ matters: [spanning] }).activity.decided).toBe(1);
    expect(assembleAnnualReport({ year: 2025, board, matters: [spanning], rules: [], incidents: [], generatedAt: NOW }).activity.decided).toBe(0);
  });

  it('separates approvals from refusals, withdrawals and lapses', () => {
    const r = build({
      matters: [
        matter({ id: 'a', status: 'in_force' }),
        matter({ id: 'b', status: 'rejected' }),
        matter({ id: 'c', status: 'withdrawn' }),
        matter({ id: 'd', status: 'lapsed' }),
      ],
    });
    expect(r.activity).toMatchObject({ decided: 4, approved: 1, refused: 1, withdrawn: 1, lapsed: 1 });
  });

  it('counts rules in force at the period end, excluding superseded ones', () => {
    const r = build({ rules: [rule(), rule({ id: 'r2', supersededBy: 'r1' }), rule({ id: 'r3', inForceFrom: null })] });
    expect(r.activity.inForceAtYearEnd).toBe(1);
  });

  it('breaks the year down by where the work came from', () => {
    const r = build({
      matters: [
        matter({ id: 'a', origin: 'institution_request' }),
        matter({ id: 'b', origin: 'compliance_concern' }),
        matter({ id: 'c', origin: 'compliance_concern' }),
      ],
    });
    expect(r.activity.byOrigin.compliance_concern).toBe(2);
    expect(r.activity.byOrigin.periodic_review).toBe(0);
  });

  it('ignores another board’s work entirely', () => {
    const theirs = matter({ id: 'x', boardId: 'other' });
    expect(build({ matters: [theirs], rules: [rule({ boardId: 'other' })] }).activity.decided).toBe(0);
  });

  it('lists the year’s decisions oldest first', () => {
    const r = build({
      matters: [
        matter({ id: 'late', settledAt: inYear('11-01') }),
        matter({ id: 'early', settledAt: inYear('02-01') }),
      ],
    });
    expect(r.decisions.map((d) => d.reference)).toEqual(['early', 'late']);
  });
});

describe('time taken, which no standard asks for', () => {
  it('reports the year’s own pace', () => {
    const r = build({
      matters: [
        matter({ id: 'a', arrivedAt: inYear('02-01'), settledAt: inYear('02-08') }),
        matter({ id: 'b', arrivedAt: inYear('04-01'), settledAt: inYear('04-04') }),
      ],
    });
    expect(r.pace.fastestDays).toBe(3);
    expect(r.pace.slowestDays).toBe(7);
    expect(r.pace.medianDays).toBe(5);
    expect(r.pace.approximate).toBe(false);
  });

  it('says nothing rather than guessing when there is nothing to measure', () => {
    const r = build();
    expect(r.pace.medianDays).toBeNull();
    expect(renderAnnualReport(r)).toContain('<span>—</span>');
  });

  it('marks the figures partial where an arrival was never recorded', () => {
    const r = build({ matters: [matter({ arrivedAt: undefined })] });
    expect(r.pace.approximate).toBe(true);
    expect(r.gaps.join(' ')).toContain('only what this system witnessed');
  });
});

describe('non-compliance in the year', () => {
  it('says plainly when there was none', () => {
    const page = renderAnnualReport(build());
    expect(page).toContain('No event was determined to be an actual non-compliance');
  });

  it('carries the count, the nature and whether it was rectified', () => {
    const r = build({ incidents: [incident()] });
    expect(r.nonCompliance.count).toBe(1);
    expect(r.nonCompliance.events[0].nature).toBe('Retail deposit mispricing');

    const page = renderAnnualReport(r);
    expect(page).toContain('SNC-2026-001');
    expect(page).toContain('<strong>1</strong>');
  });

  it('will not let an opinion rest on unpaid purification without saying so', () => {
    const owing = incident({
      purification: {
        amount: '12480.55', currency: 'EUR', destination: 'A charity',
        prescribedAt: inYear('05-10'), paidAt: null, paidReference: null,
      },
    });
    const r = build({ incidents: [owing] });
    expect(r.gaps.join(' ')).toContain('cannot rest on this record');
    expect(renderAnnualReport(r)).toContain('Outstanding purification');
  });

  it('leaves out an event the board found was not a breach', () => {
    const cleared = incident({ id: 'i2', stage: 'not_actual', actual: false });
    expect(build({ incidents: [cleared] }).nonCompliance.count).toBe(0);
  });
});

describe('what the draft cannot state', () => {
  it('always names meetings, zakat and the review functions', () => {
    const text = build().gaps.join(' ');
    expect(text).toContain('number of meetings');
    expect(text).toContain('Zakat');
    expect(text).toContain('Shariah review and Shariah audit');
  });

  it('names rules nothing will bring back to the board', () => {
    const r = build({ rules: [rule({ reviewEveryMonths: undefined })] });
    expect(r.reviews.unscheduled).toBe(1);
    expect(r.gaps.join(' ')).toContain('nothing will bring them back');
  });

  it('names reviews that were overdue at the year end', () => {
    const r = build({ rules: [rule({ inForceFrom: inYear('01-01'), reviewEveryMonths: 3 })] });
    expect(r.reviews.overdueAtYearEnd).toBe(1);
    expect(r.gaps.join(' ')).toContain('remain in force');
  });

  it('counts reviews the board actually completed', () => {
    const r = build({ rules: [rule({ lastReviewedAt: inYear('09-01') }), rule({ id: 'r2', lastReviewedAt: '2025-09-01T00:00:00.000Z' })] });
    expect(r.reviews.completedInYear).toBe(1);
  });

  it('puts the gaps in the document, not only in the data', () => {
    const page = renderAnnualReport(build());
    expect(page).toContain('What this draft cannot state');
    expect(page).toContain('would look complete and fall short');
  });
});

describe('the page', () => {
  it('is a whole document with nothing fetched from a network', () => {
    const page = renderAnnualReport(build({ matters: [matter()], incidents: [incident()] }));
    expect(page.startsWith('<!doctype html>')).toBe(true);
    expect(page).toContain('@page');
    expect(page).not.toContain('<script');
    expect(page).not.toMatch(/https?:\/\//);
  });

  it('gives every signatory a line to sign, and no line to an advisory member', () => {
    const page = renderAnnualReport(build());
    expect(page).toContain('Mufti One · Chair');
    expect(page).toContain('Dr Three');
    expect(page).not.toContain('Advisor · Advisory');
  });

  it('still lists the advisory member in the composition, which is itself a disclosure', () => {
    expect(renderAnnualReport(build())).toContain('>Advisor<');
  });

  it('escapes anything anyone typed', () => {
    const page = renderAnnualReport(build({ matters: [matter({ title: '<script>alert(1)</script>' })] }));
    expect(page).not.toContain('<script>alert(1)</script>');
    expect(page).toContain('&lt;script&gt;');
  });
});

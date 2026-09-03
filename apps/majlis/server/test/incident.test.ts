import { describe, it, expect } from 'vitest';
import type { Board, Incident } from '../src/types.js';
import { Refused } from '../src/services/lifecycle.js';
import {
  RECTIFICATION_DAYS,
  close,
  concur,
  currentPlan,
  disclosureFor,
  endorsePlan,
  fileRectificationPlan,
  prescribePurification,
  recordDirectorsApproval,
  recordPurificationPaid,
  recordRegulatorSubmission,
  rectificationClock,
  rectificationDeadline,
  returnPlan,
  stopActivities,
} from '../src/services/incident.js';

const T0 = '2026-08-24T09:00:00.000Z';
const days = (iso: string, d: number) =>
  new Date(new Date(iso).getTime() + d * 86_400_000).toISOString();

const board: Board = {
  id: 'b',
  institutionId: 'inst',
  name: 'Board',
  quorumPermit: 3,
  quorumRestrict: 2,
  totalSignatories: 4,
  ratificationWindowHours: 168,
  members: [
    { id: 's1', name: 'One', title: '', board: 'b', signatory: true },
    { id: 's2', name: 'Two', title: '', board: 'b', signatory: true },
    { id: 's3', name: 'Three', title: '', board: 'b', signatory: true },
    { id: 's4', name: 'Four', title: '', board: 'b', signatory: true },
    { id: 'adv', name: 'Advisor', title: '', board: 'b', signatory: false },
  ],
};

const REASON = 'The pricing was taken from an interest benchmark, which the approval did not permit.';

function incident(over: Partial<Incident> = {}): Incident {
  return {
    id: 'i', boardId: 'b', reference: 'SNC-2026-001',
    title: 'Retail deposit mispricing',
    report: 'Deposits were priced from a benchmark outside the approved method.',
    reportedBy: 'institution', reportedAt: T0,
    stage: 'reported',
    concurrences: [], determinedAt: null, actual: null,
    stopped: [], plans: [],
    directorsApprovedAt: null, submittedToRegulatorAt: null,
    purification: null, closedAt: null, sources: [],
    ...over,
  };
}

const code = (fn: () => unknown): string | null => {
  try {
    fn();
    return null;
  } catch (e) {
    return e instanceof Refused ? e.code : `threw ${String(e)}`;
  }
};

/** Carry an incident to a finding of actual, at the restricting quorum of two. */
function determined(at = T0): Incident {
  let i = incident();
  i = concur(board, i, { scholarId: 's1', actual: true, reason: REASON }, at).incident;
  return concur(board, i, { scholarId: 's2', actual: true, reason: REASON }, at).incident;
}

describe('the determination is the hinge, and only the board reaches it', () => {
  it('needs the restricting quorum before anything is determined', () => {
    const one = concur(board, incident(), { scholarId: 's1', actual: true, reason: REASON }, T0);
    expect(one.determined).toBe(false);
    expect(one.incident.stage).toBe('reported');
    expect(one.incident.actual).toBeNull();

    const two = concur(board, one.incident, { scholarId: 's2', actual: true, reason: REASON }, T0);
    expect(two.determined).toBe(true);
    expect(two.incident.stage).toBe('determined');
    expect(two.incident.actual).toBe(true);
    expect(two.incident.determinedAt).toBe(T0);
  });

  it('reaches "not a non-compliance" only the same way, never on its own', () => {
    let i = incident();
    i = concur(board, i, { scholarId: 's1', actual: false, reason: REASON }, T0).incident;
    expect(i.stage).toBe('reported');
    i = concur(board, i, { scholarId: 's2', actual: false, reason: REASON }, T0).incident;
    expect(i.stage).toBe('not_actual');
    expect(i.actual).toBe(false);
  });

  it('refuses a position from someone who may not take one', () => {
    expect(code(() => concur(board, incident(), { scholarId: 'adv', actual: true, reason: REASON }, T0)))
      .toBe('not_a_signatory');
    expect(code(() => concur(board, incident(), { scholarId: 'nobody', actual: true, reason: REASON }, T0)))
      .toBe('not_on_this_board');
  });

  it('refuses a position with no written reason, in either direction', () => {
    expect(code(() => concur(board, incident(), { scholarId: 's1', actual: true, reason: 'yes' }, T0)))
      .toBe('no_reason_given');
    expect(code(() => concur(board, incident(), { scholarId: 's1', actual: false, reason: 'no' }, T0)))
      .toBe('no_reason_given');
  });

  it('keeps an earlier view when a member changes their mind', () => {
    let i = incident();
    i = concur(board, i, { scholarId: 's1', actual: false, reason: REASON }, T0).incident;
    i = concur(board, i, { scholarId: 's1', actual: true, reason: REASON }, days(T0, 1)).incident;

    expect(i.concurrences).toHaveLength(2);
    expect(i.stage).toBe('reported');

    // Only the latest counts toward the threshold: s1 now says actual, so one
    // more makes two, not three.
    const then = concur(board, i, { scholarId: 's2', actual: true, reason: REASON }, days(T0, 1));
    expect(then.incident.actual).toBe(true);
  });

  it('refuses the same position twice', () => {
    const one = concur(board, incident(), { scholarId: 's1', actual: true, reason: REASON }, T0);
    expect(code(() => concur(board, one.incident, { scholarId: 's1', actual: true, reason: REASON }, T0)))
      .toBe('already_concurred');
  });

  it('refuses a position once the board has already determined', () => {
    expect(code(() => concur(board, determined(), { scholarId: 's3', actual: false, reason: REASON }, T0)))
      .toBe('wrong_stage');
  });
});

describe('what stops', () => {
  it('records the activity and everything like it, without duplicating', () => {
    const i = stopActivities(stopActivities(determined(), ['retail deposits']), [
      'retail deposits',
      'the same method on term deposits',
    ]);
    expect(i.stopped).toEqual(['retail deposits', 'the same method on term deposits']);
  });

  it('refuses an empty list, which would be a finding that names nothing', () => {
    expect(code(() => stopActivities(determined(), ['  ']))).toBe('no_steps');
  });
});

describe('the thirty days', () => {
  it('runs from the determination, not from the report', () => {
    const late = determined(days(T0, 10));
    expect(rectificationDeadline(late)).toBe(days(T0, 10 + RECTIFICATION_DAYS));
  });

  it('does not run at all where the board found no breach', () => {
    let i = incident();
    i = concur(board, i, { scholarId: 's1', actual: false, reason: REASON }, T0).incident;
    i = concur(board, i, { scholarId: 's2', actual: false, reason: REASON }, T0).incident;
    expect(rectificationDeadline(i)).toBeNull();
    expect(rectificationClock(i, days(T0, 90))).toBeNull();
  });

  it('reports the overrun rather than absorbing it', () => {
    const clock = rectificationClock(determined(), days(T0, 34))!;
    expect(clock.overdue).toBe(true);
    expect(clock.planFiled).toBe(false);
    expect(clock.note).toContain('second failure on top of the original');
  });

  it('counts down while there is still time', () => {
    const clock = rectificationClock(determined(), days(T0, 19))!;
    expect(clock.daysRemaining).toBe(11);
    expect(clock.overdue).toBe(false);
    expect(clock.note).toContain('11 days left of thirty');
  });

  it('still records the overrun when the plan arrives late', () => {
    const filed = fileRectificationPlan(
      determined(),
      { filedBy: 'institution', steps: ['reprice'], completeBy: days(T0, 60) },
      days(T0, 34),
    );
    const clock = rectificationClock(filed, days(T0, 34))!;
    expect(clock.planFiled).toBe(true);
    expect(clock.overdue).toBe(true);
    expect(clock.note).toContain('filed after the thirty days had run');
  });
});

describe('the plan', () => {
  const plan = { filedBy: 'institution', steps: ['reprice the book'], completeBy: days(T0, 45) };

  it('cannot be filed before the board has found anything', () => {
    expect(code(() => fileRectificationPlan(incident(), plan, T0))).toBe('wrong_stage');
  });

  it('cannot be filed where the board found no breach', () => {
    let i = incident();
    i = concur(board, i, { scholarId: 's1', actual: false, reason: REASON }, T0).incident;
    i = concur(board, i, { scholarId: 's2', actual: false, reason: REASON }, T0).incident;
    expect(code(() => fileRectificationPlan(i, plan, T0))).toBe('wrong_stage');
  });

  it('needs at least one step', () => {
    expect(code(() => fileRectificationPlan(determined(), { ...plan, steps: ['', ' '] }, T0)))
      .toBe('no_steps');
  });

  it('is endorsed at the restricting quorum', () => {
    let i = fileRectificationPlan(determined(), plan, days(T0, 5));
    i = endorsePlan(board, i, 's1', days(T0, 6));
    expect(i.stage).toBe('plan_filed');
    expect(currentPlan(i)!.endorsedAt).toBeNull();

    i = endorsePlan(board, i, 's2', days(T0, 7));
    expect(i.stage).toBe('endorsed');
    expect(currentPlan(i)!.endorsedAt).toBe(days(T0, 7));
  });

  it('refuses a second endorsement from the same member', () => {
    const i = endorsePlan(board, fileRectificationPlan(determined(), plan, T0), 's1', T0);
    expect(code(() => endorsePlan(board, i, 's1', T0))).toBe('already_concurred');
  });

  it('stays in the record when the board sends it back, with the reason', () => {
    let i = fileRectificationPlan(determined(), plan, days(T0, 5));
    i = endorsePlan(board, i, 's1', days(T0, 6));
    i = returnPlan(i, 'The repricing does not address the term book, which shares the defect.');

    expect(i.stage).toBe('determined');
    expect(i.plans).toHaveLength(1);
    expect(i.plans[0].returnedReason).toContain('term book');
    expect(currentPlan(i)).toBeNull();
    // An endorsement of the previous version is not an endorsement of its
    // replacement.
    expect(i.plans[0].endorsedAt).toBeNull();
  });

  it('does not buy the institution more of the thirty days', () => {
    const before = rectificationDeadline(determined());
    let i = fileRectificationPlan(determined(), plan, days(T0, 5));
    i = returnPlan(i, 'The repricing does not address the term book, which shares the defect.');
    expect(rectificationDeadline(i)).toBe(before);
  });

  it('keeps both plans once a replacement is filed', () => {
    let i = fileRectificationPlan(determined(), plan, days(T0, 5));
    i = returnPlan(i, 'The repricing does not address the term book, which shares the defect.');
    i = fileRectificationPlan(i, { ...plan, steps: ['reprice both books'] }, days(T0, 12));

    expect(i.plans).toHaveLength(2);
    expect(i.stage).toBe('plan_filed');
    expect(currentPlan(i)!.steps).toEqual(['reprice both books']);
  });

  it('needs a written reason to be returned', () => {
    const i = fileRectificationPlan(determined(), plan, T0);
    expect(code(() => returnPlan(i, 'no'))).toBe('no_reason_given');
  });
});

describe('the steps that belong to other people', () => {
  const plan = { filedBy: 'institution', steps: ['reprice'], completeBy: days(T0, 45) };
  const endorsed = () => {
    let i = fileRectificationPlan(determined(), plan, days(T0, 5));
    i = endorsePlan(board, i, 's1', days(T0, 6));
    return endorsePlan(board, i, 's2', days(T0, 7));
  };

  it('will not record the Directors approving a plan this board has not endorsed', () => {
    const i = fileRectificationPlan(determined(), plan, T0);
    expect(code(() => recordDirectorsApproval(i, T0))).toBe('wrong_stage');
  });

  it('will not record a submission the Directors have not approved', () => {
    expect(code(() => recordRegulatorSubmission(endorsed(), T0))).toBe('wrong_stage');
  });

  it('records them in order once each has happened', () => {
    let i = recordDirectorsApproval(endorsed(), days(T0, 9));
    expect(i.stage).toBe('approved');
    i = recordRegulatorSubmission(i, days(T0, 11));
    expect(i.stage).toBe('submitted');
    expect(i.submittedToRegulatorAt).toBe(days(T0, 11));
  });
});

describe('purification', () => {
  it('needs both an amount and a destination, and the board sets both', () => {
    expect(code(() => prescribePurification(determined(), { amount: '', currency: 'EUR', destination: 'charity' }, T0)))
      .toBe('nothing_prescribed');
    expect(code(() => prescribePurification(determined(), { amount: '12000.00', currency: 'EUR', destination: '  ' }, T0)))
      .toBe('nothing_prescribed');
  });

  it('is not prescribed where the board found no breach', () => {
    let i = incident();
    i = concur(board, i, { scholarId: 's1', actual: false, reason: REASON }, T0).incident;
    i = concur(board, i, { scholarId: 's2', actual: false, reason: REASON }, T0).incident;
    expect(code(() => prescribePurification(i, { amount: '1', currency: 'EUR', destination: 'x' }, T0)))
      .toBe('wrong_stage');
  });

  it('keeps the amount as written, so it can reconcile with a ledger', () => {
    const i = prescribePurification(
      determined(),
      { amount: '12480.55', currency: 'EUR', destination: 'A registered charity, not a related party' },
      T0,
    );
    expect(i.purification!.amount).toBe('12480.55');
    expect(i.purification!.paidAt).toBeNull();
  });

  it('refuses a payment against nothing, and a second payment', () => {
    expect(code(() => recordPurificationPaid(determined(), 'ref', T0))).toBe('nothing_prescribed');

    const paid = recordPurificationPaid(
      prescribePurification(determined(), { amount: '100', currency: 'EUR', destination: 'charity' }, T0),
      'TX-1',
      days(T0, 20),
    );
    expect(paid.purification!.paidReference).toBe('TX-1');
    expect(code(() => recordPurificationPaid(paid, 'TX-2', T0))).toBe('already_paid');
  });
});

describe('closing', () => {
  const plan = { filedBy: 'institution', steps: ['reprice'], completeBy: days(T0, 45) };
  const submitted = (withPurification: boolean) => {
    let i = fileRectificationPlan(determined(), plan, days(T0, 5));
    i = endorsePlan(board, i, 's1', days(T0, 6));
    i = endorsePlan(board, i, 's2', days(T0, 7));
    if (withPurification) {
      i = prescribePurification(i, { amount: '5000', currency: 'EUR', destination: 'charity' }, days(T0, 8));
    }
    i = recordDirectorsApproval(i, days(T0, 9));
    return recordRegulatorSubmission(i, days(T0, 11));
  };

  it('refuses while purification is outstanding, and names the amount', () => {
    const refusal = code(() => close(submitted(true), days(T0, 12)));
    expect(refusal).toBe('purification_outstanding');
  });

  it('closes once the money has actually moved', () => {
    const paid = recordPurificationPaid(submitted(true), 'TX-9', days(T0, 12));
    const done = close(paid, days(T0, 13));
    expect(done.stage).toBe('closed');
    expect(done.closedAt).toBe(days(T0, 13));
  });

  it('refuses to close anything that has not been submitted', () => {
    expect(code(() => close(determined(), T0))).toBe('wrong_stage');
  });

  it('closes an event the board found was not a breach', () => {
    let i = incident();
    i = concur(board, i, { scholarId: 's1', actual: false, reason: REASON }, T0).incident;
    i = concur(board, i, { scholarId: 's2', actual: false, reason: REASON }, T0).incident;
    expect(close(i, days(T0, 1)).stage).toBe('closed');
  });
});

describe('the year’s disclosure', () => {
  const other = (over: Partial<Incident>) => incident({ id: 'x', ...over });

  it('counts breaches, and leaves out what was found not to be one', () => {
    const found = other({
      reference: 'SNC-2026-002', stage: 'determined', actual: true, determinedAt: days(T0, 1),
    });
    const cleared = other({
      reference: 'SNC-2026-003', stage: 'not_actual', actual: false, determinedAt: days(T0, 2),
    });

    const d = disclosureFor(2026, [found, cleared]);
    expect(d.count).toBe(1);
    expect(d.events.map((e) => e.reference)).toEqual(['SNC-2026-002']);
  });

  it('ignores a year that is not this one', () => {
    const old = other({ stage: 'determined', actual: true, determinedAt: '2025-11-01T00:00:00.000Z' });
    expect(disclosureFor(2026, [old]).count).toBe(0);
    expect(disclosureFor(2025, [old]).count).toBe(1);
  });

  it('carries nature, amount, destination and rectification from what was written', () => {
    let i = prescribePurification(
      determined(),
      { amount: '12480.55', currency: 'EUR', destination: 'A registered charity' },
      days(T0, 2),
    );
    i = fileRectificationPlan(i, { filedBy: 'institution', steps: ['reprice', 'refund'], completeBy: days(T0, 40) }, days(T0, 3));

    const e = disclosureFor(2026, [i]).events[0];
    expect(e.nature).toBe('Retail deposit mispricing');
    expect(e.amount).toBe('12480.55');
    expect(e.destination).toBe('A registered charity');
    expect(e.paid).toBe(false);
    expect(e.rectification).toEqual(['reprice', 'refund']);
    expect(e.rectified).toBe(false);
  });

  it('totals what is still owed, by currency, without touching a float', () => {
    const a = prescribePurification(determined(), { amount: '100.10', currency: 'EUR', destination: 'c' }, T0);
    const b = prescribePurification(
      { ...determined(), id: 'b', reference: 'SNC-2026-004' },
      { amount: '250.90', currency: 'EUR', destination: 'c' },
      T0,
    );
    const settled = recordPurificationPaid(
      prescribePurification(
        { ...determined(), id: 'c', reference: 'SNC-2026-005' },
        { amount: '900', currency: 'USD', destination: 'c' },
        T0,
      ),
      'TX',
      T0,
    );

    const d = disclosureFor(2026, [a, b, settled]);
    expect(d.count).toBe(3);
    expect(d.purificationOutstanding).toEqual([{ currency: 'EUR', amounts: ['100.10', '250.90'] }]);
  });

  it('has an honest answer for a clean year', () => {
    const d = disclosureFor(2026, []);
    expect(d.count).toBe(0);
    expect(d.events).toEqual([]);
    expect(d.purificationOutstanding).toEqual([]);
  });
});

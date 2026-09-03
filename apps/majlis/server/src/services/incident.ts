/**
 * A Shariah non-compliance event, from report to closure.
 *
 * This is the kind of work that cannot wait for a quarterly meeting and today
 * does. Nine steps, of which the board owns three and the institution owns the
 * rest, and one of them is a thirty-day clock the institution is judged on.
 *
 *   1. the institution reports the event
 *   2. **the board determines whether it is actual**        ← the whole hinge
 *   3. if actual, the activity stops — and everything like it
 *   4. the institution files a rectification plan            within 30 days
 *   5. **the board endorses it**
 *   6. the Board of Directors approves
 *   7. the institution submits to the regulator
 *   8. **the board prescribes purification**: how much, and to where
 *   9. it enters the year's disclosure: nature, amount, count, rectification
 *
 * Two limits are deliberate and are enforced here rather than left to good
 * intentions.
 *
 * **Nothing in this file may find that an event was not actual.** That finding
 * ends the matter, closes the clock and removes the obligation to purify, and a
 * system that could reach it on its own would be the single most dangerous
 * thing in the application. It is reachable only by signatories concurring, in
 * writing, in the same way that finding it *actual* is.
 *
 * **Nothing here advances a stage on time alone.** A missed deadline is
 * reported, never absorbed. The clock running out changes what the record says
 * about the institution; it does not change what the institution owes.
 */

import { quorumFor } from './lifecycle.js';
import { Refused } from './lifecycle.js';
import type {
  Board,
  Concurrence,
  Incident,
  IncidentStage,
  Purification,
  RectificationPlan,
} from '../types.js';

/**
 * Thirty days from the determination, not from the report.
 *
 * The institution owes nothing until the board has found the event actual, and
 * starting the clock at the report would penalise it for the board's own time.
 */
export const RECTIFICATION_DAYS = 30;

const DAY = 86_400_000;
const MIN_REASON_CHARS = 20;

export type IncidentRefusal =
  | 'not_a_signatory'
  | 'not_on_this_board'
  | 'wrong_stage'
  | 'no_reason_given'
  | 'already_concurred'
  | 'not_determined'
  | 'not_actual'
  | 'no_plan'
  | 'no_steps'
  | 'not_endorsed'
  | 'not_approved'
  | 'not_submitted'
  | 'purification_outstanding'
  | 'nothing_prescribed'
  | 'already_paid';

function refuse(code: IncidentRefusal, message: string): never {
  throw new Refused(code as never, message);
}

function requireStage(incident: Incident, allowed: readonly IncidentStage[]): void {
  if (!allowed.includes(incident.stage)) {
    refuse(
      'wrong_stage',
      `This is ${stageInWords(incident.stage)}. That step applies when it is ` +
        allowed.map(stageInWords).join(' or ') + '.',
    );
  }
}

export function stageInWords(stage: IncidentStage): string {
  switch (stage) {
    case 'reported': return 'reported and awaiting the board';
    case 'not_actual': return 'determined not to be a non-compliance';
    case 'determined': return 'determined actual, with rectification outstanding';
    case 'plan_filed': return 'awaiting the board’s endorsement of the plan';
    case 'endorsed': return 'awaiting the Directors';
    case 'approved': return 'awaiting submission to the regulator';
    case 'submitted': return 'submitted, pending closure';
    case 'closed': return 'closed';
  }
}

function requireSignatory(board: Board, scholarId: string): void {
  const member = board.members.find((m) => m.id === scholarId);
  if (!member) refuse('not_on_this_board', 'That member does not sit on this board.');
  if (!member.signatory) {
    refuse(
      'not_a_signatory',
      'Only a signatory may take a position on whether an event is an actual non-compliance.',
    );
  }
}

function requireReason(text: string, what: string): string {
  const trimmed = (text ?? '').trim();
  if (trimmed.length < MIN_REASON_CHARS) {
    refuse('no_reason_given', `${what} needs a written reason of at least ${MIN_REASON_CHARS} characters.`);
  }
  return trimmed;
}

// ── step 2 · determination ────────────────────────────────────────────────

export interface Determination {
  incident: Incident;
  /** Whether this concurrence carried the board to a finding. */
  determined: boolean;
}

/**
 * Record one signatory's view, and reach a determination when enough agree.
 *
 * The threshold is the restricting quorum on both sides. Stopping an activity
 * is a restricting act and the asymmetry says be fast about it; finding that
 * there is nothing to stop has to be no harder to reach, or the system would
 * quietly bias every close call toward a breach nobody actually found.
 *
 * A member may change their mind while the board is still short of a
 * determination — but the earlier view stays in the record, because how a board
 * arrived at a finding is part of the finding.
 */
export function concur(
  board: Board,
  incident: Incident,
  view: { scholarId: string; actual: boolean; reason: string },
  at: string,
): Determination {
  requireStage(incident, ['reported']);
  requireSignatory(board, view.scholarId);
  const reason = requireReason(view.reason, 'A position on a reported event');

  const standing = incident.concurrences.find(
    (c) => c.scholarId === view.scholarId && c.actual === view.actual,
  );
  if (standing) {
    refuse('already_concurred', 'That member has already taken this position on this event.');
  }

  const recorded: Concurrence = {
    scholarId: view.scholarId,
    actual: view.actual,
    reason,
    at,
  };
  const concurrences = [...incident.concurrences, recorded];

  // Only a member's latest view counts toward a threshold; every view stays
  // visible.
  const latest = new Map<string, Concurrence>();
  for (const c of concurrences) latest.set(c.scholarId, c);
  const views = [...latest.values()];

  const needed = quorumFor(board, 'restrict');
  const forActual = views.filter((c) => c.actual).length;
  const forNot = views.filter((c) => !c.actual).length;

  if (forActual >= needed) {
    return {
      incident: {
        ...incident,
        concurrences,
        stage: 'determined',
        determinedAt: at,
        actual: true,
      },
      determined: true,
    };
  }

  if (forNot >= needed) {
    return {
      incident: {
        ...incident,
        concurrences,
        stage: 'not_actual',
        determinedAt: at,
        actual: false,
      },
      determined: true,
    };
  }

  return { incident: { ...incident, concurrences }, determined: false };
}

// ── step 3 · what stops ───────────────────────────────────────────────────

/**
 * Name what the finding stops, and everything like it.
 *
 * Separate from the determination because the board often knows an activity
 * breached before it knows the full extent of what shares the defect, and
 * holding the finding hostage to that list would delay the stop itself. It may
 * be added to while rectification is outstanding.
 */
export function stopActivities(incident: Incident, activities: string[]): Incident {
  requireStage(incident, ['determined', 'plan_filed', 'endorsed', 'approved', 'submitted']);

  const additions = activities.map((a) => a.trim()).filter(Boolean);
  if (additions.length === 0) {
    refuse('no_steps', 'Naming what stops needs at least one activity.');
  }

  const merged = [...incident.stopped];
  for (const a of additions) if (!merged.includes(a)) merged.push(a);
  return { ...incident, stopped: merged };
}

/**
 * The plan the board is currently looking at, if any.
 *
 * The last one filed, unless the board sent it back — a returned plan is still
 * in the record but is nobody's outstanding work.
 */
export function currentPlan(incident: Incident): RectificationPlan | null {
  const last = incident.plans[incident.plans.length - 1];
  if (!last || last.returnedReason !== null) return null;
  return last;
}

// ── step 4 · the clock ────────────────────────────────────────────────────

export function rectificationDeadline(incident: Incident): string | null {
  if (!incident.determinedAt || incident.actual !== true) return null;
  return new Date(new Date(incident.determinedAt).getTime() + RECTIFICATION_DAYS * DAY).toISOString();
}

export interface RectificationClock {
  deadline: string;
  daysRemaining: number;
  overdue: boolean;
  /** True once the plan is in, whether or not the board has endorsed it. */
  planFiled: boolean;
  note: string;
}

/**
 * Where the thirty days stand.
 *
 * Reports the overrun rather than hiding it. A plan filed on day thirty-four is
 * a second failure on top of the first, and a system that quietly accepts it
 * teaches an institution that the deadline was decorative.
 */
export function rectificationClock(incident: Incident, now: string): RectificationClock | null {
  const deadline = rectificationDeadline(incident);
  if (!deadline) return null;
  if (incident.stage === 'closed') return null;

  const remaining = (new Date(deadline).getTime() - new Date(now).getTime()) / DAY;
  const days = Math.round(remaining * 10) / 10;
  const planFiled = currentPlan(incident) !== null;
  const overdue = remaining < 0;

  const note = planFiled
    ? overdue
      ? `The plan was filed after the thirty days had run. The overrun is part of the record.`
      : `A plan is filed with ${days} of the thirty days remaining.`
    : overdue
      ? `The thirty days have run and no rectification plan has been filed. This is a second failure on top of the original.`
      : `${days} day${days === 1 ? '' : 's'} left of thirty to file a rectification plan.`;

  return { deadline, daysRemaining: days, overdue, planFiled, note };
}

/** File the institution's plan. Only ever possible after a finding of actual. */
export function fileRectificationPlan(
  incident: Incident,
  plan: { filedBy: string; steps: string[]; completeBy: string },
  at: string,
): Incident {
  requireStage(incident, ['determined']);
  if (incident.actual !== true) {
    refuse('not_actual', 'Nothing needs rectifying: the board did not find this to be a non-compliance.');
  }

  const steps = plan.steps.map((s) => s.trim()).filter(Boolean);
  if (steps.length === 0) {
    refuse('no_steps', 'A rectification plan needs at least one step.');
  }

  const filed: RectificationPlan = {
    filedBy: plan.filedBy,
    filedAt: at,
    steps,
    completeBy: plan.completeBy,
    endorsedBy: [],
    endorsedAt: null,
    returnedReason: null,
  };
  return { ...incident, plans: [...incident.plans, filed], stage: 'plan_filed' };
}

// ── step 5 · endorsement ──────────────────────────────────────────────────

/**
 * The board endorses the plan, at the restricting quorum.
 *
 * Endorsement is of *this* plan. Returning it for rework clears every
 * endorsement already given, because a member who endorsed the previous version
 * has not endorsed the one that replaced it.
 */
export function endorsePlan(
  board: Board,
  incident: Incident,
  scholarId: string,
  at: string,
): Incident {
  requireStage(incident, ['plan_filed']);
  requireSignatory(board, scholarId);
  const plan = currentPlan(incident);
  if (!plan) refuse('no_plan', 'There is no plan to endorse.');

  if (plan.endorsedBy.includes(scholarId)) {
    refuse('already_concurred', 'That member has already endorsed this plan.');
  }

  const endorsedBy = [...plan.endorsedBy, scholarId];
  const met = endorsedBy.length >= quorumFor(board, 'restrict');
  const updated: RectificationPlan = { ...plan, endorsedBy, endorsedAt: met ? at : null };

  return {
    ...incident,
    plans: [...incident.plans.slice(0, -1), updated],
    stage: met ? 'endorsed' : 'plan_filed',
  };
}

/**
 * Send the plan back.
 *
 * The clock does not restart, because it never stopped — the thirty days run
 * from the determination and a plan the board could not endorse does not buy
 * the institution more of them. The returned plan stays in the record with the
 * reason it was returned, and any endorsements it had collected go with it:
 * a member who endorsed the previous version has not endorsed its replacement.
 */
export function returnPlan(incident: Incident, reason: string): Incident {
  requireStage(incident, ['plan_filed', 'endorsed']);
  const why = requireReason(reason, 'Returning a rectification plan');

  const plan = currentPlan(incident);
  if (!plan) refuse('no_plan', 'There is no plan to return.');

  const returned: RectificationPlan = { ...plan, returnedReason: why, endorsedAt: null };
  return {
    ...incident,
    plans: [...incident.plans.slice(0, -1), returned],
    stage: 'determined',
  };
}

// ── steps 6 and 7 · outside this board ────────────────────────────────────

/**
 * The Board of Directors is not this board, and this only records that they
 * acted. A Shariah board cannot approve on the Directors' behalf and the
 * system must not let it look as though it did.
 */
export function recordDirectorsApproval(incident: Incident, at: string): Incident {
  requireStage(incident, ['endorsed']);
  return { ...incident, directorsApprovedAt: at, stage: 'approved' };
}

export function recordRegulatorSubmission(incident: Incident, at: string): Incident {
  requireStage(incident, ['approved']);
  return { ...incident, submittedToRegulatorAt: at, stage: 'submitted' };
}

// ── step 8 · purification ─────────────────────────────────────────────────

/**
 * The board prescribes the amount and the destination.
 *
 * Both are the board's. An institution that chose where its own non-permissible
 * income went could direct it somewhere that served it, which is the failure
 * this requirement exists to prevent.
 */
export function prescribePurification(
  incident: Incident,
  prescription: { amount: string; currency: string; destination: string },
  at: string,
): Incident {
  requireStage(incident, ['determined', 'plan_filed', 'endorsed', 'approved', 'submitted']);
  if (incident.actual !== true) {
    refuse('not_actual', 'There is nothing to purify: the board did not find a non-compliance.');
  }

  const amount = prescription.amount.trim();
  const destination = prescription.destination.trim();
  if (!amount || !destination) {
    refuse('nothing_prescribed', 'Purification needs both an amount and a destination.');
  }

  const purification: Purification = {
    amount,
    currency: prescription.currency,
    destination,
    prescribedAt: at,
    paidAt: null,
    paidReference: null,
  };
  return { ...incident, purification };
}

export function recordPurificationPaid(
  incident: Incident,
  reference: string,
  at: string,
): Incident {
  if (!incident.purification) {
    refuse('nothing_prescribed', 'No purification has been prescribed for this event.');
  }
  if (incident.purification.paidAt) {
    refuse('already_paid', 'This purification is already recorded as paid.');
  }
  return {
    ...incident,
    purification: { ...incident.purification, paidAt: at, paidReference: reference.trim() || null },
  };
}

// ── step 9 · closure and disclosure ───────────────────────────────────────

/**
 * Close it, once everything owed has actually happened.
 *
 * Every condition is checked rather than assumed, and the refusal names the one
 * that failed. Closing an event with purification outstanding would remove it
 * from the list of things anyone is still watching while the institution still
 * owes the money.
 */
export function close(incident: Incident, at: string): Incident {
  if (incident.stage === 'not_actual') {
    return { ...incident, stage: 'closed', closedAt: at };
  }

  requireStage(incident, ['submitted']);
  if (incident.purification && !incident.purification.paidAt) {
    refuse(
      'purification_outstanding',
      `Purification of ${incident.purification.amount} ${incident.purification.currency} to ` +
        `${incident.purification.destination} is prescribed and not recorded as paid.`,
    );
  }
  return { ...incident, stage: 'closed', closedAt: at };
}

export interface Disclosure {
  year: number;
  /** What the regulator asks for first: how many, not how much. */
  count: number;
  events: {
    reference: string;
    /** The nature of the breach, in the board's words rather than a category. */
    nature: string;
    amount: string | null;
    currency: string | null;
    destination: string | null;
    paid: boolean;
    rectification: string[];
    rectified: boolean;
  }[];
  /** Totals per currency. Strings in, strings out — no float touches money. */
  purificationOutstanding: { currency: string; amounts: string[] }[];
}

/**
 * The year's disclosure: nature, amount, count and rectification.
 *
 * Assembled, never summarised. Every field here is something the board or the
 * institution already wrote down, and the count is the one figure an annual
 * report cannot omit — an institution reporting an amount without a number of
 * events has told the reader almost nothing.
 *
 * Events found *not* to be non-compliances are absent. They were reported and
 * examined, which the record still holds, but they are not breaches and listing
 * them as such would misstate the year.
 */
export function disclosureFor(year: number, incidents: Incident[]): Disclosure {
  const mine = incidents.filter((i) => {
    if (i.actual !== true) return false;
    if (!i.determinedAt) return false;
    return new Date(i.determinedAt).getUTCFullYear() === year;
  });

  const events = mine.map((i) => ({
    reference: i.reference,
    nature: i.title,
    amount: i.purification?.amount ?? null,
    currency: i.purification?.currency ?? null,
    destination: i.purification?.destination ?? null,
    paid: Boolean(i.purification?.paidAt),
    rectification: currentPlan(i)?.steps ?? [],
    rectified: i.stage === 'closed',
  }));

  const outstanding = new Map<string, string[]>();
  for (const i of mine) {
    const p = i.purification;
    if (!p || p.paidAt) continue;
    outstanding.set(p.currency, [...(outstanding.get(p.currency) ?? []), p.amount]);
  }

  return {
    year,
    count: mine.length,
    events,
    purificationOutstanding: [...outstanding.entries()].map(([currency, amounts]) => ({
      currency,
      amounts,
    })),
  };
}

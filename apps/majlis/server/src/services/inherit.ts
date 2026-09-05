/**
 * What this board already decided about a question of this shape.
 *
 * The verdict this exists to answer: *doing it here is harder than getting on
 * Zoom and making a PDF.* It was correct, and the cause was architectural —
 * Majlis asked a scholar to author everything and then recorded what they
 * authored. The fourth murabaha of the year opened the same empty boxes as the
 * first, and the board had answered those conditions three times already.
 *
 * So the system drafts and the board rules. This file is the drafting.
 *
 * ── a proposal is not a finding, and the difference is the whole design ───
 *
 * Nothing here writes anything into the matter. It returns **proposals**, each
 * naming the matter it came from and the date the board decided it. A scholar
 * who accepts one is authoring their own finding, under their own name, at
 * today's date — accepting is an act, exactly as voting is.
 *
 * That line is not fussiness. *Inherited and unreviewed* is a different state
 * from *decided*, and a draft that looked authored would make this a machine
 * for producing rulings nobody read — which is worse than the call it replaces
 * by every measure that matters. So the count a scholar sees changes from
 * "0 of 6 answered" to "6 proposed, none reviewed", which is a true statement
 * about a different thing.
 *
 * ── it inherits from this board and from nowhere else ─────────────────────
 *
 * Never from another institution, never from a model, never from the shipped
 * library's own conditions as though the board had adopted them. What comes
 * back is this board's own words from its own past ruling, which is the only
 * source that can be pre-filled without putting words in anybody's mouth.
 *
 * ── and only where the relation is a fact ─────────────────────────────────
 *
 * The precedent is the most recent **in-force** matter judged against the same
 * contract shape. Same shape is a fact somebody wrote down. Resemblance of
 * title, of subject, of vocabulary is not, and `precedent.ts` refuses those for
 * the same reason: a precedent is a serious claim, and a coincidence offered as
 * one invites a scholar to inherit an answer to a different question.
 */

import type { ConditionFinding, Matter, RuleParameter, Structure } from '../types.js';

export type ProposalKind = 'condition' | 'term' | 'not_decided' | 'mechanism';

export interface Proposal {
  kind: ProposalKind;
  /** Which condition, or which term. Absent for prose. */
  key?: string;
  /** What the board said last time, verbatim. */
  value: string;
  /** Present on a condition: what the board found. */
  holds?: ConditionFinding['holds'];
  /** Present on a term: the unit it was expressed in. */
  unit?: string;
}

export interface Inheritance {
  matterId: string;
  /** The matter this is drawn from, or null where there is no precedent. */
  from: { id: string; title: string; decidedAt: string | null } | null;
  /** Why that matter and not another. Named, never a resemblance. */
  because: string | null;
  /** How many times this board has ruled on this shape, including the draft. */
  timesRuled: number;
  proposals: Proposal[];
  /**
   * Said in place of proposals where there are none.
   *
   * A first-of-a-kind costs full price and should. A system that made a novel
   * structure feel cheap would be lying about what was being decided.
   */
  note: string;
}

const NOTHING_TO_INHERIT =
  'This board has not ruled on a question of this shape before, so there is nothing to draw ' +
  'from. A first of its kind costs the whole apparatus — the shape chosen, each condition ' +
  'answered, the terms stated, every citation attached — and that is right. What is decided ' +
  'here is what the next one starts from.';

const SOMETHING_TO_INHERIT =
  'Nothing below has been decided. Each is what this board said last time, offered so the ' +
  'work is reading and correcting rather than writing from nothing. Accepting one records it ' +
  'as your finding, under your name, today — an unreviewed proposal is not an answer, and ' +
  'nothing here counts as one until you say so.';

/** In force, on this board, judged against the same shape, and not this matter. */
function precedentsFor(matter: Matter, all: Matter[]): Matter[] {
  if (!matter.structureId) return [];
  return all.filter(
    (m) =>
      m.id !== matter.id &&
      m.boardId === matter.boardId &&
      m.status === 'in_force' &&
      m.structureId === matter.structureId,
  );
}

/**
 * The most recently decided of them.
 *
 * By `inForceAt`, which is when the board's decision took effect, rather than
 * by when the matter was opened — a question raised in January and decided in
 * September is the board's more recent word than one raised in March and
 * decided in April.
 */
function mostRecent(candidates: Matter[]): Matter | null {
  let best: Matter | null = null;
  for (const m of candidates) {
    if (!m.inForceAt) continue;
    if (!best?.inForceAt || Date.parse(m.inForceAt) > Date.parse(best.inForceAt)) best = m;
  }
  return best ?? null;
}

/** Findings that still stand. A correction supersedes; the superseded one does not travel. */
function standingFindings(matter: Matter): ConditionFinding[] {
  const latest = new Map<string, ConditionFinding>();
  for (const f of matter.findings ?? []) {
    if (f.supersededAt) continue;
    latest.set(f.conditionId, f);
  }
  return [...latest.values()];
}

export function buildInheritance(
  matter: Matter,
  all: Matter[],
  structure: Structure | null,
): Inheritance {
  const candidates = precedentsFor(matter, all);
  const from = mostRecent(candidates);

  if (!from || !structure) {
    return {
      matterId: matter.id,
      from: null,
      because: null,
      timesRuled: candidates.length,
      proposals: [],
      note: NOTHING_TO_INHERIT,
    };
  }

  const proposals: Proposal[] = [];

  /*
   * Conditions the board has already answered on this shape.
   *
   * Only conditions this structure actually has: a shape that gained a
   * condition since the last ruling must be answered rather than quietly
   * treated as covered, and one that lost a condition should not carry a stale
   * answer forward.
   */
  const conditionIds = new Set(structure.conditions.map((c) => c.id));
  for (const finding of standingFindings(from)) {
    if (!conditionIds.has(finding.conditionId)) continue;
    proposals.push({
      kind: 'condition',
      key: finding.conditionId,
      value: finding.reason,
      holds: finding.holds,
    });
  }

  // The operative terms, with their values. A board adjusting a threshold is
  // doing something different from a board inventing a schema.
  for (const term of from.proposedRule.parameters ?? []) {
    proposals.push({
      kind: 'term',
      key: term.key,
      value: term.value,
      unit: term.unit,
    });
  }

  // What was held outside the question last time. Almost always still true, and
  // the single most commonly forgotten part of a ruling.
  for (const line of from.notDecided) {
    proposals.push({ kind: 'not_decided', value: line });
  }

  /*
   * The mechanism, only where this matter has none.
   *
   * Offering to replace a mechanism a liaison has already written would invite
   * overwriting the description of *this* arrangement with the description of a
   * different one, which is the failure the whole application is built against.
   */
  if (!matter.mechanism.trim() && from.mechanism.trim()) {
    proposals.push({ kind: 'mechanism', value: from.mechanism });
  }

  return {
    matterId: matter.id,
    from: { id: from.id, title: from.title, decidedAt: from.inForceAt },
    because: `Both are judged against the same contract shape, which this board chose on each.`,
    // The count includes the one being drafted: "the fourth this board has
    // ruled on" is what a scholar wants to hear, not "three precedents found".
    timesRuled: candidates.length + 1,
    proposals,
    note: SOMETHING_TO_INHERIT,
  };
}

/**
 * What an interface should say about the checklist once a draft exists.
 *
 * "0 of 6 answered" is true and useless where six answers are sitting in front
 * of the scholar unread. "6 proposed, none reviewed" is a true statement about
 * a different thing, and it is the one that says what the work is.
 */
export function checklistStanding(
  structure: Structure | null,
  matter: Matter,
  inheritance: Inheritance,
): string {
  if (!structure) return 'No contract shape has been chosen, so no conditions apply yet.';

  const total = structure.conditions.length;
  const answered = standingFindings(matter).length;
  const proposed = inheritance.proposals.filter((p) => p.kind === 'condition').length;

  if (answered >= total && total > 0) return `All ${total} conditions have been answered.`;
  if (proposed === 0) return `${total - answered} of ${total} conditions are unanswered.`;

  return (
    `${answered} of ${total} answered. ${proposed} more proposed from this board's last ruling ` +
    'and not yet reviewed — a proposal is not an answer until somebody says so.'
  );
}

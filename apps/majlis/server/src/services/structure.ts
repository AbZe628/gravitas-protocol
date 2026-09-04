/**
 * Ruling against a shape instead of composing a question.
 *
 * A product approval today starts from an empty box: a title, some prose, and a
 * scholar working out what to ask. In practice the question has a shape the
 * board recognises, and the shape is what makes an approval fast — the board
 * stops composing and starts judging.
 *
 * ── the limits, which are the point ───────────────────────────────────────
 *
 * **A finding is a position, and positions need reasons.** All three of them:
 * *met*, *not met*, and *not applicable*. A checklist that accepted ticks would
 * produce a document full of agreement nobody can review, which is worse than
 * no checklist — it would look like scrutiny.
 *
 * **Nothing here decides whether the conditions are satisfied overall.** It
 * counts what the board has answered and what it has not, and stops. Concluding
 * from six met conditions that a product is permissible is precisely the ruling
 * this file must not make, and a board can rule against a condition it thinks
 * wrong.
 *
 * **Findings are superseded, never overwritten.** A member who changes their
 * view leaves both in the record, like a released vote and a returned plan.
 */

import { Refused } from './lifecycle.js';
import { structureById } from '../data/structures.js';
import { effectiveFor } from './adoption.js';
import type {
  AdoptedStructure,
  Board,
  ConditionFinding,
  Matter,
  Structure,
  StructureCondition,
} from '../types.js';

const MIN_REASON_CHARS = 20;

/** While the question is still open. Findings close when the vote does. */
const OPEN_TO_FINDINGS: readonly Matter['status'][] = ['draft', 'deliberation', 'voting'];

export interface ConditionState {
  condition: StructureCondition;
  /** The member's standing finding, where they have one. */
  finding: ConditionFinding | null;
  /** Every finding recorded on it, newest first, including superseded ones. */
  history: ConditionFinding[];
  /** How many members have answered it at all. */
  answeredBy: string[];
}

export interface Checklist {
  structure: Structure;
  /**
   * Whether these conditions are the board's own or the shipped draft.
   *
   * A checklist built against the draft is not the same thing as one built
   * against what the board adopted, and a surface that showed them
   * identically would let a board believe it had settled a question it had
   * only been offered.
   */
  source: 'adopted' | 'amended' | 'draft';
  /** True where the board considered this shape and ruled against using it. */
  declined: boolean;
  /** What the source means, in the words the adoption service holds. */
  sourceNote: string;
  conditions: ConditionState[];
  /** Conditions no member has answered. The list a chair reads. */
  unanswered: string[];
  /** Conditions where standing findings disagree. Not a fault — a discussion. */
  contested: string[];
  answered: number;
  total: number;
  note: string;
}

/** Only the latest finding from each member counts; the earlier ones stay. */
function standing(findings: ConditionFinding[], conditionId: string): ConditionFinding[] {
  const mine = findings.filter((f) => f.conditionId === conditionId && !f.supersededAt);
  const latest = new Map<string, ConditionFinding>();
  for (const f of mine) latest.set(f.scholarId, f);
  return [...latest.values()];
}

export const NOT_A_CONCLUSION =
  'This counts what the board has answered and what it has not. Whether the conditions ' +
  'are satisfied, and whether a condition applies at all, are the board’s to decide — ' +
  'and a board may rule against a condition it considers wrongly drawn.';

/**
 * Where the board has got to on a shape.
 *
 * @throws Refused where the matter names a structure that does not exist. A
 *         silent empty checklist would read as a product with no conditions.
 */
export function checklistFor(
  matter: Matter,
  scholarId?: string,
  /**
   * Everything this board has adopted.
   *
   * Optional so a caller with no store — a test, or a surface that only wants
   * the shipped shape — still works, and gets the draft with the draft said
   * plainly rather than an error.
   */
  adoptions: AdoptedStructure[] = [],
): Checklist {
  const effective = matter.structureId
    ? effectiveFor(matter.structureId, matter.boardId, adoptions)
    : null;
  const structure = effective?.structure;
  if (!structure || !effective) {
    throw new Refused(
      'not_found' as never,
      matter.structureId
        ? `This matter names the structure "${matter.structureId}", which is not in the library.`
        : 'This matter is not being judged against a contract shape.',
    );
  }

  const findings = matter.findings ?? [];

  const conditions: ConditionState[] = structure.conditions.map((condition) => {
    const live = standing(findings, condition.id);
    const history = findings
      .filter((f) => f.conditionId === condition.id)
      .sort((a, b) => b.at.localeCompare(a.at));

    return {
      condition,
      finding: scholarId ? (live.find((f) => f.scholarId === scholarId) ?? null) : null,
      history,
      answeredBy: live.map((f) => f.scholarId),
    };
  });

  const unanswered = conditions.filter((c) => c.answeredBy.length === 0).map((c) => c.condition.id);

  // Standing findings that do not agree. Reported rather than resolved: two
  // scholars reading one condition differently is the work, not a defect.
  const contested = conditions
    .filter((c) => {
      const held = new Set(standing(findings, c.condition.id).map((f) => f.holds));
      return held.size > 1;
    })
    .map((c) => c.condition.id);

  const answered = conditions.length - unanswered.length;

  return {
    structure,
    source: effective.source,
    declined: effective.declined,
    sourceNote: effective.note,
    conditions,
    unanswered,
    contested,
    answered,
    total: conditions.length,
    note: NOT_A_CONCLUSION,
  };
}

/**
 * Record one member's finding on one condition.
 *
 * Refuses a matter that has been decided: a checklist that could be edited
 * after the vote would let the document say something the board never saw.
 */
export function recordFinding(
  board: Board,
  matter: Matter,
  finding: { scholarId: string; conditionId: string; holds: ConditionFinding['holds']; reason: string },
  at: string,
): Matter {
  if (!OPEN_TO_FINDINGS.includes(matter.status)) {
    throw new Refused(
      'wrong_status',
      `This matter is ${matter.status}. Findings are recorded while it is still being decided; ` +
        'a checklist that could be changed afterwards would let the document say something the ' +
        'board never saw.',
    );
  }

  const structure = matter.structureId ? structureById(matter.structureId) : undefined;
  if (!structure) {
    throw new Refused('not_found' as never, 'This matter is not being judged against a contract shape.');
  }
  if (!structure.conditions.some((c) => c.id === finding.conditionId)) {
    throw new Refused(
      'not_found' as never,
      `"${finding.conditionId}" is not a condition of ${structure.name}.`,
    );
  }

  const member = board.members.find((m) => m.id === finding.scholarId);
  if (!member) {
    throw new Refused('not_on_this_board', 'That member does not sit on this board.');
  }

  const reason = (finding.reason ?? '').trim();
  if (reason.length < MIN_REASON_CHARS) {
    throw new Refused(
      'no_reason_given',
      'A finding needs a written reason, including a finding that a condition does not apply. ' +
        'A checklist of ticks is a document full of agreement nobody can review.',
    );
  }

  // Supersede rather than replace, so a change of view stays visible.
  const findings = (matter.findings ?? []).map((f) =>
    f.conditionId === finding.conditionId && f.scholarId === finding.scholarId && !f.supersededAt
      ? { ...f, supersededAt: at }
      : f,
  );

  const recorded: ConditionFinding = {
    conditionId: finding.conditionId,
    holds: finding.holds,
    reason,
    scholarId: finding.scholarId,
    at,
    supersededAt: null,
  };

  return { ...matter, findings: [...findings, recorded] };
}

/**
 * Attach a shape to a matter, or change which one.
 *
 * Changing it clears nothing: findings against a condition of the old shape
 * stay in the record and simply stop appearing on the checklist. Deleting them
 * would erase reasoning a member gave in good faith about a question that was
 * genuinely asked.
 */
export function setStructure(matter: Matter, structureId: string | null): Matter {
  if (!OPEN_TO_FINDINGS.includes(matter.status)) {
    throw new Refused(
      'wrong_status',
      `This matter is ${matter.status}. The shape it is judged against is settled once the vote closes.`,
    );
  }
  if (structureId !== null && !structureById(structureId)) {
    throw new Refused('not_found' as never, `"${structureId}" is not in the library.`);
  }
  return { ...matter, structureId: structureId ?? undefined };
}

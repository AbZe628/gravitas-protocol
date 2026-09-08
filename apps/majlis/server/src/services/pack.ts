/**
 * The pack: one matter, everything needed to decide it, in reading order.
 *
 * Every board portal sold to corporate directors is built on one idea. Before
 * a vote, a director is given a pack, and everything they need is inside it,
 * in the order they read it. Diligent, Boardvantage, Convene and BoardEffect
 * all do this, and it is the single thing they do that this application did
 * not.
 *
 * Majlis already held every piece. What it never did was assemble them. A
 * member deciding a matter had to open the question on one screen, the
 * precedent on another, the figures on a third, the deliberation on a fourth,
 * and remember all four while voting on a fifth. That is why the vote was the
 * only thing anybody did.
 *
 * ── it assembles, and it composes nothing ─────────────────────────────────
 *
 * The same rule the fatwa follows, and for the same reason. Every sentence in
 * a pack was written by a member of the board, by the institution, or by the
 * service that already computed it. There is no summary of the deliberation,
 * no restatement of the question in tidier words, and no recommendation. A
 * pack that told a scholar what to think would be the worst thing this
 * application could produce, and it would be the easiest to build.
 *
 * ── the sixth part is the one that matters ────────────────────────────────
 *
 * `gaps` is what Majlis could not tell you, and it is not an appendix. A pack
 * that showed four sections of confident material and no seams reads as
 * complete, and a member votes on it as though it were. Every gap is stated in
 * the same voice as the rest and in the same document.
 *
 * ── it refuses nothing ────────────────────────────────────────────────────
 *
 * Unlike the fatwa, which exists only after a decision, a pack exists from the
 * moment a matter is opened — that is when it is read. An empty pack for a
 * matter nobody has touched is a true description of a matter nobody has
 * touched, and it says so section by section.
 */

import { quorumFor } from './lifecycle.js';
import { relatedTo, type Related } from './precedent.js';
import { buildCarrying, type Carrying } from './carrying.js';
import { standing as standingComputations } from './computation.js';
import type { EnforcementSnapshot } from './enforcement.js';
import type {
  Board,
  ChangeDirection,
  Computation,
  Deliberation,
  Matter,
  MatterStatus,
  Reasoning,
  RuleParameter,
  SourceRef,
} from '../types.js';

/** How the question reached the board, and how long it has been here. */
export interface PackQuestion {
  /** The institution's own words. Never edited and never paraphrased. */
  text: string;
  /** What the board is expressly not deciding. The drafter's order is kept. */
  notDecided: string[];
  mechanism: string;
  openedAt: string;
  /**
   * When the institution actually asked, where that is known and different.
   *
   * Kept apart from `openedAt` because they are not the same date, and a wait
   * measured from the later one flatters the board.
   */
  arrivedAt: string | null;
  /**
   * Days waited, from `arrivedAt` where it exists and `openedAt` otherwise.
   *
   * Null on a settled matter: a question that has been answered is not
   * waiting, and a growing number beside a decided matter would be nonsense.
   */
  waitedDays: number | null;
  /** True where the wait is measured only from what this system can see. */
  waitPartlyUnknown: boolean;
}

export interface PackAlreadySaid {
  related: Related[];
  /**
   * True where this board has said nothing bearing on the question.
   *
   * Said out loud. A silent empty section reads as *there is no precedent to
   * worry about*, which is a different claim from *we have never been asked*.
   */
  nothingYet: boolean;
}

export interface PackFigures {
  /** Everything standing that this matter's holdings are covered by. */
  computations: Computation[];
  /** The terms the board has set so far, with their own stated meanings. */
  terms: RuleParameter[];
}

export interface PackFollows {
  /** When the terms are tested, and what happens on a breach. */
  carrying: Carrying;
  /** Holdings this matter names. */
  assetIds: string[];
  /** The contract shape it is being judged against, if any. */
  structureId: string | null;
}

export interface PackStanding {
  required: number;
  /** Positions that have not been released. */
  recorded: Reasoning[];
  /** Members who hold a vote and have not used it. */
  yetToSpeak: { scholarId: string; name: string }[];
}

export interface Pack {
  matterId: string;
  boardId: string;
  title: string;
  status: MatterStatus;
  direction: ChangeDirection;

  question: PackQuestion;
  alreadySaid: PackAlreadySaid;
  figures: PackFigures;
  /** In the order it was spoken. Never reordered and never summarised. */
  said: Deliberation[];
  follows: PackFollows;
  /** Everything anybody attached and did not withdraw. */
  evidence: SourceRef[];

  /**
   * What Majlis could not tell you.
   *
   * Assembled from the other five parts rather than written here, so a gap
   * cannot exist in the data and be missing from this list.
   */
  gaps: string[];

  standing: PackStanding;

  /** When this pack was put together. Not when anything in it happened. */
  assembledAt: string;
}

const SETTLED: ReadonlySet<MatterStatus> = new Set([
  'in_force',
  'timelock',
  'rejected',
  'lapsed',
  'withdrawn',
]);

function daysBetween(fromIso: string, toIso: string): number | null {
  const from = Date.parse(fromIso);
  const to = Date.parse(toIso);
  if (Number.isNaN(from) || Number.isNaN(to)) return null;
  // Floored. A question that has waited nine and a half days has waited nine
  // whole days, and rounding it up would be flattering nobody.
  return Math.max(0, Math.floor((to - from) / 86_400_000));
}

/**
 * The gaps, read off the material rather than written by hand.
 *
 * Each entry names one thing the pack does not answer, in the plainest words
 * available. They are deliberately not softened: a member who reads *nobody
 * has checked how these figures are produced* should feel the weight of it,
 * because that is the state of the matter they are about to vote on.
 */
function gapsIn(
  matter: Matter,
  alreadySaid: PackAlreadySaid,
  figures: PackFigures,
  said: Deliberation[],
  follows: PackFollows,
): string[] {
  const gaps: string[] = [];

  if (alreadySaid.nothingYet) {
    gaps.push(
      'This board has not decided anything bearing on this question before. There is no precedent here to follow or to depart from.',
    );
  }

  if (figures.terms.length === 0) {
    gaps.push(
      'No operative terms have been set. Approving this would approve the proposal without saying at what limit, measured how, or checked how often.',
    );
  }

  if (figures.computations.length === 0 && (matter.assetIds ?? []).length > 0) {
    gaps.push(
      'No figures have been recorded for the holdings this names. Whether they are inside the limits is unknown rather than satisfied.',
    );
  }

  if (said.length === 0) {
    gaps.push('Nobody has spoken on this yet.');
  }

  if (!follows.carrying.attached) {
    gaps.push(
      'Nothing is attached that reads these terms. If this passes, somebody at the institution has to apply it, and Majlis will not know whether they did.',
    );
  }

  const withoutLocation = matter.sources.filter((s) => !s.withdrawnAt && !s.ref.trim()).length;
  if (withoutLocation > 0) {
    gaps.push(
      `${withoutLocation} of the attached sources say what they are but not where to find the passage. They cannot be checked from this pack.`,
    );
  }

  if (matter.simulation === null) {
    gaps.push(
      'Nobody has run this against real transactions, so what it would have done is not shown.',
    );
  }

  return gaps;
}

/**
 * Build the pack.
 *
 * Everything is passed in rather than fetched, for the same reason as every
 * other assembler here: this file has no opinion about where the record lives
 * and can be tested without one.
 */
export function assemblePack(input: {
  board: Board;
  matter: Matter;
  /** Every matter of this board, so precedent can be found. */
  allMatters: readonly Matter[];
  computations: readonly Computation[];
  enforcement: EnforcementSnapshot;
  assembledAt: string;
}): Pack {
  const { board, matter, allMatters, computations, enforcement, assembledAt } = input;

  const settled = SETTLED.has(matter.status);
  const waitFrom = matter.arrivedAt ?? matter.openedAt;

  const question: PackQuestion = {
    text: matter.proposal,
    notDecided: [...matter.notDecided],
    mechanism: matter.mechanism,
    openedAt: matter.openedAt,
    arrivedAt: matter.arrivedAt ?? null,
    waitedDays: settled ? null : daysBetween(waitFrom, assembledAt),
    // Absent `arrivedAt` the wait is measured from when the matter reached
    // this system, which understates it. Saying so beats a confident number
    // that is wrong.
    waitPartlyUnknown: matter.arrivedAt === undefined,
  };

  const related = relatedTo(
    matter,
    allMatters.filter((m) => m.boardId === matter.boardId),
  );
  const alreadySaid: PackAlreadySaid = { related, nothingYet: related.length === 0 };

  /*
   * The figures that bear on this matter.
   *
   * Filtered to the holdings the matter actually names. A pack for a question
   * about one token that carried every zakat computation the board ever
   * recorded would be padding, and padding is what makes a document go
   * unread.
   */
  const mine = new Set(matter.assetIds ?? []);
  const figures: PackFigures = {
    computations: standingComputations([...computations]).filter(
      (c) => c.assetId !== null && c.assetId !== undefined && mine.has(c.assetId),
    ),
    terms: [...matter.proposedRule.parameters],
  };

  const follows: PackFollows = {
    carrying: buildCarrying(matter, enforcement),
    assetIds: [...(matter.assetIds ?? [])],
    structureId: matter.structureId ?? null,
  };

  const said = [...matter.deliberation].sort((a, b) => a.at.localeCompare(b.at));

  const held = matter.reasoning.filter((r) => !r.releasedAt);
  const spoken = new Set(held.map((r) => r.scholarId));
  const standing: PackStanding = {
    required: quorumFor(board, matter.direction),
    recorded: held,
    yetToSpeak: board.members
      .filter((m) => m.signatory && !spoken.has(m.id))
      .map((m) => ({ scholarId: m.id, name: m.name })),
  };

  return {
    matterId: matter.id,
    boardId: matter.boardId,
    title: matter.title,
    status: matter.status,
    direction: matter.direction,

    question,
    alreadySaid,
    figures,
    said,
    follows,
    evidence: matter.sources.filter((s) => !s.withdrawnAt),

    gaps: gapsIn(matter, alreadySaid, figures, said, follows),

    standing,
    assembledAt,
  };
}

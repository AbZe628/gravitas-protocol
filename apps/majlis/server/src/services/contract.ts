/**
 * A contract draft, assembled from what the board actually decided.
 *
 * ── what this is, and what it is emphatically not ─────────────────────────
 *
 * **It is not a contract, and it is not legal drafting.** It is the set of
 * clauses that follow from a ruling this board gave, written out so that the
 * institution's lawyers have something to work against rather than a fatwa and
 * a blank page. Every line traces to a sentence somebody on the board wrote:
 * a condition they found met, a term they approved, a thing they held outside
 * the question. Nothing here is composed.
 *
 * That constraint is what makes it worth having. A generator that filled in
 * plausible commercial boilerplate — governing law, notices, force majeure —
 * would produce a document that looks finished, and a bank would send it. The
 * parts a Shariah board has ruled on are a small fraction of a financing
 * agreement, and pretending otherwise is the failure mode here.
 *
 * So the draft is deliberately partial and **says where it stops**. What the
 * board did not answer appears as a named gap under the clause it belongs to,
 * in the same voice as everything else in Majlis: a gap stated is a gap a
 * lawyer fills, and a gap papered over is one nobody finds until it matters.
 *
 * ── it names no standard, because Majlis does not follow one ──────────────
 *
 * The conditions come from the shape as **this board holds it** — its own
 * adoption where it has one, the shipped draft where it has not — and the
 * shipped draft names no standard at all. Where the board stated a basis on its
 * adoption, that appears, in the board's words. Where it did not, the draft
 * says it did not rather than reaching for a citation nobody wrote.
 *
 * ── and it refuses, in three cases ────────────────────────────────────────
 *
 * A matter that is not settled, a ruling the board refused, and a shape the
 * board declined all produce no draft. The first two are the same rule the
 * fatwa follows: a document that looks final for an open question will be acted
 * on. The third is subtler and matters more — drafting against a shape the
 * board has ruled against using would hand a bank an agreement built on the one
 * structure its own scholars rejected.
 */

import { Refused } from './lifecycle.js';
import { structureById } from '../data/structures.js';
import type {
  AdoptedStructure,
  Board,
  ConditionFinding,
  Matter,
  RuleParameter,
  StructureCondition,
} from '../types.js';

/**
 * One clause, with where it came from attached.
 *
 * `from` is not decoration. A lawyer reading a clause they want to change needs
 * to know whether they are looking at something the board ruled — which they
 * cannot change without going back to it — or a term of the deal, which they
 * can. Losing that distinction is how a redline quietly reverses a ruling.
 */
export interface Clause {
  /** Numbered in the order they are rendered, so a reader can cite one. */
  number: string;
  heading: string;
  /** What the contract must provide. The board's words wherever there are any. */
  text: string;
  /**
   * Where in the record this came from.
   *
   * `finding` — a condition of the shape, and the member's finding on it.
   * `term`    — an operative term the board approved, with its plain meaning.
   * `outside` — something the board held outside the question.
   */
  from: 'finding' | 'term' | 'outside';
  /** The member who wrote the sentence this rests on, where one did. */
  by?: string;
  /** Why this cannot be drafted from the record. Present only on a gap. */
  gap?: string;
}

export interface ContractDraft {
  /** The matter it rests on, for the covering line and for citation. */
  matterId: string;
  reference: string;
  boardName: string;
  /** The shape being drafted, as the board holds it. */
  structureName: string;
  /** The board's own words for what its conditions rest on. Null where none. */
  basis: string | null;
  /** True where these are the board's adopted conditions rather than the draft. */
  adopted: boolean;

  ruling: string;
  ruledAt: string | null;
  parameterHash: string;

  clauses: Clause[];
  /**
   * Conditions of the shape nobody on the board answered.
   *
   * Named rather than dropped. A checklist that quietly omitted them would read
   * as complete, and a draft built from it would look like it covered the shape.
   */
  unanswered: string[];
  /** The sentences that must travel with any draft this partial. */
  limits: string[];
  generatedAt: string;
}

/**
 * What a draft assembled from a ruling can and cannot be relied on for.
 *
 * Carried in the object rather than only printed, because the object travels:
 * an interface that received this and rendered the clauses without the limits
 * would have stripped the only part that stops it being read as an agreement.
 */
export const LIMITS = [
  'This is a draft assembled from the board’s ruling. It is not a contract, it has not been ' +
    'drafted by a lawyer, and it is not legal advice.',
  'It contains only what the board ruled on. A financing agreement contains a great deal more — ' +
    'governing law, notices, events of default, remedies — and none of that is here, because none ' +
    'of it was put to the board.',
  'Where the board did not answer something, this says so under the clause it belongs to rather ' +
    'than filling it in.',
  'The board ruled on the structure. It did not approve this document, and executing something ' +
    'assembled from a ruling is not the same as the board having seen it.',
];

const SETTLED = ['in_force', 'timelock'];

/** The standing finding on a condition, where one stands. */
function standing(findings: ConditionFinding[], conditionId: string): ConditionFinding | undefined {
  return findings.filter((f) => f.conditionId === conditionId && !f.supersededAt).pop();
}

/**
 * A condition the board found met becomes a clause; one it found not met
 * becomes a clause with the board's objection attached.
 *
 * A `not_met` finding is deliberately not dropped. The board permitted the
 * structure *and* recorded that something about it does not hold — usually on
 * condition that it starts to. A draft that silently omitted the failing
 * condition would remove exactly the clause the institution most needs to see.
 */
function fromCondition(
  condition: StructureCondition,
  finding: ConditionFinding | undefined,
  number: string,
): Clause | null {
  if (!finding) return null;
  if (finding.holds === 'not_applicable') return null;

  return {
    number,
    heading: condition.requirement,
    text:
      finding.holds === 'met'
        ? finding.reason
        : `The board recorded that this does not presently hold: ${finding.reason}`,
    from: 'finding',
    by: finding.scholarId,
    ...(finding.holds === 'not_met'
      ? {
          gap:
            'The agreement must provide for this, or the ruling does not reach the arrangement ' +
            'as it stands.',
        }
      : {}),
  };
}

/**
 * An operative term becomes a clause, and `meaning` is what is drafted from.
 *
 * The key and value are the machine's form of it — `minTangibleRatioBps`,
 * `5100` — and putting those in a contract would produce a clause nobody can
 * argue about because nobody can read it. `meaning` is the sentence the scholar
 * actually approved, which is exactly why it is compulsory and excluded from
 * the hash. The figure follows it, so it can be checked.
 */
function fromParameter(p: RuleParameter, number: string): Clause {
  const figure = p.unit ? `${p.value} ${p.unit}` : p.value;
  return {
    number,
    // The heading carries the sentence; the body carries the figure to check
    // it against. Printing the meaning in both read as a stutter on the page.
    heading: p.meaning,
    text: `The operative value is ${figure}, recorded as ${p.key}.`,
    from: 'term',
    ...(p.meaning.trim()
      ? {}
      : {
          gap:
            'This term was approved with no plain-language meaning, so there is nothing here to ' +
            'draft from but the figure.',
        }),
  };
}

export function assemble(
  board: Board,
  matter: Matter,
  generatedAt: string,
  adoption: AdoptedStructure | null = null,
): ContractDraft {
  if (!SETTLED.includes(matter.status)) {
    throw new Refused(
      'wrong_status',
      `This matter is in ${matter.status}. A draft is assembled from a ruling, and a document ` +
        'that looks like an agreement for a question the board has not decided will be acted on.',
    );
  }

  if (!matter.structureId) {
    throw new Refused(
      'no_structure',
      'This ruling was not judged against a contract shape, so there are no conditions to draft ' +
        'from. Choose the shape on the matter first — which is a decision, not a setting.',
    );
  }

  if (adoption?.standing === 'declined') {
    throw new Refused(
      'shape_declined',
      'This board considered this shape and ruled against using it. Drafting against it would ' +
        'produce an agreement built on the one structure its own scholars rejected.',
    );
  }

  const shipped = structureById(matter.structureId);
  if (!shipped) {
    throw new Refused('not_in_library', 'This matter names a contract shape that does not exist.');
  }

  /*
   * The board's own conditions where it adopted the shape, copied at adoption,
   * so a later revision of the shipped library does not silently change what a
   * contract was drafted against.
   */
  const conditions =
    adoption && adoption.conditions.length > 0 ? adoption.conditions : shipped.conditions;

  const findings = matter.findings ?? [];
  const clauses: Clause[] = [];
  const unanswered: string[] = [];

  let n = 0;
  for (const condition of conditions) {
    const found = standing(findings, condition.id);
    if (!found) {
      unanswered.push(condition.requirement);
      continue;
    }
    const clause = fromCondition(condition, found, String(++n));
    if (clause) clauses.push(clause);
    else n--; // not_applicable takes no number
  }

  for (const p of matter.proposedRule.parameters) {
    clauses.push(fromParameter(p, String(++n)));
  }

  /*
   * What the board held outside the question, as clauses in their own right.
   *
   * These are the most valuable lines in the draft and the ones a generated
   * document would never produce: the board saying, in its own words, what it
   * has *not* approved. A lawyer who reads only the permissions will draft
   * something wider than the ruling.
   */
  for (const held of matter.notDecided) {
    clauses.push({
      number: String(++n),
      /*
       * The exclusion itself is the heading. A shared label — *Not covered by
       * this ruling* — repeated above each of them read as a rendering fault
       * when two sat together, and the line saying which kind of clause this is
       * is already under every one of them.
       */
      heading: held,
      text: 'Anything relying on this needs its own ruling before it is executed.',
      from: 'outside',
    });
  }

  return {
    matterId: matter.id,
    reference: matter.id,
    boardName: board.name,
    structureName: shipped.name,
    basis: adoption?.basis ?? null,
    // A decline is refused above, so anything reaching here is the board's own.
    adopted: adoption !== null,
    ruling: matter.proposedRule.statement,
    ruledAt: matter.inForceAt ?? matter.timelockEndsAt ?? null,
    parameterHash: matter.proposedRule.parameterHash,
    clauses,
    unanswered,
    limits: LIMITS,
    generatedAt,
  };
}

// ── the page ──────────────────────────────────────────────────────────────

function esc(text: string): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function date(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return esc(iso);
  return d.toISOString().slice(0, 10);
}

const SOURCE_SAYS: Record<Clause['from'], string> = {
  finding: 'From the board’s finding on a condition of the shape',
  term: 'An operative term the board approved',
  outside: 'Held outside the question',
};

/**
 * Printed as a working document rather than as an agreement.
 *
 * The limits sit at the top, before the clauses, and not in small print at the
 * end. A reader who scrolls to the clauses and starts editing has to have gone
 * past the sentence saying this is not a contract — putting it at the foot
 * would be technically honest and practically useless.
 */
export function render(draft: ContractDraft): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Draft clauses — ${esc(draft.structureName)}</title>
<style>
  @page { size: A4; margin: 22mm 20mm; }
  body { font: 11pt/1.55 Georgia, 'Times New Roman', serif; color: #191713; margin: 0; }
  .sheet { max-width: 170mm; margin: 0 auto; padding: 10mm 0; }
  h1 { font-size: 18pt; line-height: 1.25; margin: 0 0 2mm; }
  h2 { font-size: 9pt; letter-spacing: 0.14em; text-transform: uppercase; color: #6b6459;
       margin: 9mm 0 3mm; font-family: system-ui, sans-serif; }
  .board { font-size: 10pt; color: #6b6459; margin-bottom: 6mm; }
  .limits { background: #FBF6EA; padding: 5mm 6mm; border-radius: 2mm; margin-bottom: 8mm; }
  .limits p { margin: 0 0 2.5mm; font-size: 9.5pt; line-height: 1.5; }
  .limits p:last-child { margin-bottom: 0; }
  .limits strong { color: #8A6524; }
  .clause { margin-bottom: 6mm; page-break-inside: avoid; }
  .clause .n { font-family: system-ui, sans-serif; font-size: 9pt; font-weight: 700; color: #164470; }
  .clause .h { font-weight: 700; margin: 0.5mm 0 1.5mm; }
  .clause .t { margin: 0; }
  .clause .src { font-family: system-ui, sans-serif; font-size: 8.5pt; color: #8c8377; margin-top: 1.5mm; }
  .gap { background: #F7F0E2; padding: 2.5mm 3.5mm; border-radius: 1.5mm; font-size: 9.5pt;
         color: #6b5326; margin-top: 2mm; }
  .unanswered { background: #F7F0E2; padding: 4mm 5mm; border-radius: 2mm; font-size: 9.5pt; }
  .unanswered li { margin-bottom: 1.5mm; }
  .meta { font-family: ui-monospace, 'IBM Plex Mono', monospace; font-size: 8.5pt; color: #8c8377;
          margin-top: 10mm; word-break: break-all; }
</style>
</head>
<body>
<div class="sheet">
  <h1>Draft clauses — ${esc(draft.structureName)}</h1>
  <div class="board">${esc(draft.boardName)} · ${esc(draft.reference)} · ruled ${date(draft.ruledAt)}</div>

  <div class="limits">
${draft.limits.map((l, i) => `    <p>${i === 0 ? '<strong>' + esc(l) + '</strong>' : esc(l)}</p>`).join('\n')}
  </div>

  <h2>What the board ruled</h2>
  <p>${esc(draft.ruling)}</p>

  <h2>Whose conditions these are</h2>
  <p>${
    draft.adopted
      ? 'These are this board’s own version of the shape, taken under a decision that carried.'
      : 'This board has not adopted this shape. Its conditions are the shipped draft, which is a ' +
        'starting point offered for the board to rule beside and binds nobody.'
  }</p>
  <p>${
    draft.basis
      ? esc(draft.basis)
      : 'This board has not stated what these conditions rest on. Which standard governs is the ' +
        'board’s to decide, and none is named on its behalf.'
  }</p>

  <h2>Clauses</h2>
${draft.clauses
  .map(
    (c) => `  <div class="clause">
    <div class="n">${esc(c.number)}</div>
    <p class="h">${esc(c.heading)}</p>
    <p class="t">${esc(c.text)}</p>
    <div class="src">${esc(SOURCE_SAYS[c.from])}${c.by ? ' · ' + esc(c.by) : ''}</div>
${c.gap ? `    <div class="gap">${esc(c.gap)}</div>` : ''}
  </div>`,
  )
  .join('\n')}

${
  draft.unanswered.length
    ? `  <h2>Conditions the board did not answer</h2>
  <div class="unanswered">
    <p>Named rather than left out. Nothing below has been ruled on, so nothing below may be drafted from this ruling.</p>
    <ul>
${draft.unanswered.map((u) => `      <li>${esc(u)}</li>`).join('\n')}
    </ul>
  </div>`
    : ''
}

  <div class="meta">
    Assembled ${date(draft.generatedAt)} from ${esc(draft.reference)}<br />
    ${
      /*
       * The hash, or a sentence about its absence. Printing "none recorded"
       * against an empty hash read as *no operative terms*, on a draft that
       * carried two of them — the reader has no way to know the field is about
       * the fingerprint rather than about the terms.
       */
      draft.parameterHash
        ? `Terms fixed at: ${esc(draft.parameterHash)}`
        : 'The operative terms carry no hash, so this draft cannot be compared against what was ' +
          'signed. The terms themselves are above.'
    }
  </div>
</div>
</body>
</html>`;
}

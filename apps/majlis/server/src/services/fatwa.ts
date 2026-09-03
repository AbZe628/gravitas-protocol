/**
 * The document produced at the moment of decision.
 *
 * This is the Web2 half of the whole thesis. A bank that waits nine weeks for a
 * meeting then waits three more for someone to type the minutes has not been
 * helped by software that only holds the vote. **The document is the product**,
 * and it has to be finished work — signed, dated, complete — rather than an
 * export of rows.
 *
 * Two halves, deliberately separate. `assemble` produces a structure from what
 * the record already holds; `render` turns that structure into a page. Nothing
 * in `assemble` knows about presentation, so a second renderer — a bank's own
 * template, a different language, a real PDF engine — is a new function rather
 * than a rewrite.
 *
 * ── what this may not do ──────────────────────────────────────────────────
 *
 * **It assembles. It never composes.** Every sentence in the output was written
 * by a member of the board or by the institution. There is no summary of the
 * deliberation, no restatement of the reasoning in tidier words, and no
 * generated preamble. A document that paraphrased a scholar and then carried
 * their name under it would be the worst thing this application could produce.
 *
 * **It refuses to look final before it is.** A matter still in deliberation or
 * still being voted on produces no document at all. The refusal is the feature:
 * a business unit handed a plausible-looking page for a question the board has
 * not answered will act on it.
 *
 * **It reports a hash mismatch rather than printing the hash.** If the stored
 * parameters do not produce the stored hash, something changed after the board
 * approved it, and the document says so in place of the reassuring hex string.
 */

import { hashParameters, verifyParameters } from './hash.js';
import { quorumFor, ratificationDeadline } from './lifecycle.js';
import { Refused } from './lifecycle.js';
import type { Board, Matter, Reasoning, RuleParameter, Scholar, SourceRef } from '../types.js';

/** What kind of decision this document records. */
export type FatwaKind =
  /** Approved and in force. */
  | 'ruling'
  /** Approved, timelock still running. In force on a stated date. */
  | 'pending'
  /** The board did not approve it. The business needs this in writing too. */
  | 'refusal'
  /** A restriction that stood on reduced quorum and was never ratified. */
  | 'lapsed'
  /** Taken back by the proposer before a decision. */
  | 'withdrawn';

export interface FatwaSignature {
  scholarId: string;
  name: string;
  title: string;
  position: Reasoning['position'];
  /** The member's own words. Never edited, never summarised. */
  reason: string;
  at: string;
  /** True where the position was released when the matter returned to deliberation. */
  released: boolean;
  /**
   * Set where the member's position was recorded against a different set of
   * terms from the ones in force. Should never happen; printed if it does.
   */
  onDifferentTerms: boolean;
}

export interface Fatwa {
  kind: FatwaKind;
  /** How the institution refers to this decision. */
  reference: string;
  title: string;
  boardName: string;
  institutionId: string;

  /** The question the board was asked, as it was asked. */
  question: string;
  /** What mechanically occurs. Empty where the record has none. */
  mechanism: string;
  /**
   * What is expressly **not** decided.
   *
   * Given its own field, and rendered prominently, because the failure it
   * prevents is the common one: a narrow approval read later as a broad
   * endorsement. A fatwa without this is how an institution ends up believing
   * its board blessed something it never saw.
   */
  notDecided: string[];

  /**
   * The steps the institution must follow, in order.
   *
   * A ruling that says what is permitted without saying how it is done leaves
   * the desk to work it out, and the desk will work it out differently from
   * what the board pictured.
   */
  implementationSteps: string[];

  /** The operative terms, as approved. */
  parameters: RuleParameter[];
  parameterHash: string;
  /** False when the stored parameters do not produce the stored hash. */
  parametersVerified: boolean;

  signatures: FatwaSignature[];
  /** Those against, separately, because dissent must be visible without counting. */
  dissent: FatwaSignature[];
  abstentions: FatwaSignature[];
  quorumRequired: number;
  quorumRecorded: number;

  /** Every source anyone attached and did not withdraw. */
  evidence: SourceRef[];

  openedAt: string;
  decidedAt: string | null;
  inForceAt: string | null;
  /** Set on a pending ruling: the day the timelock ends. */
  takesEffectAt: string | null;
  /** Set on a restriction: the day ratification is due. */
  ratificationDueAt: string | null;

  /** When the document was produced. Not when the decision was taken. */
  generatedAt: string;
}

const SETTLED: Record<string, FatwaKind> = {
  in_force: 'ruling',
  timelock: 'pending',
  rejected: 'refusal',
  lapsed: 'lapsed',
  withdrawn: 'withdrawn',
};

function member(board: Board, scholarId: string): Scholar | undefined {
  return board.members.find((m) => m.id === scholarId);
}

function signature(board: Board, r: Reasoning, hashInForce: string): FatwaSignature {
  const who = member(board, r.scholarId);
  return {
    scholarId: r.scholarId,
    name: who?.name ?? r.scholarId,
    title: who?.title ?? '',
    position: r.position,
    reason: r.reason,
    at: r.at,
    released: Boolean(r.releasedAt),
    // Absent on positions recorded before the field existed, which is not a
    // mismatch — it is an older record, and saying otherwise would be a lie.
    onDifferentTerms: r.onParameterHash !== undefined && r.onParameterHash !== hashInForce,
  };
}

/**
 * Build the document from the record.
 *
 * @throws Refused when the matter has not been decided. A document for an open
 *         question is the one output this file must never produce.
 */
export function assemble(board: Board, matter: Matter, generatedAt: string): Fatwa {
  const kind = SETTLED[matter.status];
  if (!kind) {
    throw new Refused(
      'wrong_status',
      `This matter is in ${matter.status}. A document is produced when the board has ` +
        'decided, and not before — a page that looks final for an open question will be acted on.',
    );
  }

  const parameters = matter.proposedRule.parameters;
  const stored = matter.proposedRule.parameterHash;
  const verified = verifyParameters(parameters, stored);
  const actual = (() => {
    try {
      return hashParameters(parameters);
    } catch {
      return stored;
    }
  })();

  const standing = matter.reasoning.filter((r) => !r.releasedAt);
  const all = matter.reasoning.map((r) => signature(board, r, actual));

  const takesEffectAt = matter.status === 'timelock' ? matter.timelockEndsAt : null;
  const ratificationDueAt =
    matter.status === 'in_force' && matter.direction === 'restrict'
      ? ratificationDeadline(board, matter)
      : null;

  return {
    kind,
    reference: matter.id,
    title: matter.title,
    boardName: board.name,
    institutionId: board.institutionId,

    question: matter.proposal,
    mechanism: matter.mechanism,
    implementationSteps: matter.implementationSteps ?? [],
    notDecided: matter.notDecided,

    parameters,
    parameterHash: stored,
    parametersVerified: verified,

    signatures: all.filter((s) => s.position === 'for'),
    dissent: all.filter((s) => s.position === 'against'),
    abstentions: all.filter((s) => s.position === 'abstain'),
    quorumRequired: quorumFor(board, matter.direction),
    quorumRecorded: standing.filter((r) => r.position === 'for').length,

    evidence: matter.sources.filter((s) => !s.withdrawnAt),

    openedAt: matter.openedAt,
    decidedAt: matter.settledAt ?? null,
    inForceAt: matter.inForceAt,
    takesEffectAt,
    ratificationDueAt,

    generatedAt,
  };
}

// ── rendering ─────────────────────────────────────────────────────────────

const HEADING: Record<FatwaKind, string> = {
  ruling: 'Ruling of the Shariah Board',
  pending: 'Ruling of the Shariah Board — not yet in effect',
  refusal: 'Decision of the Shariah Board — not approved',
  lapsed: 'Decision of the Shariah Board — lapsed',
  withdrawn: 'Record of a withdrawn matter',
};

const STANDING: Record<FatwaKind, string> = {
  ruling: 'This ruling is in force.',
  pending: 'The board has decided. This ruling is not yet in effect.',
  refusal: 'The board did not approve this. Nothing in it may be relied on as an approval.',
  lapsed:
    'This restriction stood on the reduced quorum and was not ratified within the board’s window. ' +
    'It has lapsed and must be proposed again to have any effect.',
  withdrawn:
    'This matter was withdrawn before the board decided it. It records a question that was asked ' +
    'and not answered, and settles nothing.',
};

/** Escape for HTML text and attribute contexts alike. */
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

function block(signatures: FatwaSignature[], heading: string): string {
  if (signatures.length === 0) return '';
  const rows = signatures
    .map(
      (s) => `      <div class="sig${s.released ? ' released' : ''}">
        <div class="who">
          <strong>${esc(s.name)}</strong>${s.title ? `<span>${esc(s.title)}</span>` : ''}
        </div>
        <p class="reason">${esc(s.reason)}</p>
        <p class="stamp">${date(s.at)}${s.released ? ' · position released when the matter returned to deliberation; it does not count' : ''}${
          s.onDifferentTerms ? ' · <strong>recorded against different terms from those below</strong>' : ''
        }</p>
      </div>`,
    )
    .join('\n');
  return `    <section class="signatures">
      <h2>${esc(heading)}</h2>
${rows}
    </section>`;
}

/**
 * A self-contained page, designed for print.
 *
 * No external stylesheet, no font from a network, no script. A document a bank
 * files with its regulator has to render the same in five years as it does
 * today, and anything fetched at open time is a thing that can stop existing.
 *
 * There is deliberately no headless browser behind this. A PDF engine that
 * carries a whole Chromium would not fit the deployment this runs on, and the
 * browser the reader already has produces the same page. If a server-side
 * engine is wanted later it consumes the same `Fatwa` and this function stays
 * as it is.
 */
export function render(fatwa: Fatwa): string {
  const notDecided = fatwa.notDecided.length
    ? `    <section class="not-decided">
      <h2>What this does not decide</h2>
      <ul>
${fatwa.notDecided.map((n) => `        <li>${esc(n)}</li>`).join('\n')}
      </ul>
    </section>`
    : `    <section class="not-decided empty">
      <h2>What this does not decide</h2>
      <p>The record carries no exclusions for this decision. A ruling without stated limits
      is more easily read as broader than the board intended.</p>
    </section>`;

  const parameters = fatwa.parameters.length
    ? `      <table>
        <thead><tr><th>Term</th><th>Value</th><th>What it does</th></tr></thead>
        <tbody>
${fatwa.parameters
  .map(
    (p) => `          <tr>
            <td class="mono">${esc(p.key)}</td>
            <td class="mono">${esc(p.value)}${p.unit ? ` <span class="unit">${esc(p.unit)}</span>` : ''}</td>
            <td>${esc(p.meaning)}</td>
          </tr>`,
  )
  .join('\n')}
        </tbody>
      </table>`
    : '      <p class="none">No operative terms were recorded for this decision.</p>';

  const evidence = fatwa.evidence.length
    ? `      <ol>
${fatwa.evidence
  .map(
    (s) =>
      `        <li><span class="kind">${esc(s.kind)}</span> ${esc(s.label)} — <span class="mono">${esc(s.ref)}</span>${
        s.note ? `<br><span class="note">${esc(s.note)}</span>` : ''
      }</li>`,
  )
  .join('\n')}
      </ol>`
    : '      <p class="none">No sources were attached to this matter.</p>';

  const integrity = fatwa.parametersVerified
    ? `      <p>The operative terms above hash to <span class="mono">${esc(fatwa.parameterHash)}</span>.
      Anyone holding this document can recompute that value from the terms and compare it with
      what was deployed. The question "was what the board approved what was put into effect"
      is answered by comparison rather than by testimony.</p>`
    : `      <p class="warn"><strong>The recorded terms do not produce the recorded hash.</strong>
      The stored value is <span class="mono">${esc(fatwa.parameterHash)}</span>, and the terms
      printed above do not hash to it. Something changed after the board approved them. This
      document is not evidence of what was approved until that is explained.</p>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(fatwa.reference)} — ${esc(fatwa.title)}</title>
<style>
  @page { size: A4; margin: 20mm 18mm 18mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0; color: #16211d; background: #fff;
    font: 11pt/1.55 Georgia, 'Times New Roman', serif;
  }
  .sheet { max-width: 178mm; margin: 0 auto; padding: 12mm 0; }
  header { border-bottom: 2px solid #16211d; padding-bottom: 8mm; margin-bottom: 8mm; }
  .eyebrow {
    font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace;
    font-size: 8pt; letter-spacing: .14em; text-transform: uppercase; color: #5b6b65;
  }
  h1 { font-size: 17pt; line-height: 1.25; margin: 3mm 0 2mm; font-weight: normal; }
  .board { font-size: 10pt; color: #43524d; }
  .standing {
    margin: 6mm 0 0; padding: 4mm 5mm; border-left: 3px solid #0e5b4b;
    background: #f2f7f5; font-size: 10.5pt;
  }
  .standing.refused, .standing.lapsed { border-left-color: #9c3325; background: #faf0ee; }
  h2 {
    font-size: 9pt; letter-spacing: .1em; text-transform: uppercase; color: #5b6b65;
    font-family: ui-monospace, Menlo, monospace; font-weight: normal;
    margin: 9mm 0 3mm; padding-bottom: 1.5mm; border-bottom: 1px solid #d5ded9;
  }
  section { break-inside: avoid; }
  p { margin: 0 0 3mm; }
  .not-decided {
    border: 1.5px solid #9c3325; padding: 4mm 5mm; margin: 8mm 0; break-inside: avoid;
  }
  .not-decided h2 { color: #9c3325; border: 0; margin-top: 0; }
  .not-decided ul { margin: 0; padding-left: 5mm; }
  .not-decided li { margin-bottom: 2mm; }
  .not-decided.empty p { color: #6b524d; font-style: italic; margin: 0; }
  table { width: 100%; border-collapse: collapse; font-size: 10pt; }
  th, td { text-align: left; padding: 2.5mm 3mm; border-bottom: 1px solid #d5ded9; vertical-align: top; }
  thead th {
    font-family: ui-monospace, Menlo, monospace; font-size: 8pt; letter-spacing: .1em;
    text-transform: uppercase; color: #5b6b65; font-weight: normal;
    border-bottom: 1.5px solid #9fb0a9;
  }
  .mono { font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace; font-size: 9pt; word-break: break-all; }
  .unit { color: #5b6b65; }
  .none { color: #5b6b65; font-style: italic; }
  .steps { padding-left: 6mm; }
  .steps li { margin-bottom: 2mm; }
  .sig { margin-bottom: 5mm; padding-left: 4mm; border-left: 2px solid #cfdad5; break-inside: avoid; }
  .sig.released { border-left-style: dotted; color: #6d7b76; }
  .who strong { font-size: 11pt; }
  .who span { color: #5b6b65; font-size: 9.5pt; margin-left: 2mm; }
  .reason { margin: 1.5mm 0; }
  .stamp {
    font-family: ui-monospace, Menlo, monospace; font-size: 8.5pt; color: #5b6b65; margin: 0;
  }
  .facts { width: 100%; font-size: 10pt; }
  .facts td:first-child { color: #5b6b65; width: 45mm; }
  .integrity { font-size: 9.5pt; }
  .warn { color: #9c3325; }
  footer {
    margin-top: 10mm; padding-top: 4mm; border-top: 1px solid #d5ded9;
    font-size: 8.5pt; color: #5b6b65;
  }
  @media print { .sheet { padding: 0; } }
</style>
</head>
<body>
<div class="sheet">
  <header>
    <div class="eyebrow">${esc(fatwa.reference)}</div>
    <h1>${esc(fatwa.title)}</h1>
    <div class="board">${esc(fatwa.boardName)}</div>
    <p class="standing${fatwa.kind === 'refusal' || fatwa.kind === 'lapsed' ? ' refused' : ''}">
      ${esc(STANDING[fatwa.kind])}
      ${fatwa.takesEffectAt ? `It takes effect on ${date(fatwa.takesEffectAt)} unless a signatory objects before then.` : ''}
      ${fatwa.ratificationDueAt ? `It must be ratified by the full quorum before ${date(fatwa.ratificationDueAt)} or it lapses.` : ''}
    </p>
  </header>

  <main>
    <div class="eyebrow">${esc(HEADING[fatwa.kind])}</div>

    <section>
      <h2>The question put to the board</h2>
      <p>${esc(fatwa.question)}</p>
    </section>

${fatwa.mechanism ? `    <section>
      <h2>What occurs</h2>
      <p>${esc(fatwa.mechanism)}</p>
    </section>` : ''}

${notDecided}

${fatwa.implementationSteps.length ? `    <section>
      <h2>How it is implemented</h2>
      <ol class="steps">
${fatwa.implementationSteps.map((s) => `        <li>${esc(s)}</li>`).join('\n')}
      </ol>
    </section>` : ''}

    <section>
      <h2>Operative terms</h2>
${parameters}
    </section>

${block(fatwa.signatures, 'In favour')}
${block(fatwa.dissent, 'Against')}
${block(fatwa.abstentions, 'Abstained')}

    <section>
      <h2>Evidence before the board</h2>
${evidence}
    </section>

    <section>
      <h2>Record</h2>
      <table class="facts">
        <tr><td>Raised</td><td>${date(fatwa.openedAt)}</td></tr>
        <tr><td>Decided</td><td>${date(fatwa.decidedAt)}</td></tr>
        <tr><td>In force from</td><td>${date(fatwa.inForceAt)}</td></tr>
        <tr><td>Threshold</td><td>${fatwa.quorumRecorded} of ${fatwa.quorumRequired} required</td></tr>
      </table>
    </section>

    <section class="integrity">
      <h2>Integrity</h2>
${integrity}
    </section>
  </main>

  <footer>
    Assembled from the board’s own record on ${date(fatwa.generatedAt)}. Every statement above was
    written by a member of the board or by the institution; nothing here is summarised or composed.
  </footer>
</div>
</body>
</html>
`;
}

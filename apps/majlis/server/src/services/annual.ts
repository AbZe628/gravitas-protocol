/**
 * The board's annual report to shareholders.
 *
 * AAOIFI Governance Standard No. 1 requires it, and it is the one document in
 * an Islamic bank's year that carries the board's own signature under an
 * opinion rather than under a ruling. Everything around that opinion — what the
 * board did, what it found, what the institution owes — is fact, already
 * written down, and assembling it by hand each January is work nobody should be
 * doing.
 *
 * ── the rule this whole file exists to hold ───────────────────────────────
 *
 * **Assemble every fact. Leave the opinion blank.**
 *
 * The opinion is the only part that is the board's, and the only part worth
 * their signature. A system that drafted it — even a careful draft, even one
 * clearly marked for editing — would be producing the sentence a regulator
 * relies on and shareholders read, and a board under time pressure would sign
 * it. `opinion` is therefore typed `null` rather than `string | null`: there is
 * no code path that can fill it, and adding one would not compile.
 *
 * What the file does instead is state what the opinion has to address, so a
 * board writing it in the ordinary rush of a year end is not working from
 * memory about what a regulator expects to see covered.
 *
 * **And it says what it cannot support.** The record does not hold meetings, or
 * zakat, or the internal Shariah review's own findings. A report that quietly
 * omitted them would look complete and be short of what GS-1 asks for, so each
 * is named. The gaps are the useful part of a first draft.
 */

import { disclosureFor, type Disclosure } from './incident.js';
import { forYear } from './computation.js';
import { paceOf } from './clocks.js';
import { reviewStatus } from './review.js';
import type { Board, CalculationKind, Computation, Incident, Matter, MatterOrigin, Rule, Scholar } from '../types.js';

export interface ReportedCalculation {
  kind: CalculationKind;
  /** The holding it concerns, where it concerns one. */
  assetId: string | null;
  periodFrom: string;
  periodTo: string;
  methodStated: string;
  currency: string;
  source: string;
  amount: string;
  headline: string;
  /** The sentence saying what the calculation did not answer. Carried, not rewritten. */
  note: string;
  recordedBy: string;
  recordedAt: string;
}

export interface ReportedDecision {
  reference: string;
  title: string;
  direction: Matter['direction'];
  origin: MatterOrigin;
  outcome: 'approved' | 'refused' | 'withdrawn' | 'lapsed' | 'pending';
  decidedAt: string | null;
  inForceAt: string | null;
}

export interface AnnualReport {
  year: number;
  periodFrom: string;
  periodTo: string;

  boardId: string;
  boardName: string;
  institutionId: string;
  /** Who sat on the board. Composition is itself a disclosure under GS-1. */
  composition: Scholar[];

  activity: {
    decided: number;
    approved: number;
    refused: number;
    withdrawn: number;
    lapsed: number;
    inForceAtYearEnd: number;
    byOrigin: Record<MatterOrigin, number>;
  };

  /**
   * How long the board took.
   *
   * Not required by any standard, and the most interesting number in the
   * document. It is the first time an institution can put in writing what its
   * own governance costs it in time.
   */
  pace: {
    medianDays: number | null;
    fastestDays: number | null;
    slowestDays: number | null;
    approximate: boolean;
  };

  reviews: {
    completedInYear: number;
    dueAtYearEnd: number;
    overdueAtYearEnd: number;
    unscheduled: number;
  };

  /** Nature, amount, count and rectification. Assembled, never summarised. */
  nonCompliance: Disclosure;

  /**
   * What the board noted during the year.
   *
   * Not a claim any of it was approved. A recorded calculation says the board
   * was shown these figures and that this arithmetic followed from them; the
   * opinion above is still the board's to write.
   */
  calculations: ReportedCalculation[];

  decisions: ReportedDecision[];

  /**
   * Always null, and typed so it cannot be anything else.
   *
   * The board writes this. Nothing in this repository may.
   */
  opinion: null;
  /** What a regulator expects the opinion to cover. */
  opinionMustAddress: string[];

  /** What this record cannot support, named rather than omitted. */
  gaps: string[];

  generatedAt: string;
}

const ORIGINS: MatterOrigin[] = [
  'institution_request',
  'protocol_change',
  'periodic_review',
  'compliance_concern',
];

const OPINION_MUST_ADDRESS = [
  'Whether the contracts, transactions and dealings entered into during the year are in ' +
    'compliance with the rules and principles of Shariah.',
  'Whether the allocation of profit and charging of losses relating to investment accounts ' +
    'conform to the basis approved by the board.',
  'Whether any earnings realised from sources or by means prohibited by Shariah have been ' +
    'disposed of to charity.',
  'Whether the calculation of zakat is in compliance with Shariah, and on whom the ' +
    'responsibility for paying it falls.',
  'The board’s own independence, and whether it received the information and access it needed.',
];

/**
 * The year's standing calculations, flattened for the document.
 *
 * Superseded and withdrawn ones are already out — `forYear` takes what stands
 * — because a report is the current picture. The history of revisions is on
 * the calculation's own page, where a reader looking for it will be.
 */
function computationsFor(year: number, all: Computation[]): ReportedCalculation[] {
  return forYear(all, year).map((c) => ({
    kind: c.kind,
    assetId: c.assetId,
    periodFrom: c.periodFrom,
    periodTo: c.periodTo,
    methodStated: c.methodStated,
    currency: c.currency,
    source: c.source,
    amount: c.amount,
    headline: c.headline,
    note: c.note,
    recordedBy: c.recordedBy,
    recordedAt: c.recordedAt,
  }));
}

function yearOf(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.getUTCFullYear();
}

function outcomeOf(matter: Matter): ReportedDecision['outcome'] {
  switch (matter.status) {
    case 'in_force': return 'approved';
    case 'rejected': return 'refused';
    case 'withdrawn': return 'withdrawn';
    case 'lapsed': return 'lapsed';
    default: return 'pending';
  }
}

/**
 * Everything the record holds about one year, and nothing it does not.
 *
 * A matter counts toward the year in which the board settled it, not the year
 * it was raised. A question opened in November and decided in February belongs
 * to the board that decided it.
 */
export function assembleAnnualReport(params: {
  year: number;
  board: Board;
  matters: Matter[];
  rules: Rule[];
  incidents: Incident[];
  /**
   * Optional, so an installation with nothing recorded still produces a
   * report — and so the gap it names about itself stays true rather than
   * becoming a crash.
   */
  computations?: Computation[];
  generatedAt: string;
}): AnnualReport {
  const { year, board, generatedAt } = params;
  const periodFrom = `${year}-01-01T00:00:00.000Z`;
  const periodTo = `${year}-12-31T23:59:59.999Z`;

  const mine = params.matters.filter((m) => m.boardId === board.id);
  const rules = params.rules.filter((r) => r.boardId === board.id);
  const incidents = params.incidents.filter((i) => i.boardId === board.id);

  const settledThisYear = mine.filter((m) => yearOf(m.settledAt) === year);

  const byOrigin = Object.fromEntries(
    ORIGINS.map((o) => [o, settledThisYear.filter((m) => m.origin === o).length]),
  ) as Record<MatterOrigin, number>;

  const decisions: ReportedDecision[] = settledThisYear
    .map((m) => ({
      reference: m.id,
      title: m.title,
      direction: m.direction,
      origin: m.origin,
      outcome: outcomeOf(m),
      decidedAt: m.settledAt ?? null,
      inForceAt: m.inForceAt,
    }))
    .sort((a, b) => (a.decidedAt ?? '').localeCompare(b.decidedAt ?? ''));

  // Pace over the year's own decisions, so a slow year is not flattered by a
  // fast one before it.
  const pace = paceOf(board, settledThisYear, periodTo);

  const statuses = rules.map((r) => reviewStatus(r, periodTo));

  const report: AnnualReport = {
    year,
    periodFrom,
    periodTo,

    boardId: board.id,
    boardName: board.name,
    institutionId: board.institutionId,
    composition: board.members,

    activity: {
      decided: settledThisYear.length,
      approved: settledThisYear.filter((m) => m.status === 'in_force').length,
      refused: settledThisYear.filter((m) => m.status === 'rejected').length,
      withdrawn: settledThisYear.filter((m) => m.status === 'withdrawn').length,
      lapsed: settledThisYear.filter((m) => m.status === 'lapsed').length,
      inForceAtYearEnd: rules.filter((r) => r.inForceFrom && !r.supersededBy).length,
      byOrigin,
    },

    pace: {
      medianDays: pace.medianDays,
      fastestDays: pace.fastestDays,
      slowestDays: pace.slowestDays,
      approximate: pace.approximate,
    },

    reviews: {
      completedInYear: rules.filter((r) => yearOf(r.lastReviewedAt) === year).length,
      dueAtYearEnd: statuses.filter((s) => s.state === 'due').length,
      overdueAtYearEnd: statuses.filter((s) => s.overdue).length,
      unscheduled: statuses.filter((s) => s.state === 'unscheduled').length,
    },

    nonCompliance: disclosureFor(year, incidents),

    /**
     * What the board noted during the year, and nothing more.
     *
     * These are facts assembled like every other fact here: the board was
     * shown these figures, from a named source, on a date. The report carries
     * them so the opinion has something under it, and carries each one's own
     * note so the sentence saying what a calculation did not answer travels
     * with the figure into the document.
     */
    calculations: computationsFor(year, params.computations ?? []),

    decisions,

    opinion: null,
    opinionMustAddress: OPINION_MUST_ADDRESS,

    gaps: [],
    generatedAt,
  };

  report.gaps = gapsIn(report);
  return report;
}

/**
 * What the record cannot support.
 *
 * Named rather than omitted. A report that quietly left these out would look
 * complete and fall short of GS-1, and the board would discover which at the
 * worst moment.
 */
function gapsIn(report: AnnualReport): string[] {
  const gaps: string[] = [
    'The number of meetings held and each member’s attendance is not recorded by this system. ' +
      'GS-1 expects both, and frameworks that set an attendance floor expect it stated.',
    'The findings of the institution’s own Shariah review and Shariah audit functions are not ' +
      'held here. The board’s opinion normally rests on them.',
  ];

  /**
   * Zakat is a gap only while nothing has been noted.
   *
   * The report used to say this unconditionally, which stopped being true the
   * moment a board could record a computation. A gap that outlives its cause
   * teaches a board to stop reading the gaps.
   */
  if (!report.calculations.some((c) => c.kind === 'zakat')) {
    gaps.push(
      'No zakat calculation was noted for this year. It can be worked out and recorded, and ' +
        'until one is, the figure and whose obligation it is must be supplied by hand.',
    );
  }

  if (!report.calculations.some((c) => c.kind === 'profit_distribution')) {
    gaps.push(
      'No profit distribution was noted for this year. The opinion is asked whether allocation ' +
        'and loss charging followed the approved basis, and nothing here supports that sentence ' +
        'until one is recorded.',
    );
  }

  if (report.reviews.unscheduled > 0) {
    gaps.push(
      `${report.reviews.unscheduled} rule${report.reviews.unscheduled === 1 ? '' : 's'} in force ` +
        'carry no review interval, so nothing will bring them back to the board.',
    );
  }
  if (report.reviews.overdueAtYearEnd > 0) {
    gaps.push(
      `${report.reviews.overdueAtYearEnd} review${report.reviews.overdueAtYearEnd === 1 ? ' was' : 's were'} ` +
        'overdue at the year end. The rulings remain in force; what is missing is the board looking at them.',
    );
  }
  if (report.nonCompliance.purificationOutstanding.length > 0) {
    gaps.push(
      'Purification prescribed during the year is not fully recorded as paid. An opinion stating ' +
        'that prohibited earnings were disposed of to charity cannot rest on this record as it stands.',
    );
  }
  if (report.pace.approximate) {
    gaps.push(
      'Some decisions carry no recorded arrival or settlement date, so the timing figures cover ' +
        'only what this system witnessed.',
    );
  }

  return gaps;
}

// ── rendering ─────────────────────────────────────────────────────────────

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
  return Number.isNaN(d.getTime()) ? esc(iso) : d.toISOString().slice(0, 10);
}

/**
 * Whole days, for the document.
 *
 * The arithmetic produces tenths and the structure keeps them, but printing
 * "76.5 days" in a report a regulator reads invites more trust in the figure
 * than it has earned — nothing a board does turns on half a day, and the wait
 * is measured from dates that are themselves approximate. The interface rounds
 * for the same reason; a figure that reads one way on screen and another on
 * paper is worse than either.
 */
function dayFigure(n: number | null): string {
  if (n === null) return '—';
  if (n < 1) return 'under a day';
  return `${Math.round(n)} days`;
}

const CALCULATION_WORDS: Record<CalculationKind, string> = {
  screening: 'Screening ratios',
  purification: 'Purification',
  zakat: 'Zakat',
  profit_distribution: 'Profit distribution',
  tangibility: 'Tangibility',
  late_payment: 'Late payment',
};

const OUTCOME_WORDS: Record<ReportedDecision['outcome'], string> = {
  approved: 'Approved',
  refused: 'Not approved',
  withdrawn: 'Withdrawn',
  lapsed: 'Lapsed',
  pending: 'Pending',
};

/**
 * A printable draft, with the opinion left as a blank the board fills.
 *
 * The blank is deliberately large and deliberately labelled. A thin line
 * marked "opinion" invites a sentence; a page that says what the opinion must
 * address invites the board to write the one they mean.
 */
export function renderAnnualReport(report: AnnualReport): string {
  const nc = report.nonCompliance;

  const decisions = report.decisions.length
    ? `<table><thead><tr><th>Decided</th><th>Matter</th><th>Direction</th><th>Outcome</th></tr></thead><tbody>${report.decisions
        .map(
          (d) =>
            `<tr><td class="mono">${date(d.decidedAt)}</td><td>${esc(d.title)}<br><span class="ref">${esc(d.reference)}</span></td><td>${esc(d.direction)}</td><td>${esc(OUTCOME_WORDS[d.outcome])}</td></tr>`,
        )
        .join('')}</tbody></table>`
    : '<p class="none">The board settled no matters in this period.</p>';

  const events = nc.count
    ? `<table><thead><tr><th>Reference</th><th>Nature</th><th>Purification</th><th>Rectified</th></tr></thead><tbody>${nc.events
        .map(
          (e) =>
            `<tr><td class="mono">${esc(e.reference)}</td><td>${esc(e.nature)}</td><td>${
              e.amount ? `${esc(e.amount)} ${esc(e.currency ?? '')}${e.paid ? ' · paid' : ' · <strong>outstanding</strong>'}` : 'none prescribed'
            }</td><td>${e.rectified ? 'Yes' : 'No'}</td></tr>`,
        )
        .join('')}</tbody></table>`
    : '<p>No event was determined to be an actual non-compliance during this period.</p>';

  /**
   * What the board noted, with the source beside each figure.
   *
   * The source is in the table rather than a footnote because it is the part
   * that makes the figure checkable, and each calculation's own note follows
   * the table — the sentence saying what a calculation did not answer has to
   * reach the page the shareholders read, not stop at the screen.
   */
  const calculations = report.calculations.length
    ? `<table><thead><tr><th>Calculation</th><th>Period</th><th>Amount</th><th>Source</th></tr></thead><tbody>${report.calculations
        .map(
          (c) =>
            `<tr><td>${esc(CALCULATION_WORDS[c.kind] ?? c.kind)}${
              c.assetId ? `<br><span class="ref">${esc(c.assetId)}</span>` : ''
            }</td><td class="mono">${esc(c.periodFrom)} – ${esc(c.periodTo)}</td><td class="mono">${esc(
              c.amount,
            )} ${esc(c.currency)}</td><td>${esc(c.source)}</td></tr>`,
        )
        .join('')}</tbody></table>
    <p class="none">Recorded as noted by the board. Noting a calculation is not approval of the method used, which is a ruling and is made in the ordinary way.</p>
${report.calculations
  .map((c) => `    <p class="none">${esc(CALCULATION_WORDS[c.kind] ?? c.kind)}: ${esc(c.note)}</p>`)
  .join('\n')}`
    : '<p class="none">The board noted no calculations in this period.</p>';

  const signatures = report.composition
    .filter((m) => m.signatory)
    .map(
      (m) => `      <div class="sign">
        <div class="rule"></div>
        <div class="name">${esc(m.name)}${m.title ? ` · ${esc(m.title)}` : ''}</div>
      </div>`,
    )
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Annual report of the Shariah board — ${report.year}</title>
<style>
  @page { size: A4; margin: 20mm 18mm; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #16211d; background: #fff; font: 11pt/1.55 Georgia, 'Times New Roman', serif; }
  .sheet { max-width: 178mm; margin: 0 auto; padding: 12mm 0; }
  header { border-bottom: 2px solid #16211d; padding-bottom: 7mm; margin-bottom: 7mm; }
  .eyebrow { font-family: ui-monospace, Menlo, monospace; font-size: 8pt; letter-spacing: .14em; text-transform: uppercase; color: #5b6b65; }
  h1 { font-size: 17pt; font-weight: normal; margin: 3mm 0 2mm; }
  h2 { font-size: 9pt; font-family: ui-monospace, Menlo, monospace; letter-spacing: .1em; text-transform: uppercase; color: #5b6b65; font-weight: normal; margin: 9mm 0 3mm; padding-bottom: 1.5mm; border-bottom: 1px solid #d5ded9; }
  p { margin: 0 0 3mm; }
  section { break-inside: avoid; }
  table { width: 100%; border-collapse: collapse; font-size: 10pt; }
  th, td { text-align: left; padding: 2.5mm 3mm; border-bottom: 1px solid #d5ded9; vertical-align: top; }
  thead th { font-family: ui-monospace, Menlo, monospace; font-size: 8pt; letter-spacing: .1em; text-transform: uppercase; color: #5b6b65; font-weight: normal; border-bottom: 1.5px solid #9fb0a9; }
  .mono { font-family: ui-monospace, Menlo, monospace; font-size: 9pt; }
  .ref { font-family: ui-monospace, Menlo, monospace; font-size: 8pt; color: #5b6b65; }
  .none { color: #5b6b65; font-style: italic; }
  .figures { display: table; width: 100%; }
  .figures div { display: table-row; }
  .figures span { display: table-cell; padding: 2mm 3mm 2mm 0; border-bottom: 1px solid #eef2f0; }
  .figures span:first-child { color: #5b6b65; width: 60%; }
  .opinion { border: 2px solid #16211d; padding: 6mm; margin: 8mm 0; }
  .opinion h2 { margin-top: 0; border: 0; color: #16211d; }
  .blank { border: 1px dashed #9fb0a9; min-height: 45mm; margin: 4mm 0; padding: 4mm; color: #8a9793; font-style: italic; }
  .must { font-size: 10pt; }
  .must li { margin-bottom: 2mm; }
  .gaps { border: 1.5px solid #9c3325; padding: 5mm; margin: 8mm 0; font-size: 10pt; }
  .gaps h2 { color: #9c3325; border: 0; margin-top: 0; }
  .gaps li { margin-bottom: 2.5mm; }
  .sign { margin-top: 12mm; break-inside: avoid; }
  .sign .rule { border-bottom: 1px solid #16211d; height: 12mm; }
  .sign .name { font-size: 10pt; color: #43524d; padding-top: 1.5mm; }
  footer { margin-top: 10mm; padding-top: 4mm; border-top: 1px solid #d5ded9; font-size: 8.5pt; color: #5b6b65; }
</style>
</head>
<body>
<div class="sheet">
  <header>
    <div class="eyebrow">Report of the Shariah Supervisory Board · ${report.year}</div>
    <h1>${esc(report.boardName)}</h1>
    <p class="mono">${date(report.periodFrom)} to ${date(report.periodTo)}</p>
  </header>

  <p><strong>This is a draft assembled from the board’s own record.</strong> Every figure below was
  written down by a member of the board or by the institution during the year. The opinion is not
  drafted here and cannot be: it is the board’s, and it is the only part of this document that is.</p>

  <section>
    <h2>Composition of the board</h2>
    <table><thead><tr><th>Member</th><th>Title</th><th>Signing authority</th></tr></thead><tbody>
${report.composition.map((m) => `      <tr><td>${esc(m.name)}</td><td>${esc(m.title)}</td><td>${m.signatory ? 'Yes' : 'Advisory'}</td></tr>`).join('\n')}
    </tbody></table>
  </section>

  <section>
    <h2>What the board decided</h2>
    <div class="figures">
      <div><span>Matters settled in the period</span><span>${report.activity.decided}</span></div>
      <div><span>Approved</span><span>${report.activity.approved}</span></div>
      <div><span>Not approved</span><span>${report.activity.refused}</span></div>
      <div><span>Withdrawn before decision</span><span>${report.activity.withdrawn}</span></div>
      <div><span>Lapsed</span><span>${report.activity.lapsed}</span></div>
      <div><span>Rules in force at the period end</span><span>${report.activity.inForceAtYearEnd}</span></div>
    </div>
  </section>

  <section>
    <h2>Time taken</h2>
    <div class="figures">
      <div><span>Median time from arrival to decision</span><span>${dayFigure(report.pace.medianDays)}</span></div>
      <div><span>Fastest</span><span>${dayFigure(report.pace.fastestDays)}</span></div>
      <div><span>Slowest</span><span>${dayFigure(report.pace.slowestDays)}</span></div>
    </div>
${report.pace.approximate ? '    <p class="none">Some figures cover only the part of the wait this system witnessed.</p>' : ''}
  </section>

  <section>
    <h2>Decisions taken in the period</h2>
    ${decisions}
  </section>

  <section>
    <h2>Review of rulings already in force</h2>
    <div class="figures">
      <div><span>Reviews completed in the period</span><span>${report.reviews.completedInYear}</span></div>
      <div><span>Due at the period end</span><span>${report.reviews.dueAtYearEnd}</span></div>
      <div><span>Overdue at the period end</span><span>${report.reviews.overdueAtYearEnd}</span></div>
      <div><span>In force with no review scheduled</span><span>${report.reviews.unscheduled}</span></div>
    </div>
  </section>

  <section>
    <h2>Calculations noted in the period</h2>
    ${calculations}
  </section>

  <section>
    <h2>Shariah non-compliance</h2>
    <p>Events determined by the board to be actual non-compliances during the period:
    <strong>${nc.count}</strong>.</p>
    ${events}
${
  nc.purificationOutstanding.length
    ? `    <p><strong>Outstanding purification:</strong> ${nc.purificationOutstanding
        .map((o) => `${o.amounts.join(' + ')} ${esc(o.currency)}`)
        .join('; ')}.</p>`
    : ''
}
  </section>

  <div class="opinion">
    <h2>Opinion of the board</h2>
    <p>To be written and signed by the board. Nothing above drafts it.</p>
    <div class="blank">The board’s opinion goes here.</div>
    <p><strong>It is expected to address:</strong></p>
    <ol class="must">
${report.opinionMustAddress.map((o) => `      <li>${esc(o)}</li>`).join('\n')}
    </ol>
  </div>

  <div class="gaps">
    <h2>What this draft cannot state</h2>
    <p>The following are not held in this record. They are named rather than omitted, because a
    report that left them out would look complete and fall short of what is asked for.</p>
    <ul>
${report.gaps.map((g) => `      <li>${esc(g)}</li>`).join('\n')}
    </ul>
  </div>

  <section>
    <h2>Signatures</h2>
${signatures}
  </section>

  <footer>
    Assembled from the board’s record on ${date(report.generatedAt)}. Facts only; the opinion is the
    board’s and is not produced by this system.
  </footer>
</div>
</body>
</html>
`;
}

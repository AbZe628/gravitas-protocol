/**
 * Everything the board ever decided about one holding.
 *
 * The register answers *where does this stand today*. This answers the question
 * an auditor actually asks, which is *show me how it got there* — and it is the
 * one document in this application that is about a thing rather than about a
 * decision or a year.
 *
 * ── why it is a document and not a screen ─────────────────────────────────
 *
 * A screen is read by somebody already inside Majlis. This is handed to
 * somebody outside it: an auditor, a regulator, a correspondent bank asking why
 * this token is on the list. It is one page, it prints, and it carries its own
 * dates, so it stays legible after it leaves.
 *
 * ── it assembles and it concludes nothing ─────────────────────────────────
 *
 * Every figure here comes from somewhere that already computed it. The standing
 * is derived by the register, the composition is read by the register, the
 * drift is found by the drift service, and each carries its own sentence about
 * what it does not answer. Nothing is restated in this file's own words,
 * because a document that paraphrased a ruling would be a second version of it.
 *
 * ── and it says what it cannot say ────────────────────────────────────────
 *
 * A holding nobody has ruled on has no ruling, and the page says so rather than
 * printing an empty section that reads like an absence of problems. That is the
 * same rule the annual report follows, and it matters more here: a page headed
 * with a token's name and showing nothing under "restrictions" is the most
 * misreadable thing this system could produce.
 */

import { standingOf, readComposition, type AssetStanding, type CompositionReading } from './register.js';
import { driftFor, type Drift, type Unwatched } from './drift.js';
import { forYear, standing as standingComputations } from './computation.js';
import type { Asset, Computation, Matter, Rule } from '../types.js';

export interface DecisionOnAsset {
  matterId: string;
  title: string;
  direction: Matter['direction'];
  origin: Matter['origin'];
  outcome: 'approved' | 'refused' | 'withdrawn' | 'lapsed' | 'pending';
  settledAt: string | null;
  inForceAt: string | null;
  /** What the board said it was not deciding. Carried, never summarised. */
  notDecided: string[];
  /** The rule that came out of it, where one did and is still in force. */
  ruleId: string | null;
}

export interface TermInForce {
  ruleId: string;
  ruleTitle: string;
  key: string;
  value: string;
  unit?: string;
  /** The plain-language explanation the board actually read. */
  meaning: string;
}

export interface Dossier {
  asset: Asset;
  standing: AssetStanding;
  composition: CompositionReading | null;
  /**
   * Where the holding has moved under a ruling, and what nothing is watching.
   *
   * Both halves, because a threshold nothing checks is how a crossing goes
   * unnoticed in the first place — and on a document handed to an auditor
   * that absence is the more useful of the two.
   */
  drift: {
    drifting: Drift[];
    unwatched: Unwatched[];
    unmeasured: { assetId: string; assetName: string; reason: string }[];
  };
  decisions: DecisionOnAsset[];
  terms: TermInForce[];
  /** Calculations the board noted against this holding, newest last. */
  calculations: Computation[];
  gaps: string[];
  generatedAt: string;
}

function outcomeOf(matter: Matter): DecisionOnAsset['outcome'] {
  switch (matter.status) {
    case 'in_force': return 'approved';
    case 'rejected': return 'refused';
    case 'withdrawn': return 'withdrawn';
    case 'lapsed': return 'lapsed';
    default: return 'pending';
  }
}

const namesAsset = (matter: Matter, assetId: string) =>
  Array.isArray(matter.assetIds) && matter.assetIds.includes(assetId);

/**
 * What the record holds about one holding, and nothing it does not.
 *
 * Ordered oldest first. The register lists history newest first because a
 * reader there wants the current position; a reader here wants the story, and
 * a story runs forwards.
 */
export function assembleDossier(params: {
  asset: Asset;
  matters: Matter[];
  rules: Rule[];
  computations?: Computation[];
  generatedAt: string;
}): Dossier {
  const { asset, generatedAt } = params;

  const mine = params.matters
    .filter((m) => namesAsset(m, asset.id))
    .sort((a, b) => (a.settledAt ?? a.openedAt).localeCompare(b.settledAt ?? b.openedAt));

  const decisions: DecisionOnAsset[] = mine.map((m) => ({
    matterId: m.id,
    title: m.title,
    direction: m.direction,
    origin: m.origin,
    outcome: outcomeOf(m),
    settledAt: m.settledAt ?? null,
    inForceAt: m.inForceAt,
    notDecided: m.notDecided,
    ruleId: m.status === 'in_force' ? m.proposedRule.id : null,
  }));

  /*
   * The operative terms a reader has to be able to check against.
   *
   * Taken from the matter's own copy of the rule rather than from the rules
   * table, and that is the faithful choice rather than the convenient one: the
   * matter carries the rule as the board approved it, and `parameterHash` is
   * over exactly those parameters. A board that voted on 51.00% approved the
   * object in front of it, not a row somewhere that happens to share a name —
   * and in this record the two do not always share even that.
   *
   * The rules table is still consulted, for the one thing it knows and the
   * matter does not: whether that rule has since been superseded. A term the
   * board later changed belongs in the history above, and repeating it here as
   * though it bound anybody would be the document contradicting itself.
   */
  const superseded = new Set(
    params.rules.filter((r) => r.supersededBy).map((r) => r.id),
  );

  const terms: TermInForce[] = mine
    .filter(
      (m) =>
        m.status === 'in_force' &&
        !m.proposedRule.supersededBy &&
        !superseded.has(m.proposedRule.id),
    )
    .flatMap((m) =>
      m.proposedRule.parameters.map((p) => ({
        ruleId: m.proposedRule.id,
        ruleTitle: m.proposedRule.title || m.title,
        key: p.key,
        value: p.value,
        unit: p.unit,
        meaning: p.meaning,
      })),
    );

  const standing = standingOf(asset, params.matters, generatedAt);
  const composition = asset.composition ? readComposition(asset.composition) : null;

  const all = params.computations ?? [];
  const calculations = standingComputations(all)
    .filter((c) => c.assetId === asset.id)
    .sort((a, b) => a.periodTo.localeCompare(b.periodTo));

  const dossier: Dossier = {
    asset,
    standing,
    composition,
    drift: driftFor(asset, params.matters),
    decisions,
    terms,
    calculations,
    gaps: [],
    generatedAt,
  };

  dossier.gaps = gapsIn(dossier);
  return dossier;
}

/**
 * What this page cannot say about this holding.
 *
 * Named rather than left as white space. A page headed with a token's name and
 * showing nothing under its rulings reads as an absence of problems, and that
 * is the most misreadable thing this system could produce.
 */
function gapsIn(d: Dossier): string[] {
  const gaps: string[] = [];

  if (d.decisions.length === 0) {
    gaps.push(
      'This board has never been asked about this holding. Nothing below is a finding that it is ' +
        'acceptable; there is simply no ruling to report.',
    );
  }

  if (d.terms.length === 0 && d.decisions.some((x) => x.outcome === 'approved')) {
    gaps.push(
      'A decision carried but set no operative terms, so there is no threshold or figure here to ' +
        'check performance against.',
    );
  }

  if (!d.composition) {
    gaps.push(
      'No composition has been supplied for this holding, so nothing here can say what it is made ' +
        'of or watch a proportion move.',
    );
  } else if (d.composition.incomplete) {
    gaps.push(
      'The composition supplied does not sum to the whole. It is reported as it arrived rather ' +
        'than scaled to fit, because a board ruling on an invented proportion is the worst ' +
        'outcome available here.',
    );
  }

  for (const u of d.drift.unwatched) {
    gaps.push(`A term this board set is not being checked: ${u.reason}`);
  }

  if (d.calculations.length === 0) {
    gaps.push(
      'No calculation has been noted against this holding — no screening, no purification. That ' +
        'may be right for what it is, and this page cannot tell.',
    );
  }

  if (d.asset.source === 'institution') {
    gaps.push(
      'This holding was entered by hand rather than read from a registry, so what it is depends ' +
        'on who typed it.',
    );
  }

  return gaps;
}

/** How many years the calculations here span, for a reader deciding what to check. */
export function yearsCovered(d: Dossier): number[] {
  const years = new Set(d.calculations.map((c) => Number(c.periodTo.slice(0, 4))));
  return [...years].sort();
}

/** Everything noted against this holding in one year. For a reader with a date. */
export function calculationsInYear(d: Dossier, year: number): Computation[] {
  return forYear(d.calculations, year);
}

// ── the printed page ──────────────────────────────────────────────────────

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const day = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : '—');

const OUTCOME: Record<DecisionOnAsset['outcome'], string> = {
  approved: 'Approved',
  refused: 'Not approved',
  withdrawn: 'Withdrawn',
  lapsed: 'Lapsed',
  pending: 'Still before the board',
};

const STATUS_WORDS: Record<string, string> = {
  never_examined: 'Never put to this board',
  under_consideration: 'Before the board now',
  permitted: 'Permitted, on the terms below',
  restricted: 'Restricted',
  lapsed: 'A restriction lapsed unratified',
  retired: 'Retired',
};

/**
 * One holding, as a page that can leave the building.
 *
 * Printed rather than displayed: an auditor is handed this, and it has to stay
 * legible with no application around it. Every section carries the sentence the
 * service that produced it wrote about what it does not answer, and the gaps
 * are inside the frame rather than in a footnote — a reader who stops halfway
 * should already have seen what this cannot tell them.
 */
export function renderDossier(d: Dossier): string {
  const identifiers = d.asset.identifiers
    .map(
      (i) =>
        `<span class="mono">${esc(i.scheme)}: ${esc(i.value)}${
          i.network ? ' · ' + esc(i.network) : ''
        }</span>`,
    )
    .join('<br>');

  const decisions = d.decisions.length
    ? `<table><thead><tr><th>Settled</th><th>Matter</th><th>Direction</th><th>Outcome</th></tr></thead><tbody>${d.decisions
        .map(
          (x) =>
            `<tr><td class="mono">${day(x.settledAt)}</td><td>${esc(x.title)}<br><span class="ref">${esc(
              x.matterId,
            )}</span>${
              x.notDecided.length
                ? '<br><span class="ref">Not decided: ' + esc(x.notDecided.join(' ')) + '</span>'
                : ''
            }</td><td>${esc(x.direction)}</td><td>${esc(OUTCOME[x.outcome])}</td></tr>`,
        )
        .join('')}</tbody></table>`
    : '<p class="none">This board has never been asked about this holding.</p>';

  const terms = d.terms.length
    ? `<table><thead><tr><th>Term</th><th>Value</th><th>What it means</th></tr></thead><tbody>${d.terms
        .map(
          (t) =>
            `<tr><td class="mono">${esc(t.key)}</td><td class="mono">${esc(t.value)}${
              t.unit ? ' ' + esc(t.unit) : ''
            }</td><td>${esc(t.meaning)}<br><span class="ref">${esc(t.ruleId)}</span></td></tr>`,
        )
        .join('')}</tbody></table>`
    : '<p class="none">No operative term is in force over this holding.</p>';

  const composition = d.composition
    ? `<table><thead><tr><th>Part</th><th>Kind</th><th>Share</th></tr></thead><tbody>${d.composition.parts
        .map(
          (x) =>
            `<tr><td>${esc(x.label)}</td><td>${esc(x.kind)}</td><td class="mono">${esc(x.percent)}%</td></tr>`,
        )
        .join('')}</tbody></table>
    <p class="none">Read as at ${day(d.composition.asOf)}, from ${esc(d.composition.source)}. ${esc(
      d.composition.note,
    )}</p>`
    : '<p class="none">No composition has been supplied for this holding.</p>';

  const drift = d.drift.drifting.length
    ? `<ul>${d.drift.drifting.map((x) => '<li>' + esc(x.questionForBoard) + '</li>').join('')}</ul>`
    : '<p class="none">Nothing this board set over this holding has been crossed.</p>';

  const calculations = d.calculations.length
    ? `<table><thead><tr><th>Calculation</th><th>Period</th><th>Amount</th><th>Source</th></tr></thead><tbody>${d.calculations
        .map(
          (c) =>
            `<tr><td>${esc(c.kind.replace(/_/g, ' '))}</td><td class="mono">${esc(c.periodFrom)} – ${esc(
              c.periodTo,
            )}</td><td class="mono">${esc(c.amount)} ${esc(c.currency)}</td><td>${esc(c.source)}</td></tr>`,
        )
        .join('')}</tbody></table>
    <p class="none">Noted by the board. Noting a calculation is not approval of the method used, which is a ruling and is made in the ordinary way.</p>`
    : '<p class="none">No calculation has been noted against this holding.</p>';

  const retired = d.asset.retiredAt
    ? `  <section>
    <h2>Retired</h2>
    <p>${day(d.asset.retiredAt)}${d.asset.retiredReason ? ' — ' + esc(d.asset.retiredReason) : ''}</p>
  </section>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(d.asset.name)} — the record of one holding</title>
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
  .standing { border: 2px solid #16211d; padding: 5mm; margin: 6mm 0; }
  .standing .what { font-size: 13pt; }
  .gaps { border: 1.5px solid #9c3325; padding: 5mm; margin: 8mm 0; font-size: 10pt; }
  .gaps h2 { color: #9c3325; border: 0; margin-top: 0; }
  .gaps li { margin-bottom: 2.5mm; }
  footer { margin-top: 10mm; padding-top: 4mm; border-top: 1px solid #d5ded9; font-size: 8.5pt; color: #5b6b65; }
</style>
</head>
<body>
<div class="sheet">
  <header>
    <div class="eyebrow">The record of one holding</div>
    <h1>${esc(d.asset.name)}</h1>
    <p class="mono">${esc(d.asset.kind)} · added ${day(d.asset.addedAt)}</p>
    <p>${identifiers}</p>
  </header>

  <p><strong>This is assembled from the board’s own record.</strong> Everything below was written
  down by a member of this board or supplied by the institution.
  Nothing on this page is a finding of this system: where the board has ruled, the ruling is quoted; where it has not, that is said.</p>

  <div class="standing">
    <div class="eyebrow">Where it stands</div>
    <p class="what">${esc(STATUS_WORDS[d.standing.status] ?? d.standing.status)}</p>
    <p>${esc(d.standing.note)}</p>
${d.standing.governedBy ? '    <p class="ref">Under ' + esc(d.standing.governedBy) + '</p>' : ''}
  </div>

  <section>
    <h2>What the board decided</h2>
    ${decisions}
  </section>

  <section>
    <h2>The terms in force over it</h2>
    ${terms}
  </section>

  <section>
    <h2>What it is made of</h2>
    ${composition}
  </section>

  <section>
    <h2>What has moved under a ruling</h2>
    ${drift}
  </section>

  <section>
    <h2>Calculations noted against it</h2>
    ${calculations}
  </section>

${retired}

  <div class="gaps">
    <h2>What this page cannot say</h2>
    <p>Named rather than left blank. A page showing nothing under a heading reads as an absence of
    problems, and that is not what an empty section means here.</p>
    <ul>
${d.gaps.map((g) => '      <li>' + esc(g) + '</li>').join('\n')}
    </ul>
  </div>

  <footer>
    Assembled ${day(d.generatedAt)} from the record of this board. Nothing in this application
    signs: a decision here is recorded rather than executed.
  </footer>
</div>
</body>
</html>`;
}

/**
 * The Shariah compliance manual.
 *
 * IFSB Guidance Note 6 asks an institution to hold a manual of **every approved
 * product and the steps by which it is implemented**. In most institutions this
 * is a document somebody maintains by hand, which means it is accurate on the
 * day it is written and drifting by the end of the month.
 *
 * **So it is derived, never stored.** There is no manual table and no "generate
 * manual" that writes a second copy of the truth. It is computed from the rules
 * in force each time it is asked for, exactly as `attention.ts` is computed from
 * the matters. A stored manual cannot be kept correct; a derived one cannot go
 * stale, because there is nothing to go stale.
 *
 * Two rules shape the output.
 *
 * **Live and superseded never mix.** A manual that lists a withdrawn ruling
 * beside a current one is worse than no manual: a compliance officer checking a
 * desk against it will find the wrong rule and believe they have checked. What
 * is no longer in force goes in its own section, after everything that is.
 *
 * **Gaps are named, not smoothed over.** An entry with no implementation steps
 * is not a complete manual entry, and saying so is the only way the institution
 * finds out. A document that presented every entry as finished would be
 * comfortable and useless — the whole point of holding a manual is to discover
 * what is missing from it before a regulator does.
 */

import { reviewStatus, type ReviewStatus } from './review.js';
import type { Matter, Rule, RuleParameter, SourceRef } from '../types.js';

export interface ManualEntry {
  ruleId: string;
  boardId: string;
  title: string;
  /** The ruling in the board's own words. */
  statement: string;
  inForceFrom: string | null;

  /** The conditions every transaction must meet. */
  terms: RuleParameter[];
  /** What the institution must actually do, in order. */
  implementationSteps: string[];
  /** What the ruling expressly does not cover. */
  notDecided: string[];
  evidence: SourceRef[];

  /** The matter that produced it, where this system holds one. */
  decidedIn: string | null;
  decidedAt: string | null;
  review: ReviewStatus;

  /**
   * What this entry is missing, in the words of what it costs.
   *
   * Empty is the goal and is uncommon. Each entry here is a real shortfall
   * against GN-6, not a stylistic preference.
   */
  gaps: string[];
}

export interface Manual {
  generatedAt: string;
  boardId: string | null;

  entries: ManualEntry[];
  /** No longer in force. Kept apart so nobody checks a desk against one. */
  superseded: ManualEntry[];

  /** How many live entries are missing something GN-6 asks for. */
  incomplete: number;
  /** How many live entries nothing will ever bring back to the board. */
  unscheduled: number;
}

function gapsIn(entry: Omit<ManualEntry, 'gaps'>): string[] {
  const gaps: string[] = [];

  if (entry.implementationSteps.length === 0) {
    gaps.push(
      'No implementation steps are recorded. GN-6 asks for the steps by which an approved ' +
        'product is implemented, and a compliance officer cannot check a desk against prose.',
    );
  }
  if (entry.terms.length === 0) {
    gaps.push(
      'No operative terms are recorded. A ruling with no conditions cannot be enforced by ' +
        'anything except somebody remembering it.',
    );
  }
  if (entry.notDecided.length === 0) {
    gaps.push(
      'Nothing is recorded as outside this ruling. An approval with no stated limits is the ' +
        'one most easily read later as broader than the board intended.',
    );
  }
  if (entry.evidence.length === 0) {
    gaps.push('No sources are attached. The basis of the ruling is not recoverable from the record.');
  }
  if (entry.review.state === 'unscheduled') {
    gaps.push(
      'No review interval is set. Nothing will bring this back to the board, which is how a ' +
        'ruling comes to describe something that has changed.',
    );
  }
  if (!entry.decidedIn) {
    gaps.push(
      'This system does not hold the decision that produced the rule. It was recorded here ' +
        'rather than taken here, so the reasoning and the signatures are elsewhere.',
    );
  }

  return gaps;
}

function entryFrom(rule: Rule, matter: Matter | undefined, now: string): ManualEntry {
  const base = {
    ruleId: rule.id,
    boardId: rule.boardId,
    title: matter?.title ?? rule.title,
    statement: rule.statement || matter?.proposal || '',
    inForceFrom: rule.inForceFrom,

    terms: rule.parameters,
    implementationSteps: matter?.implementationSteps ?? [],
    notDecided: matter?.notDecided ?? [],
    // Withdrawn sources were not before the board at the decision.
    evidence: (matter?.sources ?? rule.sources).filter((s) => !s.withdrawnAt),

    decidedIn: matter?.id ?? null,
    decidedAt: matter?.settledAt ?? null,
    review: reviewStatus(rule, now),
  };

  return { ...base, gaps: gapsIn(base) };
}

/**
 * Build the manual from the record.
 *
 * A matter that reached `in_force` carries its own rule, and that rule is the
 * operative one. A rule in the standing list with no matter behind it was
 * recorded rather than decided here, which the entry says.
 */
export function buildManual(
  rules: Rule[],
  matters: Matter[],
  now: string,
  boardId?: string,
): Manual {
  const scoped = <T extends { boardId: string }>(xs: T[]) =>
    boardId ? xs.filter((x) => x.boardId === boardId) : xs;

  const inForceMatters = scoped(matters).filter((m) => m.status === 'in_force');
  const byRuleId = new Map(inForceMatters.map((m) => [m.proposedRule.id, m]));

  // Every rule the record knows about: those carried by a matter decided here,
  // and those standing on their own.
  const seen = new Set<string>();
  const collected: { rule: Rule; matter?: Matter }[] = [];

  for (const matter of inForceMatters) {
    const rule = { ...matter.proposedRule, inForceFrom: matter.proposedRule.inForceFrom ?? matter.inForceAt };
    if (seen.has(rule.id)) continue;
    seen.add(rule.id);
    collected.push({ rule, matter });
  }

  for (const rule of scoped(rules)) {
    if (seen.has(rule.id)) continue;
    seen.add(rule.id);
    collected.push({ rule, matter: byRuleId.get(rule.id) });
  }

  const entries: ManualEntry[] = [];
  const superseded: ManualEntry[] = [];

  for (const { rule, matter } of collected) {
    const entry = entryFrom(rule, matter, now);
    // A rule that never took effect belongs in neither list: it is a proposal,
    // not part of the manual.
    if (!rule.inForceFrom) continue;
    (rule.supersededBy ? superseded : entries).push(entry);
  }

  const order = (a: ManualEntry, b: ManualEntry) => a.title.localeCompare(b.title);
  entries.sort(order);
  superseded.sort(order);

  return {
    generatedAt: now,
    boardId: boardId ?? null,
    entries,
    superseded,
    incomplete: entries.filter((e) => e.gaps.length > 0).length,
    unscheduled: entries.filter((e) => e.review.state === 'unscheduled').length,
  };
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

function entryHtml(entry: ManualEntry, superseded: boolean): string {
  const list = (items: string[], empty: string) =>
    items.length
      ? `<ol>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ol>`
      : `<p class="missing">${esc(empty)}</p>`;

  const terms = entry.terms.length
    ? `<table><thead><tr><th>Term</th><th>Value</th><th>What it requires</th></tr></thead><tbody>${entry.terms
        .map(
          (t) =>
            `<tr><td class="mono">${esc(t.key)}</td><td class="mono">${esc(t.value)}${
              t.unit ? ` <span class="unit">${esc(t.unit)}</span>` : ''
            }</td><td>${esc(t.meaning)}</td></tr>`,
        )
        .join('')}</tbody></table>`
    : '<p class="missing">No operative terms are recorded.</p>';

  return `  <article class="entry${superseded ? ' dead' : ''}">
    <h3>${esc(entry.title)}</h3>
    <p class="meta">In force from ${date(entry.inForceFrom)}${
      entry.decidedIn ? ` · decided in ${esc(entry.decidedIn)}` : ' · recorded, not decided here'
    } · next review ${entry.review.dueAt ? date(entry.review.dueAt) : 'not scheduled'}</p>
    ${entry.statement ? `<p class="statement">${esc(entry.statement)}</p>` : ''}

    <h4>Conditions every transaction must meet</h4>
    ${terms}

    <h4>How it is implemented</h4>
    ${list(entry.implementationSteps, 'No implementation steps are recorded for this product.')}

    <h4>Outside this ruling</h4>
    ${list(entry.notDecided, 'Nothing is recorded as outside this ruling.')}
${
  entry.gaps.length
    ? `
    <div class="gaps">
      <strong>This entry is incomplete.</strong>
      <ul>${entry.gaps.map((g) => `<li>${esc(g)}</li>`).join('')}</ul>
    </div>`
    : ''
}
  </article>`;
}

/**
 * A printable reference document.
 *
 * Self-contained for the same reason the fatwa is: a manual a bank shows an
 * auditor has to render years from now, and anything fetched at open time can
 * stop existing.
 */
export function renderManual(manual: Manual, boardName: string): string {
  const summary =
    manual.entries.length === 0
      ? '<p class="missing">No rules are in force. This manual has nothing to describe yet.</p>'
      : `<p>${manual.entries.length} rule${manual.entries.length === 1 ? '' : 's'} in force.${
          manual.incomplete
            ? ` <strong>${manual.incomplete} incomplete.</strong>`
            : ' Every entry carries its terms, its implementation steps, its limits and its sources.'
        }${manual.unscheduled ? ` ${manual.unscheduled} with no review scheduled.` : ''}</p>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Shariah compliance manual — ${esc(boardName)}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #16211d; background: #fff; font: 10.5pt/1.5 Georgia, 'Times New Roman', serif; }
  .sheet { max-width: 178mm; margin: 0 auto; padding: 10mm 0; }
  header { border-bottom: 2px solid #16211d; padding-bottom: 6mm; margin-bottom: 6mm; }
  .eyebrow { font-family: ui-monospace, Menlo, monospace; font-size: 8pt; letter-spacing: .14em; text-transform: uppercase; color: #5b6b65; }
  h1 { font-size: 16pt; font-weight: normal; margin: 2mm 0; }
  h2 { font-size: 9pt; font-family: ui-monospace, Menlo, monospace; letter-spacing: .1em; text-transform: uppercase; color: #5b6b65; font-weight: normal; margin: 10mm 0 4mm; padding-bottom: 1.5mm; border-bottom: 1px solid #d5ded9; }
  h3 { font-size: 12pt; font-weight: normal; margin: 0 0 1.5mm; }
  h4 { font-size: 8.5pt; font-family: ui-monospace, Menlo, monospace; letter-spacing: .08em; text-transform: uppercase; color: #5b6b65; font-weight: normal; margin: 4mm 0 1.5mm; }
  p { margin: 0 0 2.5mm; }
  .entry { border-left: 2px solid #0e5b4b; padding: 0 0 4mm 5mm; margin-bottom: 7mm; break-inside: avoid; }
  .entry.dead { border-left-color: #9fb0a9; color: #5b6b65; }
  .meta { font-family: ui-monospace, Menlo, monospace; font-size: 8.5pt; color: #5b6b65; }
  .statement { font-size: 11pt; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  th, td { text-align: left; padding: 2mm 2.5mm; border-bottom: 1px solid #d5ded9; vertical-align: top; }
  thead th { font-family: ui-monospace, Menlo, monospace; font-size: 7.5pt; letter-spacing: .1em; text-transform: uppercase; color: #5b6b65; font-weight: normal; border-bottom: 1.5px solid #9fb0a9; }
  .mono { font-family: ui-monospace, Menlo, monospace; font-size: 9pt; word-break: break-all; }
  .unit { color: #5b6b65; }
  ol, ul { margin: 0 0 2.5mm; padding-left: 5mm; }
  li { margin-bottom: 1.5mm; }
  .missing { color: #9c3325; font-style: italic; }
  .gaps { border: 1px solid #9c3325; padding: 3mm 4mm; margin-top: 4mm; font-size: 9.5pt; }
  .gaps strong { color: #9c3325; }
  .gaps ul { margin: 2mm 0 0; }
  .superseded-note { color: #5b6b65; font-size: 9.5pt; }
  footer { margin-top: 8mm; padding-top: 3mm; border-top: 1px solid #d5ded9; font-size: 8.5pt; color: #5b6b65; }
</style>
</head>
<body>
<div class="sheet">
  <header>
    <div class="eyebrow">Shariah compliance manual</div>
    <h1>${esc(boardName)}</h1>
    ${summary}
  </header>

  <h2>Rules in force</h2>
${manual.entries.map((e) => entryHtml(e, false)).join('\n') || '  <p class="missing">None.</p>'}

${
  manual.superseded.length
    ? `  <h2>No longer in force</h2>
  <p class="superseded-note">Kept for reference only. Nothing below governs anything today, and no
  activity should be checked against it.</p>
${manual.superseded.map((e) => entryHtml(e, true)).join('\n')}`
    : ''
}

  <footer>
    Derived from the board's record on ${date(manual.generatedAt)}. This document is computed each
    time it is asked for rather than maintained by hand, so it cannot drift from the rules it
    describes. Where an entry is marked incomplete, the shortfall is in the record and not in
    this document.
  </footer>
</div>
</body>
</html>
`;
}

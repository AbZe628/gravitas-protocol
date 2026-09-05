/**
 * Whether a pool may be traded at its market price, or only redeemed at par.
 *
 * A sukuk or a mixed pool holds tangible assets, debts, cash and receivables in
 * some proportion. Trading the paper at a negotiated price is the exchange of
 * whatever sits behind it, and where that is predominantly debt the exchange is
 * governed by the sale of debt (AAOIFI SS-59) rather than by the price two
 * parties agree; where it is cash, by sarf (SS-1). Where the tangible side is
 * large enough, the paper trades on its own terms.
 *
 * **Large enough is a ruling, and it is not made here.**
 *
 * This is the fourth calculation in Majlis and it holds the same line as the
 * other three: it computes and it never concludes. But it holds that line in a
 * harder place, because the answer a board wants out of it is a permission —
 * *may we trade this?* — and the temptation to have the software answer is
 * strongest exactly where the question is most useful.
 *
 * ── how it refuses to answer while still being worth running ──────────────
 *
 * The board states its rule as **bands**: a proportion, and the sentence the
 * board itself wrote about what happens at that proportion. Majlis computes
 * where the composition falls and repeats the board's sentence back. That is
 * not a verdict — it is the board's own words, quoted, with the arithmetic that
 * selected them shown underneath. The same relation zakat has to the base the
 * board chose, or purification to the method.
 *
 * Three consequences follow, and each of them is the point rather than a
 * limitation:
 *
 * **What counts as the tangible side is supplied.** Reading `kind: 'tangible'`
 * and deciding that is the numerator would be the software ruling on a
 * classification question. Some boards count usufruct with tangible assets;
 * some count receivables against; some treat cash as neutral and exclude it
 * from both sides. `countsAsTangible` is stated by the board and this file has
 * no opinion about it.
 *
 * **A proportion in no band is a gap, named in place.** It is not rounded into
 * the nearest band and it is not answered. A board that set a floor and never
 * said what happens below it has a hole in its rule, and being told so is worth
 * more than being handed a consequence nobody wrote.
 *
 * **Two bands over the same proportion is a refusal.** Not a precedence rule,
 * not first-match. Two sentences apply and they may say different things, and
 * choosing between them is the ruling this file will not make.
 *
 * ── the arithmetic ────────────────────────────────────────────────────────
 *
 * There is none worth the name, and that is deliberate. Parts arrive in basis
 * points against a whole of 10 000, so the counted side is an integer sum and
 * the band test is an integer comparison. No division, so nothing to round, so
 * no threshold that can flip on a display decimal — the failure `screening.ts`
 * spends its cross-multiplication avoiding cannot arise here at all.
 *
 * What the parts must do is **sum to the whole**. A composition summing to
 * 9 400 has six hundred basis points of something nobody described, and a
 * proportion computed against it is a proportion of an unknown.
 */

import { BadFigure } from './money.js';
import { PART_KINDS, type CompositionPart } from '../types.js';

export type PartKind = CompositionPart['kind'];

/**
 * One band of the board's rule, in the board's own words.
 *
 * Half-open: `fromBps` inclusive, `toBps` exclusive, so adjacent bands meet
 * without overlapping and a proportion sitting exactly on a boundary belongs to
 * the band above it. Which side a boundary falls on is the sort of thing that
 * decides a case, so it is stated here once rather than left to a reader of
 * `>=` versus `>`.
 */
export interface TradabilityBand {
  /** Inclusive floor, in basis points of the whole. */
  fromBps: number;
  /** Exclusive ceiling. 10 000 is the top of the range and is allowed. */
  toBps: number;
  /**
   * What the board said happens here. Repeated verbatim and never paraphrased:
   * the moment this system rewrites a board's sentence it is writing its own.
   */
  consequence: string;
}

export interface TradabilityInput {
  /** When the composition was measured. A stale one is still a fact about then. */
  asOf: string;
  /** Who supplied it. A composition with no source is a number somebody typed. */
  source: string;
  parts: CompositionPart[];
  /** Which kinds the board counts on the tangible side. Supplied, never inferred. */
  countsAsTangible: PartKind[];
  /** The board's rule. At least one band, and they may not overlap. */
  bands: TradabilityBand[];
  /** Where the board's rule comes from, in the words a scholar would look for. */
  authority: string;
}

export interface TradabilityStep {
  label: string;
  working: string;
  value: string;
}

export interface Tradability {
  asOf: string;
  source: string;
  authority: string;
  countsAsTangible: PartKind[];
  /** What each kind totalled, including the ones that totalled nothing. */
  byKind: { kind: PartKind; bps: number; percent: string }[];
  countedBps: number;
  countedPercent: string;
  /**
   * The board's sentence for the band this proportion falls in, or null.
   *
   * Null is a real answer and the interface shows it as one. It means the
   * board's rule does not reach this composition.
   */
  band: TradabilityBand | null;
  /** Said when `band` is null, naming the hole rather than filling it. */
  unstated: string | null;
  steps: TradabilityStep[];
  /** Standards that govern this composition whatever the proportion says. */
  alsoGovernedBy: string[];
  note: string;
}

const WHOLE = 10_000;

/**
 * What this calculation did not answer.
 *
 * Travels with the figures wherever they go, unchanged, exactly as the other
 * three calculations' notes do.
 */
export const NOT_A_PERMISSION =
  'This states a proportion and repeats the sentence this board wrote about it. ' +
  'It does not decide whether the instrument may be traded, at what price, or ' +
  'with whom — those are rulings, and the sentence above is the board’s own, ' +
  'quoted back, not a finding of this system. Where the composition falls ' +
  'outside every band the board described, nothing is concluded and the gap is ' +
  'named instead.';

/**
 * A composition that is entirely one thing is governed by more than a ratio.
 *
 * Named rather than ruled on. A pool holding nothing but debt is an exchange of
 * debt whatever proportion is computed for it, and a board reading a tangible
 * ratio of 0.00% should be pointed at the standard that actually governs
 * instead of being left to infer it from a zero.
 */
function standardsFor(byKind: Map<PartKind, number>): string[] {
  const only = (kinds: PartKind[]) =>
    kinds.reduce((sum, k) => sum + (byKind.get(k) ?? 0), 0) === WHOLE;

  const named: string[] = [];
  if (only(['debt', 'receivable'])) {
    named.push(
      'This composition is entirely debt and receivables. Its exchange is ' +
        'governed by AAOIFI SS-59 on the sale of debt, whatever proportion is ' +
        'computed above.',
    );
  }
  if (only(['cash'])) {
    named.push(
      'This composition is entirely cash. Its exchange is governed by AAOIFI ' +
        'SS-1 on sarf — like for like, hand to hand — and a proportion does not ' +
        'reach the question.',
    );
  }
  return named;
}

/** Bands that cover the same basis point. Refused rather than ordered. */
function overlapping(bands: TradabilityBand[]): [TradabilityBand, TradabilityBand] | null {
  for (let i = 0; i < bands.length; i += 1) {
    for (let j = i + 1; j < bands.length; j += 1) {
      const a = bands[i];
      const b = bands[j];
      if (a.fromBps < b.toBps && b.fromBps < a.toBps) return [a, b];
    }
  }
  return null;
}

export function assessTradability(input: TradabilityInput): Tradability {
  if (!input.source.trim()) {
    throw new BadFigure(
      'source',
      'A composition with no source is a number somebody typed. Name who ' +
        'supplied it before a board rules on it.',
    );
  }

  if (!Array.isArray(input.parts) || input.parts.length === 0) {
    throw new BadFigure('parts', 'A composition with no parts describes nothing.');
  }

  let total = 0;
  for (const part of input.parts) {
    if (!Number.isInteger(part.bps) || part.bps < 0) {
      throw new BadFigure(
        'parts',
        `“${part.label}” is ${String(part.bps)} basis points. A part is a whole ` +
          'number of basis points and cannot be negative.',
      );
    }
    if (!PART_KINDS.includes(part.kind)) {
      throw new BadFigure('parts', `“${part.label}” has no kind this register knows.`);
    }
    total += part.bps;
  }

  if (total !== WHOLE) {
    const short = WHOLE - total;
    throw new BadFigure(
      'parts',
      `The parts sum to ${total} basis points, not 10 000. There ${
        short > 0 ? `are ${short} basis points` : `is an excess of ${-short} basis points`
      } unaccounted for, and a proportion computed against this would be a ` +
        'proportion of an unknown.',
    );
  }

  if (input.countsAsTangible.length === 0) {
    throw new BadFigure(
      'countsAsTangible',
      'The board has not said which parts count on the tangible side. Some ' +
        'boards count usufruct there and some do not; reading it off the ' +
        'labels would be this system settling a classification question.',
    );
  }
  for (const kind of input.countsAsTangible) {
    if (!PART_KINDS.includes(kind)) {
      throw new BadFigure('countsAsTangible', `“${kind}” is not a kind this register knows.`);
    }
  }

  if (!Array.isArray(input.bands) || input.bands.length === 0) {
    throw new BadFigure(
      'bands',
      'The board has set no bands. Without them there is a proportion and ' +
        'nothing that says what this board makes of it.',
    );
  }
  for (const band of input.bands) {
    if (
      !Number.isInteger(band.fromBps) ||
      !Number.isInteger(band.toBps) ||
      band.fromBps < 0 ||
      band.toBps > WHOLE ||
      band.fromBps >= band.toBps
    ) {
      throw new BadFigure(
        'bands',
        `A band from ${String(band.fromBps)} to ${String(band.toBps)} basis ` +
          'points is not a range within 0 to 10 000.',
      );
    }
    if (!band.consequence.trim()) {
      throw new BadFigure(
        'bands',
        'A band with no consequence is a threshold with nothing attached. ' +
          'What the board said happens is the part worth recording.',
      );
    }
  }

  const clash = overlapping(input.bands);
  if (clash) {
    throw new BadFigure(
      'bands',
      `Two bands cover the same proportion: ${clash[0].fromBps}–${clash[0].toBps} ` +
        `and ${clash[1].fromBps}–${clash[1].toBps} basis points. Both sentences ` +
        'would apply, and choosing between them is a ruling rather than a ' +
        'precedence rule this system may pick.',
    );
  }

  // ── the sums ────────────────────────────────────────────────────────────

  const byKindMap = new Map<PartKind, number>();
  for (const kind of PART_KINDS) byKindMap.set(kind, 0);
  for (const part of input.parts) {
    byKindMap.set(part.kind, (byKindMap.get(part.kind) ?? 0) + part.bps);
  }

  const pct = (bps: number) => (bps / 100).toFixed(2);
  const counted = input.countsAsTangible.reduce((sum, k) => sum + (byKindMap.get(k) ?? 0), 0);

  const byKind = PART_KINDS.map((kind) => ({
    kind,
    bps: byKindMap.get(kind) ?? 0,
    percent: pct(byKindMap.get(kind) ?? 0),
  }));

  const steps: TradabilityStep[] = [];

  // Every kind, including the empty ones. A kind absent from the working reads
  // as a kind nobody checked.
  for (const kind of PART_KINDS) {
    const members = input.parts.filter((p) => p.kind === kind);
    const sum = byKindMap.get(kind) ?? 0;
    steps.push({
      label: `Total ${kind}`,
      working:
        members.length === 0
          ? 'no parts of this kind'
          : members.map((p) => `${p.label} ${p.bps}`).join(' + ') + ` = ${sum}`,
      value: `${pct(sum)}%`,
    });
  }

  steps.push({
    label: 'Counted on the tangible side',
    working:
      input.countsAsTangible.map((k) => `${k} ${byKindMap.get(k) ?? 0}`).join(' + ') +
      ` = ${counted} of 10000 basis points`,
    value: `${pct(counted)}%`,
  });

  /*
   * The band test, written out as the comparison it is.
   *
   * Both sides are already basis points of the same whole, so this is integer
   * against integer. Nothing is divided and nothing is rounded, which is why
   * there is no cross-multiplication here and why its absence is not an
   * omission.
   */
  const sorted = [...input.bands].sort((a, b) => a.fromBps - b.fromBps);
  const band = sorted.find((b) => counted >= b.fromBps && counted < b.toBps) ?? null;

  for (const b of sorted) {
    const hit = counted >= b.fromBps && counted < b.toBps;
    steps.push({
      label: `Band ${pct(b.fromBps)}% to ${pct(b.toBps)}%`,
      working: `${counted} ${hit ? 'falls within' : 'is outside'} ${b.fromBps} to ${b.toBps}`,
      value: hit ? 'this band' : '—',
    });
  }

  const unstated =
    band === null
      ? `The counted proportion is ${pct(counted)}%. This board’s rule describes ` +
        sorted.map((b) => `${pct(b.fromBps)}%–${pct(b.toBps)}%`).join(', ') +
        ', and says nothing about where this composition falls. That is a hole ' +
        'in the rule rather than an answer, and nothing has been concluded from it.'
      : null;

  return {
    asOf: input.asOf,
    source: input.source,
    authority: input.authority,
    countsAsTangible: [...input.countsAsTangible],
    byKind,
    countedBps: counted,
    countedPercent: pct(counted),
    band,
    unstated,
    steps,
    alsoGovernedBy: standardsFor(byKindMap),
    note: NOT_A_PERMISSION,
  };
}

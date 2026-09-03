/**
 * When the ground moves under a ruling.
 *
 * A board rules on a pool that is 51% tangible. Nobody does anything. The pool
 * rebalances and is 47% tangible in July, and **the ruling now describes a
 * holding that no longer exists.** Today nobody finds out until the audit, and
 * this is the only automation in the system that goes looking rather than
 * waiting to be opened.
 *
 * ── three limits, and they are the same three as everywhere ───────────────
 *
 * **It compares. It never re-rules.** The status of the asset stays what the
 * board made it. A ruling that expired because a number moved while nobody was
 * looking would mean compliance lapsing by arithmetic, which is worse than the
 * problem it solves.
 *
 * **It states the sum, never the conclusion.** *"Tangible is 47.00%, against
 * the 51.00% this board set in March"* is a fact. Whether that makes the
 * holding impermissible now is a ruling, and no proportion answers it.
 *
 * **It does not raise the matter itself.** It surfaces the question and a
 * member raises it in one click, exactly as they do from the register. An
 * automation that wrote matters into the record on its own would be one
 * mis-specified feed away from burying a board under questions nobody asked —
 * and the board's attention is the scarcest thing this system handles.
 *
 * ── and what it will not guess ────────────────────────────────────────────
 *
 * Which part of a composition a term is measured against is stated by the
 * board, on the term. Reading `minTangibleRatioBps` and inferring that it
 * watches the tangible proportion would be the software concluding from a name.
 * A term with nothing stated is reported as **unwatched** — a real finding,
 * because it means the board set a threshold that nothing is checking.
 */

import { percent } from './money.js';
import { readComposition } from './register.js';
import type { Asset, CompositionPart, Matter, RuleParameter } from '../types.js';

export type DriftDirection = 'into_breach' | 'back_within';

export interface Drift {
  assetId: string;
  assetName: string;
  /** The decision whose term is crossed, so a reader can go and read it. */
  matterId: string;
  term: { key: string; value: string; meaning: string; bound: 'minimum' | 'maximum' };
  /** What the composition now reads for the part the term watches. */
  observed: { kind: CompositionPart['kind']; bps: number; percent: string };
  direction: DriftDirection;
  /** When the composition was measured, and by whom. */
  asOf: string;
  source: string;
  /** Stated as something for the board to look at. Never as a conclusion. */
  questionForBoard: string;
}

export interface Unwatched {
  assetId: string;
  matterId: string;
  key: string;
  reason: string;
}

export interface DriftReport {
  asOf: string;
  drifting: Drift[];
  /** Terms that could be checked and are not, which is its own finding. */
  unwatched: Unwatched[];
  /** Holdings with a term to check and no composition to check it against. */
  unmeasured: { assetId: string; assetName: string; reason: string }[];
}

/** The matters that produced a rule still in force over this asset. */
function rulingsOver(asset: Asset, matters: Matter[]): Matter[] {
  return matters.filter(
    (m) =>
      m.status === 'in_force' &&
      Array.isArray(m.assetIds) &&
      m.assetIds.includes(asset.id),
  );
}

function bpsOf(value: string): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Where a holding stands against the terms the board set on it.
 *
 * Every comparison is integer basis points on both sides — the term as the
 * board wrote it and the composition as it was supplied — so nothing here turns
 * on a rounded display value.
 */
export function driftFor(asset: Asset, matters: Matter[]): {
  drifting: Drift[];
  unwatched: Unwatched[];
  unmeasured: DriftReport['unmeasured'];
} {
  const rulings = rulingsOver(asset, matters);
  const drifting: Drift[] = [];
  const unwatched: Unwatched[] = [];
  const unmeasured: DriftReport['unmeasured'] = [];

  const watched = rulings.flatMap((m) =>
    m.proposedRule.parameters.map((p) => ({ matter: m, parameter: p })),
  );

  if (watched.length === 0) return { drifting, unwatched, unmeasured };

  const hasWatchers = watched.some(({ parameter }) => parameter.watches);

  if (!asset.composition) {
    if (hasWatchers) {
      unmeasured.push({
        assetId: asset.id,
        assetName: asset.name,
        reason:
          'The board set a term measured against this holding’s composition, and nobody has ' +
          'supplied one. Nothing is being checked, and the absence is the finding.',
      });
    }
    // Still report the unwatched terms below: a term nothing watches is a
    // finding whether or not a composition exists.
  }

  const reading = asset.composition ? readComposition(asset.composition) : null;

  for (const { matter, parameter } of watched) {
    const watches = parameter.watches;

    if (!watches) {
      unwatched.push({
        assetId: asset.id,
        matterId: matter.id,
        key: parameter.key,
        reason:
          `"${parameter.key}" does not say what part of a composition it is measured against, ` +
          'so nothing checks it. The board set a threshold and no drift against it can be seen.',
      });
      continue;
    }

    if (!reading) continue;

    const threshold = bpsOf(parameter.value);
    if (threshold === null) {
      unwatched.push({
        assetId: asset.id,
        matterId: matter.id,
        key: parameter.key,
        reason:
          `"${parameter.key}" is set to "${parameter.value}", which is not a number of basis ` +
          'points, so it cannot be compared with a composition.',
      });
      continue;
    }

    const part = reading.byKind.find((k) => k.kind === watches.kind);
    const observedBps = part ? part.bps : 0;

    // Integer comparison on both sides. A minimum is breached below it; a
    // maximum is breached above it.
    const within =
      watches.bound === 'minimum' ? observedBps >= threshold : observedBps <= threshold;

    // Only a crossing is worth a scholar's attention. A holding comfortably
    // inside its terms is not news, and reporting it would bury the ones that
    // are not.
    if (within) continue;

    drifting.push({
      assetId: asset.id,
      assetName: asset.name,
      matterId: matter.id,
      term: {
        key: parameter.key,
        value: parameter.value,
        meaning: parameter.meaning,
        bound: watches.bound,
      },
      observed: { kind: watches.kind, bps: observedBps, percent: percent(observedBps) },
      direction: 'into_breach',
      asOf: asset.composition!.asOf,
      source: asset.composition!.source,
      questionForBoard:
        `${asset.name}: ${watches.kind} is ${percent(observedBps)}%, against the ` +
        `${percent(threshold)}% ${watches.bound} this board set in ${matter.id}. ` +
        'The composition was supplied by ' +
        `${asset.composition!.source} as at ${asset.composition!.asOf.slice(0, 10)}. ` +
        'Does the standing ruling still hold?',
    });
  }

  return { drifting, unwatched, unmeasured };
}

/**
 * Everything that has moved under a ruling, across the register.
 *
 * The list a chair reads. Ordered with the crossings first, because a threshold
 * that is breached now outranks a threshold nothing is checking — though both
 * are on the page, since the second is how the first goes unnoticed.
 */
export function driftReport(assets: Asset[], matters: Matter[], now: string): DriftReport {
  const drifting: Drift[] = [];
  const unwatched: Unwatched[] = [];
  const unmeasured: DriftReport['unmeasured'] = [];

  for (const asset of assets) {
    if (asset.retiredAt) continue;
    const found = driftFor(asset, matters);
    drifting.push(...found.drifting);
    unwatched.push(...found.unwatched);
    unmeasured.push(...found.unmeasured);
  }

  drifting.sort((a, b) => a.assetName.localeCompare(b.assetName));

  return { asOf: now, drifting, unwatched, unmeasured };
}

/** Named so a term can be written with a watcher without guessing the shape. */
export function watching(
  kind: CompositionPart['kind'],
  bound: 'minimum' | 'maximum',
): RuleParameter['watches'] {
  return { kind, bound };
}

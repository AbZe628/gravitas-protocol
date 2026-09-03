/**
 * What the board rules on.
 *
 * Everything else in this system models the process — clocks, quorums, the nine
 * steps of a breach, the documents. This models the subject, and it is the piece
 * that was missing.
 *
 * A scholar does not think in matters. They think in assets: *is this token
 * permitted, what did we say about this pool, we have never looked at that one*.
 * Until now a token existed only as free text typed inside a parameter, which
 * meant the one question a bank ever asks — what is the status of this thing —
 * could not be answered from the record at all.
 *
 * ── two rules ─────────────────────────────────────────────────────────────
 *
 * **Status is derived, never stored.** From the rules in force and the matters
 * open against an asset, computed on every read, exactly as attention and the
 * manual and the calendar are. A stored status is a second copy of the truth
 * and a second copy drifts: a rule is withdrawn and the badge stays green,
 * which is worse than no badge at all.
 *
 * **`never_examined` is the state that makes the register worth having.** It is
 * the only place a board can see the shape of what it has not done. Every other
 * screen in this application shows work somebody already started.
 */

import type {
  Asset,
  AssetStatus,
  Composition,
  Matter,
  Rule,
} from '../types.js';

/** Statuses in which a matter is still with the board. */
const OPEN: readonly Matter['status'][] = ['draft', 'deliberation', 'voting', 'timelock'];

export interface AssetStanding {
  asset: Asset;
  status: AssetStatus;
  /** The rule in force that decides the status, where one does. */
  governedBy: string | null;
  /** Matters open against it now. */
  openMatters: string[];
  /** Everything the board has ever settled about it, most recent first. */
  history: string[];
  /** One sentence an interface can show without working anything out. */
  note: string;
}

function names(matter: Matter, assetId: string): boolean {
  return Array.isArray(matter.assetIds) && matter.assetIds.includes(assetId);
}

/**
 * Where one asset stands.
 *
 * The order of the checks is the order of the answers a board would give. Being
 * retired outranks everything, because a withdrawn holding is not permitted or
 * restricted, it is gone. An open matter outranks a standing rule, because
 * "under consideration" is what a reader needs to know before they act on the
 * ruling underneath it.
 */
export function standingOf(asset: Asset, matters: Matter[], now: string): AssetStanding {
  const mine = matters.filter((m) => names(m, asset.id));

  const open = mine.filter((m) => OPEN.includes(m.status)).map((m) => m.id);
  const settled = mine
    .filter((m) => !OPEN.includes(m.status))
    .sort((a, b) => (b.settledAt ?? b.openedAt).localeCompare(a.settledAt ?? a.openedAt));

  const base = {
    asset,
    governedBy: null as string | null,
    openMatters: open,
    history: settled.map((m) => m.id),
  };

  if (asset.retiredAt) {
    return {
      ...base,
      status: 'retired',
      note: asset.retiredReason
        ? `Withdrawn from the universe: ${asset.retiredReason}`
        : 'Withdrawn from the universe. Kept for the record.',
    };
  }

  // The most recent settled matter that reached a conclusion about it.
  const inForce = settled.find((m) => m.status === 'in_force');
  const lapsed = settled.find((m) => m.status === 'lapsed');

  if (open.length > 0) {
    return {
      ...base,
      status: 'under_consideration',
      governedBy: inForce?.id ?? null,
      note: inForce
        ? `Before the board. A ruling from ${inForce.id} stands until it decides otherwise.`
        : 'Before the board, with nothing previously decided about it.',
    };
  }

  if (inForce) {
    return {
      ...base,
      status: inForce.direction === 'permit' ? 'permitted' : 'restricted',
      governedBy: inForce.id,
      note:
        inForce.direction === 'permit'
          ? 'Permitted on the terms the board set.'
          : 'Restricted. Transactions in it do not proceed.',
    };
  }

  if (lapsed) {
    return {
      ...base,
      status: 'lapsed',
      note:
        'A restriction on this lapsed without ratification. It is neither restricted nor ' +
        'approved, and it has to be proposed again to be either.',
    };
  }

  return {
    ...base,
    status: 'never_examined',
    note:
      settled.length > 0
        ? 'Raised before and never settled either way.'
        : 'In the register and never put to the board.',
  };
}

export interface Register {
  asOf: string;
  institutionId: string | null;
  /** Every asset with its standing, never-examined first. */
  assets: AssetStanding[];
  counts: Record<AssetStatus, number>;
  /**
   * How much of the universe the board has never looked at.
   *
   * The figure a chair asks for and no board can currently produce.
   */
  neverExamined: number;
  total: number;
}

const ORDER: Record<AssetStatus, number> = {
  never_examined: 0,
  under_consideration: 1,
  restricted: 2,
  lapsed: 3,
  permitted: 4,
  retired: 5,
};

/**
 * The register, with the unexamined first.
 *
 * Ordered by what needs the board rather than alphabetically, for the same
 * reason attention is: a list a scholar has to scan for the work is a list that
 * makes them do the sorting.
 */
export function buildRegister(
  assets: Asset[],
  matters: Matter[],
  now: string,
  institutionId?: string,
): Register {
  const scoped = institutionId
    ? assets.filter((a) => a.institutionId === institutionId)
    : assets;

  const standings = scoped.map((a) => standingOf(a, matters, now));

  standings.sort((a, b) => {
    const byStatus = ORDER[a.status] - ORDER[b.status];
    if (byStatus !== 0) return byStatus;
    return a.asset.name.localeCompare(b.asset.name);
  });

  const counts = Object.fromEntries(
    (Object.keys(ORDER) as AssetStatus[]).map((s) => [s, standings.filter((x) => x.status === s).length]),
  ) as Record<AssetStatus, number>;

  return {
    asOf: now,
    institutionId: institutionId ?? null,
    assets: standings,
    counts,
    neverExamined: counts.never_examined,
    total: standings.length,
  };
}

// ── composition ───────────────────────────────────────────────────────────

export interface CompositionReading {
  asOf: string;
  source: string;
  parts: { label: string; kind: string; bps: number; percent: string }[];
  /** Totals by kind, which is what a threshold is usually set against. */
  byKind: { kind: string; bps: number; percent: string }[];
  /** True where the parts do not sum to 10 000. */
  incomplete: boolean;
  total: number;
  note: string;
}

const pct = (bps: number) => (bps / 100).toFixed(2);

/**
 * A composition, read out with its arithmetic.
 *
 * Reports rather than concludes, like everything else that touches a number
 * here. It says the pool is 47.00% tangible; whether that makes it permissible
 * is a ruling and no proportion answers it.
 *
 * Parts that do not sum to 10 000 basis points are reported as incomplete
 * rather than scaled to fit. Scaling would invent a figure, and a board ruling
 * on an invented proportion is the worst outcome available here.
 */
export function readComposition(composition: Composition): CompositionReading {
  const total = composition.parts.reduce((sum, p) => sum + p.bps, 0);

  const byKind = new Map<string, number>();
  for (const p of composition.parts) {
    byKind.set(p.kind, (byKind.get(p.kind) ?? 0) + p.bps);
  }

  const incomplete = total !== 10_000;

  return {
    asOf: composition.asOf,
    source: composition.source,
    parts: composition.parts.map((p) => ({
      label: p.label,
      kind: p.kind,
      bps: p.bps,
      percent: pct(p.bps),
    })),
    byKind: [...byKind.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([kind, bps]) => ({ kind, bps, percent: pct(bps) })),
    incomplete,
    total,
    note: incomplete
      ? `The parts supplied sum to ${pct(total)}%, not 100%. They are shown as given rather than ` +
        'scaled to fit, because a proportion nobody supplied is not a proportion the board can rule on.'
      : `Supplied by ${composition.source}, as at ${composition.asOf.slice(0, 10)}.`,
  };
}

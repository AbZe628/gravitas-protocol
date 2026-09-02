import type { Matter } from '../types.js';

/**
 * What the board has already decided that bears on this.
 *
 * The value of a governance record is accumulation, and accumulation nobody can
 * reach is a pile. A scholar opening a matter should be able to see, without
 * searching for it, that the board argued from the same standard two years ago
 * and what it concluded.
 *
 * **Every relation here is a fact in the record, never a guess.** A system that
 * offers a scholar "related matters" on the strength of shared vocabulary
 * invites them to treat a coincidence as a precedent, and a precedent is a
 * serious claim. Each relation below names the specific thing the two matters
 * share, and the interface shows it.
 */

export type RelationKind =
  /** Both cite the same reference. The board argued from the same thing. */
  | 'same_source'
  /** One declares the other, or its rule, as something it interacts with. */
  | 'declared'
  /** Both set the same operative term, so one bears on the other's effect. */
  | 'same_parameter';

export interface Relation {
  kind: RelationKind;
  /** The exact thing they share, shown to the reader rather than summarised. */
  shared: string;
}

export interface Related {
  matterId: string;
  title: string;
  status: Matter['status'];
  direction: Matter['direction'];
  openedAt: string;
  inForceAt: string | null;
  relations: Relation[];
}

/** A decided matter carries more weight as precedent than an open one. */
const SETTLED: ReadonlySet<Matter['status']> = new Set(['in_force', 'rejected', 'lapsed']);

function standingRefs(m: Matter): string[] {
  return m.sources
    .filter((s) => !s.withdrawnAt)
    .map((s) => s.ref.trim().toLowerCase())
    .filter(Boolean);
}

function parameterKeys(m: Matter): string[] {
  return m.proposedRule.parameters.map((p) => p.key.trim().toLowerCase()).filter(Boolean);
}

/**
 * Declared either way round: a matter naming a rule, and a matter whose rule is
 * named. A relationship one side wrote down is a relationship.
 */
function declaredBetween(a: Matter, b: Matter): string[] {
  const shared: string[] = [];
  const aDeclares = new Set(a.interactsWith.map((r) => r.trim().toLowerCase()));
  const bDeclares = new Set(b.interactsWith.map((r) => r.trim().toLowerCase()));

  for (const candidate of [b.proposedRule.id, b.id]) {
    if (candidate && aDeclares.has(candidate.toLowerCase())) shared.push(candidate);
  }
  for (const candidate of [a.proposedRule.id, a.id]) {
    if (candidate && bDeclares.has(candidate.toLowerCase())) shared.push(candidate);
  }

  for (const r of aDeclares) if (bDeclares.has(r)) shared.push(r);

  return [...new Set(shared)];
}

export function relatedTo(matter: Matter, all: Matter[], limit = 8): Related[] {
  const myRefs = new Set(standingRefs(matter));
  const myKeys = new Set(parameterKeys(matter));

  const found: Array<Related & { weight: number }> = [];

  for (const other of all) {
    if (other.id === matter.id) continue;
    if (other.boardId !== matter.boardId) continue;
    if (other.status === 'withdrawn') continue;

    const relations: Relation[] = [];

    for (const ref of standingRefs(other)) {
      if (myRefs.has(ref)) {
        const label = other.sources.find((s) => s.ref.trim().toLowerCase() === ref);
        relations.push({ kind: 'same_source', shared: label?.label ?? ref });
      }
    }

    for (const shared of declaredBetween(matter, other)) {
      relations.push({ kind: 'declared', shared });
    }

    for (const key of parameterKeys(other)) {
      if (myKeys.has(key)) relations.push({ kind: 'same_parameter', shared: key });
    }

    if (!relations.length) continue;

    /*
     * A declared relationship is a statement by the board. A shared source is
     * evidence they reasoned from the same place. A shared term is the weakest
     * of the three and is still a fact rather than a resemblance.
     */
    const weight =
      relations.reduce(
        (n, r) => n + (r.kind === 'declared' ? 30 : r.kind === 'same_source' ? 20 : 10),
        0,
      ) + (SETTLED.has(other.status) ? 15 : 0);

    found.push({
      matterId: other.id,
      title: other.title,
      status: other.status,
      direction: other.direction,
      openedAt: other.openedAt,
      inForceAt: other.inForceAt,
      // The same thing shared twice is one relation, not two.
      relations: dedupe(relations),
      weight,
    });
  }

  return found
    .sort((a, b) => b.weight - a.weight || b.openedAt.localeCompare(a.openedAt))
    .slice(0, limit)
    .map(({ weight: _weight, ...rest }) => rest);
}

function dedupe(relations: Relation[]): Relation[] {
  const seen = new Set<string>();
  return relations.filter((r) => {
    const key = `${r.kind}:${r.shared.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

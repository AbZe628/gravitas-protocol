import type { Matter, MatterStatus, ChangeDirection, MatterOrigin } from '../types.js';

/**
 * Finding what the board decided before.
 *
 * A board that has decided two hundred matters and cannot find the one it
 * decided last year has lost the thing this application exists to accumulate.
 * Precedent is the product, and until now retrieval was a split into open and
 * settled.
 *
 * **The ranking is explainable on purpose.** A relevance score nobody can
 * account for is the wrong instrument for a record whose whole claim is that it
 * can be checked. Every result says which field matched and shows the text, so
 * a scholar can see why it came up and disagree with it.
 *
 * This scans the record in memory. That is correct at the scale of one board
 * and will not be at the scale of many; the shape of the interface does not
 * change when it is replaced by an index, which is the point of putting it
 * behind a function.
 */

/** Where a match was found. Ordered by how much weight it carries. */
export type MatchField =
  | 'title'
  | 'proposal'
  | 'rule'
  | 'parameter'
  | 'source'
  | 'reasoning'
  | 'deliberation'
  | 'mechanism'
  | 'notDecided';

const WEIGHT: Record<MatchField, number> = {
  // The board named it this. If the words are in the title they are the subject.
  title: 100,
  // What was actually proposed, and the rule that came of it.
  proposal: 60,
  rule: 60,
  // The operative terms carry more than the discussion around them.
  parameter: 45,
  // What it was argued from.
  source: 40,
  // Why members voted as they did — the most valuable prose in the record.
  reasoning: 30,
  deliberation: 20,
  mechanism: 15,
  notDecided: 15,
};

export interface Match {
  field: MatchField;
  /** Enough text around the hit to judge it without opening the matter. */
  snippet: string;
  /** Who wrote it, where the field has an author. */
  by?: string;
}

export interface SearchHit {
  matterId: string;
  boardId: string;
  title: string;
  status: MatterStatus;
  direction: ChangeDirection;
  origin: MatterOrigin;
  openedAt: string;
  inForceAt: string | null;
  score: number;
  matches: Match[];
}

export interface SearchFilters {
  boardId?: string;
  status?: MatterStatus[];
  direction?: ChangeDirection;
  origin?: MatterOrigin;
  /** Matters this member said or decided something in. */
  scholarId?: string;
  /** ISO dates, inclusive. */
  from?: string;
  to?: string;
}

/** Words, lowercased, without the ones that match everything. */
const NOISE = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'is', 'it', 'that', 'this',
  'for', 'on', 'be', 'are', 'as', 'at', 'by', 'with', 'not', 'which', 'would',
]);

export function terms(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^\p{L}\p{N}_/-]+/u)
    .map((w) => w.trim())
    .filter((w) => w.length > 1 && !NOISE.has(w));
}

/** A window around the first hit, so the reader sees why it matched. */
function snippet(text: string, needles: string[], width = 170): string {
  const lower = text.toLowerCase();
  let at = -1;
  for (const n of needles) {
    const i = lower.indexOf(n);
    if (i !== -1 && (at === -1 || i < at)) at = i;
  }
  if (at === -1) return text.slice(0, width).trim();

  const start = Math.max(0, at - Math.floor(width / 3));
  const end = Math.min(text.length, start + width);
  return (start > 0 ? '…' : '') + text.slice(start, end).trim() + (end < text.length ? '…' : '');
}

/** Every term present. Requiring all of them is what makes a search narrowable. */
function hits(text: string | undefined, needles: string[]): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return needles.every((n) => lower.includes(n));
}

function inRange(matter: Matter, f: SearchFilters): boolean {
  if (f.from && matter.openedAt < f.from) return false;
  if (f.to && matter.openedAt > f.to + '￿') return false;
  return true;
}

function touched(matter: Matter, scholarId: string): boolean {
  return (
    matter.deliberation.some((d) => d.scholarId === scholarId) ||
    matter.reasoning.some((r) => r.scholarId === scholarId) ||
    matter.objections.some((o) => o.scholarId === scholarId) ||
    matter.sources.some((s) => s.addedBy === scholarId)
  );
}

function passesFilters(matter: Matter, f: SearchFilters): boolean {
  if (f.boardId && matter.boardId !== f.boardId) return false;
  if (f.status?.length && !f.status.includes(matter.status)) return false;
  if (f.direction && matter.direction !== f.direction) return false;
  if (f.origin && matter.origin !== f.origin) return false;
  if (f.scholarId && !touched(matter, f.scholarId)) return false;
  if (!inRange(matter, f)) return false;
  return true;
}

/** Everywhere the words could be, with what the reader needs to judge each. */
function matchesIn(matter: Matter, needles: string[]): Match[] {
  const found: Match[] = [];
  const add = (field: MatchField, text: string, by?: string) => {
    if (hits(text, needles)) found.push({ field, snippet: snippet(text, needles), by });
  };

  add('title', matter.title);
  add('proposal', matter.proposal);
  add('mechanism', matter.mechanism);
  for (const n of matter.notDecided) add('notDecided', n);

  add('rule', matter.proposedRule.statement);

  for (const p of matter.proposedRule.parameters) {
    const text = `${p.key} = ${p.value}${p.unit ? ' ' + p.unit : ''} — ${p.meaning}`;
    add('parameter', text);
  }

  for (const s of matter.sources) {
    if (s.withdrawnAt) continue;
    add('source', `${s.label} — ${s.ref}${s.note ? ' — ' + s.note : ''}`, s.addedBy ?? undefined);
  }

  for (const r of matter.reasoning) {
    add('reasoning', `${r.position}: ${r.reason}`, r.scholarId);
  }

  for (const d of matter.deliberation) {
    add('deliberation', d.body, d.scholarId);
  }

  return found;
}

/**
 * A matter scores by its strongest match, plus a little for each additional
 * kind of match. Two mentions of a word in one thread should not outrank a
 * title; a matter that matches the title *and* the reasoning should outrank one
 * that matches only the title.
 */
function score(matches: Match[]): number {
  if (!matches.length) return 0;
  const kinds = new Set(matches.map((m) => m.field));
  const best = Math.max(...matches.map((m) => WEIGHT[m.field]));
  return best + (kinds.size - 1) * 5;
}

export function search(matters: Matter[], query: string, filters: SearchFilters = {}): SearchHit[] {
  const needles = terms(query);
  const filtered = matters.filter((m) => passesFilters(m, filters));

  // A query of only filters is a valid query: "everything this member voted on".
  if (!needles.length) {
    return filtered
      .map((m) => ({ ...summarise(m), score: 1, matches: [] as Match[] }))
      .sort((a, b) => b.openedAt.localeCompare(a.openedAt));
  }

  return filtered
    .map((m) => {
      const matches = matchesIn(m, needles);
      return { ...summarise(m), score: score(matches), matches };
    })
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score || b.openedAt.localeCompare(a.openedAt))
    .map((h) => ({
      ...h,
      // Enough to judge the result, not enough to reproduce the matter.
      matches: h.matches
        .sort((a, b) => WEIGHT[b.field] - WEIGHT[a.field])
        .slice(0, 4),
    }));
}

function summarise(m: Matter) {
  return {
    matterId: m.id,
    boardId: m.boardId,
    title: m.title,
    status: m.status,
    direction: m.direction,
    origin: m.origin,
    openedAt: m.openedAt,
    inForceAt: m.inForceAt,
  };
}

import type { QueueRow } from './queue.js';
import type { Role } from '../auth/members.js';

/**
 * Whether a waiting thing is this member's to do.
 *
 * ── it was decided in the browser ─────────────────────────────────────────
 *
 * *What needs you* is the first screen a member sees and the claim the whole
 * application is arranged around, and the rule behind it lived in one
 * component: a member opened the list, and the browser worked out which of the
 * thirteen rows were theirs. Nothing on the server could answer the same
 * question, so anything else that needed it — a summary sent to somebody who
 * has not opened the application in a week, a count, a reminder — had to work
 * it out a second time and would have disagreed the first time either changed.
 *
 * That is the fault this file closes. One reading, on the server, and the
 * screen reads the answer rather than making it.
 *
 * ── the rule, and why each line of it ─────────────────────────────────────
 *
 * A step with somebody's name on it is theirs and nobody else's. A step on
 * this side of the table, of something you are carrying, is yours. A step that
 * is the board's is every member's, and one reserved to the signatories is
 * every signatory's. Everything else — the institution, its liaison, a clock —
 * is somebody else's, which is worth knowing and is not yours to do.
 *
 * And a step you have already said yours on is not yours, however long it
 * stays open for the others: a cast vote sat under *yours* as a vote to cast,
 * fifty-five days old, for the member who had cast it.
 */
export function isYours(
  row: Pick<QueueRow, 'who' | 'holder' | 'whose' | 'heard'>,
  reader: { scholarId: string | null; role: Role | null },
): boolean {
  const me = reader.scholarId;
  if (me && row.heard?.includes(me)) return false;
  if (row.who) return row.who === me;
  if (row.holder && row.holder === me && (row.whose === 'board' || row.whose === 'signatory')) {
    return true;
  }
  if (row.whose === 'board') return true;
  if (row.whose === 'signatory') return reader.role === 'signatory';
  return false;
}

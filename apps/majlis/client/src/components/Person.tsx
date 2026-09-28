import { nameOf, useMembers } from '../lib/members.js';

/**
 * A person, drawn by name.
 *
 * The record attributes every act to a scholar id — `member-a` — because a
 * name is not a key and can change. That id is for the record, not for the
 * reader: drawn as it comes, the deliberation said `member-a` wrote this, the
 * top bar told each member they were `member-b`, and every avatar on the
 * demonstration board was the same letter.
 *
 * The board's own list says what each person is called. Where it does not know
 * them — somebody not on this board, or a record that names a desk in words
 * rather than a member by id — what the record holds is drawn as it is: a
 * blank would read as *nobody*, which is the one thing that would be false.
 *
 * `EveryoneIsNamed.test.ts` fails when a screen draws a person's field as text
 * without coming through here.
 */
export default function Person({ id }: { id: string | null | undefined }) {
  const members = useMembers();
  if (!id) return null;
  return <>{nameOf(members, id)}</>;
}

/** The same, as a function, where the name goes into a sentence. */
export function useNameOf(): (id: string) => string {
  const members = useMembers();
  return (id) => nameOf(members, id);
}

/**
 * The letters for somebody's avatar: the first of their first and last names.
 *
 * It was the first letter of the scholar id, so on a board whose ids all begin
 * `member-` every avatar was an M.
 */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0][0] ?? '';
  const last = words.length > 1 ? (words[words.length - 1][0] ?? '') : '';
  return (first + last).toUpperCase();
}

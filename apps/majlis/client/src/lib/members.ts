import { useEffect, useState } from 'react';
import { oversight, type SeatedMember } from './api.js';

/**
 * Who is on this board, by name, and what each of them is.
 *
 * ── why this exists ───────────────────────────────────────────────────────
 *
 * The server names the person a step is with by scholar id — `member-a` —
 * because a name is not a key and can change. Drawn as it arrives, the column
 * that says who is holding something up said `member-a`, which is a string
 * from a configuration file and not a person anybody on the board would
 * recognise.
 *
 * The names come from `/api/settings`, the same list the settings screen
 * shows, because it carries both lists a board depends on: the board's own
 * record for the name, and the credential file for what they are. Placing work
 * with somebody needs the second — the board's list carries the institution's
 * liaison as a member, and the server refuses to place work with them.
 *
 * Cached at module level, like the board's name: the shell and every list
 * ask, and a board's membership does not change while somebody is reading.
 */

let cached: SeatedMember[] | undefined;
let inFlight: Promise<void> | null = null;

export function useMembers(): SeatedMember[] | null {
  const [members, setMembers] = useState<SeatedMember[] | null>(cached ?? null);

  useEffect(() => {
    if (cached !== undefined) {
      setMembers(cached);
      return;
    }

    let live = true;
    inFlight ??= oversight
      .settings()
      .then((s) => {
        cached = Array.isArray(s?.members) ? s.members : [];
      })
      .catch(() => {
        cached = [];
      });

    void inFlight.then(() => {
      if (live) setMembers(cached ?? []);
    });

    return () => {
      live = false;
    };
  }, []);

  return members;
}

/**
 * A person's name, from their scholar id.
 *
 * Where the list does not know them, the id rather than nothing: an unknown
 * holder is still somebody holding it, and a blank would read as *nobody*,
 * which is the one thing that would be false.
 */
export function nameOf(members: readonly SeatedMember[] | null, scholarId: string): string {
  return members?.find((m) => m.scholarId === scholarId)?.name || scholarId;
}

/** Those on this side of the table, whom work can be placed with. */
export function placeableMembers(members: readonly SeatedMember[] | null): SeatedMember[] {
  return (members ?? []).filter((m) => m.role === 'signatory' || m.role === 'advisory');
}

/** For tests: forget what was read, so a second render tree asks again. */
export function forgetMembers(): void {
  cached = undefined;
  inFlight = null;
}

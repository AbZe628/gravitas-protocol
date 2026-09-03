import { useEffect, useState } from 'react';
import { governance, type Role } from './api.js';

/**
 * Who is looking, so the interface can stop offering what would be refused.
 *
 * The server decides authority; this only decides what is worth showing. An
 * advisory member is not offered a vote button, and a signatory is, but the
 * refusal in `routes/governance.ts` is what actually holds — nothing here is a
 * control, and a hidden button is not a security measure.
 *
 * Comes from `/api/attention`, which already reports the identity behind the
 * credential. A second endpoint saying the same thing would be one more place
 * for the two to disagree.
 *
 * Unknown until it answers. Rendering as an observer while it loads would flash
 * the interface from read-only to usable, and rendering as a signatory would
 * offer buttons that then vanish.
 */

export type Office = 'chair' | 'secretary' | null;

export interface Identity {
  scholarId: string;
  role: Role;
  /** Held, not ranked. Null for most members, which is the normal case. */
  office: Office;
}

export function useIdentity(): { identity: Identity | null; loading: boolean } {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    governance
      .attention()
      .then((a) => {
        if (!live) return;
        if (a && typeof a.scholarId === 'string' && typeof a.role === 'string') {
          setIdentity({ scholarId: a.scholarId, role: a.role, office: a.office ?? null });
        }
      })
      .catch(() => {
        // Not knowing is a state the interface handles; it shows nothing that
        // would need an identity rather than guessing at one.
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);

  return { identity, loading };
}

export const mayDeliberate = (role: Role | undefined): boolean =>
  role === 'signatory' || role === 'advisory' || role === 'liaison';

export const mayVote = (role: Role | undefined): boolean => role === 'signatory';

/**
 * Whether to offer a step that belongs to the institution rather than the board.
 *
 * Filing a rectification plan, minuting the Directors, recording that the
 * regulator was notified, recording that purification was paid. A board that
 * could record these would be producing a document saying something nobody
 * outside the room ever said, so the buttons are not shown to one — and the
 * route refuses regardless of what is shown.
 */
export const mayRecordInstitutionAct = (role: Role | undefined, office: Office | undefined): boolean =>
  office === 'secretary' || role === 'liaison';

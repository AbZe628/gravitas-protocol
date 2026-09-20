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

/*
 * Asked once for the whole screen, not once per component.
 *
 * ── what this was doing ───────────────────────────────────────────────────
 *
 * `useIdentity` is called in seventy-two places, and every one of them ran
 * its own `/api/attention`. Measured in the browser: ten to twelve requests
 * for the same answer on a single screen — the home screen 10, settings 12.
 * Half of that is StrictMode mounting twice in development, so five or six
 * of them are real and would ship.
 *
 * Nothing was wrong on a local server, where the answer comes back in
 * milliseconds. On a slowed one it showed what it costs: the home screen sat
 * on "Loading…" for fourteen seconds, because a browser holds six
 * connections per host and the screen was spending them on the same
 * question over and over.
 *
 * ── one request, and the answer kept ──────────────────────────────────────
 *
 * Who is looking does not change between two components of one screen. The
 * request is made once and every caller waits on that same promise; once it
 * has answered, a component mounting later starts with the answer already
 * in hand rather than flashing through a loading state it has no reason to
 * show.
 */
let upit: Promise<Identity | null> | null = null;
let poznato: Identity | null = null;
let odgovoreno = false;

function pitaj(): Promise<Identity | null> {
  upit ??= governance
    .attention()
    .then((a) => {
      if (a && typeof a.scholarId === 'string' && typeof a.role === 'string') {
        poznato = { scholarId: a.scholarId, role: a.role, office: a.office ?? null };
      }
      return poznato;
    })
    .catch(() => {
      // Not knowing is a state the interface handles; it shows nothing that
      // would need an identity rather than guessing at one.
      return null;
    })
    .finally(() => {
      odgovoreno = true;
    });
  return upit;
}

/**
 * Ask again the next time somebody looks.
 *
 * Signing out, signing in as somebody else, or anything else that changes
 * whose credential is being carried. Without this the kept answer would
 * outlive the person it describes.
 */
export function forgetIdentity(): void {
  upit = null;
  poznato = null;
  odgovoreno = false;
}

export function useIdentity(): { identity: Identity | null; loading: boolean } {
  const [identity, setIdentity] = useState<Identity | null>(() => poznato);
  const [loading, setLoading] = useState(() => !odgovoreno);

  useEffect(() => {
    let live = true;
    void pitaj().then((who) => {
      if (!live) return;
      setIdentity(who);
      setLoading(false);
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

/**
 * Who keeps the minutes, and therefore who may close somebody else's
 * undertaking.
 *
 * Mirrors `mayKeepMinutes` in the server's `auth/members.ts`, which is the
 * thing that actually refuses. An undertaking is closed by the person who
 * gave it or by whoever keeps the record — anybody else writing an account of
 * work they did not do would be putting words in a colleague's mouth.
 */
export const mayKeepMinutes = (_role: Role | undefined, office: Office | undefined): boolean =>
  office === 'secretary' || office === 'chair';

/**
 * Whether this credential belongs to the bank rather than to the board.
 *
 * The one role that is not on the board at all — the desk with a question. It
 * sees a form to put one and what became of its own, and nothing that belongs
 * to the board's own working: not the queue, not the deliberation, not a
 * matter it is not connected to.
 *
 * Used to *replace* the interface rather than to hide parts of it. A desk shown
 * the board's screens with most of it greyed out would spend its time looking
 * for what it is not allowed to touch.
 */
export const isInstitution = (role: Role | undefined): boolean => role === 'institution';

/** Whether to offer putting a question at all. The route refuses regardless. */
export const maySubmit = (role: Role | undefined): boolean =>
  role === 'institution' || mayDeliberate(role);

import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Refused, aKeyForThisPress } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import Dialog from './Dialog.js';
import AfterAct, { type Next } from './AfterAct.js';
import { Button } from './Button';

/**
 * One act, with the window before it and what follows after.
 *
 * ── what this replaces, measured ──────────────────────────────────────────
 *
 * Of fifty-eight acts a member can reach from a screen, **one** opened a
 * window before it happened and said what followed afterwards. The other
 * fifty-seven happened silently: a press, a spinner, and the screen quietly
 * different. That is the whole of the owner's complaint about this reading as
 * a web page rather than an application, and it cannot be fixed by writing
 * fifty-seven dialogs by hand — the fifty-eighth would be forgotten, and the
 * fifty-seven would drift apart from each other within a month.
 *
 * So it is one thing, used everywhere, and an act declares three sentences:
 *
 *   **what it does** — plainly, to the person about to do it
 *   **what it means** — the consequence, including who outside sees it
 *   **what follows** — at most three, and *nothing more* is a real answer
 *
 * ── the reason is not a formality ─────────────────────────────────────────
 *
 * Where an act needs a reason, the act is dead until there is one, and the bar
 * says why rather than leaving a member pressing a control that does nothing.
 * A reason typed here is not thrown away by a refusal: the window stays, with
 * the words still in it.
 *
 * ── it carries the version and the key ────────────────────────────────────
 *
 * Every act sent from here carries the copy of the record the member was
 * looking at, and one key for this press that survives every retry. A member
 * who presses twice, or whose connection stalls, records once — and a member
 * who writes while a colleague is writing is told rather than overwriting
 * them. See `services/version.ts` and `middleware/once.ts`.
 */

export interface ActProps {
  /** Opens the window. Null closes it. */
  open: boolean;
  onClose: () => void;

  /** What this act is, as a title a person recognises. */
  title: string;
  /** What it does, said plainly to whoever is about to do it. */
  does: string;
  /** What it means afterwards, including who outside this board sees it. */
  means?: string;
  /** Anything the member should read before deciding. */
  children?: ReactNode;

  /** Words for the control that performs it. */
  label: string;
  /** An act that takes something away, or cannot be walked back. */
  grave?: boolean;

  /**
   * Whether a reason is required, and the words asking for it.
   *
   * A reason is the part of the record that survives everybody who was in the
   * room, so where the server wants one this asks for it rather than letting
   * the member meet a refusal after they have pressed.
   */
  reason?: { label: string; help?: string; required?: boolean };

  /** The act itself. Given the reason, the version and the key it must carry. */
  perform: (said: {
    reason: string;
    sending: { version?: string; once?: string };
  }) => Promise<void>;

  /** The copy of the record the member was looking at, where there is one. */
  version?: string | null;

  /** What happened, and what the member may do next. At most three. */
  after?: { did: string; means: string; next: readonly Next[] };

  /**
   * Where the *what follows* is shown, when this component cannot show it.
   *
   * ── the fault this exists for ─────────────────────────────────────────────
   *
   * Most acts change the status, and a screen shows different things at
   * different statuses. Withdrawing a matter was the case that proved it: the
   * act landed, the matter became withdrawn, the screen switched to its
   * settled layout, and the panel holding this component — along with the
   * *what follows* it was about to render — was unmounted before anybody saw
   * it. Measured in the browser: the act worked, the sentence never appeared.
   *
   * So a screen whose own shape an act can change hands this down, keeps the
   * answer itself, and renders it somewhere the act cannot unmount. Where the
   * act changes nothing about what is on screen, leaving this out and showing
   * it here is simpler and does the same thing.
   */
  onDone?: (after: { did: string; means: string; next: readonly Next[] }) => void;
}

export default function Act({
  open,
  onClose,
  title,
  does,
  means,
  children,
  label,
  grave = false,
  reason,
  perform,
  version,
  after,
  onDone,
}: ActProps) {
  const { t } = useI18n();
  const [said, setSaid] = useState('');
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  /*
   * One key for this press, kept across every retry of it. Minted when the
   * window opens rather than when the request is sent: a key made per request
   * would be new on every retry and would guard nothing.
   */
  const press = useRef<string | null>(null);
  if (open && press.current === null) press.current = aKeyForThisPress();

  const needsReason = reason?.required !== false && reason !== undefined;
  const ready = !needsReason || said.trim().length > 0;

  const go = useCallback(async () => {
    if (busy || !ready) return;
    setBusy(true);
    setRefused(null);
    try {
      await perform({
        reason: said.trim(),
        sending: { version: version ?? undefined, once: press.current ?? undefined },
      });
      press.current = null;
      setSaid('');
      /*
       * Handed up where the screen owns it, shown here where it does not.
       * An act that changes the status takes this component down with the
       * panel it sits in, so it cannot be the one to show what follows.
       */
      if (after && onDone) {
        onDone(after);
        onClose();
      } else if (after) {
        setDone(true);
      } else {
        onClose();
      }
    } catch (e) {
      /*
       * The window stays and the words stay in it. A refusal that closed the
       * window and cleared the box would make the member type it again to
       * find out whether it was their fault.
       */
      setRefused(e instanceof Refused ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [after, busy, onClose, onDone, perform, ready, said, version]);

  if (done && after) {
    return (
      <AfterAct
        did={after.did}
        means={after.means}
        next={after.next}
        onClose={() => {
          setDone(false);
          onClose();
        }}
      />
    );
  }

  return (
    <Dialog
      open={open}
      title={title}
      onClose={() => {
        if (busy) return;
        setRefused(null);
        onClose();
      }}
      acts={
        <>
          <Button tone="quiet" size="md" onClick={onClose} disabled={busy}>
            {t('act.leave')}
          </Button>
          <Button
            tone={grave ? 'grave' : 'act'}
            size="md"
            onClick={go}
            busy={busy}
            disabled={!ready}
            whyDead={!ready ? t('act.reasonFirst') : undefined}
          >
            {label}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-ui leading-relaxed text-sand">{does}</p>
        {means && (
          <p className="rounded-card bg-ink px-4 py-3 text-ui leading-relaxed text-paper">
            {means}
          </p>
        )}

        {children}

        {reason && (
          <label className="block">
            <span className="mb-1.5 block text-label font-bold uppercase tracking-caps text-muted">
              {reason.label}
            </span>
            <textarea
              value={said}
              onChange={(e) => setSaid(e.target.value)}
              rows={3}
              className="w-full rounded-card border border-line bg-raised px-3 py-2 font-display text-body leading-relaxed text-paper"
            />
            {reason.help && (
              <span className="mt-1.5 block text-note leading-snug text-muted">{reason.help}</span>
            )}
          </label>
        )}

        {/*
          The refusal sits beside the control that caused it, in the server's
          own words. A status line at the top of a screen tells a member
          nothing they can act on.
        */}
        {refused && (
          <p className="rounded-card bg-breachtint px-4 py-3 text-ui leading-relaxed text-breachink">
            {refused}
          </p>
        )}

        {/* Dead, and why — said here rather than left to be guessed. */}
        {!ready && !refused && (
          <p className="text-note leading-snug text-muted">{t('act.reasonFirst')}</p>
        )}
      </div>
    </Dialog>
  );
}

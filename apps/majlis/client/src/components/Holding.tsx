import { useEffect, useState } from 'react';
import { oversight, type Passage } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { useIdentity } from '../lib/identity.js';
import { nameOf, placeableMembers, useMembers } from '../lib/members.js';
import { Button } from './Button';

/**
 * Who is carrying this, and the one or two things a member can do about it.
 *
 * ── what it offers, and why exactly that ──────────────────────────────────
 *
 * The rule is the server's — `services/assignment.ts`, `mayAssign` — and this
 * only stops offering what would be refused:
 *
 *   - **nobody holds it**: take it, or place it with a colleague;
 *   - **you hold it**: hand it on, or put it back to the board;
 *   - **a colleague holds it**: nothing to press. It says whom to ask. Taking
 *     work out of a colleague's hands is not something one member does to
 *     another quietly;
 *   - **you are the chair or the secretary**: place it with anybody, and put
 *     it back, whoever holds it. That is what the office is.
 *
 * Who holds it is the passage's `holder`, which the server wrote. Working it
 * out here from the record would be a second place deciding, which is the
 * fault the grammar exists to remove.
 *
 * Drawn only where the server says there is something to hold. On a matter in
 * its waiting period *take this* would be taking a clock.
 */
export default function Holding({
  passage,
  onChanged,
  loud = false,
  ruled = true,
}: {
  passage: Passage;
  /** Called after the record changed, so the screen reads the passage again. */
  onChanged: () => void;
  /** On the lapis card, where the quiet colours would vanish. */
  loud?: boolean;
  /**
   * A rule above it, where it follows something inside a card. Off where it
   * stands first in a pane, where a rule with nothing above it is a stray line.
   */
  ruled?: boolean;
}) {
  const { t } = useI18n();
  const { identity } = useIdentity();
  const members = useMembers();
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);
  /*
   * What the member just did, drawn before the server has answered.
   *
   * *Take this* used to wait on the write and then on a second read of the
   * whole passage before anything on the screen moved — two round trips, the
   * better part of a second on a phone, during which the button only spun.
   * The result is not in doubt: the button is offered only where the server's
   * own rule allows the act. So the new holder is drawn at once; the passage
   * the screen reads next replaces it, and a refusal puts the old one back and
   * says why.
   */
  const [shown, setShown] = useState<{ to: string | null; by: string } | null>(null);
  useEffect(() => setShown(null), [passage]);

  if (!passage.holdable) return null;

  const me = identity?.scholarId ?? null;
  const sits =
    me !== null &&
    (identity?.role === 'signatory' || identity?.role === 'advisory') &&
    (members ?? []).some((m) => m.scholarId === me);
  const office = identity?.office === 'chair' || identity?.office === 'secretary';

  const held = shown ? (shown.to === null ? null : { to: shown.to, by: shown.by }) : (passage.holder ?? null);
  const holder = held?.to ?? null;
  const mine = holder !== null && holder === me;
  const free = holder === null;

  /* The same three cases `mayAssign` names, in the same order. */
  const mayMove = sits && (office || free || mine);
  const colleagues = placeableMembers(members).filter((m) => m.scholarId !== holder);

  async function write(target: string | null) {
    if (busy) return;
    setBusy(true);
    setRefused(null);
    if (me !== null) setShown({ to: target, by: me });
    try {
      await oversight.assign({ ofKind: passage.of.kind, ofId: passage.of.id, to: target });
      setTo('');
      onChanged();
    } catch (e) {
      setShown(null);
      setRefused(e instanceof Error && e.message ? e.message : t('hold.failed'));
    } finally {
      setBusy(false);
    }
  }

  const quiet = loud ? 'text-white/80' : 'text-muted';
  const strong = loud ? 'text-white' : 'text-paper';
  const secondary =
    'rounded-xl px-3 py-1.5 text-ui font-medium ' +
    (loud ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-raised text-lapis shadow-ring');

  const who = holder === null ? null : mine ? t('hold.withYou') : nameOf(members, holder);
  const placedBy =
    held && held.by !== held.to ? t('hold.placedBy', { name: nameOf(members, held.by) }) : null;

  return (
    <div className={ruled ? 'mt-4 border-t pt-3 ' + (loud ? 'border-white/20' : 'border-line') : ''}>
      <p className={'text-ui ' + quiet}>
        {who === null ? (
          t('hold.nobody')
        ) : (
          <>
            <span className={'font-semibold ' + strong}>{mine ? who : t('hold.with', { name: who })}</span>
            {placedBy && <span> · {placedBy}</span>}
          </>
        )}
      </p>

      {mayMove && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {free && (
            <Button type="button" busy={busy} onClick={() => write(me)} className={secondary}>
              {t('hold.take')}
            </Button>
          )}

          {colleagues.length > 0 && (
            <span className="inline-flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor={`hold-to-${passage.of.id}`}>
                {t(free || office ? 'hold.placeWith' : 'hold.handOnTo')}
              </label>
              <select
                id={`hold-to-${passage.of.id}`}
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="min-h-[36px] rounded-xl bg-ink px-3 py-1.5 text-ui text-paper shadow-ring"
              >
                <option value="">{t(free || office ? 'hold.placeWith' : 'hold.handOnTo')}</option>
                {colleagues.map((m) => (
                  <option key={m.scholarId} value={m.scholarId}>
                    {m.scholarId === me ? t('hold.yourself') : m.name}
                  </option>
                ))}
              </select>
              {/* Only once somebody is chosen: a dead button beside an empty choice says nothing. */}
              {to && (
                <Button type="button" busy={busy} onClick={() => write(to)} className={secondary}>
                  {t(free || office ? 'hold.place' : 'hold.handOn')}
                </Button>
              )}
            </span>
          )}

          {!free && (mine || office) && (
            <Button type="button" busy={busy} onClick={() => write(null)} className={secondary}>
              {t('hold.putBack')}
            </Button>
          )}
        </div>
      )}

      {/* With a colleague, and not the chair: whom to ask, instead of a button that would be refused. */}
      {sits && !mayMove && <p className={'mt-1 text-note ' + quiet}>{t('hold.askThem')}</p>}

      {refused && (
        <p role="alert" className={'mt-2 text-note ' + (loud ? 'text-white' : 'text-breach')}>
          {refused}
        </p>
      )}
    </div>
  );
}

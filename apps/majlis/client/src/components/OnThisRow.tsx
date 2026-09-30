import { useState } from 'react';
import { Link } from 'react-router-dom';
import { oversight, type QueueRow } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { useIdentity } from '../lib/identity.js';
import { nameOf, useMembers } from '../lib/members.js';
import { holdingOf } from '../lib/holding.js';
import Dialog from './Dialog.js';
import { DateText } from './ui.js';
import { Button } from './Button';

/**
 * Everything else a member can do with a row, without leaving the list.
 *
 * ── why a window and not a little menu ────────────────────────────────────
 *
 * A right-click menu is the shape this asks for, and a strip of four words
 * with no explanation is not the shape of anything else in this application.
 * Every act with a consequence outside the screen opens a window that says
 * what is about to happen and to whom, and then does it — so the row's other
 * acts open the same window the record uses, reached by right-click, by a long
 * press on a phone, and by the Menu key from the keyboard, which is the same
 * gesture the browser already sends here.
 *
 * The row itself keeps one press. Taking something on needs nothing typed;
 * placing it with a named colleague needs a choice and putting it off needs a
 * reason, and those are here.
 *
 * ── setting aside is a position, not a snooze ─────────────────────────────
 *
 * *Remind me on Tuesday*, hidden from everybody else, was put to the board's
 * owner and refused in that shape: in a record whose rule is that what is
 * written is the board's and permanent, a member could otherwise push
 * something out of sight and nobody would know it had been pushed. So it
 * carries a day and a reason, and the board reads both. What it changes is one
 * member's own list, and nothing about what is waiting.
 */
export default function OnThisRow({
  row,
  open,
  onClose,
  onChanged,
}: {
  row: QueueRow;
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { t } = useI18n();
  const { identity } = useIdentity();
  const members = useMembers();

  const [until, setUntil] = useState('');
  const [reason, setReason] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);

  const can = holdingOf({
    holdable: row.holdable,
    holder: row.holder ?? null,
    identity,
    members,
  });

  const me = identity?.scholarId ?? null;
  const mine = (row.putOff ?? []).find((p) => p.by === me) ?? null;
  const others = (row.putOff ?? []).filter((p) => p.by !== me);

  const done = () => {
    setUntil('');
    setReason('');
    setTo('');
    onChanged();
    onClose();
  };

  async function run(what: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setRefused(null);
    try {
      await what();
      done();
    } catch (e) {
      setRefused(e instanceof Error && e.message ? e.message : t('hold.failed'));
    } finally {
      setBusy(false);
    }
  }

  const field = 'w-full rounded-xl bg-raised shadow-ring p-2.5 text-body leading-relaxed outline-none';
  const label = 'mb-1 block text-note text-muted';
  const secondary = 'rounded-xl bg-raised px-3 py-1.5 text-ui font-medium text-lapis shadow-ring';

  return (
    <Dialog
      open={open}
      title={row.title}
      onClose={onClose}
      acts={
        <Button type="button" onClick={onClose} className="text-ui text-muted hover:text-paper">
          {t('common.back')}
        </Button>
      }
    >
      <div className="space-y-5">
        <p className="text-ui text-muted">
          <Link className="text-lapis underline decoration-line underline-offset-4" to={row.to}>
            {t('row.open')}
          </Link>
        </p>

        {/* Who is carrying it, and the acts the rule allows — the panel's rule, read once. */}
        {can?.mayMove && (
          <div>
            <div className={label}>{t('row.whoHasIt')}</div>
            <p className="mb-2 text-ui">
              {can.holder === null
                ? t('hold.nobody')
                : can.mine
                  ? t('hold.withYou')
                  : t('hold.with', { name: nameOf(members, can.holder) })}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {can.free && (
                <Button
                  type="button"
                  busy={busy}
                  className={secondary}
                  onClick={() =>
                    void run(() => oversight.assign({ ofKind: row.kind, ofId: row.id, to: can.me }))
                  }
                >
                  {t('hold.take')}
                </Button>
              )}
              {!can.free && (
                <Button
                  type="button"
                  busy={busy}
                  className={secondary}
                  onClick={() =>
                    void run(() => oversight.assign({ ofKind: row.kind, ofId: row.id, to: null }))
                  }
                >
                  {t('hold.putBack')}
                </Button>
              )}
              {can.colleagues.length > 0 && (
                <>
                  <label className="sr-only" htmlFor={`row-to-${row.kind}-${row.id}`}>
                    {t('hold.placeWith')}
                  </label>
                  <select
                    id={`row-to-${row.kind}-${row.id}`}
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="min-h-[36px] rounded-xl bg-ink px-3 py-1.5 text-ui text-paper shadow-ring"
                  >
                    <option value="">{t('hold.placeWith')}</option>
                    {can.colleagues.map((m) => (
                      <option key={m.scholarId} value={m.scholarId}>
                        {m.scholarId === can.me ? t('hold.yourself') : m.name}
                      </option>
                    ))}
                  </select>
                  {/* Only once somebody is chosen: a dead button beside an empty choice says nothing. */}
                  {to && (
                    <Button
                      type="button"
                      busy={busy}
                      className={secondary}
                      onClick={() =>
                        void run(() => oversight.assign({ ofKind: row.kind, ofId: row.id, to }))
                      }
                    >
                      {t('hold.place')}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        <div className="border-t border-line pt-4">
          <div className={label}>{t('row.putOff')}</div>

          {mine ? (
            <>
              <p className="mb-2 max-w-[62ch] text-ui leading-relaxed">
                {t('row.youPutOff')} <DateText iso={mine.until} />
              </p>
              <p className="mb-2 max-w-[62ch] text-ui leading-relaxed text-muted">{mine.reason}</p>
              <Button
                type="button"
                busy={busy}
                className={secondary}
                onClick={() =>
                  void run(() =>
                    oversight.putOff({ ofKind: row.kind, ofId: row.id, until: null, reason: '' }),
                  )
                }
              >
                {t('row.pickUp')}
              </Button>
            </>
          ) : (
            <>
              {/*
                Said before it is done, because it is not what a member expects.

                Every other application's *remind me later* is private. This one
                is read by the board, and a member who found that out afterwards
                would rightly feel tricked.
              */}
              <p className="mb-3 max-w-[62ch] text-ui leading-relaxed text-muted">
                {t('row.putOffMeans')}
              </p>
              <label className="mb-3 block">
                <span className={label}>{t('row.until')}</span>
                <input
                  type="date"
                  value={until}
                  onChange={(e) => setUntil(e.target.value)}
                  className={field}
                />
              </label>
              <label className="block">
                <span className={label}>{t('row.why')}</span>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  className={field + ' resize-y'}
                />
              </label>
              {/* Absent until it could be honoured, rather than shown and refused. */}
              {until !== '' && reason.trim() !== '' && (
                <Button
                  type="button"
                  busy={busy}
                  className={secondary + ' mt-3'}
                  onClick={() =>
                    void run(() =>
                      oversight.putOff({
                        ofKind: row.kind,
                        ofId: row.id,
                        until: new Date(until).toISOString(),
                        reason,
                      }),
                    )
                  }
                >
                  {t('row.setAside')}
                </Button>
              )}
            </>
          )}

          {/*
            What colleagues have done with it. The half that makes this a
            record rather than a snooze: a row three members have each set
            aside is telling a chair something no count of days can.
          */}
          {others.length > 0 && (
            <ul className="mt-4 space-y-1 border-t border-line pt-3 text-ui">
              {others.map((p) => (
                <li key={p.by} className="max-w-[62ch] leading-relaxed text-muted">
                  {t('row.theyPutOff', { name: nameOf(members, p.by) })}{' '}
                  <DateText iso={p.until} /> — {p.reason}
                </li>
              ))}
            </ul>
          )}
        </div>

        {refused && (
          <p role="alert" className="text-ui text-breach">
            {refused}
          </p>
        )}
      </div>
    </Dialog>
  );
}

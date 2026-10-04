import { useEffect, useState } from 'react';
import { oversight, type Undertook } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { placeableMembers, useMembers } from '../lib/members.js';
import Person from './Person.js';
import { Button } from './Button';

/**
 * What members undertook at this sitting, recorded against it.
 *
 * ── what was missing, and it was not the reading ──────────────────────────
 *
 * The route that minutes an undertaking has always been there and **nothing
 * in the interface called it**. The board's own clocks could be read and
 * closed and never started: every undertaking on the screen came from the
 * seed. Found by looking for where a secretary records what was undertaken at
 * a sitting, and finding that there is nowhere.
 *
 * So the form is the thing, and it stands whether or not anything was read.
 *
 * ── and the reading is a way to start it, not a way round it ──────────────
 *
 * A sitting produces a minute, which is prose, and undertakings, which are
 * dates with names on them — and the second was typed in again from the first
 * by the person who had just finished writing it. What is lost there is lost
 * silently: an obligation nobody re-typed has no date on it and nothing that
 * will ever raise it.
 *
 * The sentences the minute itself contains are offered, each one filling the
 * form so it can be edited before it is minuted. Nothing is recorded by
 * pressing one, the member it names is the board's own and never a guess, and
 * a sentence whose date is *next Tuesday* arrives with no date at all —
 * because a minute read a month later would set that clock wrong.
 */
export default function WhatWasUndertaken({
  boardId,
  meetingId,
  minute,
  canKeep,
  onMinuted,
}: {
  boardId: string;
  meetingId: string;
  /** What the sitting's minute says now, so the reading follows it. */
  minute: string;
  /** Whoever keeps the minutes. Everybody else reads what was undertaken. */
  canKeep: boolean;
  onMinuted: () => void;
}) {
  const { t } = useI18n();
  const members = useMembers();

  const [found, setFound] = useState<Undertook[] | null>(null);
  const [what, setWhat] = useState('');
  const [who, setWho] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);

  useEffect(() => {
    if (!canKeep) return;
    let current = true;
    oversight
      .undertookAt(meetingId)
      .then((r) => current && setFound(r.found))
      .catch(() => current && setFound([]));
    return () => {
      current = false;
    };
    /* The reading follows the minute: saved again, read again. */
  }, [meetingId, minute, canKeep]);

  if (!canKeep) return null;

  function take(one: Undertook) {
    setWhat(one.what);
    setWho(one.who);
    setDueAt(one.dueAt ? one.dueAt.slice(0, 10) : '');
    setRefused(null);
  }

  async function minuteIt() {
    if (!what.trim() || !who || busy) return;
    setBusy(true);
    setRefused(null);
    try {
      await oversight.minuteUndertaking({
        boardId,
        meetingId,
        what: what.trim(),
        who,
        ...(dueAt ? { dueAt: new Date(dueAt + 'T00:00:00.000Z').toISOString() } : {}),
      });
      setWhat('');
      setWho('');
      setDueAt('');
      onMinuted();
    } catch (e) {
      setRefused(e instanceof Error && e.message ? e.message : t('und.minuteFailed'));
    } finally {
      setBusy(false);
    }
  }

  const offered = (found ?? []).filter((one) => one.what !== what);

  return (
    <section aria-label={t('und.minuteTitle')}>
      <div className="mb-1.5 text-label font-bold uppercase tracking-caps text-muted">
        {t('und.minuteTitle')}
      </div>
      <p className="mb-2.5 max-w-[62ch] text-note leading-relaxed text-muted">
        {t('und.minuteSays')}
      </p>

      {/*
        What the minute itself says, where it says anything. Absent where it
        says nothing — a panel reading *nothing was found* on every sitting is
        the screen talking about itself.
      */}
      {offered.length > 0 && (
        <ul className="mb-3 space-y-2">
          {offered.map((one, i) => (
            <li key={i} className="rounded-card bg-raised px-3.5 py-2.5 shadow-ring">
              <p className="mb-1.5 max-w-[62ch] font-read text-ui leading-relaxed text-sand">
                “{one.what}”
              </p>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                <span className="text-note text-muted">
                  <Person id={one.who} />
                </span>
                {one.dueAt && (
                  <span className="text-note text-muted">· {one.dueAt.slice(0, 10)}</span>
                )}
                <Button
                  type="button"
                  onClick={() => take(one)}
                  className="rounded-lg bg-ink px-3 py-1.5 text-note text-lapis shadow-ring hover:text-paper"
                >
                  {t('und.takeThis')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-2">
        <textarea
          value={what}
          onChange={(e) => setWhat(e.target.value)}
          rows={2}
          placeholder={t('und.whatHint')}
          aria-label={t('und.whatHint')}
          className="w-full rounded-xl bg-raised px-3 py-2 text-ui leading-relaxed shadow-ring"
        />
        <div className="flex flex-wrap gap-2">
          <label className="min-w-0 flex-1">
            <span className="sr-only">{t('und.whoHint')}</span>
            <select
              value={who}
              onChange={(e) => setWho(e.target.value)}
              aria-label={t('und.whoHint')}
              className="w-full rounded-xl bg-raised px-3 py-2 text-ui shadow-ring"
            >
              <option value="">{t('und.whoHint')}</option>
              {placeableMembers(members).map((m) => (
                <option key={m.scholarId} value={m.scholarId}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">{t('und.byWhen')}</span>
            <input
              type="date"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              aria-label={t('und.byWhen')}
              className="rounded-xl bg-raised px-3 py-2 text-ui shadow-ring"
            />
          </label>
        </div>

        {refused && (
          <p role="alert" className="text-ui leading-relaxed text-breach">
            {refused}
          </p>
        )}

        <div>
          <Button
            tone="quiet"
            size="sm"
            disabled={busy || !what.trim() || !who}
            whyDead={!what.trim() || !who ? t('und.needsBoth') : undefined}
            onClick={minuteIt}
          >
            {t('und.minuteIt')}
          </Button>
        </div>
      </div>
    </section>
  );
}

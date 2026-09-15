import { useState } from 'react';
import { oversight, Refused, type Settings } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { useIdentity } from '../lib/identity.js';
import { DateText } from './ui.js';
import { Field, HEADING } from './field.js';
import { Button } from './Button';

/**
 * The quorum, the confirmation window, and the name the board issues under.
 *
 * ── why this is not an ordinary settings form ─────────────────────────────
 *
 * The quorum is the number of signatures that bind the institution. An auditor
 * asking *how many did that ruling need* must not be answered with whatever
 * the setting says today, so three things hold and all three are on the
 * screen:
 *
 * **A reason is required**, and it is kept. A change to the constitution that
 * nobody can review is the kind a board discovers afterwards.
 *
 * **Every change stays**, with who made it and what it was before. The history
 * is under the form rather than in an export: the board is the one that has to
 * notice a quorum that moved twice.
 *
 * **A vote already open does not move.** The threshold is frozen onto a matter
 * when its vote opens, so lowering the quorum cannot carry something the
 * members were not asked about. It is said here because a chair pressing this
 * mid-vote is exactly the person who needs to know.
 *
 * ── who sees the form ─────────────────────────────────────────────────────
 *
 * The chair and the secretary. Everybody else reads the same figures and the
 * same history with nothing to press — the board's constitution is not a
 * secret from its own members, and a control that would be refused is absent
 * rather than shown.
 *
 * ── and membership is not here ────────────────────────────────────────────
 *
 * Deliberately, and it is not coming. An application that edited its own board
 * would be deciding who sits on a Shariah board.
 */

export default function HowItDecides({
  settings,
  onChanged,
}: {
  settings: Settings;
  onChanged: (next: Settings) => void;
}) {
  const { t } = useI18n();
  const { identity } = useIdentity();

  const office = identity?.office;
  const mayChange = office === 'chair' || office === 'secretary';

  const [open, setOpen] = useState(false);
  const [permit, setPermit] = useState(String(settings.decides.quorumPermit));
  const [restrict, setRestrict] = useState(String(settings.decides.quorumRestrict));
  const [hours, setHours] = useState(String(settings.decides.ratificationWindowHours));
  const [name, setName] = useState(settings.boardName ?? '');
  const [series, setSeries] = useState(settings.decides.rulingSeries ?? '');
  const [reason, setReason] = useState('');

  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);

  const changes = settings.changes ?? [];

  async function keep(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setRefusal(null);
    try {
      const next = await oversight.changeHowItDecides({
        reason: reason.trim(),
        name: name.trim(),
        rulingSeries: series.trim(),
        quorumPermit: Number(permit),
        quorumRestrict: Number(restrict),
        ratificationWindowHours: Number(hours),
      });
      onChanged(next);
      setReason('');
      setOpen(false);
    } catch (error) {
      setRefusal(error instanceof Refused ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  const BOX = 'w-full rounded-xl bg-raised px-3 py-2.5 text-body shadow-ring outline-none';

  return (
    <div>
      {mayChange && !open && (
        <Button
          type="button"
          onClick={() => {
            setRefusal(null);
            setOpen(true);
          }}
          className="mb-4 rounded-xl bg-raised px-4 py-2 text-ui font-semibold text-lapis shadow-ring"
        >
          {t('decides.change')}
        </Button>
      )}

      {mayChange && open && (
        <form onSubmit={keep} className="mb-5 rounded-card bg-ink/70 px-4 py-4 shadow-ring">
          {/* The one sentence a chair pressing this mid-vote has to read. */}
          <p className="mb-4 max-w-[58ch] text-note leading-relaxed text-muted">
            {t('decides.lead')}
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={t('set.quorumPermit')} headingClass={HEADING}>
              {(attrs) => (
                <input
                  {...attrs}
                  type="number"
                  min={1}
                  value={permit}
                  onChange={(e) => setPermit(e.target.value)}
                  className={BOX}
                />
              )}
            </Field>

            <Field label={t('set.quorumRestrict')} headingClass={HEADING}>
              {(attrs) => (
                <input
                  {...attrs}
                  type="number"
                  min={1}
                  value={restrict}
                  onChange={(e) => setRestrict(e.target.value)}
                  className={BOX}
                />
              )}
            </Field>

            <Field label={t('set.ratification')} headingClass={HEADING}>
              {(attrs) => (
                <input
                  {...attrs}
                  type="number"
                  min={1}
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className={BOX}
                />
              )}
            </Field>
          </div>

          <div className="mt-3">
            <Field label={t('decides.boardName')} headingClass={HEADING}>
              {(attrs) => (
                <input
                  {...attrs}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={BOX}
                />
              )}
            </Field>
          </div>

          {/*
            How rulings are numbered. Changing it renumbers nothing already
            issued — a reference the bank has filed does not move — so the help
            line says what it actually decides: what the next one is called.
          */}
          <div className="mt-3">
            <Field
              label={t('decides.series')}
              help={t('decides.seriesHelp')}
              headingClass={HEADING}
            >
              {(attrs) => (
                <input
                  {...attrs}
                  value={series}
                  onChange={(e) => setSeries(e.target.value)}
                  placeholder="SSB/{year}/{n}"
                  className={`${BOX} font-mono`}
                />
              )}
            </Field>
          </div>

          <div className="mt-3">
            <Field label={t('decides.why')} help={t('decides.whyHelp')} headingClass={HEADING}>
              {(attrs) => (
                <textarea
                  {...attrs}
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className={BOX}
                  required
                />
              )}
            </Field>
          </div>

          {refusal && <p className="mt-3 text-ui leading-relaxed text-breach">{refusal}</p>}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              disabled={busy || reason.trim().length < 20}
              className="rounded-xl bg-lapis px-5 py-2.5 text-ui font-semibold text-white shadow-act disabled:opacity-40"
            >
              {busy ? t('common.loading') : t('decides.keep')}
            </Button>
            <Button
              type="button"
              onClick={() => setOpen(false)}
              className="text-ui text-muted underline decoration-line underline-offset-4"
            >
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      )}

      {/*
        What this board calls its rulings, for everybody rather than only the
        chair. A member asked for *SSB/2026/14* has to be able to see that the
        board issues under that series at all, and what the next one will be —
        the pattern alone is a form field, the example is the answer.
      */}
      <div className="mt-5 border-t border-line pt-4">
        <div className="mb-1.5 text-label font-bold uppercase tracking-caps text-muted">
          {t('decides.series')}
        </div>
        {settings.decides.rulingSeries ? (
          <p className="max-w-[62ch] text-ui leading-relaxed text-sand">
            <span className="font-mono text-paper">{settings.decides.rulingSeries}</span>
            {settings.decides.nextReference && (
              <>
                <span className="mx-1.5 opacity-40">·</span>
                {t('decides.next')}{' '}
                <span className="font-mono text-lapis">{settings.decides.nextReference}</span>
              </>
            )}
          </p>
        ) : (
          <p className="max-w-[62ch] text-ui leading-relaxed text-muted">
            {t('decides.noSeries')}
          </p>
        )}
      </div>

      {/*
        What moved, and when. Under the figures rather than behind a link: a
        quorum that went from three to two and back is exactly what an auditor
        asks about, and the board is who has to see it first.
      */}
      {changes.length > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <div className="mb-2.5 text-label font-bold uppercase tracking-caps text-muted">
            {t('decides.history')}
          </div>
          <ul className="space-y-2.5">
            {[...changes].reverse().map((c, i) => (
              <li key={i} className="rounded-card bg-raised px-4 py-3 shadow-ring">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-ui">
                  <span className="text-paper">{c.called}</span>
                  <span className="font-mono tabular-nums text-muted">
                    {c.from} → <span className="text-paper">{c.to}</span>
                  </span>
                </div>
                <p className="mt-1 max-w-[62ch] text-ui leading-relaxed text-sand">{c.reason}</p>
                <p className="mt-1 text-note text-muted">
                  {c.by}
                  <span className="mx-1.5 opacity-40">·</span>
                  <DateText iso={c.at} />
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

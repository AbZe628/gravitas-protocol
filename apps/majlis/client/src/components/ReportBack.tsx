import { useState } from 'react';
import { oversight, Refused, type Committee } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Field, HEADING } from './field.js';

/**
 * The committee's account, going back to the board.
 *
 * ── half a feature ────────────────────────────────────────────────────────
 *
 * A board could form a committee, refer a matter to it, and read the report
 * when it came back. There was no way to write one. The route worked and
 * nothing called it, so every referral on every screen stood at *waiting* for
 * ever and the committee that had actually met had to tell the board some
 * other way.
 *
 * ── a report is an account, never an outcome ──────────────────────────────
 *
 * There is no field here for *permit* or *restrict*, deliberately and for the
 * same reason the record has none: a committee that returned a verdict would
 * be the board reading a result instead of reading the work, and a board's
 * threshold is the number of signatures that bind the institution.
 *
 * ── silence is recorded as silence ────────────────────────────────────────
 *
 * Each member is set to *recorded nothing* and stays there unless somebody
 * moves them. A form that defaulted every member to agreeing would manufacture
 * a unanimous committee out of people who never said anything, and *four
 * agreed* is exactly the sentence a board would then act on.
 *
 * Dissent carries words or it is not dissent: a member marked as disagreeing
 * with nothing written beside it tells the board only that somebody was
 * unhappy, which is worse than not knowing.
 */

type Position = 'silent' | 'agrees' | 'dissents';

export default function ReportBack({
  referralId,
  committee,
  onReported,
}: {
  referralId: string;
  committee: Committee;
  onReported: () => void;
}) {
  const { t } = useI18n();

  const [open, setOpen] = useState(false);
  const [found, setFound] = useState('');
  const [positions, setPositions] = useState<Record<string, { at: Position; said: string }>>(
    Object.fromEntries(committee.members.map((m) => [m, { at: 'silent' as Position, said: '' }])),
  );
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 rounded-xl bg-lapis px-4 py-2 text-[12.5px] font-semibold text-white shadow-act"
      >
        {t('cttee.report')}
      </button>
    );
  }

  const incomplete = Object.values(positions).some((p) => p.at === 'dissents' && !p.said.trim());

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setRefusal(null);
    try {
      const standing = committee.members
        .filter((m) => positions[m].at !== 'silent')
        .map((m) => ({
          scholarId: m,
          agrees: positions[m].at === 'agrees',
          ...(positions[m].said.trim() ? { said: positions[m].said.trim() } : {}),
        }));

      await oversight.reportOnReferral(referralId, found.trim(), standing);
      setOpen(false);
      onReported();
    } catch (error) {
      setRefusal(error instanceof Refused ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={send} className="mt-4 rounded-card bg-ink/70 px-4 py-4 shadow-ring">
      <p className="mb-3 max-w-[58ch] text-[12.5px] leading-[1.6] text-muted">
        {t('cttee.reportLead')}
      </p>

      <Field label={t('cttee.whatWasFound')} headingClass={HEADING}>
        {(attrs) => (
          <textarea
            {...attrs}
            rows={5}
            value={found}
            onChange={(e) => setFound(e.target.value)}
            className="w-full rounded-xl bg-raised px-3 py-2.5 text-[13.5px] leading-[1.6] shadow-ring outline-none"
            required
          />
        )}
      </Field>

      <div className="mt-4 mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
        {t('cttee.whoStoodWhere')}
      </div>

      <ul className="space-y-2.5">
        {committee.members.map((m) => (
          <li key={m} className="rounded-xl bg-raised px-3.5 py-3 shadow-ring">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <span className="text-[13px] text-paper">{m}</span>
              <div className="flex gap-1.5">
                {(['silent', 'agrees', 'dissents'] as Position[]).map((at) => (
                  <button
                    key={at}
                    type="button"
                    aria-pressed={positions[m].at === at}
                    onClick={() =>
                      setPositions((p) => ({ ...p, [m]: { ...p[m], at } }))
                    }
                    className={
                      'rounded-full px-3 py-1 text-[11.5px] transition-all ' +
                      (positions[m].at === at
                        ? at === 'dissents'
                          ? 'bg-breach font-semibold text-white'
                          : at === 'agrees'
                            ? 'bg-settled font-semibold text-white'
                            : 'bg-sand/20 font-semibold text-paper'
                        : 'text-muted shadow-ring hover:text-paper')
                    }
                  >
                    {t(`cttee.stood.${at}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Dissent carries words, or the board learns only that somebody was unhappy. */}
            {positions[m].at === 'dissents' && (
              <textarea
                rows={2}
                value={positions[m].said}
                aria-label={`${t('cttee.whatTheySaid')} — ${m}`}
                onChange={(e) =>
                  setPositions((p) => ({ ...p, [m]: { ...p[m], said: e.target.value } }))
                }
                placeholder={t('cttee.whatTheySaid')}
                className="mt-2.5 w-full rounded-xl bg-ink px-3 py-2 text-[12.5px] leading-[1.5] shadow-ring outline-none"
              />
            )}
          </li>
        ))}
      </ul>

      {refusal && <p className="mt-3 text-[12.5px] text-breach">{refusal}</p>}
      {incomplete && (
        <p className="mt-3 text-[12px] leading-[1.6] text-gold">{t('cttee.dissentNeedsWords')}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy || found.trim().length === 0 || incomplete}
          className="rounded-xl bg-lapis px-5 py-2.5 text-[13px] font-semibold text-white shadow-act disabled:opacity-40"
        >
          {busy ? t('common.loading') : t('cttee.sendReport')}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[12.5px] text-muted underline decoration-line underline-offset-4"
        >
          {t('common.cancel')}
        </button>
      </div>

      <p className="mt-3 max-w-[58ch] text-[11.5px] leading-[1.6] text-muted">
        {t('cttee.noVerdict')}
      </p>
    </form>
  );
}

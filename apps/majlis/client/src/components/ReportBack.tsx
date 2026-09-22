import { useState } from 'react';
import Act from './Act.js';
import AfterAct from './AfterAct.js';
import { oversight, type Committee } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Field, HEADING } from './field.js';
import { Button } from './Button';

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
  /** Whether the window that files the report is open. */
  const [filing, setFiling] = useState(false);
  const [justDid, setJustDid] = useState<{
    did: string;
    means: string;
    next: readonly { label: string; to?: string; says?: string }[];
  } | null>(null);

  if (!open) {
    return (
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 rounded-xl bg-lapis px-4 py-2 text-ui font-semibold text-white shadow-act"
      >
        {t('cttee.report')}
      </Button>
    );
  }

  const incomplete = Object.values(positions).some((p) => p.at === 'dissents' && !p.said.trim());

  async function send() {
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
  }

  return (
    <div className="mt-4 rounded-card bg-ink/70 px-4 py-4 shadow-ring">
      <p className="mb-3 max-w-[58ch] text-ui leading-relaxed text-muted">
        {t('cttee.reportLead')}
      </p>

      <Field label={t('cttee.whatWasFound')} headingClass={HEADING}>
        {(attrs) => (
          <textarea
            {...attrs}
            rows={5}
            value={found}
            onChange={(e) => setFound(e.target.value)}
            className="w-full rounded-xl bg-raised px-3 py-2.5 text-body leading-relaxed shadow-ring outline-none"
            required
          />
        )}
      </Field>

      <div className="mt-4 mb-2 text-label font-bold uppercase tracking-caps text-muted">
        {t('cttee.whoStoodWhere')}
      </div>

      <ul className="space-y-2.5">
        {committee.members.map((m) => (
          <li key={m} className="rounded-xl bg-raised px-3.5 py-3 shadow-ring">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <span className="text-ui text-paper">{m}</span>
              <div className="flex gap-1.5">
                {(['silent', 'agrees', 'dissents'] as Position[]).map((at) => (
                  <Button
                    key={at}
                    type="button"
                    aria-pressed={positions[m].at === at}
                    onClick={() =>
                      setPositions((p) => ({ ...p, [m]: { ...p[m], at } }))
                    }
                    className={
                      'inline-flex min-h-[44px] items-center rounded-full px-3 py-1 text-note transition-all lg:min-h-0 ' +
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
                  </Button>
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
                className="mt-2.5 w-full rounded-xl bg-ink px-3 py-2 text-ui leading-snug shadow-ring outline-none"
              />
            )}
          </li>
        ))}
      </ul>

      {incomplete && (
        <p className="mt-3 text-note leading-relaxed text-gold">{t('cttee.dissentNeedsWords')}</p>
      )}

      <Act
        open={filing}
        onClose={() => setFiling(false)}
        title={t('cttee.sendReport')}
        does={t('wm.report.does')}
        means={t('wm.report.means')}
        label={t('cttee.sendReport')}
        perform={send}
        onDone={setJustDid}
        after={{
          did: t('wm.report.did'),
          means: t('wm.report.didMeans'),
          next: [{ label: t('wm.next.backToMatter'), says: t('wm.next.backToMatterSays') }],
        }}
      />

      {justDid && (
        <div className="mt-4">
          <AfterAct
            did={justDid.did}
            means={justDid.means}
            next={justDid.next}
            onClose={() => setJustDid(null)}
          />
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={() => setFiling(true)}
          disabled={found.trim().length === 0 || incomplete}
          className="rounded-xl bg-lapis px-5 py-2.5 text-ui font-semibold text-white shadow-act disabled:opacity-40"
        >
          {t('cttee.sendReport')}
        </Button>
        <Button
          type="button"
          onClick={() => setOpen(false)}
          className="text-ui text-muted underline decoration-line underline-offset-4"
        >
          {t('common.cancel')}
        </Button>
      </div>

      <p className="mt-3 max-w-[58ch] text-note leading-relaxed text-muted">
        {t('cttee.noVerdict')}
      </p>
    </div>
  );
}

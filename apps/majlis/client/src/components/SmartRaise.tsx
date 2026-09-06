import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Refused, governance } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';

/**
 * Putting a question to the board, in the words the person putting it uses.
 *
 * The form this replaces asked for a **direction** and an **origin** as two
 * separate fields, and neither is a thing a secretary thinks in. Nobody
 * receiving an email from the treasury desk thinks *"this is a permitting
 * change of institution-request origin"*. They think *"the desk wants to launch
 * something and needs a ruling"*.
 *
 * So one choice is made in those words, and it sets both fields underneath.
 * Nothing is inferred and nothing is hidden: each option says plainly what it
 * records, because the direction decides how the matter is then treated — a
 * permission carries the full quorum and a delay before it takes effect, a
 * restriction takes effect at once on a reduced quorum and is ratified
 * afterwards or lapses.
 *
 * ── two steps, and the second is the question ─────────────────────────────
 *
 * What kind of decision, then what is actually being asked. The date the
 * institution asked sits on the second step because it is the one thing a
 * secretary usually has to go and look up, and putting it first would stop them
 * before they had started.
 *
 * ── what it does not do ───────────────────────────────────────────────────
 *
 * It does not pick the contract shape, propose terms, or write a word of the
 * question. Those are the board's, and a form that filled them would be putting
 * words in the mouth of a board that has not met. Once the matter exists and a
 * shape is chosen, `inherit.ts` offers what this board decided last time on a
 * question of that shape — from its own record, not from a guess made here.
 */

type Kind = 'launch' | 'restrict' | 'review' | 'concern';

/**
 * What each choice actually records.
 *
 * Kept beside the label rather than in documentation, because the difference
 * between permitting and restricting changes the quorum, the delay and the
 * ratification window — and somebody choosing in a hurry is entitled to see
 * that before they choose rather than after.
 */
const RECORDS: Record<Kind, { direction: 'permit' | 'restrict'; origin: string }> = {
  launch: { direction: 'permit', origin: 'institution_request' },
  restrict: { direction: 'restrict', origin: 'protocol_change' },
  review: { direction: 'permit', origin: 'periodic_review' },
  concern: { direction: 'restrict', origin: 'compliance_concern' },
};

const KINDS: Kind[] = ['launch', 'restrict', 'review', 'concern'];

export default function SmartRaise({ boardId }: { boardId: string }) {
  const { t } = useI18n();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind | null>(null);
  const [title, setTitle] = useState('');
  const [proposal, setProposal] = useState('');
  const [arrivedAt, setArrivedAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);

  const ready = title.trim().length >= 3 && proposal.trim().length > 0 && kind !== null;

  async function submit() {
    if (!ready || busy || !kind) return;
    setBusy(true);
    setRefusal(null);
    try {
      const created = await governance.openMatter({
        boardId,
        title: title.trim(),
        proposal: proposal.trim(),
        direction: RECORDS[kind].direction,
        origin: RECORDS[kind].origin as 'institution_request',
        /*
         * Sent only where it was given. Left empty the wait is reported as
         * covering this system's part only and says so — an understated figure
         * that admits it beats a confident wrong one.
         */
        ...(arrivedAt ? { arrivedAt: new Date(arrivedAt + 'T00:00:00Z').toISOString() } : {}),
      });
      navigate(`/matters/${created.id}`);
    } catch (error) {
      setRefusal(error instanceof Refused ? error.message : String(error));
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded border border-gold/60 px-3.5 py-1.5 text-[13px] text-white font-semibold shadow-act transition-colors hover:bg-lapis"
      >
        {t('smart.open')}
      </button>
    );
  }

  const field =
    'w-full rounded-xl bg-raised shadow-ring p-2 text-[14px] leading-relaxed outline-none focus:shadow-[0_0_0_1.5px_rgba(22,68,112,0.35)]';

  return (
    <div className="rounded-card shadow-ring bg-raised px-4 py-4">
      <div className="mb-3 text-[15px] font-semibold">{t('smart.title')}</div>

      {/* ── one: what kind of decision ─────────────────────────────────── */}

      <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-muted">{t('smart.whatKind')}</div>
      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        {KINDS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={
              'rounded border px-3 py-2.5 text-start transition-colors ' +
              (kind === k ? 'border-gold/60 bg-gold/[0.06]' : 'border-line hover:border-muted')
            }
          >
            <div className="text-[13px] font-medium">{t(`smart.kind.${k}`)}</div>
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">
              {t(`smart.kind.${k}.means`)}
            </p>
          </button>
        ))}
      </div>

      {/* ── two: the question ──────────────────────────────────────────── */}

      {kind && (
        <>
          {/*
            What was just chosen, said back. The direction decides the quorum,
            the delay and whether it is ratified afterwards, and somebody
            choosing in a hurry should see that rather than discover it.
          */}
          <p className="mb-4 rounded-xl shadow-ring px-3 py-2 text-[12px] leading-relaxed text-muted">
            {t(`matter.direction.${RECORDS[kind].direction}Note`)}
          </p>

          <label className="mb-1 block text-[12px] text-muted">{t('raise.subject')}</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={field + ' mb-3'} />

          <label className="mb-1 block text-[12px] text-muted">{t('smart.question')}</label>
          <p className="mb-1.5 text-[11.5px] leading-relaxed text-muted">{t('smart.questionHelp')}</p>
          <textarea
            value={proposal}
            onChange={(e) => setProposal(e.target.value)}
            rows={3}
            className={field + ' mb-3 resize-y'}
          />

          <label className="mb-1 block text-[12px] text-muted">{t('raise.arrivedAt')}</label>
          <p className="mb-1.5 text-[11.5px] leading-relaxed text-muted">{t('smart.arrivedShort')}</p>
          <input
            type="date"
            value={arrivedAt}
            onChange={(e) => setArrivedAt(e.target.value)}
            className={field + ' mb-3'}
          />

          {refusal && (
            <p className="mb-3 rounded border border-warn/50 px-3 py-2 text-[12.5px] leading-relaxed text-warn">
              {refusal}
            </p>
          )}

          {/*
            What the board does next, said before it is sent. A secretary
            pressing this wants to know whether they have finished or whether
            somebody is now waiting on them for something else.
          */}
          <p className="mb-3 text-[12px] leading-relaxed text-muted">{t('smart.thenWhat')}</p>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={!ready || busy}
              className="rounded border border-gold/60 px-3.5 py-1.5 text-[13px] text-white font-semibold shadow-act transition-colors hover:bg-lapis disabled:opacity-40"
            >
              {t('smart.put')}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[12.5px] text-muted underline decoration-line underline-offset-4 hover:text-paper"
            >
              {t('smart.cancel')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

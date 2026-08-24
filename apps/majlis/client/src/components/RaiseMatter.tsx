import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Refused, governance } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Card } from './ui.js';

/**
 * Raising a matter.
 *
 * Opening one is not a vote, so anyone who deliberates may do it. What the form
 * insists on is the two fields that decide how the rest of the process runs and
 * are easiest to get wrong afterwards.
 *
 * **Direction** decides everything downstream: permitting is slow — full
 * quorum, a timelock any signatory can halt — and restricting is fast, on a
 * reduced quorum, and then has to be ratified or it lapses. It is asked as a
 * question about what the change does rather than offered as a pair of labels,
 * because a proposer choosing "restrict" to move faster has misunderstood what
 * the speed is for.
 *
 * **What is not being decided** is optional and prompted anyway. A narrow
 * approval later read as a broad endorsement is the specific failure the field
 * exists to prevent, and nobody writes it unless they are asked.
 *
 * It opens as a draft. The proposer writes it before the board is asked to look,
 * and opening deliberation is a separate, deliberate act.
 */

const ORIGINS = ['institution_request', 'protocol_change', 'periodic_review', 'compliance_concern'] as const;

export default function RaiseMatter({ boardId }: { boardId: string }) {
  const { t } = useI18n();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [proposal, setProposal] = useState('');
  const [direction, setDirection] = useState<'permit' | 'restrict' | null>(null);
  const [origin, setOrigin] = useState<(typeof ORIGINS)[number]>('protocol_change');
  const [notDecided, setNotDecided] = useState('');
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);

  const ready = title.trim().length >= 3 && proposal.trim().length > 0 && direction !== null;

  async function submit() {
    if (!ready || busy || !direction) return;
    setBusy(true);
    setRefusal(null);
    try {
      const created = await governance.openMatter({
        boardId,
        title: title.trim(),
        proposal: proposal.trim(),
        direction,
        origin,
        notDecided: notDecided
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
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
        className="mb-5 rounded border border-line px-3 py-1.5 text-[12px] hover:bg-surface/60"
      >
        {t('raise.open')}
      </button>
    );
  }

  const field = 'w-full rounded border border-line bg-transparent p-2 text-[14px] leading-relaxed outline-none';

  return (
    <Card>
      <div className="mb-3 text-[13px] font-medium">{t('raise.title')}</div>

      <label className="mb-1 block text-[12px] text-muted">{t('raise.subject')}</label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} className={field + ' mb-3'} />

      <label className="mb-1 block text-[12px] text-muted">{t('raise.proposal')}</label>
      <textarea value={proposal} onChange={(e) => setProposal(e.target.value)} rows={3} className={field + ' mb-3 resize-y'} />

      <label className="mb-1 block text-[12px] text-muted">{t('raise.direction')}</label>
      <p className="mb-2 text-[11.5px] leading-relaxed text-muted">{t('raise.directionHelp')}</p>
      <div className="mb-3 flex flex-wrap gap-2">
        {(['permit', 'restrict'] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDirection(d)}
            className={
              'rounded border px-3 py-1.5 text-[12px] ' +
              (direction === d ? 'border-goldsoft text-goldsoft' : 'border-line hover:bg-surface/60')
            }
          >
            {t(`raise.direction.${d}`)}
          </button>
        ))}
      </div>

      <label className="mb-1 block text-[12px] text-muted">{t('raise.origin')}</label>
      <select
        value={origin}
        onChange={(e) => setOrigin(e.target.value as (typeof ORIGINS)[number])}
        className={field + ' mb-3'}
      >
        {ORIGINS.map((o) => (
          <option key={o} value={o}>
            {t(`matter.origin.${o}`)}
          </option>
        ))}
      </select>

      <label className="mb-1 block text-[12px] text-muted">{t('raise.notDecided')}</label>
      <p className="mb-1.5 text-[11.5px] leading-relaxed text-muted">{t('raise.notDecidedHelp')}</p>
      <textarea value={notDecided} onChange={(e) => setNotDecided(e.target.value)} rows={2} className={field + ' resize-y'} />

      {refusal && <p className="mt-2 text-[12px] leading-relaxed text-amber-300">{refusal}</p>}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={!ready || busy}
          className="rounded border border-line px-3 py-1.5 text-[12px] hover:bg-surface/60 disabled:opacity-40"
        >
          {t('raise.submit')}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-[12px] text-muted hover:text-paper">
          {t('say.cancel')}
        </button>
      </div>
      <p className="mt-2 text-[11.5px] text-muted">{t('raise.draftNote')}</p>
    </Card>
  );
}

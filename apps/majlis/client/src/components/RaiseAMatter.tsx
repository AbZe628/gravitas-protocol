import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { governance } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';

/**
 * Open a matter about the thing you are looking at.
 *
 * ── why it is one component and not four ──────────────────────────────────
 *
 * The audit found the same shape four times: a ruling whose review date has
 * passed, a briefing carrying a question addressed to the board, a holding
 * that has left the limits, a finding nobody has acted on. Each of them ends
 * with the same act — put it to the board — and each screen ended instead.
 *
 * Writing that act four times would have produced four wordings for one thing,
 * which is the fault the audit counted seventy-six of. So it is one component,
 * and every caller supplies the words the board will read.
 *
 * ── the draft is shown, never sent behind their back ──────────────────────
 *
 * A matter carries the name of whoever opened it. A control that submitted
 * text they had not read would put a scholar's name on words they never saw,
 * so the draft opens in fields they can change and the act is a second press.
 *
 * ── the direction decides the threshold ───────────────────────────────────
 *
 * Permitting needs the full threshold and a waiting period; restricting needs
 * fewer signatures and takes effect at once. A caller that guessed wrong would
 * let a rule be changed by fewer signatures than made it, so `direction` is
 * passed in by the screen that knows what is being proposed and never
 * defaulted here.
 */
export default function RaiseAMatter({
  boardId,
  title,
  proposal,
  direction,
  origin,
  label,
  note,
  canOpen,
}: {
  boardId: string;
  /** The draft the fields open with. The member's to change. */
  title: string;
  proposal: string;
  direction: 'permit' | 'restrict';
  origin: string;
  /** What the control says before it is opened. */
  label: string;
  /** One line under the fields, where the caller has something to add. */
  note?: string;
  canOpen: boolean;
}) {
  const { t } = useI18n();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [theTitle, setTheTitle] = useState(title);
  const [theProposal, setTheProposal] = useState(proposal);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canOpen) return null;

  async function raise() {
    setBusy(true);
    setError(null);
    try {
      const made = await governance.openMatter({
        boardId,
        title: theTitle,
        proposal: theProposal,
        direction,
        origin,
      });
      navigate(`/matters/${made.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('raise.failed'));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 text-[12.5px] font-semibold text-lapis underline decoration-line underline-offset-4"
      >
        {label}
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-card bg-ink px-4 py-4 shadow-ring">
      <p className="mb-3 max-w-[58ch] text-[12.5px] leading-[1.6] text-muted">{t('raise.lead')}</p>

      <label className="mb-1.5 block text-[12px] text-muted">{t('raise.title')}</label>
      <input
        value={theTitle}
        onChange={(e) => setTheTitle(e.target.value)}
        className="mb-3 w-full rounded-card bg-raised px-4 py-2.5 text-[13.5px] text-paper shadow-ring outline-none"
      />

      <label className="mb-1.5 block text-[12px] text-muted">{t('raise.proposal')}</label>
      <textarea
        value={theProposal}
        onChange={(e) => setTheProposal(e.target.value)}
        rows={5}
        className="w-full rounded-card bg-raised px-4 py-3 text-[13.5px] leading-[1.6] text-paper shadow-ring outline-none"
      />

      {error && <p className="mt-2 text-[12.5px] text-breach">{error}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={raise}
          disabled={busy || !theTitle.trim() || !theProposal.trim()}
          className="rounded-card bg-lapis px-6 py-3 text-[14px] font-bold text-white shadow-act disabled:opacity-50"
        >
          {busy ? t('raise.opening') : t('raise.openIt')}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[12.5px] text-muted underline decoration-line underline-offset-4"
        >
          {t('common.back')}
        </button>
      </div>

      {note && <p className="mt-3 max-w-[58ch] text-[12px] leading-[1.6] text-muted">{note}</p>}
    </div>
  );
}

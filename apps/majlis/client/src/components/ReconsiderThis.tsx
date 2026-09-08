import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { governance, type Rule } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';

/**
 * From a ruling whose review date has passed, to a matter about it.
 *
 * ── the step that was missing ─────────────────────────────────────────────
 *
 * The review dates were computed, and shown, and that was all. A rule could
 * sit overdue on the screen for a year with nothing to press. `services/
 * review.ts` says it plainly: this is the only kind of work with no external
 * trigger — nothing arrives to make a periodic review happen, so it slips.
 * Showing that it has slipped and offering nothing was the application making
 * the same point and then failing to help.
 *
 * ── reconsidering a rule is a matter, not a button ────────────────────────
 *
 * There is deliberately no *mark as reviewed*. A review that changed nothing
 * is still the board looking at a rule and saying it still holds, and that is
 * a decision with a date and a name on it. Anything less would let a rule be
 * cleared by whoever happened to open the screen.
 *
 * So this opens a matter, in the board's own words, with the rule named.
 * Where the board then decides nothing changes, the record says the board
 * decided nothing changes — which is the thing an auditor asks for.
 *
 * ── the draft is shown, not hidden ────────────────────────────────────────
 *
 * A matter carries the name of whoever opened it. A control that submitted
 * text they had not read would put a scholar's name on words they never saw.
 */
export default function ReconsiderThis({
  rule,
  canOpen,
}: {
  rule: Rule;
  canOpen: boolean;
}) {
  const { t } = useI18n();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [proposal, setProposal] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canOpen) return null;

  function begin() {
    setTitle(`${t('reconsider.titlePrefix')} ${rule.title}`);
    setProposal(
      [
        `${t('reconsider.theRule')} ${rule.statement}`,
        '',
        t('reconsider.theQuestion'),
      ].join('\n'),
    );
    setOpen(true);
  }

  async function raise() {
    setBusy(true);
    setError(null);
    try {
      const made = await governance.openMatter({
        boardId: rule.boardId,
        title,
        proposal,
        /*
         * Permitting, because reconsidering is not itself a restriction — and
         * the direction decides the threshold. A review that carried the
         * lower restricting threshold would let a rule be changed by fewer
         * signatures than made it.
         */
        direction: 'permit',
        origin: 'periodic_review',
      });
      navigate(`/matters/${made.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('reconsider.failed'));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={begin}
        className="mt-2 text-[12.5px] font-semibold text-lapis underline decoration-line underline-offset-4"
      >
        {t('reconsider.doIt')}
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-card bg-ink px-4 py-4 shadow-ring">
      <p className="mb-3 max-w-[58ch] text-[12.5px] leading-[1.6] text-muted">
        {t('reconsider.lead')}
      </p>

      <label className="mb-1.5 block text-[12px] text-muted">{t('reconsider.title')}</label>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="mb-3 w-full rounded-card bg-raised px-4 py-2.5 text-[13.5px] text-paper shadow-ring outline-none"
      />

      <label className="mb-1.5 block text-[12px] text-muted">{t('reconsider.proposal')}</label>
      <textarea
        value={proposal}
        onChange={(e) => setProposal(e.target.value)}
        rows={5}
        className="w-full rounded-card bg-raised px-4 py-3 text-[13.5px] leading-[1.6] text-paper shadow-ring outline-none"
      />

      {error && <p className="mt-2 text-[12.5px] text-breach">{error}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={raise}
          disabled={busy || !title.trim() || !proposal.trim()}
          className="rounded-card bg-lapis px-6 py-3 text-[14px] font-bold text-white shadow-act disabled:opacity-50"
        >
          {busy ? t('reconsider.opening') : t('reconsider.openIt')}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[12.5px] text-muted underline decoration-line underline-offset-4"
        >
          {t('common.back')}
        </button>
      </div>

      <p className="mt-3 max-w-[58ch] text-[12px] leading-[1.6] text-muted">
        {t('reconsider.evenIfNothingChanges')}
      </p>
    </div>
  );
}

import { useState } from 'react';
import Act from './Act.js';
import { useNavigate } from 'react-router-dom';
import { governance } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Field, HEADING } from './field.js';
import { Button } from './Button';

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

  /** Whether the window that opens the matter is showing. */
  const [opening, setOpening] = useState(false);

  if (!canOpen) return null;

  async function raise() {
    const made = await governance.openMatter({
      boardId,
      title: theTitle,
      proposal: theProposal,
      direction,
      origin,
    });
    navigate(`/matters/${made.id}`);
  }

  if (!open) {
    return (
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 text-ui font-semibold text-lapis underline decoration-line underline-offset-4"
      >
        {label}
      </Button>
    );
  }

  return (
    <div className="mt-3 rounded-card bg-ink px-4 py-4 shadow-ring">
      <p className="mb-3 max-w-[58ch] text-ui leading-relaxed text-muted">{t('raise.lead')}</p>

      <Field label={t('raise.title')} className="mb-3" headingClass={HEADING}>
        {(attrs) => (
          <input
            {...attrs}
            value={theTitle}
            onChange={(e) => setTheTitle(e.target.value)}
            className="w-full rounded-card bg-raised px-4 py-2.5 text-body text-paper shadow-ring outline-none"
          />
        )}
      </Field>

      <Field label={t('raise.proposal')} headingClass={HEADING}>
        {(attrs) => (
          <textarea
            {...attrs}
            value={theProposal}
            onChange={(e) => setTheProposal(e.target.value)}
            rows={5}
            className="w-full rounded-card bg-raised px-4 py-3 text-body leading-relaxed text-paper shadow-ring outline-none"
          />
        )}
      </Field>


      <div className="mt-3 flex flex-wrap items-center gap-4">
        <Button
          type="button"
          onClick={() => setOpening(true)}
          disabled={!theTitle.trim() || !theProposal.trim()}
          className="rounded-card bg-lapis px-6 py-3 text-body font-bold text-white shadow-act disabled:opacity-50"
        >
          {t('raise.openIt')}
        </Button>

            {/*
              NO-AFTER: openMatter — shown, not announced.

              All four ways of opening a matter land the member on the
              matter itself. The screen becomes what follows, and a panel
              saying so would stand between them and the work.
            */}
            <Act
              open={opening}
              onClose={() => setOpening(false)}
              title={t('raise.openIt')}
              does={t('wm.openMatter.does')}
              means={t('wm.openMatter.means')}
              label={t('raise.openIt')}
              perform={raise}
            />
        <Button
          type="button"
          onClick={() => setOpen(false)}
          className="text-ui text-muted underline decoration-line underline-offset-4"
        >
          {t('common.back')}
        </Button>
      </div>

      {note && <p className="mt-3 max-w-[58ch] text-note leading-relaxed text-muted">{note}</p>}
    </div>
  );
}

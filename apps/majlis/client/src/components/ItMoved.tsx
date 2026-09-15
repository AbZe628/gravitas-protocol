import { useI18n } from '../lib/i18n.js';
import Dialog from './Dialog.js';
import { Button } from './Button';

/**
 * Somebody wrote while you were writing. `N-04` in docs/FLOW.md.
 *
 * ── the fault behind this window ──────────────────────────────────────────
 *
 * A board of five works one matter at once — that is the product. Two of them
 * answering the same condition used to mean the second silently replaced the
 * first: no error, no notice, and a scholar's reasoning gone from the record
 * with nobody aware it had been there. The version on every act now refuses
 * that write. This is what the member sees when it is refused.
 *
 * ── it is a conversation, not an error ────────────────────────────────────
 *
 * A bare *try again* would be the annoyance, and worse: a member who is told
 * only that something failed will press again harder, and the second press is
 * the one that loses the work. So this shows **both** — what arrived while
 * they were writing, and what they wrote — and asks them to decide. That is
 * the one decision software cannot make: whether a colleague's finding changes
 * the argument is a question about the argument.
 *
 * ── and their words are not taken away ────────────────────────────────────
 *
 * Nothing is cleared. The text stays in the box behind this window, and it is
 * shown here so the member can read both at once rather than dismissing this
 * to go and look. A window that loses what somebody typed is the fault this
 * window exists to report.
 */
export default function ItMoved({
  open,
  theirs,
  yours,
  onLook,
  onAnyway,
  onClose,
}: {
  open: boolean;
  /** What arrived while they were writing, in the record's own words. */
  theirs: { who: string; what: string } | null;
  /** What the member wrote and has not recorded. */
  yours: string;
  /** Go and read it, keeping what was typed. */
  onLook: () => void;
  /** Record theirs anyway, as a correction that supersedes rather than erases. */
  onAnyway: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();

  return (
    <Dialog
      open={open}
      title={t('moved.title')}
      onClose={onClose}
      acts={
        <>
          <Button tone="quiet" size="md" onClick={onClose}>
            {t('moved.stay')}
          </Button>
          <Button tone="quiet" size="md" onClick={onAnyway}>
            {t('moved.recordMine')}
          </Button>
          <Button tone="act" size="md" onClick={onLook}>
            {t('moved.look')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-ui leading-relaxed text-sand">{t('moved.says')}</p>

        <div className="flex flex-col gap-3">
          <section className="rounded-card bg-goldtint px-4 py-3">
            <h3 className="text-label font-bold uppercase tracking-caps text-goldink">
              {theirs ? `${t('moved.theirs')} · ${theirs.who}` : t('moved.theirs')}
            </h3>
            <p className="mt-1.5 font-display text-body leading-snug text-paper">
              {theirs ? theirs.what : t('moved.theirsUnknown')}
            </p>
          </section>

          <section className="rounded-card bg-lapistint px-4 py-3">
            <h3 className="text-label font-bold uppercase tracking-caps text-lapis">
              {t('moved.yours')}
            </h3>
            <p className="mt-1.5 font-display text-body leading-snug text-paper">
              {yours || t('moved.yoursEmpty')}
            </p>
            <p className="mt-1.5 text-note text-muted">{t('moved.yoursKept')}</p>
          </section>
        </div>

        <p className="text-note leading-relaxed text-muted">{t('moved.nothingLost')}</p>
      </div>
    </Dialog>
  );
}

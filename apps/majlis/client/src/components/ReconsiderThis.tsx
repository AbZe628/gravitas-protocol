import { useI18n } from '../lib/i18n.js';
import type { Rule } from '../lib/api.js';
import RaiseAMatter from './RaiseAMatter.js';

/**
 * From a ruling whose review date has passed, to a matter about it.
 *
 * ── the step that was missing ─────────────────────────────────────────────
 *
 * The review dates were computed, and shown, and that was all. A rule could
 * sit overdue on the screen for a year with nothing to press. `services/
 * review.ts` says it plainly: this is the only kind of work with no external
 * trigger — nothing arrives to make a periodic review happen, so it slips.
 * Showing that it had slipped and offering nothing was the application making
 * the same point and then failing to help.
 *
 * ── reconsidering a rule is a matter, not a button ────────────────────────
 *
 * There is deliberately no *mark as reviewed*. A review that changed nothing
 * is still the board looking at a rule and saying it still holds, and that is
 * a decision with a date and a name on it. Anything less would let a rule be
 * cleared by whoever happened to open the screen.
 *
 * ── permitting, because the direction decides the threshold ───────────────
 *
 * Reconsidering is not itself a restriction. Carrying the lower restricting
 * threshold would let a rule be changed by fewer signatures than made it.
 *
 * The form and the wording of the act live in `RaiseAMatter`, which four
 * screens now share. Four copies of one act is how an application ends up
 * with four wordings for one thing.
 */
export default function ReconsiderThis({ rule, canOpen }: { rule: Rule; canOpen: boolean }) {
  const { t } = useI18n();

  return (
    <RaiseAMatter
      boardId={rule.boardId}
      title={`${t('reconsider.titlePrefix')} ${rule.title}`}
      proposal={[`${t('reconsider.theRule')} ${rule.statement}`, '', t('reconsider.theQuestion')].join(
        '\n',
      )}
      direction="permit"
      origin="periodic_review"
      label={t('reconsider.doIt')}
      note={t('reconsider.evenIfNothingChanges')}
      canOpen={canOpen}
    />
  );
}

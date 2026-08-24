import { useIdentity } from '../lib/identity.js';
import { useI18n } from '../lib/i18n.js';

/**
 * Why the buttons are not there.
 *
 * Stage Two hides what a role cannot do, which is right — an action offered and
 * then refused wastes someone's time. But hiding it without saying anything
 * produces the worse failure: a board opens Majlis, reads that the stage is one
 * where they decide, and finds nothing to press. The interface looks broken when
 * it is working exactly as configured.
 *
 * A shared credential cannot say which member is at the keyboard, so it cannot
 * attribute a vote, so it may only read. That is a deliberate property and not a
 * fault — but it has to be stated, with what to do about it, at the top of the
 * page rather than in a deployment note nobody opens.
 */
export default function WhoYouAre() {
  const { identity, loading } = useIdentity();
  const { t } = useI18n();

  if (loading || !identity) return null;
  if (identity.role !== 'observer') return null;

  return (
    <div className="mb-5 rounded-lg border border-goldsoft/40 bg-goldsoft/[0.07] px-4 py-3">
      <div className="mb-1 text-[13px] font-medium text-paper">{t('whoami.observerTitle')}</div>
      <p className="text-[12.5px] leading-relaxed text-paper/70">{t('whoami.observerBody')}</p>
    </div>
  );
}

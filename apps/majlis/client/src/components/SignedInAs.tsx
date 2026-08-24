import { useIdentity } from '../lib/identity.js';
import { useI18n } from '../lib/i18n.js';

/**
 * Who the interface thinks you are.
 *
 * Stage Two shows different controls to different roles, which is right, and
 * which is also invisible: a signatory and an advisory member see two different
 * pages and nothing on either says why. Someone watching a board work — or
 * being shown how it works — cannot tell whether a missing button means "you
 * may not" or "it is broken".
 *
 * The role is the part that carries meaning, so it is the part that is legible.
 * The member id is next to it because in a room where the credential is being
 * passed between people, which member is acting is the question being asked.
 *
 * Nothing here is a control. Authority lives in routes/governance.ts, and this
 * only reports what that will decide.
 */
export default function SignedInAs() {
  const { identity, loading } = useIdentity();
  const { t } = useI18n();

  if (loading || !identity) return null;

  const observer = identity.role === 'observer';

  return (
    <div className="text-right leading-tight">
      <div
        className={
          'text-[11px] font-medium ' + (observer ? 'text-muted' : 'text-goldsoft')
        }
      >
        {t(`who.role.${identity.role}`)}
      </div>
      <div className="text-[10px] text-muted">{identity.scholarId}</div>
    </div>
  );
}

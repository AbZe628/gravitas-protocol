import { useState } from 'react';
import { oversight, type Delivery, type Notice } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import TheNotice from './TheNotice.js';

/**
 * Telling the bank, from wherever the thing happened.
 *
 * ── the half that was missing everywhere ──────────────────────────────────
 *
 * The audit found the same fault on six screens and read it as six faults:
 * the register, the figures, the reviews, the library, the rulings and the
 * drafts all ran to the point of the board's act and stopped. What was
 * missing on all six was the same sentence a scholar says next — *and then we
 * tell the bank* — which existed nowhere in the application.
 *
 * So this is one control, and it goes on every screen where something has
 * just been decided, computed or found.
 *
 * ── it composes and it does not send ──────────────────────────────────────
 *
 * The same honesty as every other notice here. Most installations have no
 * channel, and what a board gets is the words — correct, complete, and
 * theirs to send. A button that said *Send* and quietly did nothing would
 * leave a board believing the desk had been told, which is worse than having
 * no button at all.
 */
export default function TellTheBank({
  kind,
  id,
  label,
}: {
  kind: 'ruling' | 'refusal' | 'draft_ready' | 'figure' | 'examination';
  id: string;
  /** Optional override; the plain one fits almost everywhere. */
  label?: string;
}) {
  const { t } = useI18n();
  const [told, setTold] = useState<{ notice: Notice; delivery: Delivery } | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  async function compose() {
    setBusy(true);
    setFailed(null);
    try {
      setTold(await oversight.telling(kind, id));
    } catch (e) {
      setFailed(e instanceof Error ? e.message : t('tell.failed'));
    } finally {
      setBusy(false);
    }
  }

  if (told) {
    return (
      <div className="mt-5">
        <TheNotice notice={told.notice} delivery={told.delivery} />
      </div>
    );
  }

  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={compose}
        disabled={busy}
        className="rounded-card bg-raised px-5 py-2.5 text-[13.5px] font-semibold text-lapis shadow-ring disabled:opacity-50"
      >
        {busy ? t('tell.composing') : (label ?? t('tell.doIt'))}
      </button>
      {failed && <p className="mt-2 text-[12.5px] text-breach">{failed}</p>}
    </div>
  );
}

import { useState } from 'react';
import { oversight, Refused, type Asset } from '../lib/api.js';
import { useHealth } from '../lib/health.js';
import { useI18n } from '../lib/i18n.js';
import { useIdentity, mayDeliberate } from '../lib/identity.js';

/**
 * Conventional or tokenised, on the holding itself.
 *
 * ── what it decides ───────────────────────────────────────────────────────
 *
 * Four things about every ruling over this holding: who carries it out, how it
 * is checked, when drift shows up, and what a contract cannot see. That is why
 * it sits on the holding rather than in a settings screen — the board reading
 * a ruling is the one who needs the answer, and it is different for the two
 * kinds in the same bank.
 *
 * ── where no chain is attached, none of this appears ──────────────────────
 *
 * Not hidden. There is nothing to distinguish: every holding is carried out by
 * people and every ruling is a record. A badge saying "conventional" on every
 * row of an ordinary installation would make it look like the reduced version
 * of something, which is exactly the impression the handbook says not to give.
 *
 * ── and the basis is shown with the answer ────────────────────────────────
 *
 * "The board marked this" and "this has a contract address, so it is read as
 * tokenised" are different answers. A board that was never asked can see that
 * it was never asked, and mark it in one press.
 */

export default function HowThisIsHeld({
  asset,
  onChanged,
}: {
  asset: Asset;
  onChanged?: (next: Asset) => void;
}) {
  const { t } = useI18n();
  const health = useHealth();
  const { identity } = useIdentity();

  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);

  // The first question, and the reason there is usually nothing here at all.
  if (!health || health.enforcement !== 'gravitas-registry') return null;

  const onChain = (asset.identifiers ?? []).find((i) => i.scheme === 'chain');
  const mark: 'conventional' | 'tokenised' = asset.heldAs ?? (onChain ? 'tokenised' : 'conventional');
  const basis = asset.heldAs
    ? 'recorded'
    : onChain
      ? 'read from the register'
      : 'nothing says otherwise';

  const mayMark = mayDeliberate(identity?.role);

  async function mark_as(next: 'conventional' | 'tokenised') {
    if (busy) return;
    setBusy(true);
    setRefusal(null);
    try {
      const saved = await oversight.markHolding(asset.id, next);
      onChanged?.(saved);
    } catch (e) {
      setRefusal(e instanceof Refused ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-6 rounded-card bg-ink px-5 py-4">
      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
        {t('held.heading')}
      </div>

      <p className="max-w-[62ch] text-[13.5px] leading-[1.6] text-paper">
        {t(`held.${mark}`)}
        <span className="ms-2 text-[12px] text-muted">{t(`carry.basis.${basis}`)}</span>
      </p>

      {/* What that means for a ruling over it. The handbook's table, in a line. */}
      <p className="mt-2 max-w-[62ch] text-[12.5px] leading-[1.6] text-sand">
        {t(`held.means.${mark}`)}
      </p>

      {/*
        The one press. Offered only where the answer was read rather than
        recorded — a board that has already marked it is not asked again, and
        changing a mark is the same press on the other value.
      */}
      {mayMark && (
        <button
          type="button"
          onClick={() => void mark_as(mark === 'tokenised' ? 'conventional' : 'tokenised')}
          disabled={busy}
          className="mt-3 text-[12.5px] text-lapis underline decoration-line underline-offset-4 disabled:opacity-50"
        >
          {t(mark === 'tokenised' ? 'held.markConventional' : 'held.markTokenised')}
        </button>
      )}

      {refusal && <p className="mt-2 text-[12.5px] leading-[1.6] text-breach">{refusal}</p>}
    </div>
  );
}

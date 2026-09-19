import { useState } from 'react';
import Act from './Act.js';
import { oversight, type Asset } from '../lib/api.js';
import { useHealth } from '../lib/health.js';
import { useI18n } from '../lib/i18n.js';
import { useIdentity, mayDeliberate } from '../lib/identity.js';
import { Button } from './Button';

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
  /** Whether the window that changes the mark is open. */
  const [marking, setMarking] = useState(false);

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
    const saved = await oversight.markHolding(asset.id, next);
    onChanged?.(saved);
  }

  return (
    <div className="mb-6 rounded-card bg-ink px-5 py-4">
      <div className="mb-1.5 text-label font-bold uppercase tracking-caps text-muted">
        {t('held.heading')}
      </div>

      <p className="max-w-[62ch] text-body leading-relaxed text-paper">
        {t(`held.${mark}`)}
        <span className="ms-2 text-note text-muted">{t(`carry.basis.${basis}`)}</span>
      </p>

      {/* What that means for a ruling over it. The handbook's table, in a line. */}
      <p className="mt-2 max-w-[62ch] text-ui leading-relaxed text-sand">
        {t(`held.means.${mark}`)}
      </p>

      {/*
        The one press. Offered only where the answer was read rather than
        recorded — a board that has already marked it is not asked again, and
        changing a mark is the same press on the other value.
      */}
      {mayMark && (
        <Button
          type="button"
          onClick={() => setMarking(true)}
          className="mt-3 text-ui text-lapis underline decoration-line underline-offset-4"
        >
          {t(mark === 'tokenised' ? 'held.markConventional' : 'held.markTokenised')}
        </Button>
      )}

      {/*
        How a thing is held decides which reading governs it, so this press
        changes what every later ruling over this holding is measured by. It
        is one word on the screen and a different body of reasoning behind it.
      */}
      <Act
        open={marking}
        onClose={() => setMarking(false)}
        title={t(mark === 'tokenised' ? 'held.markConventional' : 'held.markTokenised')}
        does={t('wm.held.does')}
        means={t('wm.held.means')}
        label={t(mark === 'tokenised' ? 'held.markConventional' : 'held.markTokenised')}
        perform={() => mark_as(mark === 'tokenised' ? 'conventional' : 'tokenised')}
      />

      {/*
        NO-WINDOW: markHolding — the half of it that is missing, and why.

        There is a window before the press. There is no *what follows* after
        it, because the answer is the screen itself: the line above says how
        this is held, the line under it says which reasoning governs it, and
        both change under the member's eyes the moment the mark does. A panel
        announcing what the two lines already say would be the same sentence
        twice, and the second one would have to be dismissed.
      */}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { api, oversight, type Asset, type RecordInput } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Refusal, Text } from './calc.js';

/**
 * Noting a calculation against a period.
 *
 * Until this existed, a scholar who worked out zakat and closed the tab had
 * computed nothing anybody could point to later. The calculation was correct
 * and it was not evidence.
 *
 * ── what this panel is careful about ──────────────────────────────────────
 *
 * **It says what recording means before it offers to do it.** The sentence
 * comes from the server and is shown, not restated: noting a calculation is
 * not approval of the method, which is a ruling and is made in the ordinary
 * way. A board pressing a button labelled "record" should already know it is
 * not pressing one labelled "approve".
 *
 * **It asks for the period rather than guessing one.** Zakat carries a hawl
 * date and no start; a year could be derived from it, but which year — lunar
 * or solar — is exactly the thing the board chose, and deriving it here would
 * quietly pick again. Purification and distribution arrive with both ends, so
 * those fields come pre-filled and are still editable.
 *
 * **It says plainly, once it is done, that the figure is now in the record.**
 * And it does not offer to record the same figure twice: the button goes, and
 * what replaces it is a line saying where the figure now lives.
 */

export interface RecordProps {
  /** Everything the calculation produced, ready to be noted. */
  input: Omit<RecordInput, 'boardId' | 'periodFrom' | 'periodTo'> & {
    periodFrom?: string;
    periodTo?: string;
  };
  /** Whether the calculation is about one holding. Zakat and distribution are not. */
  wantsHolding?: boolean;
}

export default function RecordCalculation({ input, wantsHolding = false }: RecordProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(input.periodFrom ?? '');
  const [to, setTo] = useState(input.periodTo ?? '');
  const [assetId, setAssetId] = useState(input.assetId ?? '');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [meaning, setMeaning] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // The sentence about what recording means, from the server, before the
    // panel offers to do it.
    oversight
      .computations()
      .then((d) => setMeaning(d.whatRecordingMeans))
      .catch(() => setMeaning(null));

    if (wantsHolding) {
      oversight
        .register()
        .then((r) => setAssets(r.assets.map((a) => a.asset)))
        .catch(() => setAssets([]));
    }
  }, [wantsHolding]);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const boards = await api.boards();
      if (!boards.length) throw new Error(t('noteCalc.noBoard'));

      const saved = await oversight.recordComputation({
        ...input,
        boardId: boards[0].id,
        assetId: wantsHolding ? assetId || null : null,
        periodFrom: from,
        periodTo: to,
      });
      setDone(saved.computation.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  // Recorded. The offer to record it goes, so the same figure is not noted
  // twice by somebody pressing the button again.
  if (done) {
    return (
      <p className="mt-3 rounded border border-emerald-700/50 px-3 py-2.5 text-[12.5px] leading-relaxed">
        {t('noteCalc.done')}
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 rounded border border-line px-3 py-1.5 text-[13px] text-muted transition-colors hover:border-muted hover:text-paper"
      >
        {t('noteCalc.open')}
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-line px-4 py-3.5">
      <div className="mb-2 text-[11px] uppercase tracking-wider text-muted">{t('noteCalc.title')}</div>

      {/* The server's own words. Shown before the panel offers to act. */}
      {meaning && <p className="mb-3 text-[12.5px] leading-relaxed text-muted">{meaning}</p>}

      <div className="flex gap-2">
        <div className="flex-1">
          <Text label={t('calc.from')} type="date" value={from} onChange={setFrom} />
        </div>
        <div className="flex-1">
          <Text label={t('calc.to')} type="date" value={to} onChange={setTo} />
        </div>
      </div>

      {wantsHolding && (
        <label className="mb-2.5 block">
          <span className="mb-1 block text-[11px] uppercase tracking-wider text-muted">
            {t('noteCalc.holding')}
          </span>
          <select
            value={assetId}
            onChange={(e) => setAssetId(e.target.value)}
            className="w-full rounded border border-line bg-transparent px-3 py-2 text-[13px]"
          >
            <option value="">{t('noteCalc.noHolding')}</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {/* The refusal in the server's words: it says why, and a border cannot. */}
      {error && <Refusal>{error}</Refusal>}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={save}
          className="rounded border border-gold/60 px-3.5 py-1.5 text-[13px] text-goldsoft transition-colors hover:bg-gold/10 disabled:opacity-50"
        >
          {t('noteCalc.save')}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="rounded border border-line px-3 py-1.5 text-[13px] text-muted"
        >
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import Act from './Act.js';
import { api, oversight, type Asset, type RecordInput } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Text } from './calc.js';
import { useWorkedOutFor } from '../lib/workedOutFor.js';
import { Button } from './Button';

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
  /** Told when the figure lands, so a step can show it without a reload. */
  onRecorded?: (computationId: string) => void;
}

export default function RecordCalculation({
  input,
  wantsHolding = false,
  onRecorded,
}: RecordProps) {
  /* Set when this calculator was opened from a step of a case. Null at the workbench. */
  const forStep = useWorkedOutFor();

  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(input.periodFrom ?? '');
  const [to, setTo] = useState(input.periodTo ?? '');
  const [assetId, setAssetId] = useState(input.assetId ?? '');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [meaning, setMeaning] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

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

  /** Whether the window that records the figure is open. */
  const [recording, setRecording] = useState(false);

  async function save() {
    const boards = await api.boards();
    if (!boards.length) throw new Error(t('noteCalc.noBoard'));

    const saved = await oversight.recordComputation({
      ...input,
      boardId: boards[0].id,
      assetId: wantsHolding ? assetId || null : null,
      periodFrom: from,
      periodTo: to,
        /*
          Which question this answers, where it was opened from one.

          A figure worked out on a step of a case used to go to the
          calculations screen with nothing saying what it had been asked
          about, and the step it came from showed no sign of it. Null at the
          workbench, which is honest: that figure is not for anything yet.
        */
      forMatterId: forStep?.matterId ?? null,
      forConditionId: forStep?.conditionId ?? null,
    });
    setDone(saved.computation.id);
    onRecorded?.(saved.computation.id);
    forStep?.onRecorded?.(saved.computation.id);
  }

  // Recorded. The offer to record it goes, so the same figure is not noted
  // twice by somebody pressing the button again.
  if (done) {
    return (
      <p className="mt-3 rounded-xl bg-settledtint px-4 py-2.5 text-ui leading-relaxed text-settled shadow-ringsettled">
        {t('noteCalc.done')}
      </p>
    );
  }

  if (!open) {
    return (
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 rounded-xl shadow-ring px-3 py-1.5 text-ui text-muted transition-colors hover:text-paper"
      >
        {t('noteCalc.open')}
      </Button>
    );
  }

  return (
    <div className="mt-3 rounded-card shadow-ring px-4 py-3.5">
      <div className="mb-2 text-label font-bold uppercase tracking-caps text-muted">{t('noteCalc.title')}</div>

      {/* The server's own words. Shown before the panel offers to act. */}
      {meaning && <p className="mb-3 text-ui leading-relaxed text-muted">{meaning}</p>}

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
          <span className="mb-1 block text-label font-bold uppercase tracking-caps text-muted">
            {t('noteCalc.holding')}
          </span>
          <select
            value={assetId}
            onChange={(e) => setAssetId(e.target.value)}
            className="w-full rounded-xl shadow-ring bg-raised px-3 py-2 text-ui"
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

      {/*
        Worked here, or recorded against the condition — the difference this
        window exists to make plain. A scholar who works a figure out and
        assumes it was filed has been misled by the interface; this is the
        press that files it, and it says so before it happens.
      */}
      {/*
        NO-AFTER: recordComputation — shown, not announced.

        The offer to record it goes, and in its place the screen says it is in
        the record and links to where it now stands. That is the answer, drawn
        where the button was, and the same figure cannot be recorded twice by
        pressing again.
      */}
      <Act
        open={recording}
        onClose={() => setRecording(false)}
        title={t('noteCalc.save')}
        does={t('wm.recordCalc.does')}
        means={t('wm.recordCalc.means')}
        label={t('noteCalc.save')}
        perform={save}
      />

      <div className="flex gap-2">
        <Button
          type="button"
          onClick={() => setRecording(true)}
          className="rounded-xl bg-gradient-to-br from-lapissoft to-lapis px-4 py-2 text-ui font-semibold text-white shadow-act transition-colors hover:bg-lapis"
        >
          {t('noteCalc.save')}
        </Button>
        <Button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-xl shadow-ring px-3 py-1.5 text-ui text-muted"
        >
          {t('common.cancel')}
        </Button>
      </div>
    </div>
  );
}

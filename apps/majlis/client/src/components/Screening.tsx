import { useState } from 'react';
import { oversight, type Assessment, type Figures, type RatioResult } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import ReadDocument from './ReadDocument.js';

/**
 * The three screening ratios of AAOIFI Standard 21.
 *
 * **It computes and it never concludes**, and the interface has to carry that as
 * plainly as the service does. A panel that showed three green ticks and a
 * summary line would be giving a verdict in everything but name, and a scholar
 * would reasonably read it as one.
 *
 * So: the arithmetic is shown, not the answer. "1 240 000 ÷ 3 950 000 = 31.39%,
 * against a limit of ≤ 30%. Outside the threshold." is a fact a scholar can
 * check and disagree with. "Fails" is a conclusion they are being asked to
 * accept. The sentence under the result says the rest — that permissibility is
 * a ruling and that the business activity is a separate question no ratio
 * answers.
 *
 * Collapsed until asked for. Most matters are not screening questions, and a
 * form of six money fields on every page would be furniture.
 */

const FIELDS: { key: keyof Figures; label: string }[] = [
  { key: 'marketCapitalisation', label: 'screen.marketCap' },
  { key: 'interestBearingDebt', label: 'screen.debt' },
  { key: 'cashAndInterestBearingSecurities', label: 'screen.cash' },
  { key: 'totalRevenue', label: 'screen.revenue' },
  { key: 'nonPermissibleIncome', label: 'screen.nonPermissible' },
];

const EMPTY: Figures = {
  asOf: new Date().toISOString().slice(0, 10),
  source: '',
  currency: 'USD',
  marketCapitalisation: '',
  interestBearingDebt: '',
  cashAndInterestBearingSecurities: '',
  totalRevenue: '',
  nonPermissibleIncome: '',
};

/**
 * One ratio, as arithmetic.
 *
 * The label, the workings and the authority come from the server in English and
 * are shown as they arrive. Translating them here would mean this interface
 * restating a calculation in its own words, which is exactly what the panel is
 * built not to do — and the generated documents are English-only for now
 * anyway, so a scholar reading the Arabic interface and the Arabic-labelled
 * result would then find the fatwa in English regardless. It is a real gap and
 * belongs in the same piece of work as translating the documents.
 */
function Ratio({ ratio }: { ratio: RatioResult }) {
  // Within, outside, and could-not-be-computed are three states. Collapsing the
  // third into "outside" would report a failure the figures do not support.
  const tone =
    ratio.withinThreshold === null
      ? 'border-line text-muted'
      : ratio.withinThreshold
        ? 'border-emerald-700/50'
        : 'border-warn/50';

  return (
    <li className={'rounded border px-3 py-2.5 ' + tone}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[13px] font-medium">{ratio.label}</span>
        <span className="font-mono text-[13px] tabular-nums">
          {ratio.percent === null ? '—' : ratio.percent + '%'}
        </span>
      </div>
      {/* The sum, not the verdict. */}
      <p className="mt-1 font-mono text-[11.5px] leading-relaxed text-muted break-words">
        {ratio.workings}
      </p>
      <p className="mt-1 text-[11px] text-muted opacity-80">{ratio.authority}</p>
    </li>
  );
}

export default function Screening() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [figures, setFigures] = useState<Figures>(EMPTY);
  const [result, setResult] = useState<Assessment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded border border-line px-3 py-2 text-[13px] text-muted hover:border-muted"
      >
        {t('screen.open')}
      </button>
    );
  }

  async function compute(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await oversight.screen(figures);
      setResult(res.assessment);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  /**
   * A confirmed candidate fills its field and appends its provenance.
   *
   * Appended rather than replacing: a scholar may confirm three figures from a
   * document and type the other two, and the source line has to say both. A
   * figure with no provenance is the ordinary case this feature improves on,
   * not one it refuses to work beside.
   */
  const takeCandidate = (field: string, value: string, provenance: string) => {
    setFigures((was) => ({
      ...was,
      [field]: value,
      source: was.source.trim() ? `${was.source.trim()} ${provenance}` : provenance,
    }));
  };

  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <ReadDocument
        fields={FIELDS.map((f) => ({ key: f.key as string, label: t(f.label) }))}
        onConfirm={takeCandidate}
      />

      <form onSubmit={compute}>
        <div className="mb-3 flex gap-2">
          <label className="flex-1">
            <span className="mb-1 block text-[11px] uppercase tracking-wider text-muted">
              {t('screen.asOf')}
            </span>
            <input
              type="date"
              value={figures.asOf}
              onChange={(e) => setFigures({ ...figures, asOf: e.target.value })}
              className="w-full rounded border border-line bg-transparent px-2 py-1.5 text-[13px]"
            />
          </label>
          <label className="w-24">
            <span className="mb-1 block text-[11px] uppercase tracking-wider text-muted">
              {t('screen.currency')}
            </span>
            <input
              value={figures.currency}
              onChange={(e) => setFigures({ ...figures, currency: e.target.value })}
              className="w-full rounded border border-line bg-transparent px-2 py-1.5 text-[13px]"
            />
          </label>
        </div>

        {FIELDS.map((f) => (
          <label key={f.key} className="mb-2.5 block">
            <span className="mb-1 block text-[11px] uppercase tracking-wider text-muted">
              {t(f.label)}
            </span>
            <input
              inputMode="decimal"
              value={figures[f.key] as string}
              onChange={(e) => setFigures({ ...figures, [f.key]: e.target.value })}
              className="w-full rounded border border-line bg-transparent px-3 py-2 text-[14px] font-mono tabular-nums"
              placeholder="0"
            />
          </label>
        ))}

        <label className="mb-3 block">
          <span className="mb-1 block text-[11px] uppercase tracking-wider text-muted">
            {t('screen.source')}
          </span>
          <input
            value={figures.source}
            onChange={(e) => setFigures({ ...figures, source: e.target.value })}
            placeholder={t('screen.sourceHint')}
            className="w-full rounded border border-line bg-transparent px-3 py-2 text-[13px]"
          />
        </label>

        {error && <p className="mb-3 text-[13px] leading-relaxed text-warn">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded border border-gold/60 px-3 py-1.5 text-[13px] text-goldsoft disabled:opacity-50"
          >
            {t('screen.compute')}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setResult(null);
              setError(null);
            }}
            className="rounded border border-line px-3 py-1.5 text-[13px] text-muted"
          >
            {t('common.cancel')}
          </button>
        </div>
      </form>

      {result && (
        <div className="mt-5 border-t border-line pt-4">
          <ul className="space-y-2">
            {result.ratios.map((r) => (
              <Ratio key={r.key} ratio={r} />
            ))}
          </ul>

          {/*
            Carried from the server rather than written here, so the interface
            cannot soften it and the same sentence travels with the figures
            wherever they go.
          */}
          <p className="mt-3 rounded border border-line bg-surface/60 px-3 py-2.5 text-[12.5px] leading-relaxed text-muted">
            {result.note}
          </p>
        </div>
      )}
    </div>
  );
}

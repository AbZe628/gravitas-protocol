import { useState } from 'react';
import {
  oversight,
  PART_KINDS,
  type CompositionPart,
  type PartKind,
  type Tradability as Result_,
  type TradabilityBand,
  type TradabilityInput,
} from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Compute, Note, Refusal, Result, Text, useCalc } from './calc.js';
import RecordCalculation from './RecordCalculation.js';

/**
 * Whether a pool trades at its price, or is redeemed at par.
 *
 * The other three calculations ask for figures. This one asks for a **rule**,
 * and that is the whole difference in the form. A board's threshold is not a
 * number this screen can offer a default for — some boards count usufruct on
 * the tangible side and some do not, some set one line and some set three — so
 * the composition, what counts, and what the board said happens at each level
 * are all entered, and none of them is pre-filled.
 *
 * ── the form teaches the same thing the server refuses on ─────────────────
 *
 * **The parts must sum to the whole.** The running total is shown while it is
 * being typed, naming what is unaccounted for rather than waiting to refuse.
 * A composition summing to 9 400 has six hundred basis points of something
 * nobody described, and the scholar entering it is the person who can say what.
 *
 * **A band with no consequence is a threshold with nothing attached.** The
 * sentence is the part worth recording — a board that set 51% and never wrote
 * down what happens above it has not finished setting the rule.
 *
 * ── and the answer is the board's own sentence ────────────────────────────
 *
 * What comes back is rendered as a quotation, attributed to the resolution it
 * came from. That is deliberate: a scholar reading it should see the board's
 * words in the board's voice, not a verdict this application composed. Where
 * the composition lands outside every band, the gap is shown in its place and
 * nothing is concluded — which is the more useful answer, because it says the
 * rule needs finishing.
 */

const EMPTY_PART: CompositionPart = { label: '', bps: 0, kind: 'tangible' };
const EMPTY_BAND: TradabilityBand = { fromBps: 0, toBps: 10_000, consequence: '' };

const WHOLE = 10_000;
const pct = (bps: number) => (bps / 100).toFixed(2);

/** A percentage in, basis points out. The conversion happens once, here. */
function BpsField({
  label,
  bps,
  onChange,
}: {
  label: string;
  bps: number;
  onChange: (bps: number) => void;
}) {
  const [text, setText] = useState(String(bps / 100));
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] uppercase tracking-wider text-muted">{label}</span>
      <div className="flex items-center gap-1.5">
        <input
          inputMode="decimal"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            const n = Number(e.target.value);
            onChange(Number.isNaN(n) ? 0 : Math.round(n * 100));
          }}
          className="w-full rounded border border-line bg-transparent px-2.5 py-1.5 font-mono text-[13px] tabular-nums focus:border-muted focus:outline-none"
        />
        <span className="text-[13px] text-muted">%</span>
      </div>
    </label>
  );
}

export default function Tradability() {
  const { t } = useI18n();
  const [asOf, setAsOf] = useState('');
  const [source, setSource] = useState('');
  const [authority, setAuthority] = useState('');
  const [parts, setParts] = useState<CompositionPart[]>([{ ...EMPTY_PART }]);
  const [counts, setCounts] = useState<PartKind[]>([]);
  const [bands, setBands] = useState<TradabilityBand[]>([{ ...EMPTY_BAND }]);
  const { result, error, busy, compute } = useCalc<TradabilityInput, Result_>(oversight.tradability);

  const total = parts.reduce((sum, p) => sum + (Number.isFinite(p.bps) ? p.bps : 0), 0);

  const setPart = (i: number, patch: Partial<CompositionPart>) =>
    setParts((was) => was.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const setBand = (i: number, patch: Partial<TradabilityBand>) =>
    setBands((was) => was.map((b, j) => (j === i ? { ...b, ...patch } : b)));

  const toggleKind = (kind: PartKind) =>
    setCounts((was) => (was.includes(kind) ? was.filter((k) => k !== kind) : [...was, kind]));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        compute({ asOf, source, authority, parts, countsAsTangible: counts, bands });
      }}
    >
      <div className="flex gap-2">
        <div className="flex-1">
          <Text label={t('trade.asOf')} type="date" value={asOf} onChange={setAsOf} />
        </div>
        <div className="flex-[2]">
          <Text
            label={t('calc.source')}
            hint={t('trade.source.hint')}
            value={source}
            onChange={setSource}
          />
        </div>
      </div>

      {/* ── the composition ───────────────────────────────────────────────── */}

      <fieldset className="mb-3 rounded border border-line px-3 py-3">
        <legend className="px-1 text-[11px] uppercase tracking-wider text-muted">
          {t('trade.composition')}
        </legend>
        <p className="mb-2.5 text-[11.5px] leading-relaxed text-muted">{t('trade.composition.hint')}</p>

        <div className="space-y-2">
          {parts.map((part, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2">
              <div className="min-w-[160px] flex-[2]">
                <label className="block">
                  <span className="mb-1 block text-[11px] uppercase tracking-wider text-muted">
                    {t('trade.partLabel')}
                  </span>
                  <input
                    value={part.label}
                    onChange={(e) => setPart(i, { label: e.target.value })}
                    className="w-full rounded border border-line bg-transparent px-2.5 py-1.5 text-[13px] focus:border-muted focus:outline-none"
                  />
                </label>
              </div>
              <div className="w-28">
                <BpsField label={t('trade.share')} bps={part.bps} onChange={(bps) => setPart(i, { bps })} />
              </div>
              <div className="w-36">
                <label className="block">
                  <span className="mb-1 block text-[11px] uppercase tracking-wider text-muted">
                    {t('trade.kind')}
                  </span>
                  <select
                    value={part.kind}
                    onChange={(e) => setPart(i, { kind: e.target.value as PartKind })}
                    className="w-full rounded border border-line bg-transparent px-2.5 py-1.5 text-[13px] focus:border-muted focus:outline-none"
                  >
                    {PART_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {t(`trade.kind.${k}`)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {parts.length > 1 && (
                <button
                  type="button"
                  onClick={() => setParts((was) => was.filter((_, j) => j !== i))}
                  className="rounded border border-line px-2.5 py-1.5 text-[12px] text-muted hover:border-muted hover:text-paper"
                >
                  {t('trade.removePart')}
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setParts((was) => [...was, { ...EMPTY_PART }])}
          className="mt-2.5 rounded border border-line px-2.5 py-1 text-[12px] text-muted hover:border-muted hover:text-paper"
        >
          {t('trade.addPart')}
        </button>

        {/*
          The running total, named while it is being typed rather than refused
          afterwards. The person entering the composition is the person who can
          say what the missing part is.
        */}
        <p
          className={
            'mt-2.5 font-mono text-[12px] tabular-nums ' +
            (total === WHOLE ? 'text-muted' : 'text-warn')
          }
        >
          {pct(total)}%
          {total !== WHOLE && (
            <span className="ms-2 font-sans">
              {total < WHOLE
                ? t('trade.shortBy').replace('{n}', pct(WHOLE - total))
                : t('trade.overBy').replace('{n}', pct(total - WHOLE))}
            </span>
          )}
        </p>
      </fieldset>

      {/* ── what the board counts ─────────────────────────────────────────── */}

      <fieldset className="mb-3 rounded border border-line px-3 py-3">
        <legend className="px-1 text-[11px] uppercase tracking-wider text-muted">
          {t('trade.counts')}
        </legend>
        {/*
          Nothing checked to begin with, and no default. Reading `tangible` off
          the label and counting it would be this application settling a
          classification question that belongs to the board.
        */}
        <p className="mb-2.5 text-[11.5px] leading-relaxed text-muted">{t('trade.counts.hint')}</p>
        <div className="flex flex-wrap gap-1.5">
          {PART_KINDS.map((k) => (
            <label
              key={k}
              className={
                'flex cursor-pointer items-center gap-2 rounded border px-2.5 py-1.5 text-[12.5px] transition-colors ' +
                (counts.includes(k) ? 'border-gold/60 bg-gold/[0.06]' : 'border-line hover:border-muted')
              }
            >
              <input type="checkbox" checked={counts.includes(k)} onChange={() => toggleKind(k)} />
              {t(`trade.kind.${k}`)}
            </label>
          ))}
        </div>
      </fieldset>

      {/* ── the board's rule ──────────────────────────────────────────────── */}

      <fieldset className="mb-3 rounded border border-line px-3 py-3">
        <legend className="px-1 text-[11px] uppercase tracking-wider text-muted">
          {t('trade.bands')}
        </legend>
        <p className="mb-2.5 text-[11.5px] leading-relaxed text-muted">{t('trade.bands.hint')}</p>

        <div className="space-y-2.5">
          {bands.map((band, i) => (
            <div key={i} className="rounded border border-line px-2.5 py-2.5">
              <div className="mb-2 flex flex-wrap items-end gap-2">
                <div className="w-28">
                  <BpsField
                    label={t('trade.from')}
                    bps={band.fromBps}
                    onChange={(fromBps) => setBand(i, { fromBps })}
                  />
                </div>
                <div className="w-28">
                  <BpsField
                    label={t('trade.to')}
                    bps={band.toBps}
                    onChange={(toBps) => setBand(i, { toBps })}
                  />
                </div>
                {bands.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setBands((was) => was.filter((_, j) => j !== i))}
                    className="rounded border border-line px-2.5 py-1.5 text-[12px] text-muted hover:border-muted hover:text-paper"
                  >
                    {t('trade.removeBand')}
                  </button>
                )}
              </div>
              <label className="block">
                <span className="mb-1 block text-[11px] uppercase tracking-wider text-muted">
                  {t('trade.consequence')}
                </span>
                <textarea
                  value={band.consequence}
                  rows={2}
                  placeholder={t('trade.consequence.placeholder')}
                  onChange={(e) => setBand(i, { consequence: e.target.value })}
                  className="w-full rounded border border-line bg-transparent px-2.5 py-1.5 text-[13px] leading-relaxed focus:border-muted focus:outline-none"
                />
                <span className="mt-1 block text-[11px] leading-relaxed text-muted opacity-80">
                  {t('trade.consequence.hint')}
                </span>
              </label>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setBands((was) => [...was, { ...EMPTY_BAND }])}
          className="mt-2.5 rounded border border-line px-2.5 py-1 text-[12px] text-muted hover:border-muted hover:text-paper"
        >
          {t('trade.addBand')}
        </button>
      </fieldset>

      <Text
        label={t('trade.authority')}
        hint={t('trade.authority.hint')}
        value={authority}
        onChange={setAuthority}
      />

      {error && <Refusal>{error}</Refusal>}
      <Compute busy={busy} label={t('calc.compute')} />

      {result && (
        <Result
          headline={t('trade.counted')}
          amount={`${result.countedPercent}%`}
          steps={result.steps}
        >
          {/*
            The board's own sentence, set as a quotation and attributed. A
            scholar reading this should see the board's words in the board's
            voice — not a permission this application composed.
          */}
          {result.band && (
            <blockquote className="mb-3 border-s-2 border-gold/60 ps-3">
              <p className="text-[13px] leading-relaxed">“{result.band.consequence}”</p>
              <footer className="mt-1 text-[11.5px] text-muted">
                {t('trade.bandStated')
                  .replace('{from}', pct(result.band.fromBps))
                  .replace('{to}', pct(result.band.toBps))}
                {result.authority && <span> — {result.authority}</span>}
              </footer>
            </blockquote>
          )}

          {/*
            A gap, shown where the answer would have been. Not an error: the
            arithmetic worked, and it is the rule that needs finishing.
          */}
          {result.unstated && (
            <p className="mb-3 rounded border border-warn/50 px-3 py-2.5 text-[12.5px] leading-relaxed text-warn">
              {result.unstated}
            </p>
          )}

          <div className="mb-3 space-y-1">
            {result.byKind.map((k) => (
              <div key={k.kind} className="flex items-baseline justify-between gap-2 text-[12.5px]">
                <span className={result.countsAsTangible.includes(k.kind) ? 'text-paper' : 'text-muted'}>
                  {t(`trade.kind.${k.kind}`)}
                  {result.countsAsTangible.includes(k.kind) && (
                    <span className="ms-1.5 text-[11px] text-goldsoft">{t('trade.countedMark')}</span>
                  )}
                </span>
                <span className="font-mono tabular-nums text-muted">{k.percent}%</span>
              </div>
            ))}
          </div>

          {/*
            A pool that is entirely one thing is governed by more than a ratio,
            and a board reading 0.00% should be pointed at the standard that
            actually governs rather than left to infer it from a zero.
          */}
          {result.alsoGovernedBy.map((line, i) => (
            <p key={i} className="mb-2 rounded border border-line px-3 py-2 text-[12.5px] leading-relaxed">
              {line}
            </p>
          ))}
        </Result>
      )}
      {result && <Note>{result.note}</Note>}

      {result && (
        <RecordCalculation
          wantsHolding
          input={{
            kind: 'tangibility',
            method: 'bands',
            methodStated: result.authority,
            currency: '—',
            source: result.source,
            figures: {
              countsAsTangible: result.countsAsTangible.join(', '),
              ...Object.fromEntries(result.byKind.map((k) => [k.kind, `${k.percent}%`])),
            },
            headline: 'Counted on the tangible side',
            amount: `${result.countedPercent}%`,
            steps: result.steps,
            note: result.note,
            periodFrom: result.asOf,
            periodTo: result.asOf,
          }}
        />
      )}
    </form>
  );
}

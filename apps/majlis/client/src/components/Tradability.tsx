import { useEffect, useState } from 'react';
import {
  oversight,
  PART_KINDS,
  type Composition,
  type CompositionPart,
  type PartKind,
  type Tradability as Result_,
  type TradabilityBand,
  type TradabilityInput,
} from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Compute, Note, Refusal, Result, Text, useCalc } from './calc.js';
import RecordCalculation from './RecordCalculation.js';
import FromTheRegister from './FromTheRegister.js';
import ReadDocument from './ReadDocument.js';
import { Button } from './Button';

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

  /*
   * Follow the value when it is replaced from outside.
   *
   * This field keeps its own text so a half-typed "3." is not rewritten under
   * the typist. That is right while a person is typing and wrong the moment
   * the figures are filled in from the register: the rows that already existed
   * kept their old text and the first part of the mixed pool showed 0 where
   * the record says 31. Rows two to four looked correct only because they were
   * newly mounted.
   *
   * So the local text follows the prop whenever the prop is not what the text
   * already means — which leaves typing alone and fixes filling in.
   */
  useEffect(() => {
    const asTyped = Math.round((Number(text) || 0) * 100);
    if (asTyped !== bps) setText(String(bps / 100));
    // Only when the value arrives from outside.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bps]);

  return (
    <label className="block">
      <span className="mb-1 block text-label font-bold uppercase tracking-caps text-muted">{label}</span>
      <div className="flex items-center gap-1.5">
        <input
          inputMode="decimal"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            const n = Number(e.target.value);
            onChange(Number.isNaN(n) ? 0 : Math.round(n * 100));
          }}
          className="w-full rounded-xl shadow-ring bg-raised px-2.5 py-1.5 font-mono text-ui tabular-nums focus:shadow-pick focus:outline-none"
        />
        <span className="text-ui text-muted">%</span>
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
  const [takenFrom, setTakenFrom] = useState<string | null>(null);
  const { result, error, busy, compute } = useCalc<TradabilityInput, Result_>(oversight.tradability);

  /*
   * The figures come from the register, because the register has them.
   *
   * All three fields at once — the parts, the date they were measured, and the
   * document they came from. Taking the numbers and leaving the provenance
   * behind would produce a recorded calculation nobody can trace, which is the
   * failure the whole `source` field exists to prevent.
   */
  function takeFromRegister(from: { assetId: string; name: string; composition: Composition }) {
    setParts(from.composition.parts.map((p) => ({ ...p })));
    setAsOf((from.composition.asOf ?? '').slice(0, 10));
    setSource(from.composition.source ?? '');
    setTakenFrom(from.assetId);
  }

  /*
   * Reading the shares out of the prospectus, for the parts the board named.
   *
   * ── why the board names them first ────────────────────────────────────
   *
   * Everywhere else the fields are fixed: a balance sheet has a cash line
   * whatever the board thinks. A composition does not. What the parts of a
   * pool are, and which of them are worth separating, is the classification
   * question this whole screen exists to put to a board — so a reader that
   * proposed the parts would be answering it, which is the one thing nothing
   * here may do. The scholar writes the labels; the reader looks for those
   * labels and nothing else.
   *
   * ── and a share is not an amount ──────────────────────────────────────
   *
   * A prospectus states "AED 4,250,000" far more often than "31%". Turning
   * the first into the second needs a denominator, and which figures belong
   * in it is again the board's. So an amount is not converted: it is set
   * aside, shown with what was read, and the scholar enters the share. A
   * silent division here would put a number nobody chose into a threshold
   * the board votes on.
   */
  const named = parts
    .map((p, i) => ({ key: `part-${i}`, label: p.label.trim(), kind: 'share' as const }))
    .filter((p) => p.label !== '');

  /*
   * A share arrives as a share or it does not arrive.
   *
   * The reader will not offer an amount for a field asked for as a share —
   * it says what it read and leaves the field alone — so nothing that
   * reaches here needs converting from anything. All this does is put the
   * per cent into basis points, which is the same conversion the typed
   * field does.
   */
  const takeCandidate = (field: string, value: string, provenance: string) => {
    const i = Number(field.slice('part-'.length));
    if (!Number.isInteger(i) || !parts[i]) return;

    const n = Number(value.replace(/[\s,]/g, '').replace(/%$/, ''));
    if (!Number.isFinite(n)) return;

    setPart(i, { bps: Math.round(n * 100) });
    setSource((was) => (was.trim() ? `${was.trim()} ${provenance}` : provenance));
  };

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
      <FromTheRegister onTake={takeFromRegister} chosenId={takenFrom} />

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

      <fieldset className="mb-3 rounded-xl shadow-ring px-3 py-3">
        <legend className="px-1 text-label font-bold uppercase tracking-caps text-muted">
          {t('trade.composition')}
        </legend>
        <p className="mb-2.5 text-note leading-relaxed text-muted">{t('trade.composition.hint')}</p>

        <div className="space-y-2">
          {parts.map((part, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2">
              <div className="min-w-[160px] flex-[2]">
                <label className="block">
                  <span className="mb-1 block text-label font-bold uppercase tracking-caps text-muted">
                    {t('trade.partLabel')}
                  </span>
                  <input
                    value={part.label}
                    onChange={(e) => setPart(i, { label: e.target.value })}
                    className="w-full rounded-xl shadow-ring bg-raised px-2.5 py-1.5 text-ui focus:shadow-pick focus:outline-none"
                  />
                </label>
              </div>
              <div className="w-28">
                <BpsField label={t('trade.share')} bps={part.bps} onChange={(bps) => setPart(i, { bps })} />
              </div>
              <div className="w-36">
                <label className="block">
                  <span className="mb-1 block text-label font-bold uppercase tracking-caps text-muted">
                    {t('trade.kind')}
                  </span>
                  <select
                    value={part.kind}
                    onChange={(e) => setPart(i, { kind: e.target.value as PartKind })}
                    className="w-full rounded-xl shadow-ring bg-raised px-2.5 py-1.5 text-ui focus:shadow-pick focus:outline-none"
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
                <Button
                  type="button"
                  onClick={() => setParts((was) => was.filter((_, j) => j !== i))}
                  className="rounded-xl shadow-ring px-2.5 py-1.5 text-note text-muted hover:text-paper"
                >
                  {t('trade.removePart')}
                </Button>
              )}
            </div>
          ))}
        </div>

        <Button
          type="button"
          onClick={() => setParts((was) => [...was, { ...EMPTY_PART }])}
          className="mt-2.5 rounded-xl shadow-ring px-2.5 py-1 text-note text-muted hover:text-paper"
        >
          {t('trade.addPart')}
        </Button>

        {/*
          The shares, read out of the document, for the parts the board has
          named. Below the rows rather than above them, because naming the
          parts comes first and a reader offered before there is anything to
          look for would be a control that cannot work yet.
        */}
        <div className="mt-3">
          {named.length === 0 ? (
            <p className="text-note leading-relaxed text-muted">{t('trade.nameFirst')}</p>
          ) : (
            <ReadDocument fields={named} onConfirm={takeCandidate} />
          )}
        </div>


        {/*
          The running total, named while it is being typed rather than refused
          afterwards. The person entering the composition is the person who can
          say what the missing part is.
        */}
        <p
          className={
            'mt-2.5 font-mono text-note tabular-nums ' +
            (total === WHOLE ? 'text-muted' : 'text-breach')
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

      <fieldset className="mb-3 rounded-xl shadow-ring px-3 py-3">
        <legend className="px-1 text-label font-bold uppercase tracking-caps text-muted">
          {t('trade.counts')}
        </legend>
        {/*
          Nothing checked to begin with, and no default. Reading `tangible` off
          the label and counting it would be this application settling a
          classification question that belongs to the board.
        */}
        <p className="mb-2.5 text-note leading-relaxed text-muted">{t('trade.counts.hint')}</p>
        <div className="flex flex-wrap gap-1.5">
          {PART_KINDS.map((k) => (
            <label
              key={k}
              className={
                'flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-ui transition-all ' +
                (counts.includes(k) ? 'bg-lapistint shadow-pick' : 'bg-raised shadow-ring hover:shadow-card')
              }
            >
              <input type="checkbox" checked={counts.includes(k)} onChange={() => toggleKind(k)} />
              {t(`trade.kind.${k}`)}
            </label>
          ))}
        </div>
      </fieldset>

      {/* ── the board's rule ──────────────────────────────────────────────── */}

      <fieldset className="mb-3 rounded-xl shadow-ring px-3 py-3">
        <legend className="px-1 text-label font-bold uppercase tracking-caps text-muted">
          {t('trade.bands')}
        </legend>
        <p className="mb-2.5 text-note leading-relaxed text-muted">{t('trade.bands.hint')}</p>

        <div className="space-y-2.5">
          {bands.map((band, i) => (
            <div key={i} className="rounded-xl shadow-ring px-2.5 py-2.5">
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
                  <Button
                    type="button"
                    onClick={() => setBands((was) => was.filter((_, j) => j !== i))}
                    className="rounded-xl shadow-ring px-2.5 py-1.5 text-note text-muted hover:text-paper"
                  >
                    {t('trade.removeBand')}
                  </Button>
                )}
              </div>
              <label className="block">
                <span className="mb-1 block text-label font-bold uppercase tracking-caps text-muted">
                  {t('trade.consequence')}
                </span>
                <textarea
                  value={band.consequence}
                  rows={2}
                  placeholder={t('trade.consequence.placeholder')}
                  onChange={(e) => setBand(i, { consequence: e.target.value })}
                  className="w-full rounded-xl shadow-ring bg-raised px-2.5 py-1.5 text-ui leading-relaxed focus:shadow-pick focus:outline-none"
                />
                <span className="mt-1 block text-note leading-relaxed text-muted opacity-80">
                  {t('trade.consequence.hint')}
                </span>
              </label>
            </div>
          ))}
        </div>

        <Button
          type="button"
          onClick={() => setBands((was) => [...was, { ...EMPTY_BAND }])}
          className="mt-2.5 rounded-xl shadow-ring px-2.5 py-1 text-note text-muted hover:text-paper"
        >
          {t('trade.addBand')}
        </Button>
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
              <p className="text-ui leading-relaxed">“{result.band.consequence}”</p>
              <footer className="mt-1 text-note text-muted">
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
            <p className="mb-3 rounded-xl shadow-ringbreach px-3 py-2.5 text-ui leading-relaxed text-breach">
              {result.unstated}
            </p>
          )}

          <div className="mb-3 space-y-1">
            {result.byKind.map((k) => (
              <div key={k.kind} className="flex items-baseline justify-between gap-2 text-ui">
                <span className={result.countsAsTangible.includes(k.kind) ? 'text-paper' : 'text-muted'}>
                  {t(`trade.kind.${k.kind}`)}
                  {result.countsAsTangible.includes(k.kind) && (
                    <span className="ms-1.5 text-note text-lapis">{t('trade.countedMark')}</span>
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
            <p key={i} className="mb-2 rounded-xl shadow-ring px-3 py-2 text-ui leading-relaxed">
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

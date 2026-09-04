import { useState } from 'react';
import { oversight, type BorneBy, type Zakat as Result_, type ZakatInput, type ZakatMethod, type ZakatYear } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Choice, Compute, Money, Note, Refusal, Result, Text, useCalc } from './calc.js';
import RecordCalculation from './RecordCalculation.js';

/**
 * What is due, and from whom.
 *
 * Three choices, and none of them is the software's:
 *
 * **The base.** Net assets adds up what is zakatable and subtracts what is
 * owed. Net invested funds starts from the other end — the funds put in, less
 * what is not zakatable. On the same balance sheet the two do not have to
 * agree, which is exactly why the board picks one and why this screen offers
 * neither until they do.
 *
 * **The year.** 2.5% on a lunar year, 2.577% on a solar one. A board keeping a
 * solar financial year and applying the lunar rate under-computes by a tenth
 * of a percent, every year, on every figure. It is not a rounding question and
 * it is not one this screen can answer from the dates.
 *
 * **Who bears it.** An institution computing zakat its shareholders are due to
 * pay has computed a figure and discharged nothing, and saying so is the point
 * of asking. The answer is printed with the result rather than filed behind
 * it, because it is a disclosure in its own right.
 */

const BASES: ZakatMethod[] = ['net_assets', 'net_invested_funds'];
const YEARS: ZakatYear[] = ['lunar', 'solar'];
const BEARERS: BorneBy[] = ['institution', 'shareholders', 'both'];

const NET_ASSETS = ['cash', 'receivables', 'tradeGoods', 'zakatableInvestments', 'shortTermLiabilities'] as const;
const INVESTED = [
  'paidUpCapital',
  'reserves',
  'retainedEarnings',
  'netProfit',
  'fixedAssets',
  'longTermInvestments',
  'accumulatedLosses',
] as const;

const EMPTY: ZakatInput = {
  method: 'net_assets',
  year: 'lunar',
  borneBy: 'institution',
  hawlEndsOn: '',
  currency: 'USD',
  source: '',
};

export default function Zakat() {
  const { t } = useI18n();
  const [method, setMethod] = useState<ZakatMethod | null>(null);
  const [year, setYear] = useState<ZakatYear | null>(null);
  const [borneBy, setBorneBy] = useState<BorneBy | null>(null);
  const [f, setF] = useState<ZakatInput>(EMPTY);
  const { result, error, busy, compute } = useCalc<ZakatInput, Result_>(oversight.zakat);

  const set = (k: keyof ZakatInput) => (v: string) => setF({ ...f, [k]: v });
  const fields = method === 'net_invested_funds' ? INVESTED : NET_ASSETS;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!method || !year || !borneBy) return;
        compute({ ...f, method, year, borneBy });
      }}
    >
      <Choice
        label={t('zakat.base')}
        hint={t('zakat.base.hint')}
        value={method}
        onChange={setMethod}
        options={BASES.map((m) => ({
          value: m,
          label: t(`zakat.${m}`),
          meaning: t(`zakat.${m}.meaning`),
        }))}
      />

      <Choice
        label={t('zakat.year')}
        hint={t('zakat.year.hint')}
        value={year}
        onChange={setYear}
        options={YEARS.map((y) => ({
          value: y,
          label: t(`zakat.${y}`),
          meaning: t(`zakat.${y}.meaning`),
        }))}
      />

      <Choice
        label={t('zakat.borneBy')}
        hint={t('zakat.borneBy.hint')}
        value={borneBy}
        onChange={setBorneBy}
        options={BEARERS.map((b) => ({
          value: b,
          label: t(`zakat.${b}`),
          meaning: t(`zakat.${b}.meaning`),
        }))}
      />

      {/* The figures follow the base, because the two bases want different ones. */}
      {method && (
        <>
          <div className="flex gap-2">
            <div className="flex-1">
              <Text
                label={t('zakat.hawlEndsOn')}
                hint={t('zakat.hawlEndsOn.hint')}
                type="date"
                value={f.hawlEndsOn}
                onChange={set('hawlEndsOn')}
              />
            </div>
            <div className="w-24">
              <Text label={t('calc.currency')} value={f.currency} onChange={set('currency')} />
            </div>
          </div>

          {fields.map((k) => (
            <Money
              key={k}
              label={t(`zakat.${k}`)}
              hint={t(`zakat.${k}.hint`)}
              value={(f[k] as string) ?? ''}
              onChange={set(k)}
            />
          ))}

          <Text
            label={t('calc.source')}
            hint={t('calc.source.hint')}
            value={f.source}
            onChange={set('source')}
          />

          {error && <Refusal>{error}</Refusal>}
          <Compute busy={busy} label={t('calc.compute')} />
        </>
      )}

      {result && (
        <Result
          headline={result.baseIsNegative ? t('zakat.nothingDue') : t('zakat.due')}
          amount={`${result.due} ${result.currency}`}
          steps={result.steps}
        >
          <p className="mb-2 text-[12.5px] leading-relaxed text-muted">{result.methodStated}</p>
          <p className="mb-2 text-[12.5px] leading-relaxed text-muted">
            <span className="font-mono">{result.rateStated}</span> — {result.rateWhy}
          </p>
          {/*
            Whose obligation it is, printed with the figure rather than behind
            it. "The institution computes and discloses the figure and
            discharges nothing by doing so" is the sentence that stops a
            computed number being mistaken for a paid one.
          */}
          <p className="mb-3 rounded border border-line px-3 py-2 text-[12.5px] leading-relaxed">
            {result.borneByStated}
          </p>
        </Result>
      )}
      {result && <Note>{result.note}</Note>}

      {/*
        The period is asked for rather than derived from the hawl date. A year
        could be worked back from it, but which year — lunar or solar — is
        exactly what the board chose above, and deriving it would choose again.
      */}
      {result && (
        <RecordCalculation
          input={{
            kind: 'zakat',
            method: result.method,
            methodStated: result.methodStated,
            currency: result.currency,
            source: result.source,
            figures: { ...f, method: result.method, year: result.year, borneBy: result.borneBy },
            headline: 'Due',
            amount: result.due,
            steps: result.steps,
            note: result.note,
            periodTo: result.hawlEndsOn,
          }}
        />
      )}
    </form>
  );
}

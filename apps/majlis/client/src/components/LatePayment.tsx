import { useState } from 'react';
import {
  oversight,
  type CollectionCost,
  type LateMethod,
  type LatePayment as Result_,
  type LatePaymentInput,
  type Retention,
  type Solvency,
} from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Choice, Compute, Money, Note, Rate, Refusal, Result, Text, useCalc } from './calc.js';
import RecordCalculation from './RecordCalculation.js';

/**
 * An increase taken on a late debt, and the one thing it may not become.
 *
 * The smallest of the five calculations and the one whose screen carries the
 * most. The arithmetic is a multiplication; what has to be got right is that
 * the amount ends up in the right place, and there are exactly two ways a
 * screen could get that wrong.
 *
 * **By making retention look like a default.** Whether the institution may keep
 * evidenced collection cost is a ruling and boards differ, so it is a choice
 * with nothing pre-selected — like the zakat base and the purification method.
 * A form that started on "keep the costs" would have made the ruling.
 *
 * **By letting the debtor's position go unasked.** A charge on somebody who
 * could not pay is what AAOIFI SS-3 forbids, and the answer is not something
 * arithmetic reaches. It is asked before any figure is, recorded with the
 * result, and where the answer is *unable* or *not determined* the warning the
 * server wrote sits above the amount rather than below it.
 *
 * The destination is the point of the whole thing. `toBeGivenAway` is shown as
 * the headline figure and the charge is a step underneath it, because the
 * charge is what was taken and this is what leaves.
 */

const METHODS: LateMethod[] = ['stipulated_amount', 'rate_on_overdue'];
const RETENTIONS: Retention[] = ['nothing', 'evidenced_costs'];
const SOLVENCIES: Solvency[] = ['able_and_delaying', 'unable', 'not_determined'];
const DAY_COUNTS: (360 | 365)[] = [360, 365];

export default function LatePayment() {
  const { t } = useI18n();
  const [method, setMethod] = useState<LateMethod | null>(null);
  const [retention, setRetention] = useState<Retention | null>(null);
  const [solvency, setSolvency] = useState<Solvency | null>(null);
  const [dayCount, setDayCount] = useState<360 | 365 | null>(null);
  const [rate, setRate] = useState<number | null>(null);
  const [costs, setCosts] = useState<CollectionCost[]>([]);
  const [f, setF] = useState({
    currency: 'AED',
    source: '',
    obligation: '',
    dueOn: '',
    paidOn: '',
    stipulated: '',
    outstanding: '',
  });

  const { result, error, busy, compute } = useCalc<LatePaymentInput, Result_>(oversight.latePayment);
  const set = (k: keyof typeof f) => (v: string) => setF((was) => ({ ...was, [k]: v }));

  const setCost = (i: number, patch: Partial<CollectionCost>) =>
    setCosts((was) => was.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!method || !retention || !solvency) return;
        compute({
          ...f,
          method,
          retention,
          solvency,
          // Null reaches the server as null and is refused there by name. A
          // missing rate is not a decision to charge nothing.
          rateBps: method === 'rate_on_overdue' ? rate : undefined,
          dayCount: method === 'rate_on_overdue' ? (dayCount ?? undefined) : undefined,
          costs: retention === 'evidenced_costs' ? costs : undefined,
        });
      }}
    >
      {/*
        Asked before any figure is. Whether a charge may be taken at all turns
        on this, and a form that reached it after the arithmetic would have
        treated it as a detail.
      */}
      <Choice
        label={t('late.solvency')}
        hint={t('late.solvency.hint')}
        value={solvency}
        onChange={setSolvency}
        options={SOLVENCIES.map((s) => ({
          value: s,
          label: t(`late.solvency.${s}`),
          meaning: t(`late.solvency.${s}.meaning`),
        }))}
      />

      <Choice
        label={t('calc.method')}
        hint={t('late.method.hint')}
        value={method}
        onChange={setMethod}
        options={METHODS.map((m) => ({
          value: m,
          label: t(`late.${m}`),
          meaning: t(`late.${m}.meaning`),
        }))}
      />

      {method && (
        <>
          <Text
            label={t('late.obligation')}
            hint={t('late.obligation.hint')}
            value={f.obligation}
            onChange={set('obligation')}
          />

          <div className="flex gap-2">
            <div className="flex-1">
              <Text label={t('late.dueOn')} type="date" value={f.dueOn} onChange={set('dueOn')} />
            </div>
            <div className="flex-1">
              <Text label={t('late.paidOn')} type="date" value={f.paidOn} onChange={set('paidOn')} />
            </div>
            <div className="w-24">
              <Text label={t('calc.currency')} value={f.currency} onChange={set('currency')} />
            </div>
          </div>

          {method === 'stipulated_amount' && (
            <Money
              label={t('late.stipulated')}
              hint={t('late.stipulated.hint')}
              value={f.stipulated}
              onChange={set('stipulated')}
            />
          )}

          {method === 'rate_on_overdue' && (
            <>
              <Money
                label={t('late.outstanding')}
                hint={t('late.outstanding.hint')}
                value={f.outstanding}
                onChange={set('outstanding')}
              />
              <Rate label={t('late.rate')} hint={t('late.rate.hint')} bps={rate} onChange={setRate} />
              {/*
                360 and 365 give different answers on the same debt, so this is
                a choice rather than a default sitting in a select.
              */}
              <Choice
                label={t('late.dayCount')}
                hint={t('late.dayCount.hint')}
                value={dayCount === null ? null : (String(dayCount) as '360' | '365')}
                onChange={(v) => setDayCount(Number(v) as 360 | 365)}
                options={DAY_COUNTS.map((d) => ({
                  value: String(d) as '360' | '365',
                  label: t(`late.dayCount.${d}`),
                  meaning: t(`late.dayCount.${d}.meaning`),
                }))}
              />
            </>
          )}

          {/*
            Nothing pre-selected. A form that started on "keep the costs" would
            have made the ruling this asks for.
          */}
          <Choice
            label={t('late.retention')}
            hint={t('late.retention.hint')}
            value={retention}
            onChange={setRetention}
            options={RETENTIONS.map((r) => ({
              value: r,
              label: t(`late.retention.${r}`),
              meaning: t(`late.retention.${r}.meaning`),
            }))}
          />

          {retention === 'evidenced_costs' && (
            <fieldset className="mb-3 rounded border border-line px-3 py-3">
              <legend className="px-1 text-[11px] uppercase tracking-wider text-muted">
                {t('late.costs')}
              </legend>
              <p className="mb-2.5 text-[11.5px] leading-relaxed text-muted">{t('late.costs.hint')}</p>

              <div className="space-y-2">
                {costs.map((cost, i) => (
                  <div key={i} className="flex flex-wrap items-end gap-2">
                    <div className="min-w-[180px] flex-[2]">
                      <label className="block">
                        <span className="mb-1 block text-[11px] uppercase tracking-wider text-muted">
                          {t('late.costWhat')}
                        </span>
                        <input
                          value={cost.description}
                          onChange={(e) => setCost(i, { description: e.target.value })}
                          className="w-full rounded border border-line bg-transparent px-2.5 py-1.5 text-[13px] focus:border-muted focus:outline-none"
                        />
                      </label>
                    </div>
                    <div className="w-36">
                      <label className="block">
                        <span className="mb-1 block text-[11px] uppercase tracking-wider text-muted">
                          {t('late.costAmount')}
                        </span>
                        <input
                          inputMode="decimal"
                          value={cost.amount}
                          onChange={(e) => setCost(i, { amount: e.target.value })}
                          className="w-full rounded border border-line bg-transparent px-2.5 py-1.5 font-mono text-[13px] tabular-nums focus:border-muted focus:outline-none"
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCosts((was) => was.filter((_, j) => j !== i))}
                      className="rounded border border-line px-2.5 py-1.5 text-[12px] text-muted hover:border-muted hover:text-paper"
                    >
                      {t('late.removeCost')}
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setCosts((was) => [...was, { description: '', amount: '' }])}
                className="mt-2.5 rounded border border-line px-2.5 py-1 text-[12px] text-muted hover:border-muted hover:text-paper"
              >
                {t('late.addCost')}
              </button>
            </fieldset>
          )}

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
        <>
          {/*
            Above the amount, not below it. Where the debtor could not pay, or
            nobody determined it, that is the first thing to read — the figures
            are what the method produces, not a finding that anything is due.
          */}
          {result.solvencyWarning && (
            <p className="mt-5 rounded border border-warn/50 bg-warn/[0.05] px-3 py-2.5 text-[12.5px] leading-relaxed text-warn">
              {result.solvencyWarning}
            </p>
          )}

          <Result
            headline={t('late.toBeGivenAway')}
            amount={`${result.toBeGivenAway} ${result.currency}`}
            steps={result.steps}
          >
            <p className="mb-2 text-[12.5px] leading-relaxed text-muted">{result.methodStated}</p>
            <p className="mb-2 text-[12.5px] leading-relaxed text-muted">{result.solvencyStated}</p>
            {/*
              Printed with the figure rather than behind it, like whose zakat
              obligation it is. This sentence is what stops a retained amount
              being read as ordinary revenue.
            */}
            <p className="mb-3 rounded border border-line px-3 py-2 text-[12.5px] leading-relaxed">
              {result.retentionStated}
            </p>
            <div className="mb-3 space-y-1 text-[12.5px]">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-muted">{t('late.charged')}</span>
                <span className="font-mono tabular-nums">{result.charged}</span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-muted">{t('late.retained')}</span>
                <span className="font-mono tabular-nums">{result.retained}</span>
              </div>
            </div>
          </Result>
        </>
      )}
      {result && <Note>{result.note}</Note>}

      {result && (
        <RecordCalculation
          input={{
            kind: 'late_payment',
            method: result.method,
            methodStated: result.methodStated,
            currency: result.currency,
            source: result.source,
            figures: {
              obligation: result.obligation,
              daysLate: String(result.daysLate),
              charged: result.charged,
              retained: result.retained,
              solvency: result.solvency,
              retention: result.retention,
            },
            headline: 'To be given away',
            amount: result.toBeGivenAway,
            steps: result.steps,
            note: result.note,
            periodFrom: result.dueOn,
            periodTo: result.paidOn,
          }}
        />
      )}
    </form>
  );
}

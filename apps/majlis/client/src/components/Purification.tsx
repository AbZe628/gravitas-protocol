import { useState } from 'react';
import { oversight, type PurificationInput, type PurificationMethod, type Purified } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Choice, Compute, Money, Note, Refusal, Result, Text, useCalc } from './calc.js';
import RecordCalculation from './RecordCalculation.js';
import ReadDocument from './ReadDocument.js';

/**
 * What must be given away from a holding that passed screening.
 *
 * Not the purification that follows a breach — that one comes out of an
 * incident and out of a ledger, and it is already on the incident page. This
 * one runs every period for as long as the holding is held, and it is the
 * ordinary work of a board that has approved anything with mixed income.
 *
 * ── the method is the whole design ────────────────────────────────────────
 *
 * The three methods give **different answers on the same figures**. Per-share
 * takes the company's non-permissible income against its shares in issue and
 * multiplies by what is held; per-dividend takes that income as a proportion
 * of total income and applies it to what was actually received; per-unit takes
 * a rate somebody else published. On a holding that received no dividend, the
 * first two are a figure and a zero.
 *
 * So the method is chosen before any figure is asked for, and the fields
 * change with it. Asking for all nine at once and letting the server refuse
 * would teach the same lesson more slowly and to fewer people.
 *
 * Apportioning by holding period is a fourth choice and it is the board's too:
 * purifying a full year on something held two months overstates the
 * obligation, and not apportioning at all understates it on something bought
 * late. Neither is obviously right, so it is asked rather than assumed.
 */

const METHODS: PurificationMethod[] = ['per_share', 'per_dividend', 'per_unit'];

/**
 * Which figures a document can be asked for, per method.
 *
 * The same list the form shows, because asking a document for a figure this
 * method does not use would put a number into a field the calculation ignores
 * — and a scholar who confirmed it would have checked something for nothing.
 *
 * The dates and the currency are not here. They are the period the board is
 * computing for, which is a decision made before any document is opened.
 */
const READABLE: Record<PurificationMethod, { key: keyof PurificationInput; label: string }[]> = {
  per_share: [
    { key: 'unitsHeld', label: 'purify.unitsHeld' },
    { key: 'nonPermissibleIncome', label: 'purify.nonPermissibleIncome' },
    { key: 'sharesOutstanding', label: 'purify.sharesOutstanding' },
  ],
  per_dividend: [
    { key: 'unitsHeld', label: 'purify.unitsHeld' },
    { key: 'nonPermissibleIncome', label: 'purify.nonPermissibleIncome' },
    { key: 'totalIncome', label: 'purify.totalIncome' },
    { key: 'incomeReceived', label: 'purify.incomeReceived' },
  ],
  per_unit: [
    { key: 'unitsHeld', label: 'purify.unitsHeld' },
    { key: 'ratePerUnit', label: 'purify.ratePerUnit' },
  ],
};

const EMPTY: PurificationInput = {
  method: 'per_share',
  periodFrom: '',
  periodTo: '',
  currency: 'USD',
  source: '',
  basis: '',
  unitsHeld: '',
};

export default function Purification() {
  const { t } = useI18n();
  const [method, setMethod] = useState<PurificationMethod | null>(null);
  const [f, setF] = useState<PurificationInput>(EMPTY);
  const [apportion, setApportion] = useState(false);
  const { result, error, busy, compute } = useCalc<PurificationInput, Purified>(oversight.purify);

  const set = (k: keyof PurificationInput) => (v: string) => setF({ ...f, [k]: v });

  /** A confirmed candidate fills its field and appends its provenance. */
  const takeCandidate = (field: string, value: string, provenance: string) =>
    setF((was) => ({
      ...was,
      [field]: value,
      source: was.source.trim() ? `${was.source.trim()} ${provenance}` : provenance,
    }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!method) return;
        compute({ ...f, method, apportionByHoldingPeriod: apportion });
      }}
    >
      <Choice
        label={t('calc.method')}
        hint={t('purify.methodHint')}
        value={method}
        onChange={(m) => setMethod(m)}
        options={METHODS.map((m) => ({
          value: m,
          label: t(`purify.${m}`),
          meaning: t(`purify.${m}.meaning`),
        }))}
      />

      {/* Nothing is asked for until the board has said which arithmetic to do. */}
      {method && (
        <>
          {/*
            After the method, for the same reason the fields are. The three
            methods want different figures, and a panel offering all nine would
            invite confirming figures this calculation will not use.
          */}
          <ReadDocument
            fields={READABLE[method].map((r) => ({ key: r.key as string, label: t(r.label) }))}
            onConfirm={takeCandidate}
          />

          <div className="flex gap-2">
            <div className="flex-1">
              <Text label={t('calc.from')} type="date" value={f.periodFrom} onChange={set('periodFrom')} />
            </div>
            <div className="flex-1">
              <Text label={t('calc.to')} type="date" value={f.periodTo} onChange={set('periodTo')} />
            </div>
            <div className="w-24">
              <Text label={t('calc.currency')} value={f.currency} onChange={set('currency')} />
            </div>
          </div>

          <Money label={t('purify.unitsHeld')} value={f.unitsHeld} onChange={set('unitsHeld')} />

          {method === 'per_share' && (
            <>
              <Money
                label={t('purify.nonPermissibleIncome')}
                value={f.nonPermissibleIncome ?? ''}
                onChange={set('nonPermissibleIncome')}
              />
              <Money
                label={t('purify.sharesOutstanding')}
                value={f.sharesOutstanding ?? ''}
                onChange={set('sharesOutstanding')}
              />
            </>
          )}

          {method === 'per_dividend' && (
            <>
              <Money
                label={t('purify.nonPermissibleIncome')}
                value={f.nonPermissibleIncome ?? ''}
                onChange={set('nonPermissibleIncome')}
              />
              <Money
                label={t('purify.totalIncome')}
                value={f.totalIncome ?? ''}
                onChange={set('totalIncome')}
              />
              <Money
                label={t('purify.incomeReceived')}
                value={f.incomeReceived ?? ''}
                onChange={set('incomeReceived')}
              />
            </>
          )}

          {method === 'per_unit' && (
            <Money
              label={t('purify.ratePerUnit')}
              hint={t('purify.ratePerUnit.hint')}
              value={f.ratePerUnit ?? ''}
              onChange={set('ratePerUnit')}
            />
          )}

          {/*
            The basis is recorded, never computed on. Nothing here can see
            whether a supplied number is gross or net, income alone or income
            and gain — and a figure whose basis nobody wrote down is a figure
            nobody can check next year.
          */}
          <Text
            label={t('purify.basis')}
            hint={t('purify.basis.hint')}
            value={f.basis}
            placeholder={t('purify.basis.placeholder')}
            onChange={set('basis')}
          />

          <label className="mb-3 flex cursor-pointer items-start gap-2.5 rounded border border-line px-3 py-2.5">
            <input
              type="checkbox"
              checked={apportion}
              onChange={(e) => setApportion(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="block text-[13px]">{t('purify.apportion')}</span>
              <span className="mt-0.5 block text-[11.5px] leading-relaxed text-muted">
                {t('purify.apportion.meaning')}
              </span>
            </span>
          </label>

          {apportion && (
            <div className="flex gap-2">
              <div className="flex-1">
                <Money
                  label={t('purify.daysHeld')}
                  value={String(f.daysHeld ?? '')}
                  onChange={(v) => setF({ ...f, daysHeld: v === '' ? undefined : Number(v) })}
                />
              </div>
              <div className="flex-1">
                <Money
                  label={t('purify.daysInPeriod')}
                  value={String(f.daysInPeriod ?? '')}
                  onChange={(v) => setF({ ...f, daysInPeriod: v === '' ? undefined : Number(v) })}
                />
              </div>
            </div>
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
        <Result
          headline={t('purify.mustBeGivenAway')}
          amount={`${result.amount} ${result.currency}`}
          steps={result.steps}
        >
          <p className="mb-3 text-[12.5px] leading-relaxed text-muted">{result.methodStated}</p>
          {result.perUnit && (
            <p className="mb-3 font-mono text-[12px] tabular-nums text-muted">
              {t('purify.perUnit')}: {result.perUnit} {result.currency}
            </p>
          )}
        </Result>
      )}
      {result && <Note>{result.note}</Note>}

      {/* Purification is about a holding, so the panel asks which one. */}
      {result && (
        <RecordCalculation
          wantsHolding
          input={{
            kind: 'purification',
            method: result.method,
            methodStated: result.methodStated,
            currency: result.currency,
            source: result.source,
            figures: { ...f, method: result.method, basis: result.basis },
            headline: 'To be given away',
            amount: result.amount,
            steps: result.steps,
            note: result.note,
            periodFrom: result.periodFrom,
            periodTo: result.periodTo,
          }}
        />
      )}
    </form>
  );
}

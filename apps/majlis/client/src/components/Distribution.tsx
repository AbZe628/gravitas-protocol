import { useState } from 'react';
import { oversight, type Distribution as Result_, type DistributionInput, type Reserve } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Compute, Money, Note, Rate, Refusal, Result, Text, useCalc } from './calc.js';
import RecordCalculation from './RecordCalculation.js';
import ReadDocument from './ReadDocument.js';

/**
 * What the depositors are actually paid, and what smoothing did to it.
 *
 * The annual report's opinion must address whether profit allocation and loss
 * charging on investment accounts followed the basis the board approved. This
 * screen is the arithmetic under that sentence, and it needs no model of a
 * bank — only the order of operations, which is the whole point:
 *
 *   **PER comes out of gross profit, before the split.** Both the bank and the
 *   depositors bear it.
 *
 *   **IRR comes out after the split, from the depositors' share alone.**
 *
 * Get that order wrong and real money moves between the bank and its
 * depositors, and nothing in a spreadsheet of final numbers says which way
 * round it was done. Two reserves and one ordering is the entire model.
 *
 * ── the part a board is not usually shown ─────────────────────────────────
 *
 * The reserves are how a payout is smoothed, and smoothing is displaced
 * commercial risk: in a good quarter the depositors are paid less than they
 * earned, in a bad one they are paid more. Both are disclosable, and a
 * distribution report that showed only the rate paid would hide the entire
 * question. So the difference is printed — what they would have been paid with
 * no reserves, what they were paid, and which way it went.
 *
 * No default rate. A deduction rate is a decision about somebody's returns,
 * and a field that started at 5% would have made it.
 */

function ReserveRow({ r, currency }: { r: Reserve; currency: string }) {
  const { t } = useI18n();
  return (
    <li className="rounded border border-line px-3 py-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[13px] font-medium">{r.name}</span>
        <span className="font-mono text-[13px] tabular-nums">
          {r.closingBalance} {currency}
        </span>
      </div>
      <p className="mt-0.5 font-mono text-[11.5px] text-muted">
        {r.openingBalance} {r.movement.startsWith('-') ? '−' : '+'}{' '}
        {r.movement.replace('-', '')} · {t('dist.headroom')} {r.headroom}
      </p>
      {/* A capped deduction is not the deduction the board approved. */}
      {r.cappedAt && <p className="mt-1 text-[11.5px] text-warn">{t('dist.capped')}</p>}
    </li>
  );
}

const EMPTY: DistributionInput = {
  periodFrom: '',
  periodTo: '',
  currency: 'USD',
  source: '',
  grossProfit: '',
  mudaribShareBps: 0,
  perDeductionBps: 0,
  perBalance: '0',
  perCap: '0',
  irrDeductionBps: 0,
  irrBalance: '0',
  irrCap: '0',
};

export default function Distribution() {
  const { t } = useI18n();
  const [f, setF] = useState<DistributionInput>(EMPTY);
  const [mudarib, setMudarib] = useState<number | null>(null);
  const [per, setPer] = useState<number | null>(null);
  const [irr, setIrr] = useState<number | null>(null);
  const { result, error, busy, compute } = useCalc<DistributionInput, Result_>(oversight.distribute);

  const set = (k: keyof DistributionInput) => (v: string) => setF({ ...f, [k]: v });

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
        compute({
          ...f,
          // Null reaches the server as null and is refused there by name. It is
          // not silently read as zero, which would be a decision to deduct
          // nothing rather than an unanswered question.
          mudaribShareBps: mudarib as number,
          perDeductionBps: per ?? 0,
          irrDeductionBps: irr ?? 0,
        });
      }}
    >
      {/*
        The amounts, and deliberately not the rates.

        The mudarib's share and the two reserve deductions are terms the board
        agreed in a contract. They are not figures sitting in an accounts pack
        waiting to be read out of it, and offering them here would invite
        confirming a rate against a sentence that was never the agreement.
      */}
      <ReadDocument
        fields={[
          { key: 'grossProfit', label: t('dist.grossProfit') },
          { key: 'perBalance', label: `${t('dist.perTitle')} — ${t('dist.balance')}` },
          { key: 'perCap', label: `${t('dist.perTitle')} — ${t('dist.cap')}` },
          { key: 'irrBalance', label: `${t('dist.irrTitle')} — ${t('dist.balance')}` },
          { key: 'irrCap', label: `${t('dist.irrTitle')} — ${t('dist.cap')}` },
        ]}
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

      <Money
        label={t('dist.grossProfit')}
        hint={t('dist.grossProfit.hint')}
        value={f.grossProfit}
        onChange={set('grossProfit')}
      />

      <Rate
        label={t('dist.mudaribShare')}
        hint={t('dist.mudaribShare.hint')}
        bps={mudarib}
        onChange={setMudarib}
      />

      {/* Before the split. Both parties bear it. */}
      <div className="mb-3 rounded border border-line px-3 py-3">
        <div className="mb-2 text-[11px] uppercase tracking-wider text-muted">{t('dist.perTitle')}</div>
        <p className="mb-2.5 text-[11.5px] leading-relaxed text-muted">{t('dist.per.meaning')}</p>
        <Rate label={t('dist.deduction')} bps={per} onChange={setPer} />
        <div className="flex gap-2">
          <div className="flex-1">
            <Money label={t('dist.balance')} value={f.perBalance} onChange={set('perBalance')} />
          </div>
          <div className="flex-1">
            <Money label={t('dist.cap')} hint={t('dist.cap.hint')} value={f.perCap} onChange={set('perCap')} />
          </div>
        </div>
      </div>

      {/* After the split. The depositors alone bear it. */}
      <div className="mb-3 rounded border border-line px-3 py-3">
        <div className="mb-2 text-[11px] uppercase tracking-wider text-muted">{t('dist.irrTitle')}</div>
        <p className="mb-2.5 text-[11.5px] leading-relaxed text-muted">{t('dist.irr.meaning')}</p>
        <Rate label={t('dist.deduction')} bps={irr} onChange={setIrr} />
        <div className="flex gap-2">
          <div className="flex-1">
            <Money label={t('dist.balance')} value={f.irrBalance} onChange={set('irrBalance')} />
          </div>
          <div className="flex-1">
            <Money label={t('dist.cap')} hint={t('dist.cap.hint')} value={f.irrCap} onChange={set('irrCap')} />
          </div>
        </div>
      </div>

      <Money
        label={t('dist.depositorFunds')}
        hint={t('dist.depositorFunds.hint')}
        value={f.depositorFunds ?? ''}
        onChange={set('depositorFunds')}
      />

      <Text label={t('calc.source')} hint={t('calc.source.hint')} value={f.source} onChange={set('source')} />

      {error && <Refusal>{error}</Refusal>}
      <Compute busy={busy} label={t('calc.compute')} />

      {result && (
        <Result
          headline={t('dist.paidToDepositors')}
          amount={`${result.paidToDepositors} ${result.currency}`}
          steps={result.steps}
        >
          <p className="mb-3 text-[12.5px] leading-relaxed text-muted">{result.method}</p>

          {/*
            What smoothing did, printed rather than absorbed into the rate. A
            report showing only what was paid hides the entire question the
            reserves exist to raise.
          */}
          <div className="mb-3 rounded border border-line px-3 py-2.5">
            <div className="mb-1.5 text-[11px] uppercase tracking-wider text-muted">
              {t('dist.smoothing')}
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-2 font-mono text-[12.5px] tabular-nums">
              <span className="text-muted">
                {t('dist.withoutSmoothing')} {result.smoothing.withoutSmoothing}
              </span>
              {/*
                The direction word carries the sign, so the figure must not
                carry it too: "lowered by -48300" reads as a double negative
                and makes a reader stop to work out which way it went.
              */}
              <span>
                {t(`dist.${result.smoothing.direction}`)}{' '}
                {result.smoothing.difference.replace(/^-/, '')}
              </span>
            </div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-muted">{result.smoothing.note}</p>
          </div>

          <ul className="mb-3 space-y-1.5">
            {result.reserves.map((r) => (
              <ReserveRow key={r.name} r={r} currency={result.currency} />
            ))}
          </ul>
        </Result>
      )}
      {result && <Note>{result.note}</Note>}

      {result && (
        <RecordCalculation
          input={{
            kind: 'profit_distribution',
            method: 'per_and_irr',
            methodStated: result.method,
            currency: result.currency,
            source: result.source,
            figures: {
              ...f,
              mudaribShareBps: mudarib,
              perDeductionBps: per,
              irrDeductionBps: irr,
            },
            headline: 'Paid to depositors',
            amount: result.paidToDepositors,
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

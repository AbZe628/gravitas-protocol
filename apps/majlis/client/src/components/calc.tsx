import { useState, type ReactNode } from 'react';
import type { CalcStep } from '../lib/api.js';

/**
 * The parts every calculation surface is built from.
 *
 * Three calculations, one shape, and the shape is the argument. Each of them
 * computes and never concludes, so each of them shows the same three things in
 * the same order: what was chosen, the sums, and the sentence saying what was
 * not answered. A scholar who has read one of these screens has read all three.
 *
 * ── what these parts are built to make hard ───────────────────────────────
 *
 * **Picking a method for the board.** `Choice` has no default and no first
 * option pre-selected. Where two methods give different answers on the same
 * figures — the two zakat bases, the three purification methods — choosing
 * between them is a ruling, and an interface that started on one would have
 * made it. Every option carries a line saying what it means, so the choice is
 * made from the meaning rather than from the key.
 *
 * **Showing an answer without its working.** `Result` cannot render a figure
 * without `steps` beside it. There is no prop for a bare number.
 *
 * **Softening the server's sentence.** `Note` prints what it is given and
 * nothing else. The same words travel with the figures wherever they go.
 */

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="mb-2.5 block">
      <span className="mb-1 block text-[11px] uppercase tracking-wider text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] leading-relaxed text-muted opacity-80">{hint}</span>}
    </label>
  );
}

const INPUT =
  'w-full rounded border border-line bg-transparent px-3 py-2 text-[14px] focus:border-muted focus:outline-none';

/** A money field. Monospaced and tabular so digits line up down a column. */
export function Money({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label} hint={hint}>
      <input
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className={INPUT + ' font-mono tabular-nums'}
      />
    </Field>
  );
}

export function Text({
  label,
  hint,
  value,
  placeholder,
  type,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  placeholder?: string;
  type?: 'text' | 'date';
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label} hint={hint}>
      <input
        type={type ?? 'text'}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={INPUT + ' text-[13px]'}
      />
    </Field>
  );
}

/**
 * A rate the board set, entered as a percentage and carried as basis points.
 *
 * Basis points are what the server takes, because a percentage held as a
 * decimal is a rounding error waiting to be applied to somebody's return. A
 * scholar should not have to do that conversion in their head, so the field
 * takes the percentage and the conversion happens here, once.
 */
export function Rate({
  label,
  hint,
  bps,
  onChange,
}: {
  label: string;
  hint?: string;
  bps: number | null;
  onChange: (bps: number | null) => void;
}) {
  const [text, setText] = useState(bps === null ? '' : String(bps / 100));

  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-2">
        <input
          inputMode="decimal"
          value={text}
          placeholder="0.00"
          onChange={(e) => {
            const raw = e.target.value;
            setText(raw);
            const n = Number(raw);
            // An unparseable rate is null, never zero. Zero is a decision to
            // deduct nothing, and it is not the same as having typed nothing.
            onChange(raw.trim() === '' || Number.isNaN(n) ? null : Math.round(n * 100));
          }}
          className={INPUT + ' font-mono tabular-nums'}
        />
        <span className="text-[13px] text-muted">%</span>
      </div>
    </Field>
  );
}

/**
 * A choice the board makes, with nothing chosen until they choose it.
 *
 * The meaning is on the option, not in a tooltip. Somebody picking between two
 * zakat bases is picking between two different obligations, and the difference
 * has to be readable at the moment of choosing.
 */
export function Choice<T extends string>({
  label,
  hint,
  options,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  options: { value: T; label: string; meaning: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="mb-3">
      <legend className="mb-1.5 text-[11px] uppercase tracking-wider text-muted">{label}</legend>
      {hint && <p className="mb-2 text-[11.5px] leading-relaxed text-muted">{hint}</p>}
      <div className="space-y-1.5">
        {options.map((o) => (
          <label
            key={o.value}
            className={
              'flex cursor-pointer gap-2.5 rounded border px-3 py-2.5 transition-colors ' +
              (value === o.value ? 'border-gold/60 bg-gold/[0.06]' : 'border-line hover:border-muted')
            }
          >
            <input
              type="radio"
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="mt-0.5 accent-current"
            />
            <span>
              <span className="block text-[13px] font-medium">{o.label}</span>
              <span className="mt-0.5 block text-[11.5px] leading-relaxed text-muted">{o.meaning}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** The sums, written out. One row per step, in the order they were done. */
export function Steps({ steps }: { steps: CalcStep[] }) {
  return (
    <ol className="space-y-1.5">
      {steps.map((s, i) => (
        <li key={i} className="rounded border border-line px-3 py-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-[13px]">{s.label}</span>
            <span className="font-mono text-[13px] tabular-nums">{s.value}</span>
          </div>
          {/* The sum, not the verdict. */}
          <p className="mt-0.5 font-mono text-[11.5px] leading-relaxed text-muted break-words">
            {s.working}
          </p>
        </li>
      ))}
    </ol>
  );
}

/**
 * The answer, and it cannot be rendered without its working.
 *
 * There is deliberately no prop for a figure on its own. A number with no sums
 * under it is something a board is asked to accept; a number with the sums
 * under it is something they can check and disagree with.
 */
export function Result({
  headline,
  amount,
  steps,
  children,
}: {
  headline: string;
  amount: string;
  steps: CalcStep[];
  children?: ReactNode;
}) {
  return (
    <div className="mt-5 border-t border-line pt-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[12px] uppercase tracking-wider text-muted">{headline}</span>
        <span className="font-mono text-[19px] tabular-nums text-goldsoft">{amount}</span>
      </div>
      {children}
      <Steps steps={steps} />
    </div>
  );
}

/**
 * What the calculation did not answer, in the server's own words.
 *
 * Never assembled here. The interface could soften it into a conclusion or
 * sharpen it into one, and the same sentence has to travel with the figures.
 */
export function Note({ children }: { children: string }) {
  return (
    <p className="mt-3 rounded border border-line bg-surface/60 px-3 py-2.5 text-[12.5px] leading-relaxed text-muted">
      {children}
    </p>
  );
}

/**
 * A refusal, shown as the server wrote it.
 *
 * These messages are the teaching part: "a missing figure is not a zero: a
 * zakat computed around a gap understates an obligation nobody checked" says
 * more than a red border on a field ever would.
 */
export function Refusal({ children }: { children: string }) {
  return (
    <p className="mb-3 rounded border border-warn/50 bg-warn/[0.05] px-3 py-2.5 text-[12.5px] leading-relaxed text-warn">
      {children}
    </p>
  );
}

export function Compute({ busy, label }: { busy: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="rounded border border-gold/60 px-3.5 py-1.5 text-[13px] text-goldsoft transition-colors hover:bg-gold/10 disabled:opacity-50"
    >
      {label}
    </button>
  );
}

/** Submit, error and busy, done the same way three times. */
export function useCalc<TIn, TOut>(run: (input: TIn) => Promise<TOut>) {
  const [result, setResult] = useState<TOut | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function compute(input: TIn) {
    setBusy(true);
    setError(null);
    try {
      setResult(await run(input));
    } catch (e) {
      // The old result is cleared. Leaving it beside a refusal would show a
      // figure computed from figures that have since changed.
      setResult(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return { result, error, busy, compute };
}

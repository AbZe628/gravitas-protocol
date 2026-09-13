import { createContext, useContext, type ReactNode } from 'react';

/**
 * What a calculation is being worked out for.
 *
 * ── why a context and not a prop ──────────────────────────────────────────
 *
 * Six calculators each hand a finished `RecordInput` to `RecordCalculation`,
 * and the recorder is the only place that knows how to note one. Threading two
 * more fields through all six would mean six chances to forget one, and the
 * sixth would silently record a figure with nothing saying which question it
 * answered — which is the fault this exists to close.
 *
 * So the step wraps the calculator, and the recorder reads it. A calculator
 * opened at the workbench has no provider above it and records nothing extra,
 * which is right: a calculation done on its own answers nobody's question yet,
 * and that is an ordinary use rather than a lesser one.
 */

export interface WorkedOutFor {
  matterId: string;
  conditionId: string;
  /**
   * Told when a figure is recorded, so the step can show it at once.
   *
   * The step is what has to change: a member who works out a ratio and sees
   * the step look exactly as it did before has no reason to believe anything
   * was kept.
   */
  onRecorded?: (computationId: string) => void;
}

const Context = createContext<WorkedOutFor | null>(null);

export function WorkedOutForProvider({
  value,
  children,
}: {
  value: WorkedOutFor;
  children: ReactNode;
}) {
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

/** Null at the workbench, where a calculation is not yet for anything. */
export function useWorkedOutFor(): WorkedOutFor | null {
  return useContext(Context);
}

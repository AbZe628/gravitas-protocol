import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../lib/i18n.js';
import type { AnyPhase } from '../lib/spine.js';
import { PageHead } from './page.js';

/**
 * The two shapes every screen is.
 *
 * ── why this file exists ──────────────────────────────────────────────────
 *
 * Twenty-nine screens, no two of them laid out the same way. Ten do not use
 * the page head at all. The biggest are five hundred lines of bespoke
 * arrangement each. A member who has learned one screen has learned one
 * screen, and the verdict on that was blunt: the application jumps from one
 * to the next with no sense of having arrived anywhere.
 *
 * So there are two shapes and nothing else.
 *
 * **A list** is rows of one kind of thing. Heading, a count that means
 * something now, one act, filters, rows. The content starts at the top; there
 * is no introduction and nothing to scroll past.
 *
 * **A record** is one thing. Where it sits, what it is, which stage it has
 * reached, the one act outstanding, and what has happened to it. The act is
 * always in the same corner.
 *
 * ── the rule for adding a third ───────────────────────────────────────────
 *
 * There is no third. Two exceptions are agreed and written down — the
 * calculation workbench and search — and a third needs a reason in this
 * comment, not a new component quietly added beside these.
 */

/* ══ the list ══════════════════════════════════════════════════════════ */

export function ListPage({
  phase,
  title,
  says,
  live,
  act,
  filters,
  children,
  limits,
}: {
  phase?: AnyPhase;
  title: string;
  /** One plain sentence saying what this list is for. Not optional. */
  says: string;
  /** The one fact about now that belongs beside the title. */
  live?: ReactNode;
  /** The single thing a person might come here to start. */
  act?: ReactNode;
  filters?: ReactNode;
  children: ReactNode;
  /**
   * What this list cannot see, said in place.
   *
   * A list that quietly showed nothing where it knew nothing would read as a
   * list with nothing in it, and those are different claims.
   */
  limits?: string;
}) {
  return (
    <div>
      <PageHead phase={phase} title={title} says={says} live={live} act={act} />
      {filters && <div className="mb-5 flex flex-wrap gap-2">{filters}</div>}
      {children}
      {limits && (
        <p className="mt-6 max-w-[62ch] text-[12px] leading-[1.6] text-muted">{limits}</p>
      )}
    </div>
  );
}

/** A filter that narrows this one list rather than opening another screen. */
export function Chip({
  on,
  onPick,
  children,
  count,
}: {
  on: boolean;
  onPick: () => void;
  children: ReactNode;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={on}
      className={
        'rounded-full px-3.5 py-1.5 text-[12px] transition-all ' +
        (on
          ? 'bg-lapis font-semibold text-white'
          : 'bg-raised text-sand shadow-ring hover:text-paper')
      }
    >
      {children}
      {count !== undefined && (
        <span className="ms-1.5 font-mono tabular-nums opacity-60">{count}</span>
      )}
    </button>
  );
}

export function Rows({ children }: { children: ReactNode }) {
  return <ul className="space-y-2">{children}</ul>;
}

const PHASE_TONE: Record<string, string> = {
  asked: 'text-lapis',
  deciding: 'text-[#8A6524]',
  inforce: 'text-settled',
  checked: 'text-breach',
  iasked: 'text-lapis',
  bindsme: 'text-settled',
  iowe: 'text-breach',
};

/**
 * One row, everywhere.
 *
 * Three columns and no more: how long it has stood here, what it is, and the
 * act itself. An earlier version carried a fourth — a state pill — and it
 * said the same thing as the act twice over. *Voting* and *record your
 * position* are one fact, and the button is the better half of it.
 *
 * Where the act is not this reader's to press, the column says **who holds
 * it** instead. The commonest way anything here stalls is that each side
 * believes it is with the other.
 */
export function Row({
  to,
  kind,
  phase,
  title,
  days,
  daysLabel,
  overdue,
  act,
  onAct,
  heldBy,
}: {
  /** Where the title opens. Reading, not acting. */
  to: string;
  /** What kind of thing this is, in the reader's words. */
  kind: string;
  phase: AnyPhase;
  title: string;
  days: number;
  daysLabel: string;
  overdue?: boolean;
  /** The one act, on the row. One press does it. */
  act?: string;
  onAct?: () => void;
  /** Where there is no act for this reader: who is holding it. */
  heldBy?: string;
}) {
  return (
    <li
      className={
        'flex items-center gap-4 rounded-card px-5 py-3.5 ' +
        (overdue
          ? 'border-s-[3px] border-breach bg-[#FCF0EE] shadow-[0_0_0_0.5px_rgba(154,56,48,0.2)]'
          : 'bg-raised shadow-ring')
      }
    >
      <div className="w-[3.75rem] shrink-0 text-end">
        <div
          className={
            'font-mono text-[17px] leading-none tabular-nums ' +
            (overdue ? 'text-breach' : 'text-paper')
          }
        >
          {days}
        </div>
        <div className="mt-1 text-[9px] uppercase tracking-[0.1em] text-muted">{daysLabel}</div>
      </div>

      <div className="min-w-0 flex-1">
        <div
          className={
            'mb-0.5 text-[9.5px] font-bold uppercase tracking-[0.13em] ' +
            (PHASE_TONE[phase] ?? 'text-muted')
          }
        >
          {kind}
        </div>
        <Link
          to={to}
          className="font-display text-[15px] leading-snug text-paper hover:underline hover:underline-offset-[3px]"
        >
          {title}
        </Link>
      </div>

      {act && onAct ? (
        <button
          type="button"
          onClick={onAct}
          className="shrink-0 whitespace-nowrap rounded-xl border border-lapis px-3.5 py-1.5 text-[12.5px] font-semibold text-lapis transition-colors hover:bg-lapis hover:text-white"
        >
          {act}
        </button>
      ) : heldBy ? (
        <span className="shrink-0 whitespace-nowrap text-[12.5px] text-muted">{heldBy}</span>
      ) : null}
    </li>
  );
}

/* ══ the record ════════════════════════════════════════════════════════ */

export interface Stage {
  /** What this stage is called, in the reader's words. */
  name: string;
  /** When it was reached, where it has been. */
  at?: string | null;
  state: 'done' | 'here' | 'ahead';
}

/**
 * Where this case sits in its own lifecycle.
 *
 * Not the four phases of the board's work — those were drawn above every
 * screen and were identical on all of them, so moving between screens changed
 * nothing at the top. This is **this case's** stages, so it differs from one
 * record to the next and is worth reading.
 */
export function StageBar({ stages }: { stages: readonly Stage[] }) {
  return (
    <ol className="mb-7 flex overflow-x-auto">
      {stages.map((s) => (
        <li
          key={s.name}
          aria-current={s.state === 'here' ? 'step' : undefined}
          className={
            'min-w-[7rem] flex-1 border-t-[3px] pe-3 pt-2 ' +
            (s.state === 'done'
              ? 'border-settled'
              : s.state === 'here'
                ? 'border-lapis'
                : 'border-line')
          }
        >
          <div
            className={
              'text-[9.5px] uppercase tracking-[0.1em] ' +
              (s.state === 'here'
                ? 'font-bold text-lapis'
                : s.state === 'done'
                  ? 'text-sand'
                  : 'text-muted')
            }
          >
            {s.name}
          </div>
          <div className="mt-0.5 font-mono text-[11px] text-muted">{s.at ?? '—'}</div>
        </li>
      ))}
    </ol>
  );
}

/**
 * The one act, always in the same corner.
 *
 * A member should never hunt for what to do. Everything else a record offers
 * sits behind one press, so the panel shows one thing and not five.
 */
export function ActionPanel({
  next,
  whose,
  children,
  more,
}: {
  /** The act to do now, in the words the interface uses. */
  next: string;
  /** Whose it is, and how long it has waited. */
  whose?: string;
  /** The act itself. */
  children?: ReactNode;
  /** Everything else that can be done here, folded away. */
  more?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="rounded-card bg-raised p-4 shadow-ring">
      <div className="mb-2.5 text-[9.5px] font-bold uppercase tracking-[0.13em] text-muted">
        {t('shape.next')}
      </div>
      <p className="text-[15px] leading-snug text-paper">{next}</p>
      {whose && <p className="mt-1 text-[12.5px] text-muted">{whose}</p>}
      {children && <div className="mt-3.5">{children}</div>}
      {more && <details className="mt-3 text-[12.5px]">
        <summary className="cursor-pointer text-lapis">{t('shape.more')}</summary>
        <div className="mt-2.5 flex flex-col gap-2">{more}</div>
      </details>}
    </div>
  );
}

/** A small block of facts beside the act. Label left, value right. */
export function Facts({ rows }: { rows: readonly { label: string; value: ReactNode }[] }) {
  const { t } = useI18n();
  return (
    <div className="mt-3.5 rounded-card bg-raised p-4 shadow-ring">
      <div className="mb-2.5 text-[9.5px] font-bold uppercase tracking-[0.13em] text-muted">
        {t('shape.facts')}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[12.5px]">
        {rows.map((r) => (
          <div key={r.label} className="contents">
            <dt className="text-muted">{r.label}</dt>
            <dd className="m-0 text-end text-sand">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * What has happened to this, in order.
 *
 * At the foot of every record, because it answers the question a person asks
 * second — after *what do I do now* and before anything else.
 */
export function Activity({
  entries,
}: {
  entries: readonly { at: string; said: ReactNode }[];
}) {
  const { t } = useI18n();
  if (entries.length === 0) return null;

  return (
    <section className="mt-10 border-t border-line pt-6">
      <h2 className="mb-3 text-[9.5px] font-bold uppercase tracking-[0.13em] text-muted">
        {t('shape.history')}
      </h2>
      <ul className="space-y-0">
        {entries.map((e, i) => (
          <li
            key={i}
            className="grid grid-cols-[5.5rem_1fr] gap-3.5 border-b border-line/60 py-2 text-[13px] last:border-b-0"
          >
            <time className="font-mono text-[12px] text-muted">{e.at}</time>
            <span className="text-sand">{e.said}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * One thing, in full.
 *
 * The act column is sticky on a wide screen and falls under the content on a
 * narrow one. A member who has read to the bottom should not scroll back up
 * to act.
 */
export function RecordPage({
  phase,
  tail,
  title,
  states,
  stages,
  children,
  aside,
  activity,
}: {
  phase?: AnyPhase;
  /** An identifier, where a reader would use one. */
  tail?: string;
  title: ReactNode;
  /** What state it is in, as pills. */
  states?: ReactNode;
  stages?: readonly Stage[];
  children: ReactNode;
  aside: ReactNode;
  activity?: readonly { at: string; said: ReactNode }[];
}) {
  return (
    <div>
      <PageHead phase={phase} tail={tail} title={title} says="" live={states} />
      {stages && <StageBar stages={stages} />}

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">{children}</div>
        <div className="w-full shrink-0 lg:sticky lg:top-6 lg:w-[300px]">{aside}</div>
      </div>

      {activity && <Activity entries={activity} />}
    </div>
  );
}

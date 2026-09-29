import { useEffect, useState, type ReactNode } from 'react';
import type { Passage, PassageStep } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { nameOf, useMembers } from '../lib/members.js';
import { useIdentity } from '../lib/identity.js';
import { useStanding } from '../lib/standing.js';
import { DateText } from './ui.js';
import StepWindow, { type Step } from './StepWindow.js';
import { Button } from './Button';

/**
 * One window for a piece of work, whatever kind it is.
 *
 * ── what it replaces ──────────────────────────────────────────────────────
 *
 * The window existed once in the whole application — the matter's — and every
 * other kind of work was a page. A breach was nine cards down a column, each
 * with its own button, the current one tinted; a question was a card in a
 * list; an undertaking a line with a button; a review nothing but a date that
 * passed. Five kinds of the same thing — something in a phase, with a next
 * step and somebody it waits on — drawn five ways, so a member learned five
 * screens to do one job.
 *
 * ── what it draws, and what it does not decide ────────────────────────────
 *
 * Everything here is read off the passage the server builds (`groups`,
 * `next`, `standing`, `why`, `whose`, `who`, `holder`). This window computes
 * nothing about where the work stands: which step is next, whose it is and
 * what is in the way are the record's, and the queue reads the same passage,
 * so the two cannot disagree about the same thing on the same day.
 *
 *   the strip     the phases across the top, each half named, the step the
 *                 work is at lit; every step can be opened to read it.
 *   what now      the one act, whose it is, who is carrying it, what stands
 *                 in its way and why the step exists — the guidance beside
 *                 the step, not in a manual.
 *   beside it     no more than five facts about the thing, and its document.
 *   the record    what has happened, in order, each with when and by whom.
 *   the bar       the act, on the same pixel every time.
 *
 * After an act the window moves to the step that is next — never back to a
 * list. Opening an earlier step to read it and then acting brings the member
 * back to where the work is.
 */

export interface WorkPanel {
  /** The step this belongs to, by the passage's key. */
  key: string;
  /** What the record holds for this step. */
  detail?: ReactNode;
  /**
   * The same, in a line, for the record under the step — where the detail is
   * a whole reader (a contract, a draft) that belongs on its own step only.
   */
  summary?: ReactNode;
  /** The act, where there is one for this member on this step now. */
  action?: ReactNode;
  /**
   * Whether the act is still offered when the step is in somebody else's
   * hands — for an act done on the holder's behalf, which the secretary
   * closing an undertaking for the member who gave it is.
   */
  onTheirBehalf?: boolean;
}

export interface Fact {
  label: string;
  value: ReactNode;
}

/** The step the work is at: the passage's next, else the last one done. */
function atNow(passage: Passage): string | null {
  if (passage.next) return passage.next.key;
  const all = passage.groups.flatMap((g) => g.steps);
  const done = all.filter((s) => s.state === 'done');
  return (done[done.length - 1] ?? all[0])?.key ?? null;
}

export default function WorkWindow({
  passage,
  title,
  chips,
  panels,
  facts,
  document,
  documentLabel,
  holding,
  holdingAll,
  notice,
  moved,
}: {
  passage: Passage;
  title: string;
  chips?: ReactNode;
  panels: readonly WorkPanel[];
  /** The few facts that say what this is. More than five is a page again. */
  facts?: readonly Fact[];
  /** The thing itself: the report, the question, the undertaking's words. */
  document?: ReactNode;
  documentLabel?: string;
  /**
   * Who is carrying the step the window is on, and taking it on.
   *
   * A function of the step rather than a node, because the control has to know
   * which step it is placing: the screens passed a node built from the passage
   * alone, so the only thing that could be handed to a colleague was the whole
   * of it. A member who read the contract still had to hand over the answer to
   * the regulator with it.
   */
  holding?: (step: PassageStep) => ReactNode;
  /**
   * Who is carrying the whole of it.
   *
   * Beside the facts rather than beside the step, because that is what it is
   * about: the thing, not the act in front of you. Both were the same control
   * once and it placed the whole of it wherever it was pressed, so a member
   * standing on one step handed over five.
   */
  holdingAll?: ReactNode;
  /** What the last act did, or what refused it — above the step, so it survives the step changing. */
  notice?: ReactNode;
  /**
   * A count that goes up every time an act lands, so the window can go to
   * the step that is now next rather than stay on the one just done.
   */
  moved?: number;
}) {
  const { t, say } = useI18n();
  const members = useMembers();
  const standing = useStanding();
  const me = useIdentity().identity?.scholarId;
  const steps = passage.groups.flatMap((g) => g.steps.map((s) => ({ step: s, group: g.key })));

  /* Null follows the work; a key is a step the member opened to read. */
  const [looking, setLooking] = useState<string | null>(null);
  useEffect(() => setLooking(null), [moved, passage.of.id]);
  const now = atNow(passage);
  const shown = looking ?? now;
  const at = steps.findIndex((s) => s.step.key === shown);
  const here = steps[at] ?? steps[0];

  if (!here) return null;
  const step: PassageStep = here.step;
  const panel = panels.find((p) => p.key === step.key);
  /* Following the work, rather than reading back an earlier step. */
  const following = looking === null || looking === now;

  const whose = (s: PassageStep) =>
    s.who ? nameOf(members, s.who) : t(`passage.whose.${s.whose}`);

  /*
   * Two ways an open step is not this member's to press, read off the step.
   *
   * **In a colleague's hands.** The step is the board's and the route would
   * let anybody on it act — but it was placed with somebody, and a bar
   * offering the act to five members for one member's work is how two of them
   * answer the same condition. It names whom it is with instead.
   *
   * **Already said.** A vote, a finding on a breach: open until enough have
   * spoken, and every signatory's — but not the one who has. Offered the same
   * act again, the member pressed it and the route refused.
   */
  const open = step.state === 'open';
  const elsewhere = open && step.who && step.who !== me ? step.who : null;
  const spoke = open && !!me && (step.heard ?? []).includes(me);
  const bar = elsewhere ? (
    <>
      <span className="text-ui text-muted">{t('work.withSomebody', { who: nameOf(members, elsewhere) })}</span>
      {panel?.onTheirBehalf && panel.action}
    </>
  ) : (
    panel?.action ??
    (spoke ? (
      <span className="text-ui text-muted">{t('work.heardYou')}</span>
    ) : passage.next ? (
      <span className="text-ui text-muted">{t('work.notYours', { whose: whose(step) })}</span>
    ) : null)
  );

  const strip: Step[] = steps.map(({ step: s, group }, i) => ({
    id: s.key,
    ordinal:
      s.state === 'done'
        ? '✓'
        : String(steps.filter((x, j) => j <= i && x.group === group).length).padStart(2, '0'),
    state:
      s.key === shown
        ? 'here'
        : s.state === 'done'
          ? 'done'
          : s.key === now
            ? 'contested'
            : 'todo',
    group: i === 0 || steps[i - 1].group !== group ? t(`passage.group.${group}`) : undefined,
    /* Whose each step is, even one nobody has reached: that is how work stalls. */
    label: `${say(s.act)} — ${whose(s)}`,
    onOpen: () => setLooking(s.key === now ? null : s.key),
  }));

  const inGroup = steps.filter((s) => s.group === here.group);
  const heading = `${t(`passage.group.${here.group}`)} · ${t('win.step')} ${
    inGroup.findIndex((s) => s.step.key === step.key) + 1
  } ${t('win.of')} ${inGroup.length}`;

  /* The record: every step that has happened, in order. */
  const record = steps.filter((s) => s.step.state === 'done');

  /* Beside the work: the few facts that say what this is, and the thing itself. */
  const beside =
    (facts && facts.length > 0) || document || holdingAll ? (
      <div>
        {facts && facts.length > 0 && (
          <dl className="mb-5 grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 text-ui">
            {facts.slice(0, 5).map((f) => (
              <div key={f.label} className="contents">
                <dt className="text-muted">{f.label}</dt>
                <dd className="min-w-0 text-paper">{f.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {document && (
          <>
            {documentLabel && (
              <div className="mb-1.5 text-label font-bold uppercase tracking-caps text-muted">
                {documentLabel}
              </div>
            )}
            <div className="font-read text-body leading-relaxed text-paper">{document}</div>
          </>
        )}
        {holdingAll}
      </div>
    ) : undefined;

  return (
    <StepWindow
      title={title}
      chips={chips}
      steps={strip}
      heading={heading}
      aside={beside}
      acts={
        following ? (
          bar
        ) : (
          <Button type="button" tone="quiet" size="md" onClick={() => setLooking(null)}>
            {t('work.backToNow')}
          </Button>
        )
      }
    >
      {notice && <div className="mb-4">{notice}</div>}

      {/* ── what now ───────────────────────────────────────────────── */}
      <h2 className="text-title font-semibold leading-snug tracking-title text-paper">{say(step.act)}</h2>
      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 text-note">
        <span className="font-bold uppercase tracking-caps text-muted">{whose(step)}</span>
        {step.state === 'done' && (
          <span className="text-settled">
            {t('passage.done')}
            {step.at && (
              <>
                {' · '}
                <DateText iso={step.at} />
              </>
            )}
          </span>
        )}
        {step.enforced && step.state !== 'done' && (
          <span className="text-goldink">{t('passage.enforced')}</span>
        )}
      </div>

      {/* What is in the way, in the record's own words. */}
      {step.standing && step.state !== 'done' && (
        <p className="mt-3 max-w-[62ch] rounded-lg bg-ink/60 px-3.5 py-2.5 text-ui leading-relaxed text-sand">
          {standing(step)}
        </p>
      )}

      {following && passage.next && holding && <div className="mt-4">{holding(step)}</div>}

      {panel?.detail && <div className="mt-4 max-w-[68ch] text-ui leading-relaxed text-paper">{panel.detail}</div>}

      {/* Why the step exists — the guidance beside the step, not in a manual. */}
      <div className="mt-5 max-w-[62ch] border-t border-line pt-4">
        <div className="mb-1 text-label font-bold uppercase tracking-caps text-muted">{t('work.why')}</div>
        <p className="text-ui leading-relaxed text-muted">{say(step.why)}</p>
      </div>

      {/* ── the record: what has happened, in order ─────────────────── */}
      <section className="mt-6 border-t border-line pt-4">
        <h3 className="mb-3 text-label font-bold uppercase tracking-caps text-muted">
          {t('work.pane.record')}
        </h3>
        {record.length === 0 ? (
          <p className="text-ui text-muted">{t('work.nothingYet')}</p>
        ) : (
          <ol className="space-y-3.5">
            {record.map(({ step: s }) => {
              const own = panels.find((p) => p.key === s.key);
              const said = own?.summary ?? own?.detail;
              return (
                <li key={s.key} className="grid grid-cols-[18px,1fr] gap-2">
                  <span aria-hidden="true" className="pt-0.5 text-note text-settled">
                    ✓
                  </span>
                  <div className="min-w-0">
                    <div className="text-ui font-semibold text-paper">{say(s.act)}</div>
                    <div className="mt-0.5 text-note text-muted">
                      {whose(s)}
                      {s.at && (
                        <>
                          {' · '}
                          <DateText iso={s.at} />
                        </>
                      )}
                    </div>
                    {said && s.key !== step.key && (
                      <div className="mt-1 max-w-[62ch] text-note leading-relaxed text-sand">{said}</div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {passage.settled && (
        <p className="mt-5 max-w-[62ch] rounded-lg bg-settledtint px-3.5 py-2.5 text-ui leading-relaxed text-[#235A49]">
          {say(passage.settled)}
        </p>
      )}
    </StepWindow>
  );
}

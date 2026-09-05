import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  api,
  governance,
  oversight,
  type Attention as Attention_,
  type AttentionItem,
  type MatterSummary,
} from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { mayDeliberate, useIdentity } from '../lib/identity.js';
import SmartRaise from '../components/SmartRaise.js';
import { Block, Display, Label, Note, Why } from '../components/type.js';

/**
 * Arrival.
 *
 * Two questions, because the screen that asked only the first was empty for
 * most of the people who opened it. **What needs me** is the reason a member
 * signs in. **What is the board doing** is what everybody else came for — an
 * observer, an auditor, a scholar looking before they have been given
 * credentials — and for them the honest answer to the first question is
 * *nothing*, forever. A product whose front page says *nothing is waiting for
 * you* and stops has told a first-time reader that there is nothing here.
 *
 * So the second half is always present, drawn from the record rather than
 * invented: matters open, what has drifted under a standing ruling, holdings
 * never put to the board. Three numbers a scholar recognises, each a link into
 * the thing it counts.
 *
 * ── the apology is one line ───────────────────────────────────────────────
 *
 * The credential notice used to be ninety of the hundred and thirty words on
 * this page: the largest, brightest object on a scholar's first screen was an
 * explanation of something they cannot fix, addressed to whoever installed
 * this. It is a sentence now, with the rest behind a disclosure.
 *
 * ── and one thing is large ────────────────────────────────────────────────
 *
 * The outstanding act is set in the display face at reading size, and
 * everything else on the page is smaller than it. That is the whole of the
 * hierarchy, and it is what the screen previously had none of.
 */

function urgencyRule(item: AttentionItem): string {
  if (item.overdue) return 'border-warn';
  if (item.hoursRemaining !== null && item.hoursRemaining <= 48) return 'border-gold';
  return 'border-line';
}

/** How long is left, in the largest unit that is still honest. */
function remaining(item: AttentionItem, t: (k: string) => string): string | null {
  if (item.hoursRemaining === null) return null;
  const hours = Math.abs(item.hoursRemaining);
  const days = Math.floor(hours / 24);
  const shape = days >= 2 ? `${days} ${t('guided.days')}` : `${Math.round(hours)} ${t('guided.hours')}`;
  return item.overdue ? `${t('guided.overdueBy')} ${shape}` : `${shape} ${t('guided.left')}`;
}

function TheOneThing({ item }: { item: AttentionItem }) {
  const { t } = useI18n();
  const left = remaining(item, t);

  return (
    <Link
      to={`/matters/${item.matterId}`}
      className={
        'group block border-s-[3px] ps-5 transition-colors hover:border-gold ' + urgencyRule(item)
      }
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Label>
          {t(item.kind === 'overdue' ? 'attention.overdueKind' : `attention.${item.kind}`)}
        </Label>
        {left && (
          <span
            className={
              'font-mono text-[12.5px] tabular-nums ' + (item.overdue ? 'text-warn' : 'text-gold')
            }
          >
            {left}
          </span>
        )}
      </div>

      {/* The one large thing on the page. */}
      <div className="mt-2 font-display text-[24px] leading-[1.2] text-paper sm:text-[28px]">
        {item.title}
      </div>

      <Note className="mt-2">{item.note}</Note>

      <span className="mt-3 inline-block text-[13px] text-gold transition-transform group-hover:translate-x-0.5">
        {t('guided.open')} →
      </span>
    </Link>
  );
}

/** One number, what it counts, and where it goes. */
function Count({ n, of, to }: { n: number; of: string; to: string }) {
  return (
    <Link to={to} className="group block">
      <div className="font-display text-[32px] leading-none tabular-nums text-paper transition-colors group-hover:text-gold">
        {n}
      </div>
      <Note className="mt-1.5 max-w-[22ch]">{of}</Note>
    </Link>
  );
}

export default function Guided() {
  const { t } = useI18n();
  const { identity } = useIdentity();
  const [attention, setAttention] = useState<Attention_ | null>(null);
  const [matters, setMatters] = useState<MatterSummary[] | null>(null);
  const [drifting, setDrifting] = useState<number | null>(null);
  const [unexamined, setUnexamined] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;

    governance
      .attention()
      .then((a) => live && Array.isArray(a?.items) && setAttention(a))
      .catch(() => live && setFailed(true));

    /*
     * Each of the three counts fails alone.
     *
     * They are what the board is doing, not what the reader must act on, so a
     * register that will not answer takes its own number off the page and
     * leaves the rest of the screen standing.
     */
    api
      .matters()
      .then((m) => live && Array.isArray(m) && setMatters(m))
      .catch(() => undefined);
    oversight
      .drift()
      .then((d) => live && setDrifting((d.drifting ?? []).length))
      .catch(() => undefined);
    oversight
      .register()
      // The register already counts this and says what it means; deriving it
      // again here would be a second definition of the same word.
      .then((r) => live && setUnexamined(r.neverExamined))
      .catch(() => undefined);

    return () => {
      live = false;
    };
  }, []);

  if (failed) return <Note>{t('guided.unreachable')}</Note>;
  if (!attention) return null;

  const items = [...attention.items].sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    return (a.hoursRemaining ?? Infinity) - (b.hoursRemaining ?? Infinity);
  });

  const [first, ...rest] = items;
  const open = (matters ?? []).filter((m) => m.status !== 'in_force' && m.status !== 'lapsed').length;
  const reading = !identity || identity.role === 'observer';

  return (
    <div>
      {reading && (
        <div className="mb-10">
          <Note>{t('whoami.observerShort')}</Note>
          <Why label={t('whoami.observerWhy')}>{t('whoami.observerBody')}</Why>
        </div>
      )}

      <Block>
        <Label className="mb-3">{t('guided.greeting')}</Label>

        {first ? (
          <>
            <TheOneThing item={first} />

            {rest.length > 0 && (
              <ul className="mt-8 space-y-3">
                {rest.map((item) => (
                  <li key={`${item.matterId}:${item.kind}`}>
                    <Link
                      to={`/matters/${item.matterId}`}
                      className="group flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line pb-3 transition-colors hover:border-muted"
                    >
                      <span className="font-display text-[16px] text-sand transition-colors group-hover:text-paper">
                        {item.title}
                      </span>
                      <span className="text-[12px] text-muted">
                        {t(
                          item.kind === 'overdue'
                            ? 'attention.overdueKind'
                            : `attention.${item.kind}`,
                        )}
                        {remaining(item, t) && <span> · {remaining(item, t)}</span>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          // An answer, not a blank — and set large, because for most people
          // opening this it is the whole of the first question's answer.
          <Display className="max-w-[20ch] text-sand">{t('guided.clearShort')}</Display>
        )}
      </Block>

      {/*
        What the board is doing, always. The screen that asked only what needs
        *you* was empty for an observer, an auditor, and anybody looking before
        they have credentials — which is everybody, the first time.
      */}
      <Block label={t('guided.whatIsHappening')}>
        <div className="grid gap-8 sm:grid-cols-3">
          {matters !== null && <Count n={open} of={t('guided.countOpen')} to="/classic" />}
          {drifting !== null && <Count n={drifting} of={t('guided.countDrift')} to="/register" />}
          {unexamined !== null && (
            <Count n={unexamined} of={t('guided.countUnexamined')} to="/register" />
          )}
        </div>
      </Block>

      {mayDeliberate(identity?.role) && (
        <Block>
          <SmartRaise boardId="demo-board" />
        </Block>
      )}

      <Block className="border-t border-line pt-5">
        <Link
          to="/more"
          className="text-[13px] text-muted underline decoration-line underline-offset-4 transition-colors hover:text-paper"
        >
          {t('guided.everything')} →
        </Link>
      </Block>
    </div>
  );
}

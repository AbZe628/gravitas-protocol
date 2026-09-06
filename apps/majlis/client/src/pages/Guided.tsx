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
import { Act, Card, Edge, Figure, State, type Tone } from '../components/kit.js';

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
 * The outstanding act is a raised sheet with a rule down its edge, and nothing
 * else on the page carries that much shadow. Everything after it is a quiet
 * translucent card. A reader's eye lands on the one thing before it reads a
 * word, which is what the screen previously had no way of saying.
 */

/** The one colour this item is entitled to. */
function toneFor(item: AttentionItem): Tone {
  if (item.overdue) return 'breach';
  if (item.hoursRemaining !== null && item.hoursRemaining <= 48) return 'attention';
  return 'plain';
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
  const tone = toneFor(item);
  const kind = t(item.kind === 'overdue' ? 'attention.overdueKind' : `attention.${item.kind}`);

  return (
    <Card lead className="ps-8">
      <Edge tone={tone} />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <State tone={tone}>{kind}</State>
        {left && (
          <span
            className={
              'font-mono text-[12.5px] tabular-nums ' +
              (item.overdue ? 'text-breach' : 'text-gold')
            }
          >
            {left}
          </span>
        )}
      </div>

      {/* The one large thing on the page. */}
      <div className="mt-3.5 max-w-[28ch] font-display text-[26px] leading-[1.18] tracking-[-0.02em] text-paper sm:text-[30px]">
        {item.title}
      </div>

      <Note className="mt-3">{item.note}</Note>

      <div className="mt-6">
        <Act to={`/matters/${item.matterId}`} tone="gold">
          {t('guided.open')}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M5 12h13M12 5l7 7-7 7" />
          </svg>
        </Act>
      </div>
    </Card>
  );
}

/** One number, what it counts, and where it goes. */
function Count({ n, of, to, tone = 'plain' }: { n: number; of: string; to: string; tone?: Tone }) {
  return (
    <Card to={to} tone="quiet">
      <Figure n={n} of={of} tone={tone} />
    </Card>
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

            {/*
              After the one thing, the rest — quiet, translucent, and in the
              order the sort put them. They are cards rather than rules across
              the page so that a reader can see they are the same kind of thing
              as the one above, only smaller.
            */}
            {rest.length > 0 && (
              <ul className="mt-6 space-y-2">
                {rest.map((item) => {
                  const left = remaining(item, t);
                  const tone = toneFor(item);
                  return (
                    <li key={`${item.matterId}:${item.kind}`}>
                      <Card to={`/matters/${item.matterId}`} tone="quiet" className="!py-4">
                        <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2">
                          <div className="flex min-w-0 items-center gap-3.5">
                            <span
                              className={
                                'h-[7px] w-[7px] shrink-0 rounded-full ' +
                                (tone === 'breach'
                                  ? 'bg-breach ring-[3.5px] ring-breach/15'
                                  : tone === 'attention'
                                    ? 'bg-gold ring-[3.5px] ring-gold/15'
                                    : 'bg-line')
                              }
                            />
                            <span className="font-display text-[18px] leading-snug tracking-[-0.012em] text-paper">
                              {item.title}
                            </span>
                          </div>
                          <span className="shrink-0 text-[12.5px] text-muted">
                            {t(
                              item.kind === 'overdue'
                                ? 'attention.overdueKind'
                                : `attention.${item.kind}`,
                            )}
                            {left && (
                              <>
                                {' · '}
                                <span
                                  className={
                                    'font-mono tabular-nums ' +
                                    (item.overdue ? 'text-breach' : 'text-gold')
                                  }
                                >
                                  {left}
                                </span>
                              </>
                            )}
                          </span>
                        </div>
                      </Card>
                    </li>
                  );
                })}
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
        <div className="grid gap-4 sm:grid-cols-3">
          {matters !== null && (
            <Count n={open} of={t('guided.countOpen')} to="/classic" tone="lapis" />
          )}
          {drifting !== null && (
            <Count
              n={drifting}
              of={t('guided.countDrift')}
              to="/register"
              tone={drifting > 0 ? 'attention' : 'plain'}
            />
          )}
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

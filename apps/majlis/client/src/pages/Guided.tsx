import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  api,
  governance,
  oversight,
  theWayIn,
  type Attention as Attention_,
  type AttentionItem,
  type MatterSummary,
} from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { mayDeliberate, useIdentity } from '../lib/identity.js';
import SmartRaise from '../components/SmartRaise.js';
import FourDoors from '../components/FourDoors.js';
import { Block, Display, Label, Note, Why } from '../components/type.js';
import { Act, Card, Edge, State, type Tone } from '../components/kit.js';

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

/**
 * The board's most pressing fact, for a reader nothing is waiting on.
 *
 * One statement, chosen in the order a board would rank them: a question
 * somebody is waiting on beats a matter being argued, which beats a holding
 * that has left the limits, which beats one nobody has examined. Each links to
 * the screen that answers it, so the sentence is a way in rather than a
 * headline to read past.
 *
 * Where the board genuinely has nothing outstanding it says that, and that is
 * a different sentence from "nothing needs you" — the first is about the
 * board, the second about the reader, and running them together is what made
 * a full record read as an empty one.
 */
function Pressing({
  waiting,
  longestWait,
  open,
  moved,
  unexamined,
}: {
  waiting: number | null;
  longestWait: number | null;
  open: number | null;
  moved: number | null;
  unexamined: number | null;
}) {
  const { t } = useI18n();

  const said =
    waiting !== null && waiting > 0
      ? {
          to: '/questions',
          text:
            longestWait !== null
              ? `${t('pressing.waitedFor')} ${longestWait} ${t('guided.days')}.`
              : `${waiting} ${t('spine.asked.count')}.`,
        }
      : open !== null && open > 0
        ? { to: '/classic', text: `${open} ${t('pressing.open')}` }
        : moved !== null && moved > 0
          ? { to: '/examinations', text: `${moved} ${t('pressing.moved')}` }
          : unexamined !== null && unexamined > 0
            ? { to: '/register', text: `${unexamined} ${t('pressing.unexamined')}` }
            : null;

  return (
    <>
      {said ? (
        <Link to={said.to} className="block">
          <Display className="max-w-[20ch] text-paper">{said.text}</Display>
        </Link>
      ) : (
        <Display className="max-w-[20ch] text-sand">{t('pressing.nothingOutstanding')}</Display>
      )}
      <p className="mt-3 text-[13px] leading-[1.6] text-muted">{t('guided.clearShort')}</p>
    </>
  );
}

export default function Guided() {
  const { t } = useI18n();
  const { identity } = useIdentity();
  const [attention, setAttention] = useState<Attention_ | null>(null);
  const [matters, setMatters] = useState<MatterSummary[] | null>(null);
  const [drifting, setDrifting] = useState<number | null>(null);
  const [unexamined, setUnexamined] = useState<number | null>(null);
  const [waiting, setWaiting] = useState<number | null>(null);
  const [longestWait, setLongestWait] = useState<number | null>(null);
  const [standing, setStanding] = useState<number | null>(null);
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

    /*
     * What is waiting at the door, and how long the worst of it has waited.
     *
     * The wait is the number that shames a board into acting, and it was
     * nowhere on this screen. `waitedHours` is derived on the server so that
     * two screens cannot disagree about it; the days are floored, because a
     * question that has waited nine and a half days has waited nine whole
     * days and rounding it up would be flattering nobody.
     */
    theWayIn
      .list('demo-board')
      .then((r) => {
        if (!live) return;
        const queue = (r.submissions ?? []).filter((s) => s.standing === 'waiting');
        setWaiting(queue.length);
        const worst = queue.reduce((most, s) => Math.max(most, s.waitedHours ?? 0), 0);
        setLongestWait(queue.length ? Math.floor(worst / 24) : null);
      })
      .catch(() => undefined);

    api
      .rules()
      .then((rules) => live && Array.isArray(rules) && setStanding(rules.length))
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
          /*
           * Nothing needs this reader. That is said, quietly, under the thing
           * that *is* true of the board — because a reader with no seat is
           * still asking what this board is doing, and answering only the
           * first question at forty pixels made a working record look empty.
           */
          <Pressing
            waiting={waiting}
            longestWait={longestWait}
            open={matters === null ? null : open}
            moved={drifting}
            unexamined={unexamined}
          />
        )}
      </Block>

      {/*
        The whole application, in four rows.

        This was three loose counters under a heading that said *what is
        happening* — the three that happened to be easy to fetch. One of them
        linked to a page that never mentioned what it counted, and one read
        "1 holdings". These four are the four phases, so the row a reader
        wants always exists and each opens the screen that answers it.

        Always present, for the same reason the counters were: the screen that
        asked only what needs *you* was empty for an observer, an auditor, and
        anybody looking before they have credentials — which is everybody, the
        first time.
      */}
      <Block label={t('spine.everything')}>
        {/*
          What the thing does, in one sentence, above the four steps.

          The four rows carried the process and never said it. A person opening
          this saw four abstract nouns with numbers beside them and had to work
          out that they were a sequence — and a board member who cannot tell
          what the application is for in one look does not open it twice.
        */}
        <p className="mb-5 max-w-[62ch] text-[13.5px] leading-[1.7] text-sand">
          {t('spine.howItWorks')}
        </p>

        <FourDoors
          counts={{
            asked: waiting,
            deciding: matters === null ? null : open,
            inforce: standing,
            checked: unexamined,
            moved: drifting,
            longestWaitDays: longestWait,
          }}
        />
      </Block>

      {mayDeliberate(identity?.role) && (
        <Block>
          <SmartRaise boardId="demo-board" />
        </Block>
      )}
    </div>
  );
}

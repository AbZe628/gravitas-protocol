import { useEffect, useState } from 'react';
import { oversight, theWayIn, type Passage, type Submission } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { useIdentity, mayDeliberate, maySubmit } from '../lib/identity.js';
import { MainAct, State } from '../components/kit.js';
import { Chip } from '../components/shapes.js';
import { Gaps, Nothing, PageHead } from '../components/page.js';
import { Sheet, Line, Mark, Figure, type Column } from '../components/sheet.js';
import { ErrorText, Loading } from '../components/ui.js';
import { useStillThere } from '../lib/stillThere.js';
import { nameOf, useMembers } from '../lib/members.js';
import Person from '../components/Person.js';

/**
 * What the institution has asked, and what the board did about it.
 *
 * Oldest first, and that ordering is the one opinion this screen holds. A queue
 * sorted newest-first buries the question that has waited longest, which is the
 * one most likely to have gone wrong — and the wait is the number this product
 * is judged on.
 *
 * The two acts a board has here are genuinely different and are shown as
 * different. Taking it up asks for the board's own wording of the question, in
 * a field that starts empty: defaulting it to the institution's subject line
 * would make the board's reading and the bank's wording the same string by
 * accident, which is the confusion this whole path exists to prevent. Declining
 * asks for a reason, compulsorily, because a decline the desk cannot learn
 * anything from is the board refusing to answer and refusing to say why.
 */


export function span(hours: number, t: (k: string) => string): string {
  if (hours < 48) return `${hours} ${t('attention.hours')}`;
  return `${Math.floor(hours / 24)} ${t('attention.days')}`;
}

/**
 * How long it took, said differently depending on whether it is over.
 *
 * A question the board answered inside the hour rendered as *0 hours waiting*,
 * which reads as a fault rather than as the best possible outcome. So a settled
 * one says how long it took to answer, and a same-day answer says that in
 * words — the figure is not the point once the number is small.
 */
export function clock(s: Submission, t: (k: string) => string): string {
  if (s.standing === 'waiting') return `${span(s.waitedHours, t)} ${t('queue.waited')}`;
  if (s.waitedHours < 24) return t('queue.answeredSame');
  return `${t('queue.answeredIn')} ${span(s.waitedHours, t)}`;
}

/*
  Each question, one line. Its words, its acts and where it stands are its own
  window now, at its own address (see QuestionDetail.tsx) — the list is a list.
*/
const COLS = (t: (k: string) => string): readonly Column[] => [
  { head: t('col.what'), width: 'minmax(0,2.4fr)', phone: 'lead' },
  { head: t('queue.askedBy'), width: 'minmax(0,1.2fr)', phone: 'under' },
  { head: t('col.stage'), width: '8rem', phone: 'under' },
  { head: t('col.days'), width: '9rem', end: true, phone: 'trailing' },
];

function Row({ s, passage }: { s: Submission; passage?: Passage }) {
  const { t } = useI18n();
  const members = useMembers();
  const holder = passage?.holder?.to;
  return (
    <Line
      to={`/questions/${s.id}`}
      columns={COLS(t)}
      cells={[
        s.subject,
        <span className="block truncate text-ui text-muted">
          <Person id={s.askedBy} />
          {holder && (
            <>
              <span className="mx-1.5 opacity-40">·</span>
              {nameOf(members, holder)}
            </>
          )}
        </span>,
        /* Waiting, declined and taken up are three outcomes, not three alarms. */
        <Mark>{t(`queue.${s.standing}`)}</Mark>,
        <Figure tone={s.standing === 'waiting' ? 'text-goldink' : 'text-muted'}>{clock(s, t)}</Figure>,
      ]}
    />
  );
}

export default function Questions({ boardId }: { boardId: string }) {
  const { t } = useI18n();
  const { identity } = useIdentity();
  const [all, setAll] = useState<Submission[] | null>(null);
  const [passages, setPassages] = useState<Map<string, Passage>>(new Map());
  const [failed, setFailed] = useState(false);
  /**
   * Which of the two lists is on screen. Not remembered between visits: a
   * board coming back to its queue is coming back to what is waiting.
   */
  const [show, setShow] = useState<'waiting' | 'settled'>('waiting');
  /** A failed refresh keeps a screen that is already there. */
  const there = useStillThere();

  const load = () => {
    theWayIn
      .list(boardId)
      // A 200 with the wrong shape crashes a whole page; every fetch here
      // checks before it sets.
      .then((r) => {
        there.arrived();
        setAll(Array.isArray(r.submissions) ? r.submissions : []);
      })
      .catch(() => there.lost(setFailed));
    /*
     * Every question's reading at once, for who is taking each up. Not
     * required: without it the cards are as they were, and taking up is
     * simply not offered.
     */
    oversight
      .passages('question')
      .then((r) => setPassages(new Map((r.passages ?? []).map((p) => [p.of.id, p]))))
      .catch(() => setPassages(new Map()));
  };

  useEffect(load, [boardId]);

  /*
   * Unreachable is not empty.
   *
   * This screen used to start at an empty array and swallow the failure, so
   * a board whose server was down read "nothing has been asked" — a claim
   * about the bank rather than about the connection.
   */
  if (failed) return <ErrorText />;
  if (!all) return <Loading />;

  const canAct = mayDeliberate(identity?.role);
  const open = all.filter((s) => s.standing === 'waiting');
  const settled = all.filter((s) => s.standing !== 'waiting');

  /*
   * The longest wait, above everything.
   *
   * It is the number this product is judged on and it was nowhere on the
   * screen that holds it — a reader had to scan the list and compare. Floored
   * to whole days for the same reason it is floored everywhere else.
   */
  const longest = open.reduce((most, s) => Math.max(most, s.waitedHours ?? 0), 0);

  /*
   * What this screen cannot tell you.
   *
   * Both of these were true before and neither was said. A board reading a
   * queue of three has no way of knowing that the desk sent five, or that the
   * clock on two of them starts later than the question did.
   */
  const gaps: string[] = [];
  if (open.some((s) => !s.arrivedAt || s.arrivedAt === s.recordedAt)) {
    gaps.push(t('queue.gap.arrival'));
  }
  if (all.length > 0) gaps.push(t('queue.gap.only'));

  return (
    <div>
      <PageHead
        phase="asked"
        title={t('queue.title')}
        says={t('queue.lead')}
        live={
          open.length > 0 ? (
            <>
              <State tone={longest >= 24 * 7 ? 'attention' : 'plain'}>
                {open.length} {t('spine.asked.count')}
              </State>
              <span className="text-ui text-muted">
                {t('spine.longestWait')}{' '}
                <span className="font-mono tabular-nums text-goldink">{span(longest, t)}</span>
              </span>
            </>
          ) : undefined
        }
        act={
          maySubmit(identity?.role) ? <MainAct to="/ask">{t('door.asked.put')}</MainAct> : undefined
        }
      />


      {/*
        Two headings became two chips.

        The screen drew both lists, one under the other, and what was already
        dealt with ran to 1 072 pixels — as much room as the live work, under
        it, on a screen 2 873 pixels tall. An archive is not something a board
        scrolls past on the way to its queue. It is one press away, counted so
        nobody has to wonder whether anything is there, and the queue opens on
        what is waiting.
      */}
      <div className="mb-5 flex flex-wrap gap-2">
        <Chip on={show === 'waiting'} onPick={() => setShow('waiting')} count={open.length}>
          {t('queue.waitingHere')}
        </Chip>
        {settled.length > 0 && (
          <Chip on={show === 'settled'} onPick={() => setShow('settled')} count={settled.length}>
            {t('queue.settledHere')}
          </Chip>
        )}
      </div>

      {show === 'waiting' ? (
        open.length === 0 ? (
          <Nothing>{t('queue.none')}</Nothing>
        ) : (
          <Sheet columns={COLS(t)}>
            {open.map((s) => (
              <Row key={s.id} s={s} passage={passages.get(s.id)} />
            ))}
          </Sheet>
        )
      ) : (
        <>
          <p className="mb-3.5 max-w-[62ch] text-ui leading-relaxed text-muted">
            {t('queue.settledNote')}
          </p>
          <Sheet columns={COLS(t)}>
            {settled.map((s) => (
              <Row key={s.id} s={s} />
            ))}
          </Sheet>
        </>
      )}

      <Gaps items={gaps} />

      {/* Nothing here is a control: the route refuses regardless of what shows. */}
      {!canAct && all.length > 0 && (
        <p className="mt-6 text-note text-muted">{t('whoami.observerBody')}</p>
      )}
    </div>
  );
}

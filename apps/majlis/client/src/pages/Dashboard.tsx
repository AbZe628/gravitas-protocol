import { useEffect, useState } from 'react';
import { Gaps } from '../components/page.js';
import { ListPage } from '../components/shapes.js';
import { Sheet, Line, Mark, Figure, type Column } from '../components/sheet.js';
import { api, oversight, type EnforcementSnapshot, type MatterSummary, type Wait } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { DateText, ErrorText, Loading, Tag } from '../components/ui.js';
import DriftPanel from '../components/Drift.js';
import Pace from '../components/Pace.js';
import WhoYouAre from '../components/WhoYouAre.js';
import RaiseMatter from '../components/RaiseMatter.js';
import { mayDeliberate, useIdentity } from '../lib/identity.js';
import WhatThisIs from '../components/WhatThisIs.js';

/**
 * The columns, handed to the heading row and to every line alike.
 *
 * Declared beside the screen rather than inside it so the two are given one
 * object and cannot drift apart — a heading that stops sitting over its own
 * column is worse than no heading. The title is first because that is where
 * the link goes and what a phone shows.
 */
const OPEN_COLS = (t: (k: string) => string): readonly Column[] => [
  { head: t('col.matter'), width: 'minmax(0,2.4fr)', phone: 'lead' },
  { head: t('col.direction'), width: '7rem', phone: 'under' },
  { head: t('col.stage'), width: '7rem', phone: 'under' },
  { head: t('col.origin'), width: 'minmax(0,1fr)', phone: 'hide' },
  { head: t('col.opened'), width: '6.5rem', end: true, phone: 'hide' },
  { head: t('col.waiting'), width: '5rem', end: true, phone: 'trailing' },
  /*
    How many transactions the proposed rule would have stopped.

    It was a clause inside the row's sentence and it came off the table with
    the rest of that sentence — which a test caught, and rightly: it is the
    one figure on this screen that says what a ruling would cost, and the
    board sees it before it votes. A figure belongs in a column.
  */
  { head: t('col.wouldStop'), width: '5.5rem', end: true, phone: 'hide' },
];

const SETTLED_COLS = (t: (k: string) => string): readonly Column[] => [
  { head: t('col.ruling'), width: 'minmax(0,3fr)', phone: 'lead' },
  { head: t('col.direction'), width: '7rem', phone: 'under' },
  { head: t('col.opened'), width: '6.5rem', end: true, phone: 'trailing' },
];

export default function Dashboard() {
  const { t } = useI18n();
  const [matters, setMatters] = useState<MatterSummary[] | null>(null);
  const [enforcement, setEnforcement] = useState<EnforcementSnapshot | null>(null);
  // How long each open matter has been waiting, keyed by matter. A failure here
  // takes nothing off the page: the rows simply carry no figure.
  const [waits, setWaits] = useState<Map<string, Wait>>(new Map());
  const [failed, setFailed] = useState(false);
  const { identity } = useIdentity();
  /*
   * Closed unless somebody opened it.
   *
   * This was open unless somebody had closed it, and the difference cost
   * 1,589 pixels: on any browser that had not dismissed it — a new machine, a
   * cleared store, a demonstration, anyone arriving for the first time — four
   * paragraphs explaining what a Shariah board is sat on top of the matters,
   * and the page's own heading began almost two screens down.
   *
   * An explanation that opens by default on a work screen is onboarding
   * pinned permanently into the workflow. Nothing is deleted: the panel is
   * one press away and still remembers, and the press is now to open rather
   * than to get rid of it.
   */
  const [intro, setIntro] = useState(() => {
    try {
      return localStorage.getItem('majlis.intro.read') === 'no';
    } catch {
      return false;
    }
  });

  const toggleIntro = () =>
    setIntro((was) => {
      try {
        localStorage.setItem('majlis.intro.read', was ? 'yes' : 'no');
      } catch {
        // A browser that will not store it shows the panel again next time,
        // which is a smaller cost than failing to render the page.
      }
      return !was;
    });

  /*
   * What could not be read, kept apart from what is legitimately absent.
   *
   * Both used to be discarded: enforcement became null, which also means
   * none is configured, and the waiting times became simply absent.
   */
  const [enforcementLost, setEnforcementLost] = useState(false);
  const [paceLost, setPaceLost] = useState(false);

  useEffect(() => {
    api
      .matters()
      .then((r) => (Array.isArray(r) ? setMatters(r) : setFailed(true)))
      .catch(() => setFailed(true));
    api
      .enforcement()
      .then((e) => {
        setEnforcement(e);
        setEnforcementLost(false);
      })
      .catch(() => {
        setEnforcement(null);
        setEnforcementLost(true);
      });
    oversight
      .pace()
      .then((p) => {
        setWaits(new Map((p.waiting ?? []).map((w) => [w.matterId, w])));
        setPaceLost(false);
      })
      .catch(() => setPaceLost(true));
  }, []);

  if (failed) return <ErrorText />;
  if (!matters) return <Loading />;

  const open = matters.filter((m) => m.status !== 'in_force' && m.status !== 'lapsed');
  const settled = matters.filter((m) => m.status === 'in_force' || m.status === 'lapsed');

  return (
    /*
      The matters, first.

      The heading was moved to the top of this screen once already, and the
      list stayed where it was: 843 pixels down, under what is waiting for
      you, how long the board takes, what has drifted, and a paragraph about
      what this stage does not do. Each is worth having. Not one of them is
      the reason a person presses *Matters in hand* in the rail.

      So the head band carries the name, the sentence and the one act, the
      way it does on every other list; the matters begin under it; and the
      four panels are still here, below the work rather than in front of it.

      *What is waiting for you* is gone from this screen altogether. It is
      the whole of the arrival screen at `/`, which is the rail's first
      destination and the first thing anybody sees.
    */
    <ListPage
      phase="deciding"
      title={t('dash.title')}
      says={t('dash.stageNotice')}
      act={mayDeliberate(identity?.role) ? <RaiseMatter boardId="demo-board" /> : undefined}
    >
      {open.length === 0 ? (
        <p className="text-muted text-sm">{t('dash.none')}</p>
      ) : (
        /*
          A table, with the fields under their own headings.

          These were cards, then they were three-line rows, and both of them
          set one record in a hundred pixels: the direction, the title, the
          origin, the date and the wait all stacked, so nothing on one line
          sat above the same thing on the next. Seven matters filled a
          screen and no two of their dates could be compared without reading
          each sentence.

          Five columns now, and the eye runs down whichever one it came for.
        */
        <Sheet columns={OPEN_COLS(t)}>
          {open.map((m) => (
            <Line
              key={m.id}
              to={`/matters/${m.id}`}
              columns={OPEN_COLS(t)}
              cells={[
                m.title,
                <Mark tone={m.direction === 'restrict' ? 'text-breach' : 'text-settled'}>
                  {t(`matter.direction.${m.direction}`)}
                </Mark>,
                <Mark tone="text-goldink">{t(`matter.status.${m.status}`)}</Mark>,
                <span className="block truncate text-note text-muted">
                  {t(`matter.origin.${m.origin}`)}
                </span>,
                <Figure>
                  <DateText iso={m.openedAt} />
                </Figure>,
                /*
                  The figure alone, because the column is already headed.
                  `WaitingFor` writes "waiting 54 days", which under a heading
                  reading WAITING is the word three times and wraps the cell
                  onto two lines. The asterisk stays: it says the count covers
                  only the part this system witnessed.
                */
                <Figure>
                  {waits.has(m.id)
                    ? `${waits.get(m.id)!.days}${waits.get(m.id)!.partial ? '*' : ''}`
                    : ''}
                </Figure>,
                <Figure tone={m.affected ? 'text-lapis' : 'text-muted'}>
                  {m.affected ?? '—'}
                </Figure>,
              ]}
            />
          ))}
        </Sheet>
      )}

      {settled.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-label font-bold uppercase tracking-caps text-muted">
            {t('matter.status.in_force')}
          </h2>
          <Sheet columns={SETTLED_COLS(t)}>
            {settled.map((m) => (
              <Line
                key={m.id}
                to={`/matters/${m.id}`}
                columns={SETTLED_COLS(t)}
                cells={[
                  m.title,
                  <Mark tone={m.direction === 'restrict' ? 'text-breach' : 'text-settled'}>
                    {t(`matter.direction.${m.direction}`)}
                  </Mark>,
                  <Figure>
                    <DateText iso={m.openedAt} />
                  </Figure>,
                ]}
              />
            ))}
          </Sheet>
        </div>
      )}

      {/*
        The four panels, below the work.

        Every one of them answers a question somebody has while looking at
        these matters — how long the board is taking, what has moved under a
        ruling already made, what a Shariah board is, and whether this member
        may act at all. None of them is a reason to open this screen, so none
        of them stands in front of it any more.
      */}
      <div className="mt-10">
        <Pace />
        <DriftPanel />
        <WhatThisIs open={intro} onToggle={toggleIntro} />
        <WhoYouAre />
      </div>

      {/*
        An installation with nothing attached says so in a sentence rather than
        showing an empty address and an unreachable badge, which would read as a
        fault in something that was never configured.
      */}
      {enforcement && !enforcement.configured && (
        <div className="mt-9 rounded-card shadow-ring px-4 py-3">
          <div className="text-label font-bold uppercase tracking-caps text-muted">
            {t('dash.enforcement')}
          </div>
          <p className="mt-1.5 text-ui leading-relaxed text-muted">{t('dash.enforcementNone')}</p>
        </div>
      )}

      {enforcement?.configured && (
        <div className="mt-9 rounded-card shadow-ring px-4 py-3">
          <div className="text-label font-bold uppercase tracking-caps text-muted">
            {enforcement.label ?? t('dash.registry')}
          </div>
          {enforcement.address && (
            <div className="mt-1 font-mono text-note break-all text-muted">{enforcement.address}</div>
          )}
          <div className="mt-2">
            {enforcement.reachable ? (
              <Tag tone="ok">{t('dash.registryReachable')}</Tag>
            ) : (
              <Tag tone="warn">{t('dash.registryUnreachable')}</Tag>
            )}
          </div>
        </div>
      )}

      <Gaps
        items={[
          enforcementLost ? t('gap.enforcementLost') : null,
          paceLost ? t('gap.paceLost') : null,
        ].filter((x): x is string => x !== null)}
      />
    </ListPage>
  );
}

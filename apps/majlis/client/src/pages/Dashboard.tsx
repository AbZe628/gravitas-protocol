import { useEffect, useState } from 'react';
import { Gaps } from '../components/page.js';
import { ListPage, Row, Rows } from '../components/shapes.js';
import { State } from '../components/kit.js';
import { api, oversight, type EnforcementSnapshot, type MatterSummary, type Wait } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { DateText, ErrorText, Loading, Tag } from '../components/ui.js';
import DriftPanel from '../components/Drift.js';
import Pace, { WaitingFor } from '../components/Pace.js';
import WhoYouAre from '../components/WhoYouAre.js';
import RaiseMatter from '../components/RaiseMatter.js';
import { mayDeliberate, useIdentity } from '../lib/identity.js';
import WhatThisIs from '../components/WhatThisIs.js';

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
          The same row every other list in here uses.

          These were cards: each one its own panel with its own ring and its
          own shadow, 100 pixels of padding between four facts. A list of
          matters is a list, and the board reads it the way it reads the
          queue, the register and the record — one surface, a line between
          rows, the state where the state always is.
        */
        <Rows>
          {open.map((m) => (
            <Row
              key={m.id}
              to={`/matters/${m.id}`}
              phase="deciding"
              kind={t(`matter.direction.${m.direction}`)}
              title={m.title}
              note={
                <>
                  {t(`matter.origin.${m.origin}`)}
                  <span className="mx-1.5 opacity-40">·</span>
                  {t('common.opened')} <DateText iso={m.openedAt} />
                  {waits.has(m.id) && (
                    <>
                      <span className="mx-1.5 opacity-40">·</span>
                      <WaitingFor wait={waits.get(m.id)} />
                    </>
                  )}
                  {m.affected !== null && (
                    <>
                      <span className="mx-1.5 opacity-40">·</span>
                      <span className="text-lapis">
                        {m.affected} {t('sim.affected')}
                      </span>
                    </>
                  )}
                </>
              }
              standing={<State tone="plain">{t(`matter.status.${m.status}`)}</State>}
            />
          ))}
        </Rows>
      )}

      {settled.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-label font-bold uppercase tracking-caps text-muted">
            {t('matter.status.in_force')}
          </h2>
          <Rows>
            {settled.map((m) => (
              <Row
                key={m.id}
                to={`/matters/${m.id}`}
                phase="inforce"
                kind={t(`matter.direction.${m.direction}`)}
                title={m.title}
                note={<DateText iso={m.openedAt} />}
              />
            ))}
          </Rows>
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

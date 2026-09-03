import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, oversight, type EnforcementSnapshot, type MatterSummary, type Wait } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Card, DateText, ErrorText, Loading, Tag } from '../components/ui.js';
import Attention from '../components/Attention.js';
import DriftPanel from '../components/Drift.js';
import Pace, { WaitingFor } from '../components/Pace.js';
import WhoYouAre from '../components/WhoYouAre.js';
import RaiseMatter from '../components/RaiseMatter.js';
import { mayDeliberate, useIdentity } from '../lib/identity.js';

export default function Dashboard() {
  const { t } = useI18n();
  const [matters, setMatters] = useState<MatterSummary[] | null>(null);
  const [enforcement, setEnforcement] = useState<EnforcementSnapshot | null>(null);
  // How long each open matter has been waiting, keyed by matter. A failure here
  // takes nothing off the page: the rows simply carry no figure.
  const [waits, setWaits] = useState<Map<string, Wait>>(new Map());
  const [failed, setFailed] = useState(false);
  const { identity } = useIdentity();

  useEffect(() => {
    api.matters().then(setMatters).catch(() => setFailed(true));
    api.enforcement().then(setEnforcement).catch(() => setEnforcement(null));
    oversight
      .pace()
      .then((p) => setWaits(new Map((p.waiting ?? []).map((w) => [w.matterId, w]))))
      .catch(() => undefined);
  }, []);

  if (failed) return <ErrorText />;
  if (!matters) return <Loading />;

  const open = matters.filter((m) => m.status !== 'in_force' && m.status !== 'lapsed');
  const settled = matters.filter((m) => m.status === 'in_force' || m.status === 'lapsed');

  return (
    <div>
      {/*
        What is waiting for this member comes first. A deadline that passes
        because nobody looked is the failure this panel exists to prevent, so it
        sits above the list of everything rather than below it.
      */}
      {/*
        Before anything else. Someone who cannot act needs to know that before
        they go looking for the buttons, not after.
      */}
      <WhoYouAre />

      <Attention />

      {/*
        What the board costs the institution in time. Institutional rather than
        personal, which is why it sits below what this member owes and above
        everything else.
      */}
      <Pace />

      {/*
        Below the pace and above the list, because it is the one thing on this
        page nobody asked the system to look for. It reports and links; it does
        not raise anything.
      */}
      <DriftPanel />

      <div className="mb-5 rounded-lg border border-line bg-surface/60 px-4 py-3 text-[13px] text-muted">
        {t('dash.stageNotice')}
      </div>

      <h1 className="mb-4 text-[19px] font-semibold">{t('dash.title')}</h1>

      {mayDeliberate(identity?.role) && <RaiseMatter boardId="demo-board" />}

      {open.length === 0 ? (
        <p className="text-muted text-sm">{t('dash.none')}</p>
      ) : (
        <ul className="space-y-3">
          {open.map((m) => (
            <li key={m.id}>
              <Link to={`/matters/${m.id}`} className="block">
                <Card accent={m.direction === 'restrict'}>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Tag tone={m.direction === 'restrict' ? 'warn' : 'gold'}>
                      {t(`matter.direction.${m.direction}`)}
                    </Tag>
                    <Tag>{t(`matter.status.${m.status}`)}</Tag>
                  </div>
                  <div className="text-[15px] font-medium leading-snug">{m.title}</div>
                  <div className="mt-2 text-[12px] text-muted">
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
                        <span className="text-goldsoft">
                          {m.affected} {t('sim.affected')}
                        </span>
                      </>
                    )}
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {settled.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-[13px] font-semibold uppercase tracking-[0.14em] text-muted">
            {t('matter.status.in_force')}
          </h2>
          <ul className="space-y-2">
            {settled.map((m) => (
              <li key={m.id}>
                <Link
                  to={`/matters/${m.id}`}
                  className="block rounded-lg border border-line px-4 py-3 hover:border-muted"
                >
                  <div className="text-[14px] leading-snug">{m.title}</div>
                  <div className="mt-1 text-[12px] text-muted">
                    <DateText iso={m.openedAt} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {/*
        An installation with nothing attached says so in a sentence rather than
        showing an empty address and an unreachable badge, which would read as a
        fault in something that was never configured.
      */}
      {enforcement && !enforcement.configured && (
        <div className="mt-9 rounded-lg border border-line px-4 py-3">
          <div className="text-[11px] uppercase tracking-wider text-muted">
            {t('dash.enforcement')}
          </div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{t('dash.enforcementNone')}</p>
        </div>
      )}

      {enforcement?.configured && (
        <div className="mt-9 rounded-lg border border-line px-4 py-3">
          <div className="text-[11px] uppercase tracking-wider text-muted">
            {enforcement.label ?? t('dash.registry')}
          </div>
          {enforcement.address && (
            <div className="mt-1 font-mono text-[11px] break-all text-muted">{enforcement.address}</div>
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
    </div>
  );
}

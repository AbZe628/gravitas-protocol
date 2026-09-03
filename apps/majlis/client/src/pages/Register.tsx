import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { oversight, type AssetStanding, type AssetStatus, type Register as RegisterData } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Card, ErrorText, Loading, Tag } from '../components/ui.js';

/**
 * The universe the board rules on.
 *
 * Every other screen in this application shows work somebody already started.
 * This is the only one that shows the domain — and the only place a board can
 * see the state that matters most and that no record currently holds: **what it
 * has never looked at.**
 *
 * Grouped by standing rather than by kind, with the unexamined first, because a
 * scholar opening this is looking for the work rather than for a catalogue. The
 * counts sit at the top for the same reason: *five of seven have never been put
 * to this board* is a sentence a chair can act on, and no board can currently
 * produce it.
 *
 * Nothing here rules on anything. The status is derived from what the board
 * already decided, and the only action offered is to put something to it.
 */

const BANDS: AssetStatus[] = [
  'never_examined',
  'under_consideration',
  'restricted',
  'lapsed',
  'permitted',
  'retired',
];

function tone(status: AssetStatus): 'warn' | 'gold' | 'ok' | undefined {
  if (status === 'restricted' || status === 'lapsed') return 'warn';
  if (status === 'never_examined') return 'gold';
  if (status === 'permitted') return 'ok';
  return undefined;
}

function Row({ standing }: { standing: AssetStanding }) {
  const { t } = useI18n();
  const a = standing.asset;

  return (
    <Link to={`/register/${a.id}`} className="block">
      <Card accent={standing.status === 'never_examined'}>
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <Tag tone={tone(standing.status)}>{t(`reg.status.${standing.status}`)}</Tag>
          <span className="text-[11px] uppercase tracking-wider text-muted">
            {t(`reg.kind.${a.kind}`)}
          </span>
        </div>

        <div className="text-[15px] font-medium leading-snug">{a.name}</div>

        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-muted">
          {a.identifiers.map((id, i) => (
            <span key={i} className="font-mono break-all">
              {id.value}
              {id.network ? <span className="opacity-60"> · {id.network}</span> : null}
            </span>
          ))}
        </div>

        <p className="mt-1.5 text-[12px] leading-relaxed text-muted">{standing.note}</p>
      </Card>
    </Link>
  );
}

export default function Register() {
  const { t } = useI18n();
  const [data, setData] = useState<RegisterData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    oversight
      .register()
      .then(setData)
      .catch(() => setFailed(true));
  }, []);

  if (failed) return <ErrorText />;
  if (!data) return <Loading />;

  const assets = Array.isArray(data.assets) ? data.assets : [];
  const grouped = BANDS.map((band) => ({
    band,
    items: assets.filter((a) => a.status === band),
  })).filter((g) => g.items.length > 0);

  return (
    <div>
      <h1 className="mb-1 text-[19px] font-semibold">{t('reg.title')}</h1>
      <p className="mb-4 text-[13px] leading-relaxed text-muted">{t('reg.intro')}</p>

      {assets.length === 0 ? (
        <p className="text-[14px] text-muted">{t('reg.none')}</p>
      ) : (
        <>
          {/*
            The figure a chair asks for and no board can currently produce. It
            is stated as a sentence rather than a badge, because it is not a
            deadline and manufacturing urgency about it would be dishonest.
          */}
          <div className="mb-6 rounded-lg border border-line bg-surface/40 px-4 py-3 text-[13px] leading-relaxed">
            {data.neverExamined > 0 ? (
              <span>
                <span className="font-medium tabular-nums">
                  {data.neverExamined} {t('reg.of')} {data.total}
                </span>{' '}
                <span className="text-muted">{t('reg.neverExaminedNote')}</span>
              </span>
            ) : (
              <span className="text-muted">{t('reg.allExamined')}</span>
            )}
          </div>

          {grouped.map((g) => (
            <section key={g.band} className="mb-7">
              <h2 className="mb-3 flex items-baseline gap-2 text-[13px] font-semibold uppercase tracking-[0.14em] text-muted">
                {t(`reg.status.${g.band}`)}
                <span className="text-[12px] font-normal tabular-nums opacity-70">{g.items.length}</span>
              </h2>
              <ul className="space-y-2.5">
                {g.items.map((s) => (
                  <li key={s.asset.id}>
                    <Row standing={s} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}

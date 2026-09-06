import { useEffect, useState } from 'react';
import { oversight, type AssetStanding, type AssetStatus, type Register as RegisterData } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { ErrorText, Loading } from '../components/ui.js';
import { Card, State, type Tone } from '../components/kit.js';
import { Display, Label, Note } from '../components/type.js';

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
 *
 * ── a row, not a card ─────────────────────────────────────────────────────
 *
 * This was a column of narrow cards, and every unexamined one was washed gold,
 * so a page whose whole job is *what have we not looked at* was one colour and
 * said nothing. An absence is not a clock. Each entry is now a full-width row
 * on a white sheet, its standing carried by a dot and a pill, and the figure
 * that a chair actually asks for stands in the column beside it rather than in
 * a strip above the list.
 */

const BANDS: AssetStatus[] = [
  'never_examined',
  'under_consideration',
  'restricted',
  'lapsed',
  'permitted',
  'retired',
];

/** The one colour a standing is entitled to. */
function toneFor(status: AssetStatus): Tone {
  if (status === 'restricted' || status === 'lapsed') return 'breach';
  if (status === 'under_consideration') return 'attention';
  if (status === 'permitted') return 'settled';
  // Never examined and retired are absences. An absence is not an alarm.
  return 'plain';
}

const DOT: Record<Tone, string> = {
  breach: 'bg-breach ring-[3.5px] ring-breach/15',
  attention: 'bg-gold ring-[3.5px] ring-gold/15',
  settled: 'bg-settled ring-[3.5px] ring-settled/15',
  lapis: 'bg-lapis ring-[3.5px] ring-lapis/15',
  plain: 'bg-line',
};

function Row({ standing }: { standing: AssetStanding }) {
  const { t } = useI18n();
  const a = standing.asset;
  const tone = toneFor(standing.status);

  return (
    <Card to={`/register/${a.id}`} tone="quiet" className="!py-4">
      {/* The standing drops below the name on a phone, for the reason the
          library's rows do: a pill beside a title on a 375px row leaves the
          title breaking over five lines. */}
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:gap-4">
        <span className={'mt-2 hidden h-[7px] w-[7px] shrink-0 rounded-full sm:block ' + DOT[tone]} />

        <div className="order-last min-w-0 flex-1 sm:order-none">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5">
            <span className="font-display text-[19px] leading-snug tracking-[-0.014em] text-paper">
              {a.name}
            </span>
            <span className="text-[11px] uppercase tracking-[0.1em] text-muted">
              {t(`reg.kind.${a.kind}`)}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-muted">
            {a.identifiers.map((id, i) => (
              <span key={i} className="break-all font-mono">
                {id.value}
                {id.network ? <span className="opacity-60"> · {id.network}</span> : null}
              </span>
            ))}
          </div>

          <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{standing.note}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <span className={'h-[7px] w-[7px] shrink-0 rounded-full sm:hidden ' + DOT[tone]} />
          <State tone={tone}>{t(`reg.status.${standing.status}`)}</State>
        </div>
      </div>
    </Card>
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
      <div className="mb-8">
        <Display>{t('reg.title')}</Display>
        <Note className="mt-3">{t('reg.intro')}</Note>
      </div>

      {assets.length === 0 ? (
        <p className="text-[14px] text-muted">{t('reg.none')}</p>
      ) : (
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            {grouped.map((g) => (
              <section key={g.band} className="mb-8 last:mb-0">
                <div className="mb-3.5 flex items-baseline gap-2.5">
                  <Label>{t(`reg.status.${g.band}`)}</Label>
                  <span className="text-[12px] tabular-nums text-muted">{g.items.length}</span>
                </div>
                <ul className="space-y-2">
                  {g.items.map((s) => (
                    <li key={s.asset.id}>
                      <Row standing={s} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          {/*
            The figure a chair asks for and no board can currently produce. It
            is stated as a sentence rather than a badge, because it is not a
            deadline and manufacturing urgency about it would be dishonest.
          */}
          <aside className="w-full shrink-0 lg:w-[306px]">
            <div className="rounded-sheet bg-raised/60 px-6 py-5 shadow-ring">
              {data.neverExamined > 0 ? (
                <>
                  <div className="flex items-baseline gap-2.5">
                    <span className="font-display text-[40px] leading-[0.92] tabular-nums tracking-[-0.028em] text-paper">
                      {data.neverExamined}
                    </span>
                    <span className="font-display text-[22px] leading-none tracking-[-0.02em] text-muted">
                      {t('reg.of')} {data.total}
                    </span>
                  </div>
                  <p className="mt-3.5 text-[13px] leading-[1.6] text-sand">
                    {t('reg.neverExaminedNote')}
                  </p>
                </>
              ) : (
                <p className="text-[13px] leading-[1.6] text-sand">{t('reg.allExamined')}</p>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

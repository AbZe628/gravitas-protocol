import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { oversight, type AssetStanding, type AssetStatus, type Register as RegisterData } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { ErrorText, Loading } from '../components/ui.js';
import { State, type Tone } from '../components/kit.js';
import { Division, Gaps, Nothing, PageHead } from '../components/page.js';
import { Row, Rows } from '../components/shapes.js';
import { mayDeliberate, useIdentity } from '../lib/identity.js';
import EnterAHolding from '../components/EnterAHolding.js';

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

/**
 * A holding, as a row.
 *
 * No age: a holding has a standing rather than a wait, so the left column
 * carries a mark and the right carries what the board has said about it.
 * The identifiers sit under the name because that is what a desk matches
 * against when it is looking for one particular instrument.
 */
function holdingRow(s: AssetStanding, t: (k: string) => string) {
  return (
    <Row
      key={s.asset.id}
      to={`/register/${s.asset.id}`}
      phase="inforce"
      kind={t(`reg.kind.${s.asset.kind}`)}
      title={s.asset.name}
      note={
        <>
          {s.asset.identifiers.map((id, i) => (
            <span key={i} className="me-3 break-all font-mono text-note">
              {id.value}
              {id.network ? <span className="opacity-60"> · {id.network}</span> : null}
            </span>
          ))}
          <span className="block">{s.note}</span>
        </>
      }
      standing={<State tone={toneFor(s.status)}>{t(`reg.status.${s.status}`)}</State>}
    />
  );
}

export default function Register() {
  const { t } = useI18n();
  const { identity } = useIdentity();
  const [data, setData] = useState<RegisterData | null>(null);
  const [failed, setFailed] = useState(false);

  const load = () =>
    oversight
      .register()
      .then(setData)
      .catch(() => setFailed(true));

  useEffect(() => {
    void load();
  }, []);

  if (failed) return <ErrorText />;
  if (!data) return <Loading />;

  const assets = Array.isArray(data.assets) ? data.assets : [];
  const grouped = BANDS.map((band) => ({
    band,
    items: assets.filter((a) => a.status === band),
  })).filter((g) => g.items.length > 0);

  /*
   * What this page cannot tell you.
   *
   * The count of unexamined holdings used to sit in a box on the right where a
   * reader could take it as a statistic. It is a gap, it belongs with the
   * other gaps, and it links to the screen that closes it — which the box
   * never did.
   */
  const permitted = assets.filter((a) => a.status === 'permitted').length;

  const gaps: string[] = [];
  if (data.neverExamined > 0) {
    gaps.push(
      `${data.neverExamined} ${t('reg.of')} ${data.total} — ${t('reg.neverExaminedNote')}`,
    );
  }
  if (assets.length > 0) gaps.push(t('reg.gap.asAtLast'));

  /*
   * A wall, written as a wall. §FAZA 8, N-74.
   *
   * Two entries about the same instrument stay two. There is no act for
   * saying *this is the one we already hold* — not a broken one, not a
   * hidden one: it was never built. Said here rather than left for a
   * member to discover by looking for a control that does not exist,
   * because a register that quietly lists a thing twice is a register
   * whose totals are wrong and does not know it.
   */
  if (assets.length > 1) gaps.push(t('reg.gap.noMerge'));

  return (
    <div>
      <PageHead
        phase="inforce"
        title={t('reg.title')}
        says={t('reg.intro')}
        live={
          assets.length > 0 ? (
            <>
              {/*
                Every holding, not the permitted ones. The pill said
                "permitted" over a count of everything, which is the kind of
                small lie a bank finds in a demo.
              */}
              <State tone="plain">
                {assets.length} {t('reg.live.holdings')}
              </State>
              {permitted > 0 && (
                <State tone="settled">
                  {permitted} {t('reg.live.permitted')}
                </State>
              )}
              {data.neverExamined > 0 && (
                <Link
                  to="/examinations"
                  className="text-ui text-gold underline decoration-gold/30 underline-offset-4 transition-colors hover:text-paper"
                >
                  {data.neverExamined} {t('spine.checked.count')}
                </Link>
              )}
            </>
          ) : undefined
        }
      />

      {/*
        The one thing a person comes here to start.

        The register could be read and never added to, on a screen whose whole
        subject is what the board has not looked at yet. The route to add one
        has always worked; nothing asked for it.
      */}
      {mayDeliberate(identity?.role) && <EnterAHolding onEntered={() => void load()} />}

      {assets.length === 0 ? (
        <Nothing>{t('reg.none')}</Nothing>
      ) : (
        <>
          {grouped.map((g) => (
            <Division key={g.band} heading={`${t(`reg.status.${g.band}`)} · ${g.items.length}`}>
              <Rows>{g.items.map((s) => holdingRow(s, t))}</Rows>
            </Division>
          ))}

          <Gaps items={gaps} />
        </>
      )}
    </div>
  );
}

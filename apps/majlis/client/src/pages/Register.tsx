import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { oversight, type AssetStanding, type AssetStatus, type Register as RegisterData } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { ErrorText, Loading } from '../components/ui.js';
import { State, type Tone } from '../components/kit.js';
import { Division, Gaps, Nothing, PageHead } from '../components/page.js';
import { Sheet, Line, Mark, type Column } from '../components/sheet.js';
import { Button } from '../components/Button';
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
const COLS = (t: (k: string) => string): readonly Column[] => [
  { head: t('col.holding'), width: 'minmax(0,2.2fr)', phone: 'lead' },
  { head: t('col.kind'), width: '9rem', phone: 'under' },
  { head: t('col.identifier'), width: 'minmax(0,1.4fr)', phone: 'hide' },
  { head: t('col.standing'), width: '10rem', phone: 'under' },
];

function holdingRow(s: AssetStanding, t: (k: string) => string) {
  return (
    <Line
      key={s.asset.id}
      to={`/register/${s.asset.id}`}
      columns={COLS(t)}
      cells={[
        s.asset.name,
        <Mark>{t(`reg.kind.${s.asset.kind}`)}</Mark>,
        /*
          The first identifier, not all of them. A holding can carry three,
          and a column that grows with the record is a column that stops
          being one. The rest are on the holding's own screen, which is
          where a desk that is matching one goes anyway.
        */
        <span className="block truncate font-mono text-note text-muted">
          {s.asset.identifiers[0]?.value ?? '—'}
        </span>,
        /* Red stays on the one that means the bank may not hold this. */
        <Mark tone={toneFor(s.status) === 'breach' ? 'text-breach' : undefined}>
          {t(`reg.status.${s.status}`)}
        </Mark>,
      ]}
    />
  );
}

export default function Register() {
  const { t } = useI18n();
  const { identity } = useIdentity();
  const [data, setData] = useState<RegisterData | null>(null);
  const [failed, setFailed] = useState(false);
  /** Whether the panel that enters a holding is open. The button is in the head. */
  const [entering, setEntering] = useState(false);

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
        act={
          mayDeliberate(identity?.role) ? (
            <Button
              type="button"
              onClick={() => setEntering(true)}
              className="rounded-xl bg-lapis px-5 py-2.5 text-ui font-semibold text-white shadow-act transition-all hover:bg-lapissoft"
            >
              {t('reg.enter')}
            </Button>
          ) : undefined
        }
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
              {/*
                A count of what is fine is not news. Green here put three
                accents in one head — green, gold and the red on *Lapsed*
                down the list — and the only one worth finding by sweeping
                is the last. See `Mark`.
              */}
              {permitted > 0 && (
                <State tone="plain">
                  {permitted} {t('reg.live.permitted')}
                </State>
              )}
              {data.neverExamined > 0 && (
                <Link
                  to="/examinations"
                  /* A way to somewhere, in the colour every other way here is. */
                  className="text-ui text-lapis underline decoration-lapis/30 underline-offset-4 transition-colors hover:text-paper"
                >
                  {data.neverExamined} {t('spine.checked.count')}
                </Link>
              )}
            </>
          ) : undefined
        }
      />

      {/*
        The one thing a person comes here to start. The button is in the
        head with every other screen's act; this is the panel it opens.
      */}
      {mayDeliberate(identity?.role) && (
        <EnterAHolding open={entering} onClose={() => setEntering(false)} onEntered={() => void load()} />
      )}

      {assets.length === 0 ? (
        <Nothing>{t('reg.none')}</Nothing>
      ) : (
        <>
          {grouped.map((g) => (
            <Division key={g.band} heading={`${t(`reg.status.${g.band}`)} · ${g.items.length}`}>
              <Sheet columns={COLS(t)}>{g.items.map((s) => holdingRow(s, t))}</Sheet>
            </Division>
          ))}

          <Gaps items={gaps} />
        </>
      )}
    </div>
  );
}

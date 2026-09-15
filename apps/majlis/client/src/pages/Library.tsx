import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SlideOver from '../components/SlideOver.js';
import StructureDetail from './StructureDetail.js';
import { oversight, type HeldStructure, type Library as LibraryData } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Division, Nothing } from '../components/page.js';
import { ListPage, Row, Rows } from '../components/shapes.js';
import { ErrorText, Loading } from '../components/ui.js';
import { State, type Tone } from '../components/kit.js';
import { useStillThere } from '../lib/stillThere.js';

/**
 * The library as this board holds it.
 *
 * Nineteen contract shapes ship as a draft. Until a board has done something
 * with one, its conditions are somebody else's reading — offered so a scholar
 * stops composing a question from an empty box, and binding on nobody.
 *
 * The page is arranged around the state most shapes are in on the day a board
 * starts: **untouched**. Those come first, because the useful question here is
 * not "what have we adopted" but "what have we never looked at" — the same
 * reason the register puts the unexamined holdings at the top.
 *
 * ── what adopting is, and is not ──────────────────────────────────────────
 *
 * It is not approving a product. It is the board saying: when we judge a
 * murabaha, these are the conditions we judge it against. A board may amend
 * them, or rule against using the shape at all, and either way says why. That
 * happens on the shape's own page, under a decision of this board.
 *
 * ── this screen is a list and nothing else ────────────────────────────────
 *
 * It used to print all nineteen shapes in full, each with its conditions, its
 * history and its adoption form, so a member looking for one scrolled past
 * eighteen. The counts stood in a sidebar as a forty-point figure, which made
 * this a third page shape — neither a list nor a record. They are now one line
 * beside the heading, where every other count in this application goes.
 */

/*
 * A shape nobody has touched is an absence, not an alarm — the same reading
 * the register takes of a holding never put to the board. Only a shape this
 * board ruled against is a refusal.
 */
function toneFor(held: HeldStructure): Tone {
  if (held.declined) return 'breach';
  if (held.source === 'draft') return 'plain';
  return 'settled';
}

/** Untouched first: it is the state most shapes are in and the one worth acting on. */
const ORDER: HeldStructure['source'][] = ['draft', 'amended', 'adopted'];

export default function Library() {
  /**
   * Which shape is open beside the list.
   *
   * Nineteen shapes is a list of choices, and pressing one used to navigate
   * away from it. It opens beside the list now and closes back to exactly
   * where the member was, which is what choosing from a list should do.
   */
  const [open, setOpen] = useState<{ id: string; name: string } | null>(null);
  const { t } = useI18n();
  const [data, setData] = useState<LibraryData | null>(null);
  const [failed, setFailed] = useState(false);
  /** A failed refresh keeps a screen that is already there. */
  const there = useStillThere();

  useEffect(() => {
    void oversight
      .library()
      .then((d) => {
        if (!d || !Array.isArray(d.library)) {
          there.lost(setFailed);
          return;
        }
        there.arrived();
        setData(d);
      })
      .catch(() => there.lost(setFailed));
  }, []);

  if (failed) return <ErrorText />;
  if (!data) return <Loading />;

  const untouched = data.total - data.adopted - data.declined;

  const groups = ORDER.map((source) => ({
    source,
    items: data.library.filter((h) => (h.declined ? source === 'draft' : h.source === source)),
  })).filter((g) => g.items.length > 0);

  return (
    <ListPage
      phase="inforce"
      title={t('adopt.title')}
      says={t('adopt.intro')}
      /* Checking a draft is done against these shapes, so it is offered from
         here rather than from a rail entry of its own. */
      act={(
        <Link
          to="/check"
          className="rounded-xl bg-lapis px-4 py-2 text-ui font-semibold text-white shadow-act"
        >
          {t('adopt.toCheck')}
        </Link>
      )}
      live={
        <span className="text-ui text-muted">
          <span className="font-mono tabular-nums text-paper">{untouched}</span>{' '}
          <span>{t('adopt.untouched')}</span>
          <span className="mx-2 opacity-40">·</span>
          <span className="font-mono tabular-nums text-paper">{data.adopted}</span>{' '}
          <span>{t('adopt.taken')}</span>
          <span className="mx-2 opacity-40">·</span>
          <span className="font-mono tabular-nums text-paper">{data.declined}</span>{' '}
          <span>{t('adopt.declinedCount')}</span>
        </span>
      }
      limits={data.notes.draft}
    >
      {/*
        Said once, here, where it is true of the whole library — instead of
        nineteen times, once inside every shape, which is what it was.
      */}
      {data.adopted === 0 && (
        <div className="mb-7">
          <Nothing>{t('adopt.neverUsed')}</Nothing>
        </div>
      )}

      {groups.map((g) => (
        <Division
          key={g.source}
          heading={`${t(g.source === 'draft' ? 'adopt.draft' : `adopt.${g.source}`)} · ${g.items.length}`}
        >
          <Rows>
            {g.items.map((h) => (
              <Row
                key={h.structure.id}
                onPress={() => setOpen({ id: h.structure.id, name: h.structure.name })}
                phase="inforce"
                kind={t(`family.${h.structure.family}`)}
                title={h.structure.name}
                /*
                  The basis only where the board has stated one. Seventeen
                  untouched shapes each carrying "this board has not said what
                  these rest on" is the page telling a reader seventeen times
                  that it has nothing for them — which is what the count at the
                  top already said once.
                */
                note={
                  <>
                    {h.adoption?.basis ? (
                      <>
                        {h.adoption.basis}
                        <span className="mx-2 opacity-40">·</span>
                      </>
                    ) : null}
                    <span className="tabular-nums">{h.structure.conditions.length}</span>{' '}
                    {t('adopt.conditions')}
                  </>
                }
                standing={
                  <State tone={toneFor(h)}>
                    {t(h.declined ? 'adopt.declined' : `adopt.${h.source}`)}
                  </State>
                }
              />
            ))}
          </Rows>
        </Division>
      ))}
      {/*
        The shape, beside the list rather than instead of it.

        The same screen that answers at /library/:id, so nothing is a second
        version of anything — it takes the id as a prop here and from the
        address there.
      */}
      <SlideOver
        open={open !== null}
        title={open?.name ?? ''}
        onClose={() => setOpen(null)}
      >
        {open && <StructureDetail structureId={open.id} />}
      </SlideOver>
    </ListPage>
  );
}

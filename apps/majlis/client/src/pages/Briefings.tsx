import { useEffect, useState } from 'react';
import { api, type Briefing } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Nothing } from '../components/page.js';
import { ListPage, Row, Rows } from '../components/shapes.js';
import { DateText, ErrorText, Loading } from '../components/ui.js';

/**
 * What the technical team changed, and the question it puts to the board.
 *
 * ── it was a column of documents ──────────────────────────────────────────
 *
 * Every briefing used to be printed in full on this screen: the account, the
 * rules it touches, the question in its gold box, and the draft form for
 * opening a matter. Three briefings made a page a member had to scroll to
 * reach the third, and there was no way to link one to somebody.
 *
 * A briefing is a record. It has a title, an author, a date and a question
 * addressed to the board, and it belongs on its own page like every other
 * record here. What is left on this screen is the list: who raised it, when,
 * and what they are asking.
 */

export default function Briefings() {
  const { t } = useI18n();
  const [items, setItems] = useState<Briefing[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api
      .briefings()
      .then((r) => (Array.isArray(r) ? setItems(r) : setFailed(true)))
      .catch(() => setFailed(true));
  }, []);

  if (failed) return <ErrorText />;
  if (!items) return <Loading />;

  return (
    <ListPage
      phase="inforce"
      title={t('nav.briefings')}
      says={t('brief.lead')}
      live={
        items.length > 0 ? (
          <span className="text-[13px] text-muted">
            <span className="font-mono tabular-nums text-paper">{items.length}</span>{' '}
            <span>{t('nav.briefings')}</span>
          </span>
        ) : undefined
      }
    >
      {items.length === 0 ? (
        <Nothing>{t('brief.none')}</Nothing>
      ) : (
        <Rows>
          {items.map((b) => (
            <Row
              key={b.id}
              to={`/briefings/${b.id}`}
              phase="inforce"
              /* Who is asking. On a list of one kind of paper, that is what
                 differs from one row to the next. */
              kind={`${t('brief.raisedBy')} ${t(`brief.raisedBy.${b.raisedBy}`)}`}
              title={b.title}
              note={
                <>
                  <DateText iso={b.publishedAt} />
                  <span className="mx-1.5 opacity-40">·</span>
                  {b.questionForBoard}
                </>
              }
            />
          ))}
        </Rows>
      )}
    </ListPage>
  );
}

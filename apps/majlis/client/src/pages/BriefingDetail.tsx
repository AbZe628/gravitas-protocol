import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, type Briefing } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { mayDeliberate, useIdentity } from '../lib/identity.js';
import InTheMargin from '../components/InTheMargin.js';
import RaiseAMatter from '../components/RaiseAMatter.js';
import { Nothing } from '../components/page.js';
import { Facts, RecordPage } from '../components/shapes.js';
import { DateText, ErrorText, Loading, Sources, Tag } from '../components/ui.js';

/**
 * One briefing.
 *
 * ── no action panel, and the reason ───────────────────────────────────────
 *
 * Every other record here carries the one act outstanding in the same corner.
 * A briefing carries none. It is an account of something that already
 * happened, published to the board for information; nobody is waiting on a
 * member and no clock is running. Putting a panel there headed *next* would
 * claim a duty that does not exist.
 *
 * What it does carry is a question addressed to the board, and a member may
 * choose to make a matter of it. That choice sits under the question it
 * concerns, because the draft is made of those words and a person should be
 * able to read them while they edit.
 */

export default function BriefingDetail() {
  const { id = '' } = useParams();
  const { t } = useI18n();
  const { identity } = useIdentity();

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

  const b = items.find((x) => x.id === id);
  if (!b) return <Nothing>{t('brief.notFound')}</Nothing>;

  const aside = (
    <Facts
      rows={[
        { label: t('brief.raisedBy'), value: t(`brief.raisedBy.${b.raisedBy}`) },
        { label: t('brief.published'), value: <DateText iso={b.publishedAt} /> },
      ]}
    />
  );

  return (
    <RecordPage
      phase="inforce"
      title={b.title}
      states={
        <>
          {b.touchesRules.map((r) => (
            <Tag key={r}>{r}</Tag>
          ))}
        </>
      }
      aside={aside}
    >
      {/*
        What changed and why, as one passage a member can mark. The two used
        to be separate paragraphs under separate headings, which read as two
        documents when it is one account.
      */}
      <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
        {t('brief.account')}
      </div>
      <div className="mt-2">
        <InTheMargin on="briefing" subjectId={b.id} />
      </div>

      <div className="mt-6 rounded-card bg-[#FBF4E4] px-5 py-4 shadow-[0_0_0_0.5px_rgba(176,132,48,0.24)]">
        <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-gold">
          {t('brief.question')}
        </div>
        {/* The one part addressed to the board, in the board's face. */}
        <p className="mt-2 max-w-[62ch] font-display text-[16px] leading-[1.55]">
          {b.questionForBoard}
        </p>

        <RaiseAMatter
          boardId="demo-board"
          title={b.title}
          proposal={b.questionForBoard}
          direction="permit"
          origin="protocol_change"
          label={t('brief.putToBoard')}
          note={t('brief.raisedBy')}
          canOpen={mayDeliberate(identity?.role)}
        />
      </div>

      <Sources sources={b.sources} />
    </RecordPage>
  );
}

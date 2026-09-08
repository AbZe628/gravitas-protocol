import { useEffect, useState } from 'react';
import { api, type Briefing } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { mayDeliberate, useIdentity } from '../lib/identity.js';
import RaiseAMatter from '../components/RaiseAMatter.js';
import { PageHead } from '../components/page.js';
import InTheMargin from '../components/InTheMargin.js';
import { Card, DateText, ErrorText, Loading, Sources, Tag } from '../components/ui.js';

export default function Briefings() {
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

  return (
    <div>
      <PageHead
        phase="inforce"
        title={t('nav.briefings')}
        says={t('brief.lead')}
      />
      <ul className="space-y-5">
        {items.map((b) => (
          <li key={b.id}>
            <Card>
              <div className="mb-2 text-[12px] text-muted">
                <DateText iso={b.publishedAt} />
                <span className="mx-1.5 opacity-40">·</span>
                {t('brief.raisedBy')} {t(`brief.raisedBy.${b.raisedBy}`)}
              </div>
              <h2 className="max-w-[46ch] font-display text-[21px] leading-snug tracking-[-0.014em]">
                {b.title}
              </h2>

              {/*
                What changed and why, as one passage a member can mark. The
                two used to be separate paragraphs under separate headings,
                which read as two documents when it is one account.
              */}
              <div className="mt-4 text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
                {t('brief.account')}
              </div>
              <div className="mt-2">
                <InTheMargin on="briefing" subjectId={b.id} />
              </div>

              {b.touchesRules.length > 0 && (
                <div className="mt-3.5 flex flex-wrap gap-1.5">
                  {b.touchesRules.map((r) => (
                    <Tag key={r}>{r}</Tag>
                  ))}
                </div>
              )}

              <div className="mt-5 rounded-card bg-[#FBF4E4] px-5 py-4 shadow-[0_0_0_0.5px_rgba(176,132,48,0.24)]">
                <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-gold">
                  {t('brief.question')}
                </div>
                {/* The one part addressed to the board, in the board's face. */}
                <p className="mt-2 max-w-[62ch] font-display text-[16px] leading-[1.55]">
                  {b.questionForBoard}
                </p>
              </div>

              {/*
                A briefing carries a question addressed to the board and had
                nothing to do about it: the screen was a dead end with the
                one thing on it that most obviously asks for an answer.
              */}
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

              <Sources sources={b.sources} />
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { governance, type Attention as Attention_, type AttentionItem } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { useIdentity } from '../lib/identity.js';
import WhoYouAre from '../components/WhoYouAre.js';

/**
 * One thing, one action.
 *
 * The verdict this exists to answer: *a board would come in once, say we do not
 * need this, and go back to how they worked before.* The application had twelve
 * navigation items, six panels on its first screen, and no answer to the only
 * question a scholar arrives with — **is there anything here for me.**
 *
 * So this screen answers that and stops. One card, the one act that is
 * outstanding, and how long it has been waiting. Everything below it is a
 * reminder without a button. Everything else in Majlis is behind one link, and
 * the link is at the bottom because a scholar who wants the register knows they
 * want the register.
 *
 * ── it does not put the vote on the card ──────────────────────────────────
 *
 * The obvious next move is a pair of approve and refuse buttons here, and it is
 * wrong. A position in this record is taken on **specific terms** — every one
 * carries the hash of exactly the terms it was cast on, so that *"did this
 * member approve these words"* is a comparison rather than a recollection.
 * Voting from a summary card is voting on a headline, and the honest answer to
 * the regulator afterwards would be that the member approved a notification.
 *
 * The card is one tap from the vote, and the vote screen can be fifteen
 * seconds. The speed belongs there; the button does not belong here.
 *
 * ── nothing waiting is an answer ──────────────────────────────────────────
 *
 * Not a blank. A scholar who opens this and sees that the board is clear has
 * been told something, and that is worth a sentence rather than an empty page.
 *
 * ── it is a shell, not a replacement ──────────────────────────────────────
 *
 * Every service, route and refusal underneath is the one that was already
 * there. Classic is one link away and unchanged. Nothing is removed; what
 * changes is what a person sees first.
 */

const TONE: Record<string, string> = {
  overdue: 'border-warn/60',
  soon: 'border-gold/60',
  ordinary: 'border-line',
};

function urgency(item: AttentionItem): keyof typeof TONE {
  if (item.overdue) return 'overdue';
  if (item.hoursRemaining !== null && item.hoursRemaining <= 48) return 'soon';
  return 'ordinary';
}

/** How long is left, in the largest unit that is still honest. */
function remaining(item: AttentionItem, t: (k: string) => string): string | null {
  if (item.hoursRemaining === null) return null;
  const hours = Math.abs(item.hoursRemaining);
  const days = Math.floor(hours / 24);
  const shape = days >= 2 ? `${days} ${t('guided.days')}` : `${Math.round(hours)} ${t('guided.hours')}`;
  return item.overdue ? `${t('guided.overdueBy')} ${shape}` : `${shape} ${t('guided.left')}`;
}

function TheOneThing({ item }: { item: AttentionItem }) {
  const { t } = useI18n();
  const left = remaining(item, t);

  return (
    <Link
      to={`/matters/${item.matterId}`}
      className={
        'block rounded-lg border bg-surface/60 px-4 py-4 transition-colors hover:border-muted ' +
        TONE[urgency(item)]
      }
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-[11px] uppercase tracking-wider text-muted">
          {t(item.kind === 'overdue' ? 'attention.overdueKind' : `attention.${item.kind}`)}
        </span>
        {left && (
          <span
            className={
              'font-mono text-[12.5px] tabular-nums ' +
              (item.overdue ? 'text-warn' : 'text-goldsoft')
            }
          >
            {left}
          </span>
        )}
      </div>

      <div className="mt-1.5 text-[17px] leading-snug">{item.title}</div>

      {/* The server's sentence, unchanged. It says what the act actually is. */}
      <p className="mt-1.5 max-w-prose text-[12.5px] leading-relaxed text-muted">{item.note}</p>

      {/*
        One tap to the matter, where the terms are. Not a vote button: a
        position is taken on specific terms and carries their hash, and a vote
        cast from a summary is a vote on a headline.
      */}
      <span className="mt-3 inline-block rounded border border-gold/60 px-3.5 py-1.5 text-[13px] text-goldsoft">
        {t('guided.open')}
      </span>
    </Link>
  );
}

export default function Guided() {
  const { t } = useI18n();
  const { identity } = useIdentity();
  const [attention, setAttention] = useState<Attention_ | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    governance
      .attention()
      .then((a) => live && Array.isArray(a?.items) && setAttention(a))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);

  if (failed) return <p className="text-[13px] text-muted">{t('guided.unreachable')}</p>;
  if (!attention) return null;

  /*
   * Overdue first, then by how little is left. A matter with no deadline sorts
   * last rather than first: it needs doing and nothing is running out on it.
   */
  const items = [...attention.items].sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    return (a.hoursRemaining ?? Infinity) - (b.hoursRemaining ?? Infinity);
  });

  const [first, ...rest] = items;

  return (
    <div>
      {/*
        Whether this session can act at all, before anything asks it to. A
        person who cannot vote should learn that here rather than by pressing
        something that is not there.
      */}
      <WhoYouAre />

      <h1 className="mb-1 text-[19px] font-semibold tracking-tight">
        {/*
          Named only where there is a name. The shared credential resolves to an
          observer with no member behind it, and greeting somebody as anonymous
          is worse than not greeting them.
        */}
        {identity && identity.role !== 'observer'
          ? t('guided.greetingNamed').replace('{who}', identity.scholarId)
          : t('guided.greeting')}
      </h1>

      {first ? (
        <>
          <p className="mb-4 text-[13px] leading-relaxed text-muted">
            {items.length === 1
              ? t('guided.oneThing')
              : t('guided.someThings').replace('{n}', String(items.length))}
          </p>

          <TheOneThing item={first} />

          {/*
            Everything else is listed without a control. A second button beside
            the first is two things asking to be done, which is the state this
            screen exists to remove.
          */}
          {rest.length > 0 && (
            <div className="mt-5">
              <div className="mb-2 text-[11px] uppercase tracking-wider text-muted">
                {t('guided.after')}
              </div>
              <ul className="space-y-1.5">
                {rest.map((item) => (
                  <li key={`${item.matterId}:${item.kind}`}>
                    <Link
                      to={`/matters/${item.matterId}`}
                      className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 rounded border border-line px-3 py-2 text-[12.5px] transition-colors hover:border-muted"
                    >
                      <span>{item.title}</span>
                      <span className="text-[11.5px] text-muted">
                        {t(item.kind === 'overdue' ? 'attention.overdueKind' : `attention.${item.kind}`)}
                        {remaining(item, t) && <span> · {remaining(item, t)}</span>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        // An answer, not a blank. Being told the board is clear is information.
        <p className="mb-4 max-w-prose text-[13.5px] leading-relaxed">{t('guided.clear')}</p>
      )}

      {/*
        Everything else, behind one link. A scholar who wants the register knows
        they want the register, and nothing is removed by not showing it here.
      */}
      <div className="mt-8 border-t border-line pt-4">
        <Link
          to="/more"
          className="text-[12.5px] text-muted underline decoration-line underline-offset-4 transition-colors hover:text-paper"
        >
          {t('guided.everything')}
        </Link>
      </div>
    </div>
  );
}

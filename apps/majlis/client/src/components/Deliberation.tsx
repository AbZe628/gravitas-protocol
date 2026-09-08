import { useState } from 'react';
import { Refused, governance, type Deliberation as Entry, type Matter } from '../lib/api.js';
import { useIdentity } from '../lib/identity.js';
import { useI18n } from '../lib/i18n.js';
import { DateText, Tag } from './ui.js';

/**
 * The deliberation, as a thread.
 *
 * `replyTo` has been on the type since Stage One and nothing displayed it, so
 * an answer to a question sat in the list as though it were a new point. A
 * board arguing about a mechanism is following several arguments at once, and a
 * flat list asks the reader to reconstruct which answer belongs to which
 * question.
 *
 * One level of nesting, deliberately. Deeper trees are how a discussion becomes
 * unreadable in a narrow column, and a reply to a reply is still a reply to the
 * thread.
 */

interface Props {
  matter: Matter;
  canSpeak: boolean;
  onChanged: (matter: Matter) => void;
}

function Composer({
  matterId,
  replyTo,
  mentionable,
  onDone,
  onCancel,
}: {
  matterId: string;
  replyTo: string | null;
  /** Who may be named here. Empty where the matter did not say. */
  mentionable: { id: string; name: string; title: string }[];
  onDone: (m: Matter) => void;
  onCancel?: () => void;
}) {
  const { t } = useI18n();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);

  async function submit() {
    if (!body.trim() || busy) return;
    setBusy(true);
    setRefusal(null);
    try {
      onDone(await governance.say(matterId, body.trim(), replyTo));
      setBody('');
      onCancel?.();
    } catch (error) {
      // The server writes its refusals to be read. Passing the sentence
      // through is the whole value of it.
      setRefusal(error instanceof Refused ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-card shadow-ring p-3">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t('say.placeholder')}
            aria-label={t('say.placeholder')}
        rows={replyTo ? 2 : 3}
        className="w-full resize-y rounded bg-transparent text-[14px] leading-relaxed outline-none placeholder:text-muted"
      />
      {/*
        The board, offered by name and inserted as an id. Names are ambiguous
        and change; ids are what the record uses. Nobody should have to type
        the id, and nobody should be able to name somebody who is not here.
      */}
      {mentionable.length > 0 && (
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted">{t('say.ask')}</span>
          {mentionable.map((m) => (
            <button
              key={m.id}
              type="button"
              title={m.title}
              onClick={() => setBody((was) => (was.endsWith(' ') || was === '' ? was : was + ' ') + '@' + m.id + ' ')}
              className="rounded-xl shadow-ring px-2 py-0.5 text-[11.5px] text-muted hover:text-paper"
            >
              {m.name}
            </button>
          ))}
        </div>
      )}

      {refusal && <p className="mt-2 text-[12px] leading-relaxed text-breach">{refusal}</p>}
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={!body.trim() || busy}
          className="rounded-xl shadow-ring px-3 py-1.5 text-[12px] hover:bg-raised disabled:opacity-40"
        >
          {t('say.submit')}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-[12px] text-muted hover:text-paper"
          >
            {t('say.cancel')}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * The entry, with any names in it marked.
 *
 * The segments come from the server already resolved. Where they are absent —
 * an entry loaded from somewhere that does not send them — the body is shown
 * as it is, which is the right failure: text a reader can still read, rather
 * than a second parser here quietly disagreeing with the first.
 */
function Body({ entry }: { entry: Entry }) {
  const { identity } = useIdentity();
  if (!entry.segments) return <>{entry.body}</>;

  return (
    <>
      {entry.segments.map((part, i) =>
        part.scholarId ? (
          <span
            key={i}
            className={
              // Their own name is marked more strongly, because the useful
              // question when reading a long thread is whether any of it was
              // addressed to you.
              part.scholarId === identity?.scholarId
                ? 'rounded bg-lapis/10 px-1 text-lapis'
                : 'text-lapis'
            }
          >
            {part.text}
          </span>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}

function Entry({
  entry,
  replies,
  matterId,
  mentionable,
  canSpeak,
  onChanged,
}: {
  entry: Entry;
  replies: Entry[];
  matterId: string;
  mentionable: { id: string; name: string; title: string }[];
  canSpeak: boolean;
  onChanged: (m: Matter) => void;
}) {
  const { t } = useI18n();
  const [replying, setReplying] = useState(false);

  return (
    <li
      className={
        'rounded-card px-5 py-4 ' +
        (entry.liaisonAnswer ? 'bg-raised/60 shadow-ring' : 'bg-raised shadow-card')
      }
    >
      <div className="mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px]">
        <span className="font-semibold text-lapis">{entry.scholarId}</span>
        {entry.liaisonAnswer && <Tag>{t('matter.liaison')}</Tag>}
        <span className="text-muted">
          <DateText iso={entry.at} />
        </span>
      </div>
      <p className="max-w-[62ch] font-display text-[15.5px] leading-[1.6]">
        <Body entry={entry} />
      </p>

      {canSpeak && !replying && (
        <button
          type="button"
          onClick={() => setReplying(true)}
          className="mt-3 text-[12.5px] text-muted underline decoration-line underline-offset-4 transition-colors hover:text-paper"
        >
          {t('say.reply')}
        </button>
      )}

      {replying && (
        <div className="mt-3">
          <p className="mb-2 text-[11.5px] text-muted">
            {t('say.replyingTo')} {entry.scholarId}
          </p>
          <Composer
            matterId={matterId}
            replyTo={entry.id}
            mentionable={mentionable}
            onDone={onChanged}
            onCancel={() => setReplying(false)}
          />
        </div>
      )}

      {replies.length > 0 && (
        <ul className="mt-4 space-y-4 border-s-2 border-line ps-5">
          {replies.map((reply) => (
            <li key={reply.id}>
              <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px]">
                <span className="font-semibold text-lapis">{reply.scholarId}</span>
                {reply.liaisonAnswer && <Tag>{t('matter.liaison')}</Tag>}
                <span className="text-muted">
                  <DateText iso={reply.at} />
                </span>
              </div>
              <p className="max-w-[62ch] font-display text-[15px] leading-[1.6]">{reply.body}</p>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export default function Deliberation({ matter, canSpeak, onChanged }: Props) {
  const { t } = useI18n();
  const entries = matter.deliberation ?? [];

  const roots = entries.filter((e) => !e.replyTo);
  const repliesFor = (id: string) => entries.filter((e) => e.replyTo === id);

  // A reply whose parent is gone would otherwise vanish from the record.
  const ids = new Set(entries.map((e) => e.id));
  const orphans = entries.filter((e) => e.replyTo && !ids.has(e.replyTo));

  const open = matter.status === 'draft' || matter.status === 'deliberation' || matter.status === 'voting';

  return (
    <div>
      {entries.length > 0 && (
        <ul className="mb-4 space-y-4">
          {[...roots, ...orphans].map((entry) => (
            <Entry
              key={entry.id}
              entry={entry}
              replies={repliesFor(entry.id)}
              matterId={matter.id}
              mentionable={matter.mentionable ?? []}
              canSpeak={canSpeak && open}
              onChanged={onChanged}
            />
          ))}
        </ul>
      )}

      {canSpeak && open && (
        <Composer
          matterId={matter.id}
          replyTo={null}
          mentionable={matter.mentionable ?? []}
          onDone={onChanged}
        />
      )}
      {entries.length === 0 && !canSpeak && (
        <p className="text-[13px] text-muted">{t('matter.noDeliberation')}</p>
      )}
    </div>
  );
}

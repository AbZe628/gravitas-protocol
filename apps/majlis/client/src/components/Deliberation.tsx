import { useState } from 'react';
import { Refused, governance, type Deliberation as Entry, type Matter } from '../lib/api.js';
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
  onDone,
  onCancel,
}: {
  matterId: string;
  replyTo: string | null;
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
    <div className="rounded-lg border border-line p-3">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t('say.placeholder')}
        rows={replyTo ? 2 : 3}
        className="w-full resize-y rounded bg-transparent text-[14px] leading-relaxed outline-none placeholder:text-muted"
      />
      {refusal && <p className="mt-2 text-[12px] leading-relaxed text-amber-300">{refusal}</p>}
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={!body.trim() || busy}
          className="rounded border border-line px-3 py-1.5 text-[12px] hover:bg-surface/60 disabled:opacity-40"
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

function Entry({
  entry,
  replies,
  matterId,
  canSpeak,
  onChanged,
}: {
  entry: Entry;
  replies: Entry[];
  matterId: string;
  canSpeak: boolean;
  onChanged: (m: Matter) => void;
}) {
  const { t } = useI18n();
  const [replying, setReplying] = useState(false);

  return (
    <li className={'rounded-lg border p-3.5 ' + (entry.liaisonAnswer ? 'border-line bg-surface/40' : 'border-line')}>
      <div className="mb-1.5 flex items-center gap-2 text-[12px]">
        <span className="text-goldsoft">{entry.scholarId}</span>
        {entry.liaisonAnswer && <Tag>{t('matter.liaison')}</Tag>}
        <span className="text-muted">
          <DateText iso={entry.at} />
        </span>
      </div>
      <p className="text-[14px] leading-relaxed">{entry.body}</p>

      {canSpeak && !replying && (
        <button
          type="button"
          onClick={() => setReplying(true)}
          className="mt-2 text-[12px] text-muted hover:text-paper"
        >
          {t('say.reply')}
        </button>
      )}

      {replying && (
        <div className="mt-3">
          <p className="mb-1.5 text-[11px] text-muted">
            {t('say.replyingTo')} {entry.scholarId}
          </p>
          <Composer
            matterId={matterId}
            replyTo={entry.id}
            onDone={onChanged}
            onCancel={() => setReplying(false)}
          />
        </div>
      )}

      {replies.length > 0 && (
        <ul className="mt-3 space-y-3 border-s border-line ps-3.5">
          {replies.map((reply) => (
            <li key={reply.id}>
              <div className="mb-1 flex items-center gap-2 text-[12px]">
                <span className="text-goldsoft">{reply.scholarId}</span>
                {reply.liaisonAnswer && <Tag>{t('matter.liaison')}</Tag>}
                <span className="text-muted">
                  <DateText iso={reply.at} />
                </span>
              </div>
              <p className="text-[13.5px] leading-relaxed">{reply.body}</p>
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
              canSpeak={canSpeak && open}
              onChanged={onChanged}
            />
          ))}
        </ul>
      )}

      {canSpeak && open && <Composer matterId={matter.id} replyTo={null} onDone={onChanged} />}
      {entries.length === 0 && !canSpeak && (
        <p className="text-[13px] text-muted">{t('matter.noDeliberation')}</p>
      )}
    </div>
  );
}

import { useState } from 'react';
import type { Delivery, Notice } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';

/**
 * The words to tell the board, and whether anybody was told.
 *
 * The second half is the whole reason this is a component rather than a block
 * of text. On an installation with no channel — which is most of them — nothing
 * has been sent, and a panel that simply displayed a nicely formatted message
 * would read as a receipt. A secretary would assume the board had been emailed,
 * and would find out otherwise when nobody turned up.
 *
 * So the state is said in words before the words themselves: *Majlis has not
 * sent this*, followed by why that is the ordinary arrangement rather than a
 * fault, and then the text to carry. The copy button is the actual next step,
 * so it is the one thing here that looks like an action.
 *
 * Where a channel *is* configured, the same component says so and how many
 * members it reached. Same words either way — two wordings for one event is how
 * a record and a mailbox start disagreeing.
 */
export default function TheNotice({ notice, delivery }: { notice: Notice; delivery: Delivery }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const text = `${notice.subject}\n\n${notice.body}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // A refused clipboard is not worth an error state: the text is on the
      // screen and selectable, which is the fallback a person already knows.
    }
  }

  return (
    <div className="rounded-sheet bg-raised px-5 py-4 shadow-card">
      <div className="mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
          {t('notice.title')}
        </span>
        <span
          className={
            'rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.1em] ' +
            (delivery.sent
              ? 'bg-[#EBF3EF] text-settled shadow-[0_0_0_0.5px_rgba(44,107,87,0.18)]'
              : 'bg-black/[0.045] text-sand')
          }
        >
          {delivery.sent ? `${t('notice.sentTo')} ${delivery.reached ?? 0}` : t('notice.notSent')}
        </span>
      </div>

      {!delivery.sent && (
        <p className="mb-3 max-w-[62ch] text-[12.5px] leading-[1.6] text-muted">
          {t('notice.notSentBody')}
        </p>
      )}

      {/*
        The notice itself, monospaced and selectable. Set as text a person
        pastes rather than as prose the interface is saying, because that is
        what it is about to become.
      */}
      <pre className="mb-3 max-w-full overflow-x-auto whitespace-pre-wrap rounded-card bg-sheet px-4 py-3 font-mono text-[11.5px] leading-[1.6] shadow-ring">
        {text}
      </pre>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="button"
          onClick={copy}
          className="rounded-xl bg-gradient-to-br from-lapissoft to-[#143E67] px-4 py-2 text-[12.5px] font-semibold text-white shadow-act transition-all hover:brightness-110 active:scale-[0.98]"
        >
          {copied ? t('notice.copied') : t('notice.copy')}
        </button>
        <span className="text-[11.5px] text-muted">
          {t('notice.concerns')}{' '}
          <span className="tabular-nums">{notice.concerns.length}</span> {t('notice.members')}
        </span>
      </div>
    </div>
  );
}

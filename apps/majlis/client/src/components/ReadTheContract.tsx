import { useState } from 'react';
import { oversight, type ContractReading } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import WhereTheDraftComesFrom from './WhereTheDraftComesFrom.js';
import { Nothing } from './page.js';

/**
 * Paste a contract, see where each condition is answered.
 *
 * ── the flow this completes ───────────────────────────────────────────────
 *
 * A question arrives, somebody reads the contract against the conditions, the
 * board looks at what was found, changes what needs changing, and votes. Every
 * part of that existed except the reading, and the reading existed on the
 * server and was reachable from nowhere — written, tested, and never put on a
 * screen. This is the screen.
 *
 * It sits inside the matter's papers, between the figures and what members
 * said, because that is where it belongs in the order somebody reads: here is
 * the text, here is where each condition is answered, now say what you think.
 *
 * And it sits on a screen of its own, against a shape from the library, for
 * the case that comes first: a scholar with a draft in their hand and nothing
 * opened yet. Requiring a matter for that meant the one thing the AI advisers
 * are bought for could only be reached by somebody who had already decided to
 * deliberate.
 *
 * ── what it is not, and the difference is the product ─────────────────────
 *
 * The competing products return a verdict — compliant, partially compliant,
 * non-compliant. This returns **where each condition is answered in the text
 * and where it is not**, quotes the sentence, and stops. There is no *met*:
 * met is a finding, it carries a scholar's name and a reason, and it is
 * recorded on the checklist below by a person.
 *
 * A condition about the order two things happen in says a person has to read
 * it, however many of the words are present. No reading of words can tell you
 * which of two events came first, and that is exactly what such a condition
 * asks.
 *
 * ── nothing is kept ───────────────────────────────────────────────────────
 *
 * The text is read and forgotten. A contract a bank pastes to see what the
 * board would ask about is not yet a document of the record, and keeping it
 * would make it one without anybody having decided that.
 */

const STANDING: Record<string, { tone: string; key: string }> = {
  found: { tone: 'text-settled', key: 'read.found' },
  unclear: { tone: 'text-gold', key: 'read.unclear' },
  absent: { tone: 'text-breach', key: 'read.absent' },
};

export default function ReadTheContract({
  matterId,
  structureId,
  startWith,
  canRead,
}: {
  /** Read against this matter's shape. */
  matterId?: string;
  /** Or against a shape named directly, with no matter involved. */
  structureId?: string;
  /**
   * A draft to arrive holding, so a press lands on the reading rather than on
   * the empty form that would produce it.
   */
  startWith?: { name: string; text: string } | null;
  canRead: boolean;
}) {
  const { t } = useI18n();
  const [text, setText] = useState(startWith?.text ?? '');
  const [took, setTook] = useState<string | null>(startWith?.name ?? null);
  const [reading, setReading] = useState<ContractReading | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  if (!canRead) return null;

  async function read() {
    setBusy(true);
    setFailed(null);
    try {
      setReading(
        matterId
          ? await oversight.readContract(matterId, text)
          : await oversight.readAgainstShape(structureId as string, text),
      );
    } catch (e) {
      setFailed(e instanceof Error ? e.message : t('read.failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {!reading && (
        <>
          <p className="mb-3 max-w-[58ch] text-[13px] leading-[1.65] text-muted">{t('read.lead')}</p>

          {/*
            Three ways in, where there was one. A scholar's contract is a file,
            or it is a draft this board already assembled from its own ruling,
            and neither could be used: the only supported way to check a
            contract was to open it elsewhere, select all, and paste.
          */}
          <WhereTheDraftComesFrom
            structureId={structureId}
            onText={(t_, from) => {
              setText(t_);
              setTook(from);
            }}
          />

          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setTook(null);
            }}
            rows={6}
            placeholder={t('read.placeholder')}
            aria-label={t('read.placeholder')}
            className="w-full rounded-card bg-ink px-4 py-3 text-[13.5px] leading-[1.6] text-paper shadow-ring outline-none placeholder:text-muted focus:shadow-lift"
          />

          {/* Where the words came from, so a reading is traceable to a source. */}
          {took && (
            <p className="mt-2 text-[12px] text-muted">
              {t('draftfrom.took')} {took}
              <span className="mx-1.5 opacity-40">·</span>
              {text.trim().length} {t('draftfrom.characters')}
            </p>
          )}
          {failed && <p className="mt-2 text-[12.5px] text-breach">{failed}</p>}
          <button
            type="button"
            onClick={read}
            disabled={busy || text.trim().length < 40}
            className="mt-3 rounded-card bg-lapis px-6 py-3 text-[14px] font-bold text-white shadow-act disabled:opacity-50"
          >
            {busy ? t('read.reading') : t('read.doIt')}
          </button>
        </>
      )}

      {reading && (
        <>
          <ul className="space-y-2.5">
            {reading.conditions.map((c) => {
              const s = STANDING[c.standing] ?? STANDING.absent;
              return (
                <li key={c.conditionId} className="rounded-card bg-ink px-4 py-3">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className={'text-[11px] font-bold uppercase tracking-[0.1em] ' + s.tone}>
                      {t(s.key)}
                    </span>
                    <span className="text-[13.5px] font-semibold">{c.requirement}</span>
                  </div>

                  {/* The sentence it was found in. Without it a reader cannot check. */}
                  {c.passages.map((p, i) => (
                    <p
                      key={i}
                      className="mt-2 max-w-[58ch] border-s-2 border-line ps-3 font-display text-[13.5px] leading-[1.6] text-sand"
                    >
                      {p.text}
                    </p>
                  ))}

                  <p className="mt-2 max-w-[58ch] text-[12.5px] leading-[1.6] text-muted">{c.note}</p>
                </li>
              );
            })}
          </ul>

          {/*
            What the reading could not do. Never an appendix and never muted:
            a list of confident findings with no seams is read as complete.
          */}
          <div className="mt-5 border-t border-line pt-4">
            <div className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
              {t('read.limits')}
            </div>
            <ul className="space-y-2">
              {reading.limits.map((l, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="mt-[7px] h-[6px] w-[6px] shrink-0 rounded-full bg-gold/70" />
                  <span className="max-w-[58ch] text-[12.5px] leading-[1.6] text-sand">{l}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-4 max-w-[58ch] text-[12.5px] leading-[1.6] text-muted">{t('read.thenWhat')}</p>

          <button
            type="button"
            onClick={() => {
              setReading(null);
              setText('');
            }}
            className="mt-3 text-[12.5px] text-muted underline decoration-line underline-offset-4 hover:text-paper"
          >
            {t('read.again')}
          </button>
        </>
      )}

      {reading === null && text.trim().length > 0 && text.trim().length < 40 && (
        <div className="mt-3">
          <Nothing>{t('read.tooShort')}</Nothing>
        </div>
      )}
    </div>
  );
}

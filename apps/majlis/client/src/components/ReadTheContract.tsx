import { useState } from 'react';
import { oversight, type ContractReading } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import WhereTheDraftComesFrom from './WhereTheDraftComesFrom.js';
import WhichShape from './WhichShape.js';
import { Nothing } from './page.js';
import { Button } from './Button';
import Act from './Act.js';

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
  onItsOwnScreen = false,
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
  /**
   * True on the screen a scholar opened in order to read a draft.
   *
   * There the form is what they came for and opens straight away. Inside a
   * matter it is a tool among others and folds until asked for.
   */
  onItsOwnScreen?: boolean;
}) {
  const { t } = useI18n();
  const [text, setText] = useState(startWith?.text ?? '');
  const [took, setTook] = useState<string | null>(startWith?.name ?? null);
  const [reading, setReading] = useState<ContractReading | null>(null);
  /** Whether the window that performs the reading is open. */
  const [asking, setAsking] = useState(false);
  /* Opened by a press inside a matter; already open where it is the point. */
  const [open, setOpen] = useState(Boolean(startWith));

  /*
   * The shape, chosen here rather than on a screen before this one.
   *
   * Outside a matter the reading needs a shape named, and naming it used to
   * mean a page of its own that reprinted all nineteen as cards. It is a
   * list of names with one wanted, which is a dropdown, and it belongs
   * beside the draft — with *compare them all* for the scholar who cannot
   * name the shape yet, which is most of them.
   *
   * Inside a matter there is nothing to choose: the matter's own shape is
   * what its conditions are, and offering a picker there would invite
   * reading a matter's draft against somebody else's conditions.
   */
  const [shape, setShape] = useState(structureId ?? '');

  if (!canRead) return null;

  const readsAgainst = matterId ? null : shape;

  async function read() {
    setReading(
      matterId
        ? await oversight.readContract(matterId, text)
        : await oversight.readAgainstShape(shape, text),
    );
  }

  /*
   * Folded until asked for, on the matter's own page.
   *
   * ── why this changed ──────────────────────────────────────────────────
   *
   * A six-row paste box stood permanently open between a member and the steps
   * of their case. It is a tool somebody reaches for once, early, on the
   * minority of matters that arrive with a draft attached — and it was the
   * largest object on the way to the work on every matter, including the ones
   * with no contract to read at all.
   *
   * It is one press away and says what it is for. On its own screen, where a
   * scholar arrived precisely to read a draft, it opens as it always did:
   * folding the thing somebody came for would be the same fault the other way
   * round.
   */
  if (!reading && !open && !onItsOwnScreen) {
    return (
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl bg-raised px-4 py-2 text-ui font-semibold text-lapis shadow-ring transition-colors hover:text-paper"
      >
        {t('read.doIt')}
      </Button>
    );
  }

  return (
    <div>
      {!reading && (
        <>
          <p className="mb-3 max-w-[58ch] text-ui leading-relaxed text-muted">{t('read.lead')}</p>

          {/*
            Three ways in, where there was one. A scholar's contract is a file,
            or it is a draft this board already assembled from its own ruling,
            and neither could be used: the only supported way to check a
            contract was to open it elsewhere, select all, and paste.
          */}
          <WhereTheDraftComesFrom
            structureId={readsAgainst ?? undefined}
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
            className="w-full rounded-card bg-ink px-4 py-3 text-body leading-relaxed text-paper shadow-ring outline-none placeholder:text-muted focus:shadow-lift"
          />

          {/* Where the words came from, so a reading is traceable to a source. */}
          {took && (
            <p className="mt-2 text-note text-muted">
              {t('draftfrom.took')} {took}
              <span className="mx-1.5 opacity-40">·</span>
              {text.trim().length} {t('draftfrom.characters')}
            </p>
          )}
          {/*
            Which conditions this is read against, below the draft rather
            than on a page before it.

            Below, because the draft is what a scholar arrives holding and
            the shape is often what they want the reading to help them see.
            Comparing all of them needs the text, so asking for the shape
            first put the two the wrong way round.
          */}
          {!matterId && <div className="mt-4"><WhichShape value={shape} onChange={setShape} text={text} /></div>}

          <Button
            type="button"
            onClick={() => setAsking(true)}
            disabled={text.trim().length < 40 || (!matterId && shape === '')}
            className="mt-3 rounded-card bg-lapis px-6 py-3 text-body font-bold text-white shadow-act disabled:opacity-50"
          >
            {t('read.doIt')}
          </Button>

          {/*
            The one place a machine reads a contract, and so the one place
            that has to say what it is doing before it does it. What comes
            back looks like an answer — conditions, verdicts, quotations —
            and a member who does not know how it was made could take it for
            one. The window says: words found and lined up, nothing recorded,
            every quotation checked against the source, and where nothing was
            found the field stays empty and named rather than guessed.
          */}
          <Act
            open={asking}
            onClose={() => setAsking(false)}
            title={t('read.doIt')}
            does={t('wm.read.does')}
            means={t('wm.read.means')}
            label={t('read.doIt')}
            perform={read}
            after={{
              did: t('wm.read.did'),
              means: t('wm.read.didMeans'),
              next: [{ label: t('wm.next.theReading'), says: t('wm.next.theReadingSays') }],
            }}
          />
        </>
      )}

      {reading && (
        <>
          {/*
            Which reader produced this, above the findings rather than under
            them.

            There are two and they disagree: one matches the condition's words
            against the draft, the other sends the draft to a reading
            assistant and finds clauses the first cannot. A board reading
            "Not there" is entitled to know which of the two said it, and
            where their draft went to be read, before they read a word of it.
          */}
          <div className="mb-3 flex flex-wrap items-baseline gap-x-2 text-note text-muted">
            <span className="font-semibold text-sand">
              {reading.readBy === 'model' ? t('read.byModel') : t('read.byWords')}
            </span>
            {reading.readBy === 'model' && reading.processor && (
              <span>
                <span className="mx-0.5 opacity-40">·</span> {t('read.sentTo')}{' '}
                {reading.processor}
              </span>
            )}
          </div>

          <ul className="space-y-2.5">
            {reading.conditions.map((c) => {
              const s = STANDING[c.standing] ?? STANDING.absent;
              return (
                <li key={c.conditionId} className="rounded-card bg-ink px-4 py-3">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className={'text-note font-bold uppercase tracking-label ' + s.tone}>
                      {t(s.key)}
                    </span>
                    <span className="text-body font-semibold">{c.requirement}</span>
                  </div>

                  {/* The sentence it was found in. Without it a reader cannot check. */}
                  {c.passages.map((p, i) => (
                    <div key={i} className="mt-2 border-s-2 border-line ps-3">
                      {/*
                        Where in the contract, where whoever read it could
                        name a clause. A scholar goes looking by number, not
                        by character offset, and the matcher has no number to
                        give — so this appears with one reader and not the
                        other, rather than being invented for both.
                      */}
                      {p.label && (
                        <div className="mb-1 text-label font-bold uppercase tracking-caps text-muted">
                          {p.label}
                        </div>
                      )}
                      <p className="max-w-[58ch] font-display text-body leading-relaxed text-sand">
                        {p.text}
                      </p>
                    </div>
                  ))}

                  <p className="mt-2 max-w-[58ch] text-ui leading-relaxed text-muted">{c.note}</p>
                </li>
              );
            })}
          </ul>

          {/*
            What the reading could not do. Never an appendix and never muted:
            a list of confident findings with no seams is read as complete.
          */}
          <div className="mt-5 border-t border-line pt-4">
            <div className="mb-2.5 text-label font-bold uppercase tracking-caps text-muted">
              {t('read.limits')}
            </div>
            <ul className="space-y-2">
              {reading.limits.map((l, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="mt-[7px] h-[6px] w-[6px] shrink-0 rounded-full bg-gold/70" />
                  <span className="max-w-[58ch] text-ui leading-relaxed text-sand">{l}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-4 max-w-[58ch] text-ui leading-relaxed text-muted">{t('read.thenWhat')}</p>

          <Button
            type="button"
            onClick={() => {
              setReading(null);
              setText('');
            }}
            className="mt-3 text-ui text-muted underline decoration-line underline-offset-4 hover:text-paper"
          >
            {t('read.again')}
          </Button>
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

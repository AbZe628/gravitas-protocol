import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, governance, Refused, type Matter } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { DateText } from './ui.js';
import { Field, HEADING } from './field.js';
import { Nothing } from './page.js';
import { Button } from './Button';

/**
 * What the board has asked this institution, and the box to answer in.
 *
 * ── the other half of asking ──────────────────────────────────────────────
 *
 * A question the board puts from a step has to arrive somewhere. Without this
 * the board could ask and nobody could answer, which is worse than not asking:
 * the case would sit with the waiting recorded against the institution and the
 * institution would never learn it had been asked anything.
 *
 * ── it opens the case, it does not summarise it ───────────────────────────
 *
 * Each question carries the title of the case it belongs to and links to it.
 * A desk answering *does the institution take possession before the sale* needs
 * to know which arrangement is being asked about, and a list of questions with
 * no cases attached is a quiz.
 *
 * ── answered ones stay ────────────────────────────────────────────────────
 *
 * A desk that answered last week should be able to see what it said, because
 * the next question is often about the same thing. They fold under the
 * outstanding ones rather than disappearing.
 */

interface Open {
  matter: Matter;
  questionId: string;
  asking: string;
  askedBy: string;
  askedAt: string;
  answer: string | null;
  answeredAt: string | null;
}

export default function WhatTheBoardAsked({ boardId }: { boardId: string }) {
  const { t } = useI18n();
  const [rows, setRows] = useState<Open[] | null>(null);
  const [answering, setAnswering] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);

  function load() {
    api
      .matters()
      .then(async (list) => {
        /*
         * The summaries do not carry the questions, so each case that might
         * hold one is read. A board with hundreds of settled cases would want
         * this narrowed on the server; a board with the handful that are open
         * does not, and a filter written before it is needed is a filter
         * nobody has measured.
         */
        const open = list.filter((m) =>
          ['draft', 'deliberation', 'voting', 'timelock'].includes(m.status),
        );
        const full = await Promise.all(
          open.map((m) => api.matter(m.id).catch(() => null)),
        );

        const found: Open[] = [];
        for (const matter of full) {
          if (!matter) continue;
          for (const q of matter.asked ?? []) {
            found.push({
              matter,
              questionId: q.id,
              asking: q.asking,
              askedBy: q.askedBy,
              askedAt: q.askedAt,
              answer: q.answer,
              answeredAt: q.answeredAt,
            });
          }
        }
        setRows(found);
      })
      .catch(() => setRows([]));
  }

  useEffect(load, [boardId]);

  if (!rows) return null;

  const outstanding = rows.filter((r) => r.answeredAt === null);
  const answered = rows.filter((r) => r.answeredAt !== null);

  async function send(row: Open, e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setRefusal(null);
    try {
      await governance.answerAsked(row.matter.id, row.questionId, answer.trim());
      setAnswering(null);
      setAnswer('');
      load();
    } catch (error) {
      setRefusal(error instanceof Refused ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mb-8">
      <h2 className="mb-1 text-label font-bold uppercase tracking-caps text-muted">
        {t('toDesk.onCase')}
      </h2>

      {outstanding.length === 0 && answered.length === 0 ? (
        <Nothing>{t('toDesk.none')}</Nothing>
      ) : (
        <ul className="space-y-2.5">
          {outstanding.map((row) => (
            <li
              key={row.questionId}
              className="rounded-card bg-goldtint px-5 py-4 shadow-ringgold"
            >
              <div className="mb-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-note text-muted">
                <DateText iso={row.askedAt} />
                <span>{row.askedBy}</span>
                <Link
                  to={`/matters/${row.matter.id}`}
                  className="text-lapis underline decoration-line underline-offset-4"
                >
                  {row.matter.title}
                </Link>
              </div>
              <p className="max-w-[62ch] font-display text-lead leading-relaxed text-paper">
                {row.asking}
              </p>

              {answering === row.questionId ? (
                <form onSubmit={(e) => send(row, e)} className="mt-3">
                  <Field label={t('toDesk.yourAnswer')} headingClass={HEADING}>
                    {(attrs) => (
                      <textarea
                        {...attrs}
                        rows={4}
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        className="w-full rounded-xl bg-raised px-3 py-2.5 text-ui leading-relaxed shadow-ring outline-none"
                        required
                      />
                    )}
                  </Field>
                  {refusal && <p className="mt-2.5 text-ui text-breach">{refusal}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <Button
                      type="submit"
                      disabled={busy || answer.trim().length < 10}
                      className="rounded-xl bg-lapis px-4 py-2 text-ui font-semibold text-white shadow-act disabled:opacity-40"
                    >
                      {t('toDesk.sendAnswer')}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setAnswering(null)}
                      className="text-note text-muted underline decoration-line underline-offset-4"
                    >
                      {t('common.cancel')}
                    </Button>
                  </div>
                </form>
              ) : (
                <Button
                  type="button"
                  onClick={() => {
                    setAnswering(row.questionId);
                    setAnswer('');
                    setRefusal(null);
                  }}
                  className="mt-3 rounded-xl bg-lapis px-4 py-2 text-ui font-semibold text-white shadow-act"
                >
                  {t('toDesk.answerIt')}
                </Button>
              )}
            </li>
          ))}

          {answered.length > 0 && (
            <li>
              <details>
                <summary className="cursor-pointer text-ui text-muted hover:text-paper">
                  {answered.length} {t('toDesk.answered')}
                </summary>
                <ul className="mt-2.5 space-y-2.5">
                  {answered.map((row) => (
                    <li key={row.questionId} className="rounded-card bg-raised px-5 py-4 shadow-ring">
                      <div className="mb-1.5 text-note text-muted">
                        <DateText iso={row.askedAt} />
                        <span className="mx-1.5 opacity-40">·</span>
                        {row.matter.title}
                      </div>
                      <p className="max-w-[62ch] text-ui leading-relaxed text-sand">{row.asking}</p>
                      <p className="mt-2 max-w-[62ch] font-display text-lead leading-relaxed text-paper">
                        {row.answer}
                      </p>
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  api,
  examinations,
  type Examinable,
  type Examination,
  type MatterSummary,
} from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import TellTheBank from '../components/TellTheBank.js';
import ReportWhatWasFound from '../components/ReportWhatWasFound.js';
import { Division, Nothing, PageHead } from '../components/page.js';
import { ErrorText, Loading } from '../components/ui.js';
import { useIdentity, mayRecordInstitutionAct, mayDeliberate } from '../lib/identity.js';
import { Act, Card, Quiet, State } from '../components/kit.js';

/**
 * What was executed, against what the board approved.
 *
 * The screen reports and does not judge. There is no pass, no score and no
 * traffic light: exceptions are counted and described, and whether they make an
 * arrangement impermissible is a ruling raised as a matter.
 *
 * Two things it must show that a simpler screen would leave out. Coverage is
 * unknown wherever the institution did not say how many transactions there
 * were, and it says unknown rather than showing a percentage of a number nobody
 * supplied. And the conditions an examination did not reach are named, because
 * silence about a condition reads as a pass.
 */

const field = 'w-full rounded-xl bg-raised shadow-ring p-2.5 text-[14px] leading-relaxed outline-none';
const label = 'mb-1 block text-[12px] text-muted';
const help = 'mb-2 max-w-[62ch] text-[11.5px] leading-[1.6] text-muted';

function One({ e, canReport }: { e: Examination; canReport: boolean }) {
  const { t } = useI18n();

  return (
    <Card>
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        {e.exceptions === 0 ? (
          <State tone="settled">{t('exam.noExceptions')}</State>
        ) : (
          <State tone="breach">
            {e.exceptions} {t('exam.exceptions')}
          </State>
        )}
        <span className="text-[11.5px] text-muted">
          {e.from.slice(0, 10)} — {e.to.slice(0, 10)}
        </span>
      </div>

      {e.matterTitle && (
        <div className="font-display text-[17px] leading-snug">
          <Link to={`/matters/${e.matterId}`} className="hover:text-lapis">
            {e.matterTitle}
          </Link>
        </div>
      )}

      {/*
        The figure, and only where it can be known. `percent === null` is not a
        missing value to hide — it is the institution not having said how many
        transactions there were, which the reader has to be told.
      */}
      <p className="mt-2 text-[13px]">
        <span className="font-mono tabular-nums">{e.coverage.examined}</span> {t('exam.examined')}
        {e.coverage.population !== null && (
          <>
            {' '}
            {t('exam.ofTotal')}{' '}
            <span className="font-mono tabular-nums">{e.coverage.population}</span>
            <span className="ms-2 text-muted">({e.coverage.percent}%)</span>
          </>
        )}
      </p>
      {e.coverage.population === null && (
        <p className="mt-1 max-w-[62ch] text-[11.5px] leading-[1.55] text-muted">
          {t('exam.coverageUnknown')}
        </p>
      )}

      <div className="mt-3">
        <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
          {t('exam.howChosen')}
        </div>
        <p className="max-w-[62ch] text-[12.5px] leading-[1.6]">{e.howChosen}</p>
      </div>

      {e.findings.filter((f) => f.held === 'exceptions').length > 0 && (
        <ul className="mt-3 space-y-2">
          {e.findings
            .filter((f) => f.held === 'exceptions')
            .map((f, i) => (
              <li key={i} className="rounded-xl bg-[#FCF0EE] px-3.5 py-2.5 shadow-[0_0_0_0.5px_rgba(154,56,48,0.18)]">
                <div className="text-[11.5px] font-semibold text-breach">
                  {f.against.replace(/^term:/, '')}
                  <span className="ms-2 font-mono tabular-nums">{f.exceptions}</span>
                </div>
                <p className="mt-1 max-w-[62ch] text-[12.5px] leading-[1.6] text-muted">{f.note}</p>
              </li>
            ))}
        </ul>
      )}

      {e.notExamined.length > 0 && (
        <div className="mt-3 rounded-xl bg-[#F7F0E2] px-3.5 py-2.5 shadow-[0_0_0_0.5px_rgba(176,132,48,0.28)]">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-[#8A6524]">
            {t('exam.notExamined')} · {e.notExamined.length}
          </div>
          <p className="max-w-[62ch] text-[11.5px] leading-[1.55] text-[#6b5326]">
            {t('exam.notExaminedNote')}
          </p>
        </div>
      )}

      {e.againstCurrentTerms === false && (
        <p className="mt-3 max-w-[62ch] text-[12px] leading-[1.55] text-muted">
          {t('exam.termsMoved')}
        </p>
      )}

      {/*
        And then you tell the bank what the review found. It says what was
        looked at and what fell outside the terms, and stops there — whether
        anything follows is the board's determination and has its own path.
      */}
      {/*
        The one thing that follows from a finding with exceptions, and the
        step that had no path: putting it to the board as a reported event.
      */}
      <ReportWhatWasFound e={e} ruleTitle={e.ruleId} canReport={canReport} />

      <TellTheBank kind="examination" id={e.id} />
    </Card>
  );
}

export default function Examinations({ boardId }: { boardId: string }) {
  const { t } = useI18n();
  const { identity } = useIdentity();
  const [all, setAll] = useState<Examination[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [settled, setSettled] = useState<MatterSummary[]>([]);
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState<Examinable | null>(null);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [howChosen, setHowChosen] = useState('');
  const [population, setPopulation] = useState('');
  const [examined, setExamined] = useState('');
  const [held, setHeld] = useState<Record<string, { held: string; exceptions: string; note: string }>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    examinations
      .list(boardId)
      .then((r) => setAll(Array.isArray(r.examinations) ? r.examinations : []))
      .catch(() => setFailed(true));
    api
      .matters()
      .then((m) => {
        const list = Array.isArray(m) ? m : [];
        setSettled(list.filter((x) => x.status === 'in_force' || x.status === 'timelock'));
      })
      .catch(() => undefined);
  };

  useEffect(load, [boardId]);

  // Unreachable is not "nothing has been examined", which on this screen of
  // all screens is the more alarming of the two claims.
  if (failed) return <ErrorText />;
  if (!all) return <Loading />;

  // Whoever records this is the institution's own review function, never a
  // signatory. The route refuses regardless of what is shown.
  const mayRecord = mayRecordInstitutionAct(identity?.role, identity?.office);

  async function choose(matterId: string) {
    setError(null);
    try {
      setSubject(await examinations.examinable(matterId));
      setHeld({});
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function save() {
    if (!subject) return;
    setBusy(true);
    setError(null);
    try {
      const findings = Object.entries(held)
        .filter(([, v]) => v.held)
        .map(([against, v]) => ({
          against,
          held: v.held as 'held' | 'exceptions' | 'not_examined',
          exceptions: Number(v.exceptions || 0),
          note: v.note ?? '',
        }));

      await examinations.record({
        matterId: subject.matterId,
        from: new Date(from).toISOString(),
        to: new Date(to).toISOString(),
        howChosen,
        // Empty means the institution did not say. Sent as null rather than 0,
        // which would claim there were no transactions at all.
        population: population.trim() === '' ? null : Number(population),
        examined: Number(examined),
        findings,
      });

      setOpen(false);
      setSubject(null);
      setHowChosen('');
      setPopulation('');
      setExamined('');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const rows = [...(subject?.conditions ?? []), ...(subject?.terms ?? [])];

  return (
    <div className="mx-auto max-w-reading px-5 pb-16 pt-6">
      <PageHead
        phase="checked"
        title={t('exam.title')}
        says={t('exam.lead')}
      />

      {mayRecord ? (
        <div className="mt-5">
          {!open ? (
            <Act onClick={() => setOpen(true)}>{t('exam.record')}</Act>
          ) : (
            <Card>
              <label className={label}>{t('exam.whichRuling')}</label>
              {settled.length === 0 ? (
                <p className="mb-3 text-[12.5px] text-muted">{t('exam.noSettled')}</p>
              ) : (
                <select
                  value={subject?.matterId ?? ''}
                  onChange={(e) => void choose(e.target.value)}
                  className={field + ' mb-4'}
                >
                  <option value="">—</option>
                  {settled.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              )}

              {subject && (
                <>
                  <div className="mb-4 flex gap-3">
                    <label className="flex-1">
                      <span className={label}>{t('exam.from')}</span>
                      <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={field} />
                    </label>
                    <label className="flex-1">
                      <span className={label}>{t('exam.to')}</span>
                      <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={field} />
                    </label>
                  </div>

                  <label className={label}>{t('exam.howChosen')}</label>
                  <p className={help}>{t('exam.howChosenHelp')}</p>
                  <textarea
                    value={howChosen}
                    onChange={(e) => setHowChosen(e.target.value)}
                    rows={3}
                    className={field + ' mb-4 resize-y'}
                  />

                  <div className="mb-4 flex gap-3">
                    <label className="flex-1">
                      <span className={label}>{t('exam.howMany')}</span>
                      <input
                        inputMode="numeric"
                        value={examined}
                        onChange={(e) => setExamined(e.target.value)}
                        className={field + ' font-mono tabular-nums'}
                      />
                    </label>
                    <label className="flex-1">
                      <span className={label}>{t('exam.population')}</span>
                      <input
                        inputMode="numeric"
                        value={population}
                        onChange={(e) => setPopulation(e.target.value)}
                        className={field + ' font-mono tabular-nums'}
                      />
                    </label>
                  </div>
                  <p className={help}>{t('exam.populationHelp')}</p>

                  {/*
                    One row per condition and per operative term, from the
                    server. A form that assembled the list itself would omit one
                    and produce an examination that silently never covered it.
                  */}
                  <div className="mt-4 space-y-3">
                    {rows.map((r) => {
                      const v = held[r.against] ?? { held: '', exceptions: '', note: '' };
                      return (
                        <div key={r.against} className="rounded-card bg-raised/60 px-4 py-3 shadow-ring">
                          <p className="mb-2 max-w-[62ch] text-[13px] leading-[1.5]">{r.requirement}</p>
                          <div className="mb-2 flex flex-wrap gap-2">
                            {(['held', 'exceptions', 'not_examined'] as const).map((h) => (
                              <button
                                key={h}
                                type="button"
                                onClick={() => setHeld({ ...held, [r.against]: { ...v, held: h } })}
                                className={
                                  'rounded-xl px-3 py-1.5 text-[12px] transition-all ' +
                                  (v.held === h
                                    ? 'bg-[#EAF1F7] font-semibold text-lapis shadow-[0_0_0_1.5px_#164470]'
                                    : 'bg-raised text-sand shadow-ring hover:text-paper')
                                }
                              >
                                {t(`exam.finding.${h}`)}
                              </button>
                            ))}
                          </div>

                          {v.held === 'exceptions' && (
                            <>
                              <input
                                inputMode="numeric"
                                placeholder={t('exam.howManyFailed')}
            aria-label={t('exam.howManyFailed')}
                                value={v.exceptions}
                                onChange={(e) =>
                                  setHeld({ ...held, [r.against]: { ...v, exceptions: e.target.value } })
                                }
                                className={field + ' mb-2 font-mono tabular-nums'}
                              />
                              <textarea
                                placeholder={t('exam.findingNote')}
            aria-label={t('exam.findingNote')}
                                value={v.note}
                                onChange={(e) => setHeld({ ...held, [r.against]: { ...v, note: e.target.value } })}
                                rows={2}
                                className={field + ' resize-y'}
                              />
                              <p className="mt-1 text-[11px] leading-[1.5] text-muted">
                                {t('exam.findingNoteHelp')}
                              </p>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {error && (
                    <p className="mt-4 rounded-xl bg-[#FCF0EE] px-3.5 py-2.5 text-[12.5px] text-breach shadow-[0_0_0_0.5px_rgba(154,56,48,0.2)]">
                      {error}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-4">
                    <Act onClick={save} disabled={busy || !from || !to || !examined}>
                      {t('exam.save')}
                    </Act>
                    <Quiet onClick={() => { setOpen(false); setSubject(null); }}>{t('common.back')}</Quiet>
                  </div>
                </>
              )}
            </Card>
          )}
        </div>
      ) : (
        <p className="mt-5 max-w-[62ch] rounded-card bg-raised/60 px-4 py-3 text-[12.5px] leading-[1.6] text-muted shadow-ring">
          {t('exam.onlyInstitution')}
        </p>
      )}

      <Division heading={t('exam.recorded')}>
        {all.length === 0 ? (
          <Nothing>{t('exam.none')}</Nothing>
        ) : (
          <div className="space-y-3">
            {all.map((e) => (
              <One key={e.id} e={e} canReport={mayDeliberate(identity?.role)} />
            ))}
          </div>
        )}
      </Division>

      <p className="mt-8 max-w-[62ch] text-[12px] leading-[1.6] text-muted">
        {t('exam.notAVerdict')}
      </p>
    </div>
  );
}

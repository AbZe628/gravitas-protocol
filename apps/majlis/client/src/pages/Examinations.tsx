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
import { Division, Nothing, PageHead, Gaps } from '../components/page.js';
import { ErrorText, Loading } from '../components/ui.js';
import { useIdentity, mayRecordInstitutionAct, mayDeliberate } from '../lib/identity.js';
import { MainAct, Card, Quiet, State } from '../components/kit.js';
import Act from '../components/Act.js';
import AfterAct from '../components/AfterAct.js';
import { Field } from '../components/field.js';
import { Button } from '../components/Button';

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

const field = 'w-full rounded-xl bg-raised shadow-ring p-2.5 text-body leading-relaxed outline-none';
const label = 'mb-1 block text-note text-muted';
const help = 'mb-2 max-w-[62ch] text-note leading-relaxed text-muted';

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
        <span className="text-note text-muted">
          {e.from.slice(0, 10)} — {e.to.slice(0, 10)}
        </span>
      </div>

      {e.matterTitle && (
        <div className="font-display text-sub leading-snug">
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
      <p className="mt-2 text-ui">
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
        <p className="mt-1 max-w-[62ch] text-note leading-relaxed text-muted">
          {t('exam.coverageUnknown')}
        </p>
      )}

      <div className="mt-3">
        <div className="mb-1 text-label font-bold uppercase tracking-caps text-muted">
          {t('exam.howChosen')}
        </div>
        <p className="max-w-[62ch] text-ui leading-relaxed">{e.howChosen}</p>
      </div>

      {e.findings.filter((f) => f.held === 'exceptions').length > 0 && (
        <ul className="mt-3 space-y-2">
          {e.findings
            .filter((f) => f.held === 'exceptions')
            .map((f, i) => (
              <li key={i} className="rounded-xl bg-breachtint px-3.5 py-2.5 shadow-ringbreach">
                {/*
                  What the board wrote, not what the parameter is called.

                  This printed the identifier — `minTangibleRatioBps` — with the
                  exception count jammed against it and nothing saying what the
                  number counted. The board's own sentence for that term is in
                  the record and the server now sends it; the identifier stays
                  underneath, in the mono face, because an auditor tracing a
                  finding back to the parameter needs it and a scholar reading
                  the examination does not.
                */}
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="max-w-[54ch] text-ui font-semibold leading-snug text-breach">
                    {f.inWords ?? f.against.replace(/^term:/, '')}
                  </span>
                  <span className="shrink-0 text-note text-breach">
                    <span className="font-mono tabular-nums">{f.exceptions}</span>{' '}
                    {t('exam.exceptions')}
                  </span>
                </div>
                {f.inWords && (
                  <div className="mt-1 font-mono text-label text-muted opacity-70">
                    {f.against.replace(/^term:/, '')}
                  </div>
                )}
                <p className="mt-1.5 max-w-[62ch] text-ui leading-relaxed text-muted">{f.note}</p>
              </li>
            ))}
        </ul>
      )}

      {e.notExamined.length > 0 && (
        <div className="mt-3 rounded-xl bg-[#F7F0E2] px-3.5 py-2.5 shadow-ringgold">
          <div className="mb-1 text-label font-bold uppercase tracking-caps text-goldink">
            {t('exam.notExamined')} · {e.notExamined.length}
          </div>
          <p className="max-w-[62ch] text-note leading-relaxed text-goldink">
            {t('exam.notExaminedNote')}
          </p>
        </div>
      )}

      {e.againstCurrentTerms === false && (
        <p className="mt-3 max-w-[62ch] text-note leading-relaxed text-muted">
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
  /** Rulings in force were asked for and did not come — not the same as none. */
  const [settledLost, setSettledLost] = useState(false);
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
  /** Whether the window that performs the act is open. */
  const [recording, setRecording] = useState(false);
  const [justDid, setJustDid] = useState<{
    did: string;
    means: string;
    next: readonly { label: string; to?: string; says?: string }[];
  } | null>(null);

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
      .then(() => setSettledLost(false))
      /*
       * Not thrown away. An exception is measured against what the board
       * put in force, and a screen that quietly holds none of those is
       * saying the board ruled on nothing.
       */
      .catch(() => setSettledLost(true));
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
    /*
     * Nothing to record against, and saying so out loud. Returning quietly
     * would leave the window announcing an examination that never happened.
     */
    if (!subject) throw new Error(t('exam.noSubject'));

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
  }

  const rows = [...(subject?.conditions ?? []), ...(subject?.terms ?? [])];

  return (
    <div>
      <PageHead
        phase="checked"
        title={t('exam.title')}
        says={t('exam.lead')}
      />

      {justDid && (
        <div className="mt-5">
          <AfterAct
            did={justDid.did}
            means={justDid.means}
            next={justDid.next}
            onClose={() => setJustDid(null)}
          />
        </div>
      )}

      {mayRecord ? (
        <div className="mt-5">
          {!open ? (
            <MainAct onClick={() => setOpen(true)}>{t('exam.record')}</MainAct>
          ) : (
            <Card>
              {/*
                With nothing settled there is no box, so there is nothing to
                head: the sentence says why on its own rather than heading an
                absent control.
              */}
              {/*
                And a read that failed does not say "nothing is in force".
                The gap is also named at the foot of the page, but the
                sentence a member reads first is this one, where the list
                of rulings would have been.
              */}
              {settledLost ? (
                <>
                  <div className={label}>{t('exam.whichRuling')}</div>
                  <p role="alert" className="mb-3 max-w-[62ch] text-ui leading-relaxed text-sand">
                    {t('gap.settledLost')}
                  </p>
                </>
              ) : settled.length === 0 ? (
                <>
                  <div className={label}>{t('exam.whichRuling')}</div>
                  <p className="mb-3 text-ui text-muted">{t('exam.noSettled')}</p>
                </>
              ) : (
                <Field label={t('exam.whichRuling')} className="mb-4" headingClass={label}>
                  {(attrs) => (
                    <select
                      {...attrs}
                      value={subject?.matterId ?? ''}
                      onChange={(e) => void choose(e.target.value)}
                      className={field}
                    >
                      <option value="">—</option>
                      {settled.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.title}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
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

                  <Field
                    label={t('exam.howChosen')}
                    help={t('exam.howChosenHelp')}
                    className="mb-4"
                    headingClass={label}
                    helpClass={help}
                  >
                    {(attrs) => (
                      <textarea
                        {...attrs}
                        value={howChosen}
                        onChange={(e) => setHowChosen(e.target.value)}
                        rows={3}
                        className={field + ' resize-y'}
                      />
                    )}
                  </Field>

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
                          <p className="mb-2 max-w-[62ch] text-ui leading-snug">{r.requirement}</p>
                          <div className="mb-2 flex flex-wrap gap-2">
                            {(['held', 'exceptions', 'not_examined'] as const).map((h) => (
                              <Button
                                key={h}
                                type="button"
                                onClick={() => setHeld({ ...held, [r.against]: { ...v, held: h } })}
                                className={
                                  'inline-flex min-h-[44px] items-center rounded-xl px-3 py-1.5 text-note transition-all lg:min-h-0 ' +
                                  (v.held === h
                                    ? 'bg-lapistint font-semibold text-lapis shadow-pick'
                                    : 'bg-raised text-sand shadow-ring hover:text-paper')
                                }
                              >
                                {t(`exam.finding.${h}`)}
                              </Button>
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
                              <p className="mt-1 text-note leading-snug text-muted">
                                {t('exam.findingNoteHelp')}
                              </p>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {error && (
                    <p className="mt-4 rounded-xl bg-breachtint px-3.5 py-2.5 text-ui text-breach shadow-ringbreach">
                      {error}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-4">
                    <MainAct
                      onClick={() => setRecording(true)}
                      disabled={!from || !to || !examined}
                    >
                      {t('exam.save')}
                    </MainAct>

                    <Act
                      open={recording}
                      onClose={() => setRecording(false)}
                      title={t('exam.record')}
                      does={t('wm.exam.does')}
                      means={t('wm.exam.means')}
                      label={t('exam.save')}
                      perform={save}
                      onDone={setJustDid}
                      after={{
                        did: t('wm.exam.did'),
                        means: t('wm.exam.didMeans'),
                        next: [
                          { label: t('wm.next.checked'), to: '/check', says: t('wm.next.checkedSays') },
                        ],
                      }}
                    />
                    <Quiet onClick={() => { setOpen(false); setSubject(null); }}>{t('common.back')}</Quiet>
                  </div>
                </>
              )}
            </Card>
          )}
        </div>
      ) : (
        <p className="mt-5 max-w-[62ch] rounded-card bg-raised/60 px-4 py-3 text-ui leading-relaxed text-muted shadow-ring">
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

      <Gaps items={settledLost ? [t('gap.settledLost')] : []} />

      <p className="mt-8 max-w-[62ch] text-note leading-relaxed text-muted">
        {t('exam.notAVerdict')}
      </p>
    </div>
  );
}

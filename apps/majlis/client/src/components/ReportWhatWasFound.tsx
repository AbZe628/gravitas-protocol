import Act from './Act.js';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { oversight, type Examination } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import { Field, HEADING } from './field.js';
import { Button } from './Button';

/**
 * From a review that found something, to the board.
 *
 * ── the step that was missing ─────────────────────────────────────────────
 *
 * A review found three transfers outside the terms and the screen stopped
 * there. The one thing that follows from such a finding — putting it to the
 * board as a reported event, which starts a thirty-day clock the institution
 * is judged on — had no path at all. A member had to notice it, remember it,
 * go elsewhere, and retype what they had just read.
 *
 * ── it fills the report in and then gets out of the way ───────────────────
 *
 * The words are taken from the examination the member already wrote: the
 * rule, the period, how the sample was chosen, and each finding's own note.
 * Nothing is composed here.
 *
 * And it is a **draft in a box they can edit**, not a hidden payload. What is
 * reported to the board carries their name and starts a clock; a control that
 * submitted text they never read would be putting words in their mouth at the
 * worst possible moment.
 *
 * ── it appears only where it applies ──────────────────────────────────────
 *
 * A review where everything held has nothing to report, and offering the
 * control anyway would invite somebody to report a clean quarter.
 */
export default function ReportWhatWasFound({
  e,
  ruleTitle,
  canReport,
}: {
  e: Examination;
  ruleTitle: string;
  canReport: boolean;
}) {
  const { t } = useI18n();
  const navigate = useNavigate();

  const failed = (e.findings ?? []).filter((f) => f.held === 'exceptions');
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [report, setReport] = useState('');

  /** Whether the window that files the breach is open. */
  const [filing, setFiling] = useState(false);

  if (!canReport || failed.length === 0) return null;

  function begin() {
    setTitle(`${ruleTitle} — ${failed.reduce((n, f) => n + f.exceptions, 0)} ${t('found.outsideTerms')}`);
    setReport(
      [
        `${t('found.reviewOf')} ${ruleTitle}`,
        `${t('found.period')} ${e.from.slice(0, 10)} — ${e.to.slice(0, 10)}`,
        `${t('found.lookedAt')} ${e.examined}${e.population === null ? '' : ` / ${e.population}`}`,
        `${t('found.howChosen')} ${e.howChosen}`,
        '',
        ...failed.map((f) => `${f.against}: ${f.exceptions}\n${f.note}`),
      ].join('\n'),
    );
    setOpen(true);
  }

  async function send() {
    const made = await oversight.report({
      boardId: e.boardId,
      // The examination is the reference, so the board can find what this
      // came from without anybody writing a cross-reference by hand.
      reference: e.id,
      title,
      report,
    });
    navigate(`/incidents/${made.id}`);
  }

  if (!open) {
    return (
      <Button
        type="button"
        onClick={begin}
        className="mt-4 rounded-card bg-raised px-5 py-2.5 text-body font-semibold text-breach shadow-ring"
      >
        {t('found.putToBoard')}
      </Button>
    );
  }

  return (
    <div className="mt-4 rounded-card bg-ink px-4 py-4 shadow-ring">
      <p className="mb-3 max-w-[58ch] text-ui leading-relaxed text-muted">{t('found.lead')}</p>

      <Field label={t('found.title')} className="mb-3" headingClass={HEADING}>
        {(attrs) => (
          <input
            {...attrs}
            value={title}
            onChange={(ev) => setTitle(ev.target.value)}
            className="w-full rounded-card bg-raised px-4 py-2.5 text-body text-paper shadow-ring outline-none"
          />
        )}
      </Field>

      <Field label={t('found.what')} headingClass={HEADING}>
        {(attrs) => (
          <textarea
            {...attrs}
            value={report}
            onChange={(ev) => setReport(ev.target.value)}
            rows={8}
            className="w-full rounded-card bg-raised px-4 py-3 font-mono text-ui leading-relaxed text-paper shadow-ring outline-none"
          />
        )}
      </Field>


      <div className="mt-3 flex flex-wrap items-center gap-4">
        <Button
          type="button"
          onClick={() => setFiling(true)}
          disabled={!title.trim() || !report.trim()}
          className="rounded-card bg-breach px-6 py-3 text-body font-bold text-white shadow-act disabled:opacity-50"
        >
          {t('found.report')}
        </Button>

        {/*
          A breach is the gravest thing anyone enters here. It goes on the
          record under the reporter's name, the clock starts against the
          institution, and the whole board sees it — none of which is undone
          by deciding later that it was not a breach after all.
        */}
        {/*
          NO-AFTER: report — shown, not announced.

          The press lands the member on the breach itself: the title they
          wrote, the clock already running, and the acts that follow it. A
          panel saying "it is reported" on top of the report would be a
          sentence between the member and the work.
        */}
        <Act
          open={filing}
          onClose={() => setFiling(false)}
          title={t('found.report')}
          does={t('wm.reportBreach.does')}
          means={t('wm.reportBreach.means')}
          label={t('found.report')}
          grave
          perform={send}
        />
        <Button
          type="button"
          onClick={() => setOpen(false)}
          className="text-ui text-muted underline decoration-line underline-offset-4"
        >
          {t('common.back')}
        </Button>
      </div>

      <p className="mt-3 max-w-[58ch] text-note leading-relaxed text-muted">{t('found.clockStarts')}</p>
    </div>
  );
}

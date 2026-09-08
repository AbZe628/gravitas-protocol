import type { Board, Computation, Examination, Matter } from '../types.js';
import type { Notice } from './notice.js';

/**
 * Telling the bank.
 *
 * ── the half of every task that was missing ───────────────────────────────
 *
 * `notice.ts` composes three notices and all three point inward: a question
 * arrived, a matter was opened, a vote is open. Every one of them tells the
 * *board* that something happened.
 *
 * Nothing told the *institution* anything. Not that a ruling was made, not
 * that a figure was recorded, not that a draft exists, not that a review found
 * exceptions. So every task in this application ran to the point of the
 * board's act and stopped, and the sentence a scholar actually says next —
 * *and then we tell the bank* — had nowhere to happen.
 *
 * That is why the register, the figures, the examinations and the library all
 * came out of the audit as screens where nothing can be done. They are all the
 * same missing half.
 *
 * ── it composes and it does not send ──────────────────────────────────────
 *
 * Exactly like `notice.ts`, and for the same reason. Most installations have
 * no channel; what they get is the words, correct and complete, for a person
 * to send. A screen that showed a *Send* button and quietly did nothing would
 * be the worst thing here, because the board would believe the desk had been
 * told.
 *
 * ── what it may never do ──────────────────────────────────────────────────
 *
 * **It states, it does not interpret.** A notice about an examination says how
 * many were looked at and how many failed. It does not say the bank is
 * non-compliant — that is a determination, it belongs to the board, and it has
 * its own nine-step path.
 *
 * **It carries no reasoning.** A member's reason for a vote is in the record
 * and in the ruling; repeating it in a notice would put a scholar's words in a
 * message nobody showed them.
 */

/** What the bank is being told about. */
export type TellingEvent =
  | { kind: 'ruling'; matter: Matter }
  | { kind: 'refusal'; matter: Matter }
  | { kind: 'draft_ready'; matter: Matter }
  | { kind: 'figure'; computation: Computation }
  | { kind: 'examination'; examination: Examination; ruleTitle: string };

const day = (iso: string) => iso.slice(0, 10);

/**
 * The words, for one event.
 *
 * `concerns` is empty on every one of these: a notice to the institution
 * concerns the institution, and this application holds no addresses for it.
 * Saying so with an empty list is what stops a screen from implying that
 * somebody was reached.
 */
export function tell(board: Board, event: TellingEvent): Notice {
  switch (event.kind) {
    case 'ruling': {
      const m = event.matter;
      return {
        subject: `Decision of ${board.name}: ${m.title}`,
        body:
          `${board.name} has decided a matter that concerns you.\n\n` +
          `${m.title}\n` +
          `${m.direction === 'restrict' ? 'This restricts what may be done.' : 'This permits something that was not permitted.'}\n` +
          (m.inForceAt ? `In force from ${day(m.inForceAt)}.\n` : '') +
          `\nWhat was decided, on what terms, and who voted is in the written ruling. ` +
          `The terms below are the operative part:\n\n` +
          m.proposedRule.parameters
            .map((p) => `  ${p.value}${p.unit ? ' ' + p.unit : ''} — ${p.meaning}`)
            .join('\n') +
          `\n\nWhat this does not decide:\n` +
          m.notDecided.map((n) => `  ${n}`).join('\n'),
        concerns: [],
      };
    }

    case 'refusal': {
      const m = event.matter;
      return {
        subject: `Not approved by ${board.name}: ${m.title}`,
        body:
          `${board.name} considered this and did not approve it.\n\n` +
          `${m.title}\n\n` +
          `A refusal is a decision and it is in the record with the board's reasons. ` +
          `It is not a refusal to answer, and it does not prevent the question being ` +
          `put again on different terms.`,
        concerns: [],
      };
    }

    case 'draft_ready': {
      const m = event.matter;
      return {
        subject: `Draft clauses ready: ${m.title}`,
        body:
          `Clauses have been drafted from the board's ruling on this matter.\n\n` +
          `${m.title}\n\n` +
          `They are assembled from what the board decided — the findings, the terms and ` +
          `the exclusions — and nothing in them was composed. They are a starting point ` +
          `for your own drafting and not an agreement.`,
        concerns: [],
      };
    }

    case 'figure': {
      const c = event.computation;
      return {
        subject: `A figure recorded: ${c.headline}`,
        body:
          `A figure has been recorded for ${day(c.periodFrom)} to ${day(c.periodTo)}.\n\n` +
          `${c.headline}\n` +
          `${c.amount}\n\n` +
          `Method: ${c.methodStated}\n` +
          `Source: ${c.source}\n\n` +
          `Recording it is not doing it. Whether the amount was paid, given away or ` +
          `set aside is something you record, and Majlis does not know it.`,
        concerns: [],
      };
    }

    case 'examination': {
      const e = event.examination;
      const failed = e.findings.filter((f) => f.held === 'exceptions');
      return {
        subject: `A review of ${event.ruleTitle}`,
        body:
          `A review has been carried out against a ruling of ${board.name}.\n\n` +
          `${event.ruleTitle}\n` +
          `Period: ${day(e.from)} to ${day(e.to)}\n` +
          `Looked at: ${e.examined}${e.population === null ? '' : ` of ${e.population}`}\n` +
          `How they were chosen: ${e.howChosen}\n\n` +
          (failed.length === 0
            ? `Nothing was found outside the terms.`
            : failed
                .map((f) => `Against ${f.against}: ${f.exceptions} outside the terms.\n  ${f.note}`)
                .join('\n\n')) +
          /*
           * The loaded word is left out altogether, not merely disclaimed.
           * An earlier wording said "whether it is a non-compliance is a
           * determination of the board" — which is true, and puts the word in
           * a message to the bank anyway, where it will be read as the
           * board's finding.
           */
          `\n\nThis says what was found. Whether anything follows from it is a ` +
          `determination of the board, and it is made separately.`,
        concerns: [],
      };
    }
  }
}

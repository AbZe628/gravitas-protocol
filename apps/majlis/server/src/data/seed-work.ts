import type { Computation, Examination, Submission } from '../types.js';
import type { Undertaking } from '../services/undertaking.js';
import type { Annotation } from '../services/annotation.js';

/**
 * The rest of the demonstration record.
 *
 * ALL CONTENT BELOW IS FABRICATED DEMONSTRATION DATA, exactly as in `seed.ts`.
 * No part of it represents the view, reasoning, vote, figure or finding of any
 * real scholar, board or institution. Nothing here has been reviewed by
 * anybody. Replace the whole record before any production use.
 *
 * ── why this file exists ──────────────────────────────────────────────────
 *
 * Six of the sixteen screens were empty on the demonstration record. Four of
 * them — the queue of questions, the figures, the reviews, and what members
 * undertook — were empty because of a rule written into the stores one comment
 * at a time: *seeding a figure would be putting a number in a board's mouth.*
 *
 * That rule is right for a production installation and wrong here, and the
 * inconsistency was the giveaway: `seed.ts` already fabricates the institution,
 * the board, its members, three matters, three rulings, a sitting, an incident
 * and seven holdings. Refusing to fabricate a submission while fabricating a
 * ruling protected nobody. What it did was make the newest and strongest parts
 * of the application — the way in, the examinations — look like features that
 * had not been built.
 *
 * So the caution moves from *what may be seeded* to *how loudly it is
 * labelled*: every institution, board and member in this record is named
 * "Demonstration" or "Board Member A", and every screen shows the record's
 * start date, so nobody can mistake it for a board's history.
 *
 * ── what is deliberately still empty ──────────────────────────────────────
 *
 * The assistant. It is off unless a key is configured, and seeding a
 * conversation with a model that is not attached would be inventing answers
 * nobody asked for. The screen says it is off, which is true.
 */

const BOARD = 'demo-board';
const INSTITUTION = 'demo-institution';

/**
 * Questions the desk put to the board.
 *
 * Two waiting and one taken up, so the queue shows both halves of its own
 * story. The waiting one is deliberately the oldest: the wait is the number
 * this product is judged on and a queue where nothing has waited teaches a
 * reader nothing.
 */
export const submissions: Submission[] = [
  {
    id: 'submission-2026-07-14',
    boardId: BOARD,
    institutionId: INSTITUTION,
    arrivedAt: '2026-07-14T08:20:00Z',
    recordedAt: '2026-07-16T09:00:00Z',
    askedBy: 'Treasury desk (illustrative)',
    recordedBy: 'member-b',
    onBehalf: true,
    subject: 'Interbank liquidity through a commodity sale',
    question:
      'The desk needs an overnight liquidity instrument. May we place surplus through a ' +
      'commodity purchase and immediate onward sale, where the broker is the same party on ' +
      'both legs and the metal is never moved?',
    background:
      'Correspondent banks offer this as standard. Our concern is that the commodity leg may ' +
      'be a formality rather than a sale, and we would rather be told that now than after we ' +
      'have priced it.',
    awaiting: 'Know whether to price the instrument for the September book.',
    attachments: [],
    dispositions: [],
  },
  {
    id: 'submission-2026-08-02',
    boardId: BOARD,
    institutionId: INSTITUTION,
    arrivedAt: '2026-08-02T11:05:00Z',
    recordedAt: '2026-08-02T11:05:00Z',
    askedBy: 'Retail products (illustrative)',
    recordedBy: 'member-b',
    onBehalf: false,
    subject: 'Charging for a late instalment',
    question:
      'May we charge anything at all when a customer pays an instalment late, and if so does ' +
      'the amount stay with the bank or go to charity?',
    background:
      'Collections have asked for a deterrent. We have not implemented anything and will not ' +
      'until the board has ruled.',
    awaiting: 'A rule we can write into the product terms.',
    attachments: [],
    dispositions: [],
  },
  {
    id: 'submission-2026-07-01',
    boardId: BOARD,
    institutionId: INSTITUTION,
    arrivedAt: '2026-07-01T07:40:00Z',
    recordedAt: '2026-07-01T07:40:00Z',
    askedBy: 'Asset management (illustrative)',
    recordedBy: 'member-b',
    onBehalf: false,
    subject: 'A pool that falls below the ratio without anybody acting',
    question:
      'The ratio can fall through ordinary market movement, with nothing done or omitted by ' +
      'the manager, and be restored within days. Must trading suspend immediately in that ' +
      'case as well?',
    background: 'This has happened twice this year and was restored inside a week both times.',
    awaiting: 'Know whether to build a restoration window into the fund documentation.',
    attachments: [],
    dispositions: [
      {
        kind: 'opened',
        at: '2026-07-03T09:15:00Z',
        by: 'member-a',
        matterId: 'matter-2026-07-03',
        reason: 'Taken up as a matter. The board reads it as a question about drift, not about fault.',
      },
    ],
  },
];

/**
 * Figures somebody worked out, by the board's own method.
 *
 * Each one quotes the method it applied in `methodStated`, which is the field
 * that keeps a calculation from reading as the application's opinion.
 */
export const computations: Computation[] = [
  {
    id: 'computation-2026-06-30-screening',
    kind: 'screening',
    boardId: BOARD,
    assetId: 'asset-mixed-pool',
    periodFrom: '2026-04-01',
    periodTo: '2026-06-30',
    method: 'Ratios against market value, as this board set them.',
    methodStated:
      'Debt and interest-bearing holdings measured against market value, with the limits set ' +
      'by this board in matter-2026-04-02. Majlis applied the method; it did not choose it.',
    currency: 'AED',
    source: 'Pool net asset value breakdown (illustrative) as at 30 June 2026',
    figures: {
      marketValue: 412_000_000,
      debt: 96_400_000,
      interestBearing: 11_200_000,
      tangibleRatioBps: 5000,
    },
    headline: 'Tangible 50.00%, against the 51.00% this board requires',
    amount: '50.00%',
    steps: [
      {
        label: 'Debt against market value',
        working: '96,400,000 ÷ 412,000,000',
        value: '23.40%',
      },
      {
        label: 'Interest-bearing against market value',
        working: '11,200,000 ÷ 412,000,000',
        value: '2.72%',
      },
      {
        label: 'Tangible and usufruct against pool value',
        working: '206,000,000 ÷ 412,000,000',
        value: '50.00%',
      },
    ],
    note:
      'The tangible proportion is below the minimum this board set. That is a finding for the ' +
      'board, not a conclusion drawn here.',
    recordedBy: 'member-b',
    recordedAt: '2026-07-04T10:20:00Z',
    supersedes: null,
    withdrawnAt: null,
    withdrawnBy: null,
    withdrawalReason: null,
  },
  {
    id: 'computation-2026-06-30-purification',
    kind: 'purification',
    boardId: BOARD,
    assetId: 'asset-sukuk-ijara',
    periodFrom: '2026-01-01',
    periodTo: '2026-06-30',
    method: 'Income to be given away, on the proportion this board set.',
    methodStated:
      'The proportion of income to be given away is the one this board recorded. The figure ' +
      'below applies it to the period; the proportion itself was not chosen here.',
    currency: 'AED',
    source: 'Distribution statement (illustrative), half year to 30 June 2026',
    figures: { incomeReceived: 3_480_000, proportionBps: 140 },
    headline: 'AED 48,720 to be given away for the half year',
    amount: 'AED 48,720.00',
    steps: [
      {
        label: 'Income received in the period',
        working: 'Distribution statement, six months',
        value: 'AED 3,480,000.00',
      },
      {
        label: 'Proportion set by the board',
        working: '140 basis points',
        value: '1.40%',
      },
      {
        label: 'To be given away',
        working: '3,480,000 × 0.0140',
        value: 'AED 48,720.00',
      },
    ],
    note:
      'Majlis does not know whether this was given away. Recording that it was is a separate ' +
      'act by the institution.',
    recordedBy: 'member-b',
    recordedAt: '2026-07-08T14:00:00Z',
    supersedes: null,
    withdrawnAt: null,
    withdrawnBy: null,
    withdrawalReason: null,
  },
];

/**
 * What was actually done, checked against what the board approved.
 *
 * One that held and one that did not, because an examination record where
 * everything held reads as a formality and teaches a reader nothing about what
 * the screen is for.
 */
export const examinations: Examination[] = [
  {
    id: 'examination-2026-07-31',
    boardId: BOARD,
    matterId: 'matter-2026-04-02',
    ruleId: 'rule-pool-trading',
    parameterHash: '',
    from: '2026-04-01',
    to: '2026-06-30',
    howChosen:
      'Every secondary transfer in the quarter above AED 1,000,000, and twenty below it chosen ' +
      'at random.',
    population: 412,
    examined: 78,
    examinedBy: 'member-b',
    recordedAt: '2026-07-31T16:30:00Z',
    findings: [
      {
        against: 'minTangibleRatioBps',
        held: 'exceptions',
        exceptions: 3,
        note:
          'Three transfers executed on 12 and 13 June while the ratio stood at 50.4%. The desk ' +
          'reports the pricing feed was two days stale. The transfers were not reversed.',
      },
      {
        against: 'onBreach',
        held: 'held',
        exceptions: 0,
        note:
          'Once the ratio was corrected in the feed, secondary transfers stopped executing ' +
          'without anybody intervening.',
      },
    ],
  },
  {
    id: 'examination-2026-04-30',
    boardId: BOARD,
    matterId: 'matter-2026-04-02',
    ruleId: 'rule-pool-trading',
    parameterHash: '',
    from: '2026-01-01',
    to: '2026-03-31',
    howChosen: 'Every secondary transfer in the quarter.',
    population: 366,
    examined: 366,
    examinedBy: 'member-b',
    recordedAt: '2026-04-30T11:00:00Z',
    findings: [
      {
        against: 'minTangibleRatioBps',
        held: 'held',
        exceptions: 0,
        note: 'The ratio stayed above the minimum throughout the quarter.',
      },
    ],
  },
];

/**
 * What somebody undertook to do at the sitting.
 *
 * One overdue, one with no date the board set, and one closed with an account
 * of what happened — so the screen shows all three states it can be in, and
 * the difference between *overdue* and *nobody set a date* is visible rather
 * than described.
 */
export const undertakings: Undertaking[] = [
  {
    id: 'undertaking-2026-08-20-a',
    boardId: BOARD,
    meetingId: 'meeting-2026-08-20',
    matterId: 'matter-2026-07-03',
    what:
      'Ask the desk for the pricing feed’s update schedule, and whether a stale feed can hold ' +
      'a trade rather than let it through.',
    who: 'member-b',
    dueAt: '2026-09-03T00:00:00Z',
    minutedBy: 'member-b',
    minutedAt: '2026-08-20T14:40:00Z',
    state: 'open',
  },
  {
    id: 'undertaking-2026-08-20-b',
    boardId: BOARD,
    meetingId: 'meeting-2026-08-20',
    what:
      'Put the three June transfers to the board as a reported non-compliance, or say why they ' +
      'are not one.',
    who: 'member-a',
    minutedBy: 'member-b',
    minutedAt: '2026-08-20T14:45:00Z',
    state: 'open',
  },
  {
    id: 'undertaking-2026-08-20-c',
    boardId: BOARD,
    meetingId: 'meeting-2026-08-20',
    what: 'Circulate the contract library so members can say which shapes to take up first.',
    who: 'member-c',
    dueAt: '2026-08-27T00:00:00Z',
    minutedBy: 'member-b',
    minutedAt: '2026-08-20T14:50:00Z',
    state: 'done',
    outcome: {
      said: 'Circulated on 25 August. Three members replied; murabaha and ijara were named by all three.',
      by: 'member-c',
      at: '2026-08-26T09:10:00Z',
    },
  },
];

/**
 * Notes two members left in the margin of the papers.
 *
 * FABRICATED, like everything else in this file. They are here because a
 * margin with nothing in it demonstrates nothing: a board portal's annotations
 * are only legible once you can see one member marking a line, another
 * answering, and the mark sitting exactly where the words are.
 *
 * Both are on the proposal of `matter-2026-08-11`, which is the matter in
 * voting — the one somebody showing this will already have open.
 */
export const annotations: Annotation[] = [
  {
    id: 'note-2026-08-12-a',
    boardId: BOARD,
    on: 'proposal',
    subjectId: 'matter-2026-08-11',
    quote: 'borrowing inside the index',
    at: 0,
    said:
      'Inside the index, or inside the fund holding it? A fund that borrows at its own level ' +
      'reaches the same exposure and this wording does not touch it.',
    by: 'member-b',
    atTime: '2026-08-12T09:20:00Z',
  },
  {
    id: 'note-2026-08-12-b',
    boardId: BOARD,
    on: 'proposal',
    subjectId: 'matter-2026-08-11',
    quote: 'borrowing inside the index',
    at: 0,
    said:
      'Inside the index only. Borrowing at fund level is named in what is not being decided, ' +
      'and it is a separate question.',
    by: 'member-a',
    atTime: '2026-08-12T11:05:00Z',
    replyTo: 'note-2026-08-12-a',
  },
];

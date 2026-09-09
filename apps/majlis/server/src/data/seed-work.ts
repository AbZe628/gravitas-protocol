import type { AdoptedStructure, Computation, Examination, Submission } from '../types.js';
import { structureById } from './structures.js';
import type { Undertaking } from '../services/undertaking.js';
import type { Annotation } from '../services/annotation.js';
import type { Committee, Referral } from '../services/committee.js';

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
    /*
     * The commonest question a bank asks, with the contract attached, which is
     * the case the whole reader exists for and which the record could not show
     * until a submission could carry one.
     *
     * Fabricated, like everything else in this file, and deliberately partial:
     * it answers some of the murabaha conditions and is silent on others, so a
     * scholar opening it sees a real reading rather than a clean sheet.
     */
    draft: {
      name: 'Commodity murabaha master agreement (illustrative draft).txt',
      readAt: '2026-07-14T08:20:00Z',
      text: [
        'COMMODITY MURABAHA MASTER AGREEMENT (ILLUSTRATIVE DRAFT)',
        '',
        '1. Purchase. The Seller shall purchase the Commodity from the Supplier and shall take',
        'ownership of the Commodity before any onward sale to the Buyer is concluded. Title to',
        'the Commodity shall pass to the Seller upon the Supplier issuing the purchase',
        'confirmation.',
        '',
        '2. Risk. The Seller bears the risk of loss of or damage to the Commodity from the moment',
        'ownership passes to it until ownership passes to the Buyer.',
        '',
        '3. Sale to the Buyer. The Seller shall sell the Commodity to the Buyer at a price equal',
        'to the cost of the Commodity plus a disclosed profit. The cost and the profit shall each',
        'be stated to the Buyer in writing before the sale is concluded.',
        '',
        '4. Deferred payment. The Buyer shall pay the sale price on the maturity date. The sale',
        'price, once concluded, shall not increase for any reason including late payment.',
        '',
        '5. Delivery. The Commodity shall be delivered by transfer of warrants. The parties',
        'acknowledge that the Commodity is not physically moved.',
        '',
        '6. Broker. The Supplier and the onward purchaser may be the same party where market',
        'conditions require it.',
        '',
        '7. Governing law. This agreement is governed by the laws of the jurisdiction of the',
        'Buyer, without prejudice to the rulings of the Board.',
      ].join('\n'),
    },
    dispositions: [],
  },
  /*
   * One the board declined, because the queue showed only one outcome.
   *
   * Of the four standings a question can reach, the record reached two:
   * waiting and opened. So a reader learned that the board takes questions up
   * and never learned that it may not, or what a decline looks like — and a
   * decline is the harder half. The refusal carries a reason, compulsorily,
   * because a decline the desk cannot learn anything from is the board
   * refusing to answer and refusing to say why.
   *
   * Deliberately a question the board is right to decline: it asks for a
   * commercial judgement dressed as a Shariah one.
   */
  {
    id: 'submission-2026-08-19',
    boardId: BOARD,
    institutionId: INSTITUTION,
    arrivedAt: '2026-08-19T15:30:00Z',
    recordedAt: '2026-08-19T15:30:00Z',
    askedBy: 'Treasury desk (illustrative)',
    recordedBy: 'member-b',
    onBehalf: false,
    subject: 'Which of two compliant funding structures we should use',
    question:
      'Both the commodity murabaha and the wakala route have been approved by this board. The wakala ' +
      'is cheaper for us. Will the board confirm that we should use the wakala?',
    background:
      'Treasury would like the board on record so the choice is not questioned internally later.',
    awaiting: 'Sign off the funding plan for the fourth quarter.',
    attachments: [],
    draft: null,
    dispositions: [
      {
        kind: 'declined',
        at: '2026-08-21T09:50:00Z',
        by: 'member-a',
        reason:
          'Both are permitted and the board has said so. Which of two permitted structures the ' +
          'institution uses is a commercial decision and is not the board’s to make; taking it would ' +
          'put the board’s name on a pricing choice. If the question is whether the wakala remains ' +
          'permitted on its current terms, ask that and it will be answered.',
      },
    ],
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
    draft: null,
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
    draft: null,
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
  {
    /*
     * Put in by the desk itself, which is what makes it different from the
     * three above. `onBehalf` is false and `recordedBy` is the desk's own
     * credential, so this is the one that appears on the institution's screen.
     */
    id: 'submission-2026-08-25',
    boardId: BOARD,
    institutionId: INSTITUTION,
    arrivedAt: '2026-08-25T11:05:00Z',
    recordedAt: '2026-08-25T11:05:00Z',
    askedBy: 'Treasury desk (illustrative)',
    recordedBy: 'desk-treasury',
    onBehalf: false,
    subject: 'A profit rate benchmarked to an interest rate',
    question:
      'Our funding cost is quoted against a conventional benchmark and the counterparty ' +
      'prices from it. May the profit rate on a murabaha reference that benchmark as a ' +
      'number, where the contract itself contains no interest?',
    background:
      'Every quote we receive is expressed this way. We can restate it as a fixed figure at ' +
      'signing, but the figure would still have been arrived at from the benchmark.',
    awaiting: 'Know whether to renegotiate the pricing basis before the facility renews.',
    attachments: [],
    draft: null,
    dispositions: [],
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
    /*
     * Under the names the screening form asks for them.
     *
     * They were `marketValue`, `debt` and `interestBearing`, and the form
     * calls the same three figures `marketCapitalisation`,
     * `interestBearingDebt` and `cashAndInterestBearingSecurities`. The record
     * and the screen disagreed about the names of the same numbers, so a board
     * taking last quarter's figures across got the currency and the source and
     * none of the money.
     */
    figures: {
      marketCapitalisation: 412_000_000,
      interestBearingDebt: 96_400_000,
      cashAndInterestBearingSecurities: 11_200_000,
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

  /*
   * Four of the six kinds had never been recorded.
   *
   * Measured across the record: screening and purification were there, and
   * zakat, tangibility, late payment and profit distribution were not. Two
   * things followed. *Recorded* — a tab of its own — listed two rows and read
   * as a feature nobody uses. And "take the figures from a previous one",
   * which is how a board avoids retyping a quarterly return, had nothing to
   * offer on four of the six screens that carry it.
   *
   * Each below is a real shape for its kind: the figures the form asks for,
   * under the names the form asks for them, so the next one can read them back.
   */
  {
    id: 'computation-2026-06-30-tangibility',
    kind: 'tangibility',
    boardId: BOARD,
    assetId: 'asset-mixed-pool',
    periodFrom: '2026-06-30',
    periodTo: '2026-06-30',
    method: 'bands',
    methodStated:
      'Tangible assets and usufructs counted together, against the bands this board set in ' +
      'matter-2026-04-02.',
    currency: '—',
    source: 'Pool net asset value breakdown (illustrative) as at 30 June 2026',
    figures: {
      countsAsTangible: 'tangible',
      tangible: '50.00%',
      receivable: '33.00%',
      cash: '17.00%',
    },
    headline: 'Counted on the tangible side',
    amount: '50.00%',
    steps: [
      { label: 'Leased equipment', working: '3100 bps', value: '31.00%' },
      { label: 'Leased property', working: '1900 bps', value: '19.00%' },
      { label: 'Counted as tangible', working: '3100 + 1900', value: '50.00%' },
    ],
    note:
      'Below the 51.00% this board requires. Whether the pool may still be traded is a ruling, ' +
      'and this figure is not one.',
    recordedBy: 'member-b',
    recordedAt: '2026-07-08T14:20:00Z',
    supersedes: null,
    withdrawnAt: null,
    withdrawnBy: null,
    withdrawalReason: null,
  },
  {
    id: 'computation-2026-06-30-zakat',
    kind: 'zakat',
    boardId: BOARD,
    assetId: null,
    periodFrom: '2025-07-01',
    periodTo: '2026-06-30',
    method: 'net_assets',
    methodStated:
      'Net assets, on the lunar year, borne by the institution. The board chose the base and ' +
      'the year; Majlis did the arithmetic.',
    currency: 'AED',
    source: 'Audited statement of financial position as at 30 June 2026 (illustrative)',
    figures: {
      cash: 84_200_000,
      receivables: 31_500_000,
      inventory: 4_800_000,
      shortTermLiabilities: 27_400_000,
      rate: '2.5775%',
    },
    headline: 'Zakat due on the net assets base',
    amount: 'AED 2,401,431.75',
    steps: [
      { label: 'Zakatable assets', working: '84,200,000 + 31,500,000 + 4,800,000', value: 'AED 120,500,000' },
      { label: 'Less short-term liabilities', working: '120,500,000 − 27,400,000', value: 'AED 93,100,000' },
      { label: 'At the lunar rate', working: '93,100,000 × 0.025775', value: 'AED 2,399,652.50' },
    ],
    note:
      'Whether the institution or the shareholders bear it is the board’s ruling, not a figure. ' +
      'This was computed as borne by the institution because that is what the board said.',
    recordedBy: 'member-b',
    recordedAt: '2026-07-14T10:00:00Z',
    supersedes: null,
    withdrawnAt: null,
    withdrawnBy: null,
    withdrawalReason: null,
  },
  {
    id: 'computation-2026-06-30-late-payment',
    kind: 'late_payment',
    boardId: BOARD,
    assetId: null,
    periodFrom: '2026-04-01',
    periodTo: '2026-06-30',
    method: 'actual_cost',
    methodStated:
      'The institution’s own cost of collection, evidenced. Anything above it is given away and ' +
      'not kept, as this board ruled.',
    currency: 'AED',
    source: 'Collections cost schedule for the quarter (illustrative)',
    figures: {
      charged: 214_800,
      actualCost: 61_200,
      invoices: 38,
    },
    headline: 'To be given away, not kept',
    amount: 'AED 153,600.00',
    steps: [
      { label: 'Charged on late settlement', working: '38 invoices', value: 'AED 214,800.00' },
      { label: 'Evidenced cost of collection', working: 'schedule attached', value: 'AED 61,200.00' },
      { label: 'Above the cost', working: '214,800 − 61,200', value: 'AED 153,600.00' },
    ],
    note:
      'This is the figure behind SNC-2026-005. Majlis computed it; where it goes is the board’s ' +
      'direction and is recorded on the breach.',
    recordedBy: 'member-b',
    recordedAt: '2026-09-08T09:30:00Z',
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

/**
 * One committee, and one matter it was asked to look at.
 *
 * FABRICATED. It exists so the referral panel demonstrates the thing that
 * matters about it: the committee reported, it was *not* of one mind, and the
 * matter is exactly where it was. A seeded committee that agreed unanimously
 * would show the feature and hide the point.
 *
 * Majlis ships no committee names and no standing committees. This one is
 * named the way a board would name its own, in the demonstration record only.
 */
export const committees: Committee[] = [
  {
    id: 'committee-contracts',
    boardId: BOARD,
    name: 'The contracts committee',
    remit:
      'Read a contract shape before it comes to the board, and say what is unclear in it. ' +
      'The committee does not rule; the board does.',
    members: ['member-a', 'member-b', 'member-c'],
    convenor: 'member-a',
    formedIn: 'matter-2026-04-02',
    formedAt: '2026-04-09T00:00:00Z',
  },
];

export const referrals: Referral[] = [
  {
    id: 'referral-2026-08-12',
    boardId: BOARD,
    committeeId: 'committee-contracts',
    matterId: 'matter-2026-08-11',
    asking:
      'Whether the wording reaches a fund that borrows at its own level rather than inside the index.',
    referredBy: 'member-d',
    referredAt: '2026-08-12T10:00:00Z',
    report: {
      found:
        'The wording reaches borrowing inside the index only. A fund that borrows at its own ' +
        'level is outside it. The committee reads that as deliberate, since the matter already ' +
        'names fund-level borrowing among what is not being decided.',
      by: 'member-a',
      at: '2026-08-18T15:30:00Z',
      standing: [
        { scholarId: 'member-a', agrees: true, at: '2026-08-18T15:30:00Z' },
        { scholarId: 'member-b', agrees: true, at: '2026-08-18T15:35:00Z' },
        {
          scholarId: 'member-c',
          agrees: false,
          said:
            'A fund borrowing at its own level reaches the same exposure by another route. ' +
            'Leaving it outside means the restriction can be stepped around the week it takes effect.',
          at: '2026-08-18T16:10:00Z',
        },
      ],
    },
  },
];

/**
 * The shapes this board has actually taken up.
 *
 * ── why this was empty, and what it cost ──────────────────────────────────
 *
 * There were no adoptions in the record at all. Nineteen shapes ship as a
 * draft binding on nobody, and with nothing adopted every one of them read the
 * same — *this board has not said what these rest on* — nineteen times down
 * one page, beside a figure saying "19 never looked at". A reader learned that
 * the library was empty, which is true of the demonstration and reads as true
 * of the product.
 *
 * It also made three things unreachable. A reading against **the board's own**
 * conditions could never happen, so the sentence distinguishing it from a
 * reading against the shipped draft was never shown. `AdoptedStructure.basis`
 * — the one place in this whole application where a standard may be named,
 * because it is the board's own words about its own adoption — had no example.
 * And a matter's checklist had no adopted shape to check against.
 *
 * Both are tied to a matter that carried and is in force, because nothing
 * becomes binding by administration: an adoption names the decision it came
 * from, or it is a button that changed the rules.
 */
export const adoptions: AdoptedStructure[] = [
  {
    id: 'adoption-murabaha-2026-04',
    boardId: 'demo-board',
    structureId: 'murabaha',
    standing: 'adopted',
    /* As shipped. The board read them and took them unchanged. */
    conditions: structureById('murabaha')?.conditions ?? [],
    amendments: [],
    basis:
      'AAOIFI Shariah Standard No. 8 as this board reads it, with the two additions minuted on 2 April 2026.',
    matterId: 'matter-2026-04-02',
    decidedBy: 'member-a',
    decidedAt: '2026-04-02T15:00:00Z',
    supersedes: null,
  },
  {
    id: 'adoption-ijara-mbt-2026-04',
    boardId: 'demo-board',
    structureId: 'ijara-mbt',
    standing: 'amended',
    conditions: structureById('ijara-mbt')?.conditions ?? [],
    /*
     * What this board changed, in its own words. This is the part a later
     * reader is looking for, and the shipped draft is silent on both.
     */
    amendments: [
      'The transfer at the end is by gift, not by sale at a nominal price. A sale at a price nobody negotiated is the transfer dressed as a contract.',
      'Where the asset is destroyed and the lessee was not at fault, rent stops on the day of destruction and is not apportioned to the end of the term.',
    ],
    basis: 'Our own view, minuted 2 April 2026. No external standard is adopted for this shape.',
    matterId: 'matter-2026-04-02',
    decidedBy: 'member-a',
    decidedAt: '2026-04-02T15:20:00Z',
    supersedes: null,
  },
];

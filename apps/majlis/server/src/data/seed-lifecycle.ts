import type { Matter } from '../types.js';
import { hashParameters } from '../services/hash.js';

/**
 * Two matters that let the whole lifecycle be shown.
 *
 * ALL CONTENT BELOW IS FABRICATED DEMONSTRATION DATA, as in `seed.ts`.
 *
 * ── the gap this closes ───────────────────────────────────────────────────
 *
 * The demonstration record held three matters: one in deliberation, one
 * lapsed, one in force. **Nothing was ever in `voting` or in `timelock`**, so
 * the two screens the whole product is about could not be reached at all:
 * the vote, and the window in which one signatory can halt a permitting change
 * before it takes effect.
 *
 * Somebody demonstrating this had to open a vote themselves, in front of the
 * room, to show that voting existed — and could not show the objection window
 * without waiting forty-eight hours.
 *
 * ── what each one is for ──────────────────────────────────────────────────
 *
 * **The vote.** Restricting, so the lower threshold applies and the tally
 * reads plainly. Two positions are recorded and three members have not voted,
 * so a member signing in has something to do on the arrival screen — which is
 * what that screen is for, and what it could not say before.
 *
 * **The waiting period.** Permitting, threshold met, and the window still
 * open. It shows the asymmetry the board actually relies on: permitting is
 * slow and can be halted by one signatory; restricting is immediate.
 *
 * Both dates are stated relative to nothing — they are fixed, so the record
 * reads the same to everybody, and a reader who compares them to today will
 * find the waiting period long expired. That is deliberate: it puts the matter
 * on the arrival screen as ready to be brought into force, which is a step
 * somebody can actually take during a demonstration.
 */

const votingParams = [
  {
    key: 'maxProviderBorrowingBps',
    value: '3000',
    unit: 'basis points',
    meaning:
      'Borrowing inside an index may not exceed 30.00% of the index’s market value, measured ' +
      'at each rebalancing.',
    watches: { kind: 'debt' as const, bound: 'maximum' as const },
  },
  {
    key: 'onBreach',
    value: 'suspend_new_positions',
    meaning:
      'While the proportion is above the limit, no new position is taken. Existing positions ' +
      'are held pending a decision of the board rather than sold automatically.',
  },
];

const timelockParams = [
  {
    key: 'graceDaysBeforeReclassification',
    value: '30',
    unit: 'days',
    meaning:
      'Where a pool falls below the tangible minimum through market movement alone, the ' +
      'manager has thirty days to restore it before the pool is reclassified.',
  },
];

export const lifecycleMatters: Matter[] = [
  {
    id: 'matter-2026-08-11',
    boardId: 'demo-board',
    title: 'Suspension of leveraged index instruments',
    origin: 'institution_request',
    direction: 'restrict',
    status: 'voting',
    openedAt: '2026-08-11T09:00:00Z',
    arrivedAt: '2026-08-04T15:30:00Z',
    proposal:
      'That the desk take no new position in an index instrument whose exposure is obtained ' +
      'through borrowing inside the index, where that borrowing exceeds the limit below.',
    notDecided: [
      'Whether existing positions must be sold. They are held pending a decision of the board.',
      'Whether the same treatment applies to a fund that borrows at the fund level rather than inside the index. That is a separate question.',
    ],
    mechanism:
      'At each rebalancing the borrowing inside the index is measured against the index’s ' +
      'market value. Above the limit, no new position is taken.',
    interactsWith: ['rule-pool-trading'],
    assetIds: ['asset-leveraged-index'],
    /*
     * The shape it is judged against.
     *
     * Without one the contract reading has no conditions to read against and
     * refuses — which is right, and meant the reading refused on every matter
     * in the demonstration record, so it could not be shown at all.
     */
    structureId: 'murabaha',
    proposedRule: {
      id: 'rule-leveraged-index',
      boardId: 'demo-board',
      title: 'Leveraged index instruments',
      statement:
        'No new position is taken in an index instrument whose internal borrowing exceeds the ' +
        'proportion this board has set.',
      parameters: votingParams,
      parameterHash: hashParameters(votingParams),
      version: 1,
      inForceFrom: null,
      supersededBy: null,
      supersedes: null,
      sources: [],
    },
    simulation: null,
    deliberation: [
      {
        id: 'del-2026-08-11-a',
        scholarId: 'member-a',
        body:
          'The borrowing is the provider’s and not ours, but the exposure it buys is ours. I do ' +
          'not think the distinction survives.',
        at: '2026-08-11T10:15:00Z',
        replyTo: null,
        liaisonAnswer: false,
      },
      {
        id: 'del-2026-08-11-b',
        scholarId: 'member-b',
        body:
          'Agreed on the principle. My concern is the measurement: at each rebalancing means we ' +
          'are reading a figure the provider publishes, and we should say what happens when they ' +
          'do not publish it.',
        at: '2026-08-11T11:40:00Z',
        replyTo: 'del-2026-08-11-a',
        liaisonAnswer: false,
      },
      {
        id: 'del-2026-08-11-c',
        scholarId: 'liaison-1',
        body:
          'On the mechanism: the provider publishes at each rebalancing and not between. Where ' +
          'the figure is missing the desk has nothing to read, so the rule would need to say ' +
          'whether that counts as above the limit or as unknown.',
        at: '2026-08-11T14:05:00Z',
        replyTo: 'del-2026-08-11-b',
        liaisonAnswer: true,
      },
    ],
    reasoning: [
      {
        scholarId: 'member-a',
        position: 'for',
        reason:
          'The exposure obtained is the exposure held. Where it is obtained by borrowing, the ' +
          'holder has taken on what the borrowing bought.',
        at: '2026-08-12T09:00:00Z',
        onParameterHash: hashParameters(votingParams),
      },
      {
        scholarId: 'member-b',
        position: 'for',
        reason:
          'For, on the understanding that a missing figure is treated as above the limit rather ' +
          'than as unknown. I would want that written into the terms before it is closed.',
        at: '2026-08-12T10:30:00Z',
        onParameterHash: hashParameters(votingParams),
      },
    ],
    timelockStartedAt: null,
    timelockEndsAt: null,
    objections: [],
    inForceAt: null,
    sources: [
      {
        kind: 'external',
        label: 'Index methodology (illustrative), section 4: internal leverage',
        ref: 'p. 17',
        addedBy: 'liaison-1',
        at: '2026-08-11T14:10:00Z',
      },
    ],
  },

  {
    id: 'matter-2026-07-28',
    boardId: 'demo-board',
    title: 'A restoration window before a pool is reclassified',
    origin: 'periodic_review',
    direction: 'permit',
    status: 'timelock',
    openedAt: '2026-07-28T09:00:00Z',
    settledAt: '2026-08-05T16:00:00Z',
    proposal:
      'That a manager be given a defined period to restore the tangible ratio before a pool is ' +
      'reclassified, where the ratio fell through market movement and not through any act or ' +
      'omission of the manager.',
    notDecided: [
      'Whether trading may resume during the window. It may not; suspension is immediate and unchanged.',
      'Whether a second window may follow a first within the same year. That is left open and will be put separately.',
    ],
    mechanism:
      'Trading suspends the moment the ratio falls, as now. The window governs reclassification ' +
      'only, and expires without further notice.',
    interactsWith: ['rule-pool-trading'],
    assetIds: ['asset-mixed-pool'],
    proposedRule: {
      id: 'rule-restoration-window',
      boardId: 'demo-board',
      title: 'Restoration window',
      statement:
        'A pool that falls below the tangible minimum through market movement alone is ' +
        'reclassified only after the window this board has set has passed.',
      parameters: timelockParams,
      parameterHash: hashParameters(timelockParams),
      version: 1,
      inForceFrom: null,
      supersededBy: null,
      supersedes: null,
      sources: [],
    },
    simulation: null,
    deliberation: [
      {
        id: 'del-2026-07-28-a',
        scholarId: 'member-c',
        body:
          'A window without a limit on how often it may be used becomes the ordinary state. I am ' +
          'content with thirty days on the understanding that the second question is put.',
        at: '2026-07-29T08:20:00Z',
        replyTo: null,
        liaisonAnswer: false,
      },
    ],
    reasoning: [
      {
        scholarId: 'member-a',
        position: 'for',
        reason: 'Suspension stays immediate. What the window changes is only reclassification.',
        at: '2026-08-05T15:00:00Z',
        onParameterHash: hashParameters(timelockParams),
      },
      {
        scholarId: 'member-b',
        position: 'for',
        reason: 'For, and I would want the second question put at the next sitting.',
        at: '2026-08-05T15:20:00Z',
        onParameterHash: hashParameters(timelockParams),
      },
      {
        scholarId: 'member-c',
        position: 'for',
        reason: 'For, on the record that this is not a licence to operate at the boundary.',
        at: '2026-08-05T15:40:00Z',
        onParameterHash: hashParameters(timelockParams),
      },
      {
        scholarId: 'member-d',
        position: 'for',
        reason: 'For. The distinction between drift and an act of the manager is the right one.',
        at: '2026-08-05T15:55:00Z',
        onParameterHash: hashParameters(timelockParams),
      },
      {
        scholarId: 'member-e',
        position: 'abstain',
        reason:
          'I abstain. I am not persuaded thirty days is the right length and I would rather say ' +
          'so than vote for a number I have not tested.',
        at: '2026-08-05T16:00:00Z',
        onParameterHash: hashParameters(timelockParams),
      },
    ],
    timelockStartedAt: '2026-08-05T16:00:00Z',
    timelockEndsAt: '2026-08-07T16:00:00Z',
    objections: [],
    inForceAt: null,
    sources: [],
  },
];

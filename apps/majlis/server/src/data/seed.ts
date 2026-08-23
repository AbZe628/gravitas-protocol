import type { Board, Matter, Briefing, Rule } from '../types.js';
import { hashParameters } from '../services/hash.js';

/**
 * Seed record for Stage One.
 *
 * ALL CONTENT BELOW IS FABRICATED DEMONSTRATION DATA.
 *
 * No part of it represents the view, reasoning, vote or statement of any real
 * scholar, board or institution. The board members are deliberately unnamed
 * placeholders. Nothing here has been reviewed or approved by anyone.
 *
 * It exists so that a scholar opening the application sees the shape of the
 * thing rather than an empty shell, and so that every screen can be exercised
 * in tests. Replace it entirely with a real board's record before any
 * production use.
 *
 * Do not attribute any reasoning in this file to a named person. That
 * constraint is the reason the placeholders are unnamed.
 */

export const boards: Board[] = [
  {
    id: 'demo-board',
    name: 'Demonstration Board (illustrative data only)',
    quorumPermit: 3,
    quorumRestrict: 2,
    totalSignatories: 5,
    ratificationWindowHours: 168,
    members: [
      {
        id: 'member-a',
        name: 'Board Member A',
        title: 'Shariah Board Member (placeholder)',
        board: 'demo-board',
        signatory: true,
      },
      {
        id: 'member-b',
        name: 'Board Member B',
        title: 'Shariah Auditor (placeholder)',
        board: 'demo-board',
        signatory: true,
      },
    ],
  },
];

function rule(
  id: string,
  boardId: string,
  title: string,
  statement: string,
  params: Rule['parameters'],
  version: number,
  inForceFrom: string | null,
  sources: Rule['sources'],
): Rule {
  return {
    id,
    boardId,
    title,
    statement,
    parameters: params,
    parameterHash: hashParameters(params),
    version,
    inForceFrom,
    supersededBy: null,
    supersedes: null,
    sources,
  };
}

export const rules: Rule[] = [
  rule(
    'rule-tangible-ratio',
    'demo-board',
    'Tangible asset ratio for secondary trading of mixed pools',
    'Where a tokenised pool combines asset categories, tokens may be traded in the secondary market at ' +
      'market price only while tangible assets and usufructs constitute the majority of the value of the pool.',
    [
      {
        key: 'minTangibleRatioBps',
        value: '5100',
        unit: 'basis points',
        meaning: 'Tangible assets and usufructs must be at least 51.00% of pool value.',
      },
      {
        key: 'measurementSource',
        value: 'pool.navBreakdown',
        meaning: 'The ratio is read from the pool net asset value breakdown at the time of the transaction.',
      },
      {
        key: 'onBreach',
        value: 'block_secondary_market_trades',
        meaning:
          'While the ratio is below the threshold, secondary market transfers at market price do not execute. ' +
          'Redemption at net asset value is unaffected.',
      },
    ],
    3,
    '2026-04-02T00:00:00Z',
    [
      { kind: 'code', label: 'PolicyRegistry.checkRatio', ref: 'contracts/GravitasPolicyRegistry.sol' },
      { kind: 'test', label: 'ratio boundary at exactly 5100 bps', ref: 'test/PolicyRegistry.ratio.t.sol' },
      {
        kind: 'document',
        label: 'Illustrative tradability principles (fabricated demonstration source)',
        ref: 'docs/references/mixed-portfolio.md',
      },
    ],
  ),
  rule(
    'rule-stablecoin-par',
    'demo-board',
    'Exchange of cash-backed tokens at par',
    'A token representing nothing beyond monetary value may be exchanged against the currency it ' +
      'represents only at par. It may not be dealt in as an instrument of trading gain in its own right.',
    [
      {
        key: 'toleranceBps',
        value: '0',
        unit: 'basis points',
        meaning: 'No deviation from par is permitted on either side.',
      },
      {
        key: 'appliesTo',
        value: 'assetClass:cash_backed_token',
        meaning: 'Applies to tokens classified by the board as backed solely by monetary assets.',
      },
      {
        key: 'onBreach',
        value: 'revert',
        meaning: 'A transaction attempting exchange at any rate other than par does not execute.',
      },
    ],
    1,
    '2026-02-18T00:00:00Z',
    [
      { kind: 'code', label: 'PolicyRegistry.parCheck', ref: 'contracts/GravitasPolicyRegistry.sol' },
      { kind: 'test', label: 'par exchange rejects premium and discount', ref: 'test/PolicyRegistry.par.t.sol' },
    ],
  ),
  rule(
    'rule-wakil-mandate',
    'demo-board',
    'Deployment boundary for an investment agent',
    'An agent appointed under Wakalah bil Istithmar may deploy pooled funds only into the asset ' +
      'categories the board has approved for that mandate.',
    [
      {
        key: 'permittedCategories',
        value: 'leased_property,leased_equipment,diminishing_musharakah,trade_finance,compliant_reits',
        meaning: 'The complete set of categories into which the agent may deploy.',
      },
      {
        key: 'onOutOfMandate',
        value: 'revert',
        meaning: 'A deployment into any category outside the set does not execute.',
      },
    ],
    2,
    '2026-05-11T00:00:00Z',
    [
      { kind: 'code', label: 'PolicyRegistry.mandateCheck', ref: 'contracts/GravitasPolicyRegistry.sol' },
      { kind: 'test', label: 'out-of-mandate deployment reverts', ref: 'test/PolicyRegistry.mandate.t.sol' },
    ],
  ),
];

const proposedRatioRule = rule(
  'rule-tangible-ratio-v4',
  'demo-board',
  'Tangible asset ratio — treatment of temporary breach',
  'Where the tangible asset ratio falls below the threshold through ordinary market movement rather ' +
    'than through an act of the manager, secondary market trading is suspended immediately, and the ' +
    'manager is allowed a defined period to restore the ratio before the pool is reclassified.',
  [
    {
      key: 'minTangibleRatioBps',
      value: '5100',
      unit: 'basis points',
      meaning: 'Unchanged from the rule currently in force.',
    },
    {
      key: 'graceHours',
      value: '720',
      unit: 'hours',
      meaning:
        'Thirty days during which the manager may restore the ratio. Trading remains suspended throughout; ' +
        'the grace period governs reclassification, not permission to trade.',
    },
    {
      key: 'onGraceExpiry',
      value: 'reclassify_pool',
      meaning:
        'If the ratio is not restored within the period, the pool is reclassified and the tokens cease to ' +
        'be treated as tradable at market price until the board rules again.',
    },
  ],
  4,
  null,
  [
    { kind: 'code', label: 'PolicyRegistry.checkRatio (proposed)', ref: 'contracts/GravitasPolicyRegistry.sol#L214' },
    { kind: 'test', label: 'grace period expiry reclassifies', ref: 'test/PolicyRegistry.grace.t.sol' },
  ],
);

export const matters: Matter[] = [
  {
    id: 'matter-2026-07-03',
    boardId: 'demo-board',
    title: 'Treatment of a tangible asset ratio breached by drift rather than by act',
    origin: 'compliance_concern',
    direction: 'permit',
    status: 'deliberation',
    openedAt: '2026-07-21T09:00:00Z',
    proposal:
      'The rule presently in force suspends secondary market trading the moment the tangible asset ratio ' +
      'falls below the threshold, and provides nothing further. In practice a pool may cross the threshold ' +
      'through ordinary market movement, with no act or omission by the manager, and be restored within days. ' +
      'The proposal is to keep the suspension immediate but to give the manager a defined period to restore ' +
      'the ratio before the pool is reclassified.',
    notDecided: [
      'Whether the 51% threshold itself is correct. That is not reopened here.',
      'Whether redemption at net asset value may continue during suspension. It may; that is already settled.',
      'Whether a breach caused by an act of the manager attracts the same treatment. It does not, and is dealt with separately.',
    ],
    mechanism:
      'The ratio is read at each transaction that depends on it. When it falls below the threshold, ' +
      'transactions requiring the tradability condition cease to execute immediately. Under the proposal a ' +
      'timer begins at that moment. If the ratio is restored before the timer expires, trading resumes with ' +
      'no further act by the board. If it is not, the pool is reclassified and cannot be traded at market ' +
      'price until the board rules again.',
    interactsWith: ['rule-tangible-ratio'],
    proposedRule: proposedRatioRule,
    simulation: {
      windowFrom: '2026-04-01T00:00:00Z',
      windowTo: '2026-06-30T23:59:59Z',
      transactionsExamined: 18422,
      transactionsAffected: 47,
      affectedSample: [
        {
          hash: '0x9f2c…4ab1',
          at: '2026-05-14T11:22:31Z',
          asset: 'Mixed pool — leased equipment and trade finance',
          valueUsd: 12400,
          reason: 'Tangible ratio at 5043 bps, below the 5100 bps threshold.',
        },
        {
          hash: '0x71de…08cc',
          at: '2026-05-14T13:05:02Z',
          asset: 'Mixed pool — leased equipment and trade finance',
          valueUsd: 3100,
          reason: 'Tangible ratio at 5039 bps, below the 5100 bps threshold.',
        },
        {
          hash: '0x22b8…9f30',
          at: '2026-06-02T08:47:55Z',
          asset: 'Mixed pool — leased property',
          valueUsd: 88250,
          reason: 'Tangible ratio at 5011 bps following a partial asset sale.',
        },
      ],
      note:
        'Of the 47 affected transactions, 44 fell within two windows in which the ratio was restored within ' +
        'nine and four days respectively. Three fell in a window that was not restored within thirty days.',
    },
    deliberation: [
      {
        id: 'd1',
        scholarId: 'member-a',
        body:
          'The immediate suspension is correct and should not be softened. My question is narrower: does a ' +
          'grace period of thirty days risk becoming an ordinary state, in which a manager operates at the ' +
          'boundary and relies on the period rather than treating it as an exception?',
        at: '2026-07-21T14:12:00Z',
        replyTo: null,
        liaisonAnswer: false,
      },
      {
        id: 'd2',
        scholarId: 'member-b',
        body:
          'A related point. If the ratio is restored on day twenty-nine and breached again on day thirty-two, ' +
          'does a fresh period begin? If it does, the constraint is not a constraint. I would want a limit on ' +
          'the number of periods within a rolling year before reclassification follows automatically.',
        at: '2026-07-22T07:40:00Z',
        replyTo: 'd1',
        liaisonAnswer: false,
      },
      {
        id: 'd3',
        scholarId: 'liaison',
        body:
          'On the mechanism: a rolling limit is expressible as a parameter and would be enforced identically ' +
          'to the period itself. It would read as a count of grace periods entered within a trailing window. ' +
          'It is not currently in the proposed parameters. If the board wishes it, the proposal returns to ' +
          'draft and comes back with it included rather than being amended after approval.',
        at: '2026-07-22T09:15:00Z',
        replyTo: 'd2',
        liaisonAnswer: true,
      },
    ],
    reasoning: [],
    timelockStartedAt: null,
    timelockEndsAt: null,
    objections: [],
    inForceAt: null,
    sources: [
      { kind: 'code', label: 'GravitasPolicyRegistry', ref: 'contracts/GravitasPolicyRegistry.sol' },
      { kind: 'chain', label: 'Registry on Arbitrum Sepolia', ref: '0x6f3bfb896DD9964C9c05dA88692bDf1b1b2C3F23' },
    ],
  },
  {
    id: 'matter-2026-06-19',
    boardId: 'demo-board',
    title: 'Suspension of an asset following a change in its underlying structure',
    origin: 'protocol_change',
    direction: 'restrict',
    status: 'in_force',
    openedAt: '2026-06-19T06:30:00Z',
    proposal:
      'An asset previously approved by this board altered its structure such that a portion of returns now ' +
      'derives from a lending facility that was not present when the approval was given. The proposal is to ' +
      'suspend the asset immediately pending review.',
    notDecided: [
      'Whether the asset is impermissible. Suspension is not a ruling; it holds the position while the board looks.',
      'Whether holders may redeem. They may.',
    ],
    mechanism:
      'The asset is removed from the permitted set. Transactions involving it cease to execute from the ' +
      'moment the change takes effect. No waiting period applies to a restriction.',
    interactsWith: [],
    proposedRule: rule(
      'rule-suspend-asset-x',
      'demo-board',
      'Suspension of asset pending structural review',
      'The asset is removed from the permitted set pending review by the board.',
      [
        { key: 'assetId', value: 'asset:0x…redacted', meaning: 'The asset suspended.' },
        { key: 'effect', value: 'remove_from_permitted_set', meaning: 'Transactions involving the asset do not execute.' },
        {
          key: 'ratifyBy',
          value: '2026-06-26T06:30:00Z',
          meaning: 'The suspension lapses unless confirmed by the full board within seven days.',
        },
      ],
      1,
      '2026-06-19T06:34:00Z',
      [{ kind: 'code', label: 'PolicyRegistry.suspendAsset', ref: 'contracts/GravitasPolicyRegistry.sol' }],
    ),
    simulation: null,
    deliberation: [],
    reasoning: [
      {
        scholarId: 'member-a',
        position: 'for',
        reason:
          'The structure that was approved is not the structure now operating. Suspension holds the position ' +
          'without prejudging the question, which is the correct response to a change of this kind.',
        at: '2026-06-19T06:33:00Z',
      },
      {
        scholarId: 'member-b',
        position: 'for',
        reason:
          'I agree with suspension and record one reservation: the board learned of this change from the ' +
          'technical team rather than from the issuer. That is a reporting failure on the issuer\'s part and ' +
          'should be raised with them separately.',
        at: '2026-06-19T06:34:00Z',
      },
    ],
    timelockStartedAt: null,
    timelockEndsAt: null,
    objections: [],
    inForceAt: '2026-06-19T06:34:00Z',
    sources: [],
  },
];

export const briefings: Briefing[] = [
  {
    id: 'brief-cl-nft',
    publishedAt: '2026-07-10T00:00:00Z',
    title: 'Liquidity positions as distinct instruments rather than fungible tokens',
    whatChanged:
      'An earlier design of a widely used decentralised exchange represented a liquidity position as a ' +
      'fungible token: every holder in a pool held an identical, interchangeable claim. A later design ' +
      'allows a provider to concentrate liquidity within a chosen price range. Because each position now ' +
      'has its own range, each is a distinct instrument rather than an interchangeable one.',
    whyChanged:
      'Concentrating liquidity within a range means a given amount of capital supports more trading volume ' +
      'within that range. Those who designed it presented this as an improvement in capital efficiency, ' +
      'which it is.',
    touchesRules: ['rule-wakil-mandate'],
    questionForBoard:
      'Because each position is distinct, moving one to a different range or venue cannot be done in a ' +
      'single act. It requires a sequence of separate transactions, and the price moves between them, so ' +
      'the holder cannot know at the outset what he will hold at the end. Does the board consider this a ' +
      'form of gharar arising from the mechanism, and if so, does it affect any position held under an ' +
      'existing mandate?',
    sources: [
      { kind: 'external', label: 'Protocol technical documentation', ref: 'docs/references/concentrated-liquidity.md' },
      { kind: 'code', label: 'TeleportV3 atomic migration', ref: 'contracts/TeleportV3.sol' },
      { kind: 'test', label: 'migration reverts entirely on any failed step', ref: 'test/TeleportV3.atomicity.t.sol' },
    ],
    raisedBy: 'technical_team',
  },
  {
    id: 'brief-standing-approvals',
    publishedAt: '2026-06-28T00:00:00Z',
    title: 'Standing permissions granted to applications do not expire by default',
    whatChanged:
      'When a holder connects a wallet to an application, he grants that application authority to move ' +
      'specified assets. By common practice this authority is granted without an upper limit and without ' +
      'an expiry. It persists until the holder returns and revokes it, which in practice almost nobody does.',
    whyChanged:
      'Requiring a fresh permission for every transaction imposes an additional step and an additional cost ' +
      'on the holder each time. Unlimited standing permission was adopted for convenience.',
    touchesRules: [],
    questionForBoard:
      'A valid sale requires possession of the subject matter. Where a third party holds a standing, ' +
      'unlimited and unexpiring authority to take an asset from the holder, does that affect the holder\'s ' +
      'possession of it, or is possession unaffected while the authority remains unexercised?',
    sources: [
      { kind: 'document', label: 'Token approval mechanics', ref: 'docs/references/approvals.md' },
      { kind: 'code', label: 'Scoped, expiring authorisation in TeleportV3', ref: 'contracts/TeleportV3.sol' },
    ],
    raisedBy: 'technical_team',
  },
  {
    id: 'brief-settlement-finality',
    publishedAt: '2026-05-30T00:00:00Z',
    title: 'Settlement finality and the absence of reversal',
    whatChanged:
      'In conventional payment systems an erroneous or disputed transfer can be reversed by an intermediary ' +
      'with the authority to do so. On a public settlement network there is no such authority: once a ' +
      'transaction is included and confirmed, it is final and cannot be undone by anyone.',
    whyChanged:
      'Finality without an intermediary is the property the networks were designed to have. It is not a ' +
      'defect or an oversight.',
    touchesRules: ['rule-stablecoin-par', 'rule-tangible-ratio'],
    questionForBoard:
      'Where a transfer cannot be reversed, a compliance condition applied after execution has no remedy ' +
      'available to it. Does the board consider that this places an obligation on institutions to enforce ' +
      'conditions before execution rather than to review them afterwards, and if so, should that obligation ' +
      'be recorded as a rule in its own right?',
    sources: [{ kind: 'document', label: 'Settlement finality', ref: 'docs/references/finality.md' }],
    raisedBy: 'board_member',
  },
];

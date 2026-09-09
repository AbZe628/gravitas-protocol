import type {
  Asset, Board, Institution, Matter, Briefing, Rule, Incident, Meeting } from '../types.js';
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

export const institutions: Institution[] = [
  {
    id: 'demo-institution',
    name: 'Demonstration Institution (illustrative data only)',
    shortName: 'Demonstration',
  },
];

export const boards: Board[] = [
  {
    id: 'demo-board',
    institutionId: 'demo-institution',
    name: 'Demonstration Board (illustrative data only)',
    quorumPermit: 3,
    quorumRestrict: 2,
    totalSignatories: 5,
    ratificationWindowHours: 168,
    /*
     * Five signatories, matching totalSignatories, plus an advisory member and
     * a technical liaison who deliberate without voting.
     *
     * The count has to match. The board previously declared five signatories
     * and a permitting quorum of three while listing two members, which meant a
     * permitting change could never reach quorum. In Stage One that was
     * invisible, because nothing could be voted on. In Stage Two it made the
     * demonstration board unable to demonstrate the process it exists to show.
     */
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
      {
        id: 'member-c',
        name: 'Board Member C',
        title: 'Shariah Board Member (placeholder)',
        board: 'demo-board',
        signatory: true,
      },
      {
        id: 'member-d',
        name: 'Board Member D',
        title: 'Shariah Board Member (placeholder)',
        board: 'demo-board',
        signatory: true,
      },
      {
        id: 'member-e',
        name: 'Board Member E',
        title: 'Shariah Board Member (placeholder)',
        board: 'demo-board',
        signatory: true,
      },
      {
        id: 'advisor-1',
        name: 'Advisory Member',
        title: 'Advisory, without signing authority (placeholder)',
        board: 'demo-board',
        signatory: false,
      },
      {
        id: 'liaison-1',
        name: 'Technical Liaison',
        title: 'Answers questions of mechanism, does not vote (placeholder)',
        board: 'demo-board',
        signatory: false,
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

/**
 * A ruling in force over the mixed pool, carrying a term that says what part of
 * a composition it is measured against.
 *
 * It exists so the demonstration record shows drift rather than only the
 * machinery for it: the pool's tangible parts total 50.00% against the 51.00%
 * this ruling requires, which is exactly the condition that goes unnoticed
 * until an audit.
 */
export const poolRuling: Matter = {
  id: 'matter-2026-04-02',
  boardId: 'demo-board',
  assetIds: ['asset-mixed-pool'],
  /**
   * Judged against the sukuk shape, and answered.
   *
   * It always was a sukuk question — a pool of leased assets and receivables,
   * traded at market price, turning on the proportion that is tangible — and
   * `matter-2026-07-03` already names sukuk for exactly that reason. Saying so
   * here costs nothing and makes the pair what a board's year actually looks
   * like: a question decided, and a second one of the same shape arriving
   * months later.
   *
   * The findings are seeded because this matter is **in force**. A board that
   * brought a permission into force having answered nothing is the gap the
   * passage panel now reports, and leaving it that way would have kept a hole
   * in the record for the sake of a rule about matters still being deliberated.
   * The reasons below are this demonstration board's, in the register of a real
   * one, and the whole file is marked illustrative.
   */
  structureId: 'sukuk',
  findings: [
    {
      conditionId: 'holders-own-the-assets',
      holds: 'met',
      reason:
        'The trust deed passes an undivided share in the leased assets to unitholders, and the ' +
        'administrator confirms the assets are held outside the originator’s balance sheet.',
      scholarId: 'member-a',
      at: '2026-03-27T10:15:00Z',
    },
    {
      conditionId: 'no-purchase-undertaking-at-face-value',
      holds: 'met',
      reason:
        'The originator’s undertaking is at the net asset value on the day of exercise. We saw ' +
        'the clause; it is not at par and not at outstanding principal.',
      scholarId: 'member-b',
      at: '2026-03-27T11:40:00Z',
    },
    {
      conditionId: 'tangible-ratio-for-trading',
      holds: 'met',
      reason:
        'Tangible assets and usufructs are the majority of pool value, and the threshold is set ' +
        'in the operative terms of this ruling rather than assumed. It is measured monthly from ' +
        'the administrator’s published breakdown.',
      scholarId: 'member-a',
      at: '2026-03-28T09:05:00Z',
    },
    {
      conditionId: 'returns-from-the-assets',
      holds: 'met',
      reason:
        'Distributions are the lease rentals net of costs. The liquidity facility is disclosed ' +
        'separately and is not a term of the units.',
      scholarId: 'member-c',
      at: '2026-03-28T14:22:00Z',
    },
    {
      conditionId: 'proceeds-used-as-stated',
      holds: 'met',
      reason: 'The assets are identified by serial number in the schedule to the prospectus.',
      scholarId: 'member-b',
      at: '2026-03-29T08:30:00Z',
    },
    {
      /*
       * Not met, and deliberately. A demonstration where the board agreed with
       * everything teaches nothing, and a ruling can be brought into force on
       * conditions the board found against — that is what the operative terms
       * are for.
       */
      conditionId: 'income-screened-where-mixed',
      holds: 'not_met',
      reason:
        'The administrator does not presently report income by source, so the non-permissible ' +
        'proportion cannot be worked out. Permission is given on the condition that this ' +
        'reporting begins, and purification is computed from it each period.',
      scholarId: 'member-a',
      at: '2026-03-29T09:50:00Z',
    },
  ],
  title: 'Secondary trading of a mixed pool at market price',
  origin: 'institution_request',
  direction: 'permit',
  status: 'in_force',
  openedAt: '2026-03-18T09:00:00Z',
  settledAt: '2026-03-30T14:20:00Z',
  proposal:
    'The desk asks whether units in a pool combining leased assets and trade receivables may ' +
    'be traded in the secondary market at market price, and on what condition.',
  notDecided: [
    'This does not address redemption at net asset value, which is unaffected.',
    'This does not approve any other pool, whatever its composition.',
  ],
  mechanism:
    'Units are transferred between holders at a market price. The pool net asset value ' +
    'breakdown is published each month end by the administrator.',
  implementationSteps: [
    'Read the tangible proportion from the published net asset value breakdown, not from the desk’s own file.',
    'Where the proportion is below the recorded minimum, secondary transfers at market price do not execute.',
    'Redemption at net asset value continues regardless.',
  ],
  interactsWith: ['rule-tangible-ratio'],
  proposedRule: {
    id: 'rule-pool-trading',
    boardId: 'demo-board',
    title: 'Secondary trading of a mixed pool at market price',
    statement:
      'Units may be traded at market price only while tangible assets and usufructs are the ' +
      'majority of the value of the pool.',
    parameters: [
      {
        key: 'minTangibleRatioBps',
        value: '5100',
        unit: 'basis points',
        meaning: 'Tangible assets and usufructs must be at least 51.00% of pool value.',
        watches: { kind: 'tangible', bound: 'minimum' },
      },
      {
        key: 'onBreach',
        value: 'block_secondary_market_trades',
        meaning:
          'While the proportion is below the threshold, secondary transfers at market price do ' +
          'not execute. Redemption at net asset value is unaffected.',
      },
    ],
    parameterHash: '',
    version: 1,
    inForceFrom: '2026-04-02T00:00:00Z',
    reviewEveryMonths: 6,
    supersededBy: null,
    supersedes: null,
    sources: [
      {
        kind: 'document',
        label: 'Illustrative tradability principles (fabricated demonstration source)',
        ref: 'docs/references/mixed-portfolio.md',
      },
    ],
  },
  simulation: null,
  deliberation: [],
  reasoning: [
    {
      scholarId: 'member-a',
      position: 'for',
      reason:
        'While the tangible majority holds, what is traded is a share in assets rather than in ' +
        'a receivable, and the price may be what a buyer will pay.',
      at: '2026-03-29T10:05:00Z',
    },
    {
      scholarId: 'member-b',
      position: 'for',
      reason:
        'Subject to the threshold being read from the published breakdown rather than from the ' +
        'desk, which is where the last dispute came from.',
      at: '2026-03-29T15:40:00Z',
    },
    {
      scholarId: 'member-c',
      position: 'for',
      reason:
        'The condition is workable and the breach behaviour is stated, which is what was missing ' +
        'when this was last before us.',
      at: '2026-03-30T09:12:00Z',
    },
  ],
  timelockStartedAt: '2026-03-30T14:20:00Z',
  timelockEndsAt: '2026-04-01T14:20:00Z',
  objections: [],
  inForceAt: '2026-04-02T00:00:00Z',
  sources: [
    {
      kind: 'document',
      label: 'Illustrative tradability principles (fabricated demonstration source)',
      ref: 'docs/references/mixed-portfolio.md',
    },
  ],
};

export const matters: Matter[] = [
  poolRuling,
  {
    id: 'matter-2026-07-03',
    assetIds: ['asset-mixed-pool'],
    /**
     * Judged against a shape, so the checklist is reachable in a demonstration.
     *
     * Sukuk rather than anything else because the condition this matter turns
     * on — the proportion of tangible assets in a pool that is traded — is a
     * sukuk condition, and this is the shape a board would actually reach for.
     *
     * No findings are seeded against it. An empty checklist is the true state
     * of a matter still in deliberation, and a seeded finding would be putting
     * words in the mouth of a board that never met.
     */
    structureId: 'sukuk',
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
    assetIds: ['asset-restructured-token'],
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

/**
 * The universe the board rules on.
 *
 * Illustrative, like everything else here. What it is shaped to demonstrate is
 * the state that matters most and that no board can currently see: **most of a
 * universe has never been examined.** Two of these carry a ruling; the rest
 * have never been put to anybody, which is the ordinary condition of a register
 * and the reason one is worth keeping.
 */
export const assets: Asset[] = [
  {
    id: 'asset-mixed-pool',
    institutionId: 'demo-institution',
    kind: 'pool',
    name: 'Mixed pool — leased equipment and trade finance',
    identifiers: [
      { scheme: 'chain', value: '0x4a1f…c209', network: 'arbitrum-sepolia' },
      { scheme: 'internal', value: 'POOL-MIX-01' },
    ],
    source: 'registry',
    addedAt: '2026-03-02T00:00:00Z',
    addedBy: null,
    composition: {
      asOf: '2026-06-30T00:00:00Z',
      source: 'Pool net asset value breakdown (illustrative)',
      parts: [
        { label: 'Leased equipment', bps: 3100, kind: 'tangible' },
        { label: 'Leased property', bps: 1900, kind: 'tangible' },
        { label: 'Trade receivables', bps: 3300, kind: 'receivable' },
        { label: 'Cash', bps: 1700, kind: 'cash' },
      ],
    },
    retiredAt: null,
    retiredReason: null,
  },
  {
    id: 'asset-restructured-token',
    institutionId: 'demo-institution',
    kind: 'token',
    name: 'Token whose underlying structure changed after approval',
    identifiers: [{ scheme: 'chain', value: '0x9f2c…a41e', network: 'arbitrum-sepolia' }],
    source: 'registry',
    addedAt: '2026-01-14T00:00:00Z',
    addedBy: null,
    composition: null,
    retiredAt: null,
    retiredReason: null,
  },
  {
    id: 'asset-cash-backed',
    institutionId: 'demo-institution',
    kind: 'token',
    name: 'Cash-backed settlement token',
    identifiers: [
      { scheme: 'chain', value: '0xaf88…5831', network: 'arbitrum-sepolia' },
      { scheme: 'ticker', value: 'USDC' },
    ],
    source: 'registry',
    addedAt: '2026-01-14T00:00:00Z',
    addedBy: null,
    composition: null,
    retiredAt: null,
    retiredReason: null,
  },
  {
    id: 'asset-staking-wrapper',
    institutionId: 'demo-institution',
    kind: 'token',
    name: 'Wrapped staking position',
    identifiers: [{ scheme: 'chain', value: '0x5979…8ce8', network: 'arbitrum-sepolia' }],
    source: 'registry',
    addedAt: '2026-05-21T00:00:00Z',
    addedBy: null,
    composition: null,
    retiredAt: null,
    retiredReason: null,
  },
  {
    id: 'asset-sukuk-ijara',
    institutionId: 'demo-institution',
    kind: 'security',
    name: 'Sukuk al-ijara, five year',
    identifiers: [
      { scheme: 'isin', value: 'XS0000000000' },
      { scheme: 'internal', value: 'SUK-IJ-05' },
    ],
    source: 'institution',
    addedAt: '2026-04-08T00:00:00Z',
    addedBy: null,
    composition: {
      asOf: '2026-06-30T00:00:00Z',
      source: 'Issuer report (illustrative)',
      parts: [
        { label: 'Leased assets', bps: 7200, kind: 'tangible' },
        { label: 'Receivables', bps: 2100, kind: 'receivable' },
        { label: 'Cash', bps: 700, kind: 'cash' },
      ],
    },
    retiredAt: null,
    retiredReason: null,
  },
  {
    id: 'asset-commodity-murabaha',
    institutionId: 'demo-institution',
    kind: 'product',
    name: 'Commodity murabaha for retail deposits',
    identifiers: [{ scheme: 'internal', value: 'PRD-CM-RETAIL' }],
    source: 'institution',
    addedAt: '2026-08-19T00:00:00Z',
    addedBy: null,
    composition: null,
    retiredAt: null,
    retiredReason: null,
  },
  {
    id: 'asset-leveraged-index',
    institutionId: 'demo-institution',
    kind: 'instrument',
    name: 'Leveraged index instrument',
    identifiers: [{ scheme: 'ticker', value: 'LVX3' }],
    source: 'member',
    addedAt: '2026-08-27T00:00:00Z',
    addedBy: 'member-c',
    composition: null,
    retiredAt: null,
    retiredReason: null,
  },
];

/**
 * One reported event, mid-flow, and one meeting that happened.
 *
 * ── why these are here, when they deliberately were not ───────────────────
 *
 * `store/memory.ts` refused to seed either, and gave a good reason: a record
 * that opens with a breach the board never reported would be putting words in
 * a board's mouth. That reason is answered by the board these belong to. It is
 * called *Demonstration Board (illustrative data only)*, every member is an
 * unnamed placeholder, and the header of this file says in as many words that
 * nothing in it represents any real scholar. Nobody is being quoted.
 *
 * What was left instead was three screens — events, meetings and what is
 * coming — that a scholar opens to find nothing, which teaches them the
 * application does nothing. The non-compliance path is nine steps long and four
 * of them belong to the institution rather than the board; it cannot be
 * understood from an empty page and a paragraph.
 *
 * So: one event far enough along to show the shape, with the thirty-day clock
 * running and purification prescribed and unpaid, and one meeting recorded so
 * the cadence has something to count from.
 */
export const incidents: Incident[] = [
  {
    id: 'incident-2026-08-14',
    boardId: 'demo-board',
    reference: 'SNC-2026-004',
    title: 'Profit paid on a deposit before the underlying sale settled',
    report:
      'Retail term deposits maturing between 3 and 11 August were credited with their profit share on the maturity date. For 214 of them the underlying commodity sale had not completed at that point; it completed between one and four days later. The amounts were correct. What was early was the entitlement, not the arithmetic.',
    reportedBy: 'liaison-1',
    reportedAt: '2026-08-14T09:20:00Z',

    stage: 'endorsed',

    concurrences: [
      {
        scholarId: 'member-a',
        actual: true,
        reason:
          'Profit on a murabaha is earned when the sale completes. Paying it before that is paying on a contract that does not yet exist, and the fact that the figure later turned out right does not make the entitlement have existed.',
        at: '2026-08-18T10:05:00Z',
      },
      {
        scholarId: 'member-b',
        actual: true,
        reason:
          'Concur. I would add that the number of deposits is not what makes this actual — one would have been enough. It is the sequence.',
        at: '2026-08-18T11:40:00Z',
      },
      {
        scholarId: 'member-c',
        actual: true,
        reason:
          'Actual, and the operations note attached to the report is the part the board should keep: the settlement lag is a known feature of the commodity desk, not an incident of these 214.',
        at: '2026-08-18T14:12:00Z',
      },
    ],
    determinedAt: '2026-08-18T14:12:00Z',
    actual: true,

    stopped: [
      'Crediting profit on a term deposit before the underlying sale is confirmed settled',
      'Every retail term deposit product using the same commodity desk',
    ],

    plans: [
      {
        filedBy: 'liaison-1',
        filedAt: '2026-08-24T08:00:00Z',
        steps: [
          'Hold the profit credit until the desk confirms settlement, rather than on the maturity date.',
          'Reconcile the 214 deposits and identify the profit attributable to the days before settlement.',
          'Report the reconciled figure to the board for a purification direction.',
          'Add a settlement check to the product release list so a new product cannot ship without one.',
        ],
        completeBy: '2026-09-17T00:00:00Z',
        endorsedBy: ['member-a', 'member-b', 'member-c'],
        endorsedAt: '2026-08-27T15:30:00Z',
        returnedReason: null,
      },
    ],
    directorsApprovedAt: null,
    submittedToRegulatorAt: null,

    purification: {
      amount: '41280.00',
      currency: 'AED',
      destination:
        'A charitable purpose chosen by the board, disbursed by the institution and evidenced to the board. Not to be applied against any cost of the institution.',
      prescribedAt: '2026-08-27T15:30:00Z',
      paidAt: null,
      paidReference: null,
    },

    closedAt: null,
    sources: [
      { kind: 'standard', ref: 'AAOIFI SS-8 Murabaha, 4/2', label: 'When profit on a murabaha is earned' },
      { kind: 'standard', ref: 'AAOIFI GS-2 Shariah Review', label: 'What a review does when it finds something' },
    ],
  },

  /*
   * A second breach, stopped short of the amount.
   *
   * The first one has its purification already prescribed, which is a complete
   * story and hides the step that matters most: the board being asked for a
   * figure it cannot work out, because the amount is the income wrongly taken
   * and only the institution's reconciliation produces it. That state was
   * unreachable in the demonstration record, so nobody was ever shown the one
   * place this application has to say what it is waiting for.
   *
   * The same shape as the first and deliberately smaller, so the breaches
   * screen shows two of different sizes rather than one.
   */
  {
    id: 'incident-2026-09-02',
    boardId: 'demo-board',
    reference: 'SNC-2026-005',
    title: 'Late payment charge taken to income instead of to charity',
    report:
      'A charge for late settlement was applied on 38 corporate invoices between May and August. The board has ruled that anything taken on a late instalment is given away and not kept. The charges were correctly calculated and were posted to fee income.',
    reportedBy: 'liaison-1',
    reportedAt: '2026-09-02T11:15:00Z',

    stage: 'endorsed',

    concurrences: [
      {
        scholarId: 'member-a',
        actual: true,
        reason:
          'The ruling is not about whether a charge may be made. It is about where it goes, and it went to income. That is the breach.',
        at: '2026-09-04T09:30:00Z',
      },
      {
        scholarId: 'member-b',
        actual: true,
        reason:
          'Concur. The posting rule was never changed in the ledger after the ruling, which is where I would look for the next one of these.',
        at: '2026-09-04T10:05:00Z',
      },
    ],
    determinedAt: '2026-09-04T10:05:00Z',
    actual: true,

    stopped: ['Applying the late settlement charge on new corporate invoices'],

    plans: [
      {
        filedBy: 'liaison-1',
        filedAt: '2026-09-05T14:00:00Z',
        steps: [
          'Change the posting rule so a late settlement charge cannot reach fee income.',
          'Total the charges taken on the 38 invoices and report the figure to the board.',
          'Ask the board for a purification direction once the figure is confirmed.',
        ],
        completeBy: '2026-09-30T00:00:00Z',
        endorsedBy: ['member-a', 'member-b'],
        endorsedAt: '2026-09-07T16:20:00Z',
        returnedReason: null,
      },
    ],
    directorsApprovedAt: null,
    submittedToRegulatorAt: null,

    /* Not yet. This is the state the first breach cannot show. */
    purification: null,

    closedAt: null,
    sources: [],
  },

  /*
   * A breach nobody has determined yet.
   *
   * Measured across the record: of the eight stages a breach can be in, the
   * demonstration reached **one**. Both of the others are `endorsed`, so the
   * nine-step screen — which exists precisely to show a breach moving — showed
   * a breach that had stopped moving, twice, and the step that actually needs
   * a scholar was never on it.
   *
   * This one is at the first step and is the board's: reported, nobody has
   * said whether it is actual. It is the only kind of breach that belongs on
   * somebody's list of things to do today.
   */
  {
    id: 'incident-2026-09-06',
    boardId: 'demo-board',
    reference: 'SNC-2026-006',
    title: 'A wakala deployment outside the approved categories',
    report:
      'The investment agent placed 4.1m of pooled funds into a short-term paper programme during the week of 24 August. The programme is not among the categories the board approved for this mandate. The funds were returned to cash on 31 August. The desk reports it as a mandate error rather than a loss: the position was profitable.',
    reportedBy: 'liaison-1',
    reportedAt: '2026-09-06T08:40:00Z',

    stage: 'reported',

    /* Nobody has said yet. This is what the board is being asked for. */
    concurrences: [],
    determinedAt: null,
    actual: null,

    stopped: [],
    plans: [],
    directorsApprovedAt: null,
    submittedToRegulatorAt: null,
    purification: null,
    closedAt: null,
    sources: [
      {
        kind: 'ruling',
        ref: 'rule-wakil-mandate',
        label: 'Deployment boundary for an investment agent',
      },
    ],
  },
];

/**
 * One meeting, recorded.
 *
 * The cadence panel counts from the last meeting and has never had one to
 * count from, so it has always shown its own absence. This is the meeting the
 * matters in this file were discussed at, which is also what makes the agenda
 * worth reading: every item points at something else in the record.
 */
export const meetings: Meeting[] = [
  {
    id: 'meeting-2026-08-20',
    boardId: 'demo-board',
    at: '2026-08-20T13:00:00Z',
    joinUrl: null,
    agenda: [
      { matterId: 'matter-2026-07-03', item: 'Tangible ratio breached by drift rather than by act' },
      { item: 'Reported non-compliance SNC-2026-004 — determination' },
      { item: 'The contract library: which shapes this board will take up first' },
    ],
    attendance: [
      { scholarId: 'member-a', present: true },
      { scholarId: 'member-b', present: true },
      { scholarId: 'member-c', present: true },
      { scholarId: 'member-d', present: false, note: 'Travelling; sent written comments on the first item.' },
      { scholarId: 'member-e', present: true },
      { scholarId: 'advisor-1', present: true },
      { scholarId: 'liaison-1', present: true },
    ],
    minute:
      'The drift matter was discussed and not put to a vote: the board asked for the operative terms to be drafted first, so that what is voted on is the terms rather than the intention. The reported non-compliance was determined actual, three signatories concurring, and the institution was asked to file a plan within ten days. On the library, the board agreed to take up the sale family first on the ground that most of what the institution offers sits in it, and left the rest untouched rather than adopting a list nobody had read.',
    recordedBy: 'liaison-1',
    closedAt: '2026-08-20T14:35:00Z',
  },

  /*
   * One convened and still open, because a closed one shows none of the work.
   *
   * `Meetings.tsx` draws the attendance control and the minute field only
   * while a meeting is not closed. With a single closed meeting the secretary
   * — the one role a supervisor names as keeper of the minute — opened the
   * screen to one button and no fields, so recording attendance, keeping the
   * minute and closing a sitting, which is what every board portal is bought
   * for, were invisible to everybody who was ever shown this.
   *
   * Dated ahead of the record's own today so it stays open as the data ages,
   * and carrying no minute and no attendance on purpose: those are what a
   * visitor fills in.
   */
  {
    id: 'meeting-2026-10-15',
    boardId: 'demo-board',
    at: '2026-10-15T13:00:00Z',
    joinUrl: null,
    agenda: [
      {
        matterId: 'matter-2026-08-11',
        item: 'Suspension of leveraged index instruments — the vote is open',
      },
      {
        matterId: 'matter-2026-07-28',
        item: 'A restoration window before a pool is reclassified — the waiting period has run',
      },
      { item: 'Reported non-compliance SNC-2026-006 — determination' },
      { item: 'The four holdings nobody has examined' },
    ],
    attendance: [],
    minute: '',
    recordedBy: 'member-a',
    closedAt: null,
  },
];

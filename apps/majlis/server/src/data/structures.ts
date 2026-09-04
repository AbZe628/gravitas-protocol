/**
 * The nominate contracts, as conditions a board rules against.
 *
 * ── what this is, and is not ──────────────────────────────────────────────
 *
 * **It is not an assertion of what the Shariah requires.** It is a draft
 * checklist with its source named, offered so that a board stops composing a
 * question from an empty box and starts judging a shape it recognises. An
 * AAOIFI board, a Bank Negara board and a bank's own house view will not agree
 * on every line below, and a system that shipped its reading as settled would
 * be ruling.
 *
 * So every condition carries `authority` — where it is drawn from — and every
 * finding recorded against it carries the member who made it and their reason.
 * **The board's finding is the record; this is the prompt.**
 *
 * `why` is not decoration either. A condition stated without its reason can
 * only be accepted or rejected on authority; stated with it, a scholar can
 * disagree with the reasoning, which is the argument a board should be having.
 *
 * ── what is not built ─────────────────────────────────────────────────────
 *
 * **Adoption.** In the design a board approves this library once, as a matter
 * like any other, and thereafter amends its own copy. That workflow does not
 * exist. Until it does, this is reference material a board reads and rules
 * beside, and no part of the application treats a condition as binding.
 */

import type { Structure } from '../types.js';

export const structures: Structure[] = [
  {
    id: 'murabaha',
    name: 'Murabaha, including commodity murabaha and tawarruq',
    family: 'sale',
    authority: 'AAOIFI Shariah Standard No. 8; No. 30 on monetisation',
    calculations: ['late_payment', 'purification'],
    conditions: [
      {
        id: 'ownership-before-sale',
        requirement:
          'The institution owns the asset and has taken possession of it, actual or constructive, before selling it on.',
        why:
          'Selling what one does not own turns the sale into a financing of money by money, which is the thing the contract is chosen to avoid.',
        evidence: 'sequence',
        authority: 'SS 8; SS 18 on possession',
      },
      {
        id: 'cost-disclosed',
        requirement: 'The original cost and the mark-up are disclosed to the buyer.',
        why:
          'Murabaha is a sale of trust. Undisclosed cost makes it an ordinary sale at an unknown margin, and the buyer has agreed to something other than what was named.',
        evidence: 'document',
        authority: 'SS 8',
      },
      {
        id: 'asset-identified',
        requirement: 'The asset exists and is identified at the moment of sale.',
        why:
          'A sale of something unspecified is a sale of an expectation. The buyer cannot know what they have bought and neither can anyone reviewing it later.',
        evidence: 'document',
        authority: 'SS 8',
      },
      {
        id: 'promise-one-sided',
        requirement:
          'Any binding promise to purchase runs against the client alone and is given before the institution acquires the asset.',
        why:
          'A promise binding on both sides before the asset exists is a sale contract in advance of ownership, wearing a promise’s clothes.',
        evidence: 'undertaking',
        authority: 'SS 8; SS 49 on promise',
      },
      {
        id: 'no-late-increase',
        requirement:
          'No increase is taken to income on late payment. Anything charged is directed to charity.',
        why:
          'An increase for the passage of time on an established debt is riba, whatever it is called on the schedule.',
        evidence: 'document',
        authority: 'SS 3 on the procrastinating debtor',
      },
      {
        id: 'tawarruq-real-commodity',
        requirement:
          'Where the structure is tawarruq: the commodity is real, identified and deliverable, and the client does not sell it back to the institution or its agent.',
        why:
          'A commodity that never moves and returns to the same seller is a circular sale. Nothing has been traded and the whole arrangement is a loan.',
        evidence: 'sequence',
        authority: 'SS 30',
      },
    ],
  },

  {
    id: 'ijara',
    name: 'Ijara — lease of an asset or a service',
    family: 'lease',
    authority: 'AAOIFI Shariah Standard No. 9',
    calculations: ['late_payment'],
    conditions: [
      {
        id: 'lessor-owns-what-is-leased',
        requirement:
          'The institution owns the asset, or holds a right to its use that it is entitled to sublet, before leasing it out.',
        why:
          'Rent is the price of a use. Leasing what one has no right to use sells something the lessor never held, and the lessee has paid for a permission nobody could give.',
        evidence: 'sequence',
        authority: 'SS 9',
      },
      {
        id: 'rent-begins-on-delivery',
        requirement:
          'Rent begins when the asset is delivered and usable, and does not accrue for a period before that.',
        why:
          'Rent charged before delivery is a charge for the time between paying and receiving, which is a return on the amount advanced rather than on the use of anything.',
        evidence: 'sequence',
        authority: 'SS 9',
      },
      {
        id: 'ownership-risk-with-lessor',
        requirement:
          'The risk of the asset being destroyed or becoming unusable without the lessee’s fault stays with the lessor, and rent stops when the use stops.',
        why:
          'Rent that continues after the use has ended is being paid for nothing. What is left is an obligation to keep paying an amount for a period.',
        evidence: 'document',
        authority: 'SS 9',
      },
      {
        id: 'major-maintenance-and-insurance-on-lessor',
        requirement:
          'Major maintenance and insurance of the asset are the lessor’s, and the lessee bears only operating upkeep.',
        why:
          'These costs are what ownership actually consists of. A lessor relieved of them owns the asset on paper and is being paid for the balance outstanding.',
        evidence: 'document',
        authority: 'SS 9',
      },
      {
        id: 'variable-rent-has-a-floor-and-ceiling',
        requirement:
          'Where rent varies with a benchmark, the first period is fixed and later periods move within a stated floor and ceiling.',
        why:
          'Rent tied to an open-ended external rate is not a price for the use; it is a rate applied to a balance. The bounds are what keep it a rent that both parties can see the limits of.',
        evidence: 'figure',
        authority: 'SS 9',
      },
      {
        id: 'no-increase-on-late-rent-to-income',
        requirement:
          'Any amount charged for late payment of rent is given to charity rather than taken to income.',
        why:
          'Once rent is due it is a debt. An increase on it for time is the same increase the contract form was chosen to avoid, and keeping it makes the delay profitable.',
        evidence: 'figure',
        authority: 'SS 9; SS 3 on default',
      },
    ],
  },

  {
    id: 'ijara-mbt',
    name: 'Ijara, and ijara muntahia bittamleek',
    family: 'lease',
    authority: 'AAOIFI Shariah Standard No. 9',
    calculations: [],
    conditions: [
      {
        id: 'lessor-bears-ownership-risk',
        requirement:
          'The risks of ownership remain with the lessor for the whole term, including total loss of the asset.',
        why:
          'Rent is earned by bearing the risk of the thing let. A lessor who bears none is lending, and the rent is interest under another name.',
        evidence: 'document',
        authority: 'SS 9',
      },
      {
        id: 'lessor-maintains-and-insures',
        requirement:
          'Major maintenance and insurance of the asset are the lessor’s, and takaful is used where available.',
        why:
          'These are the costs of ownership. Passing them to the lessee removes the risk that justifies the rent.',
        evidence: 'document',
        authority: 'SS 9; SS 26 on takaful',
      },
      {
        id: 'transfer-is-separate',
        requirement:
          'Transfer of ownership at the end is a separate promise or gift, not a term of the lease itself.',
        why:
          'A lease that is also a sale is two contracts in one contract, and the price of neither is determinate.',
        evidence: 'undertaking',
        authority: 'SS 9; SS 25 on combining contracts',
      },
      {
        id: 'rent-after-delivery',
        requirement: 'Rent does not begin to accrue before the asset is delivered and usable.',
        why:
          'Rent is the price of usufruct. There is no usufruct before delivery, so rent charged for that period is a charge for time alone.',
        evidence: 'sequence',
        authority: 'SS 9',
      },
      {
        id: 'no-rent-when-unusable',
        requirement:
          'Rent is not due for any period in which the asset is unusable through no fault of the lessee.',
        why: 'Same reason. What is being paid for has stopped existing for that period.',
        evidence: 'document',
        authority: 'SS 9',
      },
      {
        id: 'lawful-usufruct',
        requirement: 'The asset is one whose use is lawful.',
        why:
          'The lease conveys use. Where that use is unlawful the contract conveys the unlawful thing itself, whatever the paperwork is called.',
        evidence: 'document',
        authority: 'SS 9',
      },
    ],
  },

  {
    id: 'mudaraba',
    name: 'Mudaraba',
    family: 'partnership',
    authority: 'AAOIFI Shariah Standard No. 13',
    calculations: ['profit_distribution'],
    conditions: [
      {
        id: 'profit-by-ratio',
        requirement:
          'Profit is divided by an agreed ratio of the profit itself, never as a fixed amount and never as a percentage of the capital.',
        why:
          'A fixed amount, or a return measured against capital, is a return that does not depend on the venture. That is a loan with a price on it.',
        evidence: 'figure',
        authority: 'SS 13',
      },
      {
        id: 'loss-on-capital-provider',
        requirement:
          'Loss falls on the provider of capital alone, unless the mudarib was negligent or breached the terms.',
        why:
          'The mudarib contributes work and loses that. Making them bear capital loss as well turns the arrangement into a guaranteed loan to the capital provider.',
        evidence: 'document',
        authority: 'SS 13',
      },
      {
        id: 'no-guarantee',
        requirement:
          'The mudarib does not guarantee the capital or any return on it, whether directly or through a third party they control.',
        why:
          'A guaranteed return is the definition of what this contract exists instead of. A guarantee routed through an affiliate is the same guarantee.',
        evidence: 'document',
        authority: 'SS 13',
      },
      {
        id: 'profit-on-realisation',
        requirement:
          'Profit is recognised when actually realised, and distribution before realisation is treated as an advance against it.',
        why:
          'Distributing unrealised profit pays one party out of another’s capital, and the shortfall appears later as a loss somebody did not agree to bear.',
        evidence: 'figure',
        authority: 'SS 13',
      },
      {
        id: 'expenses-agreed',
        requirement:
          'The expenses chargeable to the mudaraba are agreed in advance, and the mudarib’s own operating costs are not among them.',
        why:
          'Unbounded expenses charged to the venture reduce the profit the capital provider shares in, which recovers by the back door what the ratio gave away.',
        evidence: 'document',
        authority: 'SS 13',
      },
      {
        id: 'reserves-approved',
        requirement:
          'Any profit equalisation or investment risk reserve is taken at a rate and to a ceiling the board approved, and its effect on what account holders received is disclosed.',
        why:
          'The reserves smooth what depositors are paid, which is what they are for and also how a poor period is hidden. Undisclosed, they make the return look like a rate rather than a share.',
        evidence: 'figure',
        authority: 'SS 13; and the board’s own approved basis',
      },
    ],
  },

  // ── sale, continued ─────────────────────────────────────────────────────

  {
    id: 'musawama',
    name: 'Musawama — sale at a negotiated price',
    family: 'sale',
    authority: 'AAOIFI Shariah Standard No. 8 by contrast; the general rules of sale',
    calculations: ['late_payment'],
    conditions: [
      {
        id: 'no-cost-disclosure-relied-on',
        requirement:
          'The price is agreed by negotiation and the buyer does not rely on a stated cost or a stated mark-up.',
        why:
          'This is the line between musawama and murabaha. A buyer who was told a cost has been sold a contract of trust, and the seller is then bound by the accuracy of that figure whether or not anyone called it murabaha.',
        evidence: 'document',
        authority: 'General rules of sale; SS 8 by contrast',
      },
      {
        id: 'price-certain',
        requirement: 'The price is known and fixed at the moment the contract is concluded.',
        why:
          'A price left to be settled later is a term the parties have not agreed. Each of them is bound to something different, and the disagreement surfaces after performance has begun.',
        evidence: 'document',
        authority: 'General rules of sale',
      },
      {
        id: 'subject-identified',
        requirement: 'The subject of the sale exists, is owned by the seller, and is identified.',
        why:
          'Selling what one does not own or cannot point to is selling an expectation. Neither the buyer nor anyone reviewing it afterwards can say what changed hands.',
        evidence: 'document',
        authority: 'General rules of sale',
      },
      {
        id: 'no-increase-for-time',
        requirement:
          'No increase is charged on the price once the debt is established, whether described as a penalty, an administrative charge or compensation.',
        why:
          'An increase for the passage of time on a settled debt is the exact thing the sale form was chosen to avoid. Anything collected under that heading is not the institution\u2019s to keep.',
        evidence: 'document',
        authority: 'SS 3 on default in payment',
      },
    ],
  },

  {
    id: 'salam',
    name: 'Salam — payment now for delivery later',
    family: 'sale',
    authority: 'AAOIFI Shariah Standard No. 10',
    calculations: [],
    conditions: [
      {
        id: 'price-paid-in-full-at-contract',
        requirement:
          'The whole price is paid to the seller at the session of the contract, not deferred and not set off against an existing debt.',
        why:
          'Salam is the one sale where the subject may not yet exist, and it is allowed because the capital reaches the seller immediately. Defer the price and both sides of the exchange are delayed, which is a debt for a debt.',
        evidence: 'sequence',
        authority: 'SS 10',
      },
      {
        id: 'goods-described-by-specification',
        requirement:
          'The goods are described by specification — kind, quality, quantity — and are not tied to a particular field, herd or batch.',
        why:
          'The seller must be able to deliver from anywhere. Tying delivery to one identified source means the contract fails if that source fails, which turns a sale into a wager on that source.',
        evidence: 'document',
        authority: 'SS 10',
      },
      {
        id: 'delivery-date-fixed',
        requirement: 'The date and place of delivery are fixed.',
        why:
          'Without a fixed date the buyer has paid for something with no moment at which the seller is in default. There is nothing to enforce and nothing to review.',
        evidence: 'document',
        authority: 'SS 10',
      },
      {
        id: 'no-sale-before-receipt',
        requirement:
          'The buyer does not sell the salam goods on before taking delivery of them.',
        why:
          'Selling goods not yet received passes on a risk the seller has not yet borne, and if the first delivery fails the second sale has nothing under it.',
        evidence: 'sequence',
        authority: 'SS 10',
      },
      {
        id: 'parallel-salam-independent',
        requirement:
          'Where a parallel salam is entered into, it is a separate contract and neither contract is conditional on the other.',
        why:
          'Two contracts made conditional on each other are one contract with two prices. The institution would then be passing through a position it never held, which is the arrangement the form is meant to prevent.',
        evidence: 'document',
        authority: 'SS 10 on parallel salam',
      },
    ],
  },

  {
    id: 'istisna',
    name: "Istisna' and parallel istisna' — manufacture to order",
    family: 'sale',
    authority: 'AAOIFI Shariah Standard No. 11',
    calculations: ['late_payment'],
    conditions: [
      {
        id: 'subject-requires-manufacture',
        requirement:
          'The subject is something to be manufactured, built or constructed, described in enough detail to be made and to be accepted or refused on delivery.',
        why:
          "Istisna' is a contract over work as well as goods. If nothing is to be made, the parties are in an ordinary sale and the freedoms this contract allows do not apply to them.",
        evidence: 'document',
        authority: 'SS 11',
      },
      {
        id: 'price-fixed-payment-flexible',
        requirement:
          'The price is fixed at the outset, though it may be paid at the start, in instalments, or on delivery.',
        why:
          'The flexibility here is in the timing of payment, not in the amount. A price that moves with the schedule is a charge for time under another name.',
        evidence: 'document',
        authority: 'SS 11',
      },
      {
        id: 'manufacturer-bears-work',
        requirement:
          'The manufacturer is responsible for the work and the materials, and bears the loss if the subject is destroyed before delivery.',
        why:
          'The return in this contract is earned by taking the risk of production. A manufacturer who bears neither the work nor the risk of loss is financing, and the sale is a wrapper.',
        evidence: 'document',
        authority: 'SS 11',
      },
      {
        id: 'parallel-istisna-separate',
        requirement:
          'A parallel contract with a subcontractor is separate, and the institution remains answerable to its own buyer for delivery and for defects.',
        why:
          'If the institution can point at the subcontractor and step out, it never bore the obligation it was paid to bear. The two contracts must be able to fail independently.',
        evidence: 'document',
        authority: "SS 11 on parallel istisna'",
      },
      {
        id: 'delivery-terms-and-remedies',
        requirement:
          'The delivery date and the consequences of late or defective delivery are stated, and any agreed reduction is compensation for the failure rather than a charge for time.',
        why:
          'A reduction tied to the length of a delay is a rate. A reduction tied to what the delay actually cost is a remedy, and the two look identical on a statement.',
        evidence: 'document',
        authority: 'SS 11; SS 3 on default',
      },
    ],
  },

  // ── partnership, continued ──────────────────────────────────────────────

  {
    id: 'musharaka',
    name: 'Musharaka — partnership in capital and profit',
    family: 'partnership',
    authority: 'AAOIFI Shariah Standard No. 12',
    calculations: ['profit_distribution'],
    conditions: [
      {
        id: 'profit-ratio-agreed-loss-by-capital',
        requirement:
          'Profit is shared in ratios agreed at the outset, and loss is borne strictly in proportion to capital contributed.',
        why:
          'Profit may reward effort as well as money, so its ratio is open to agreement. Loss is the destruction of capital, and a partner who is protected from it has lent rather than invested.',
        evidence: 'document',
        authority: 'SS 12',
      },
      {
        id: 'no-guaranteed-return',
        requirement:
          'No partner guarantees another\u2019s capital or a fixed return on it, whether directly or through a third party related to them.',
        why:
          'A guaranteed return converts the share into a debt with a rate. Routing the guarantee through an affiliate changes who signs it and changes nothing about what it is.',
        evidence: 'undertaking',
        authority: 'SS 12',
      },
      {
        id: 'profit-from-actual-results',
        requirement:
          'Profit is distributed from realised results, and any interim distribution is on account and adjusted at the final reckoning.',
        why:
          'A distribution that is never adjusted is a payment fixed in advance. The partnership then reports a share and pays a coupon.',
        evidence: 'figure',
        authority: 'SS 12',
      },
      {
        id: 'capital-contributions-valued',
        requirement:
          'Contributions in kind are valued and agreed by the partners at the outset, and the valuation is recorded.',
        why:
          'Unvalued contributions mean the profit ratios rest on a number nobody wrote down, and the argument arrives at the first distribution rather than at the start.',
        evidence: 'figure',
        authority: 'SS 12',
      },
      {
        id: 'management-terms-stated',
        requirement:
          'Which partners manage, and on what terms they are paid for managing, are stated separately from the profit share.',
        why:
          'A management fee folded into the profit share hides a fixed payment inside a variable one, and the partner receiving it stops depending on the result.',
        evidence: 'document',
        authority: 'SS 12',
      },
    ],
  },

  {
    id: 'diminishing-musharaka',
    name: 'Diminishing musharaka — partnership with a buy-out',
    family: 'partnership',
    authority: 'AAOIFI Shariah Standard No. 12, section on diminishing partnership',
    calculations: ['profit_distribution'],
    conditions: [
      {
        id: 'units-bought-at-market-or-agreed-price',
        requirement:
          'Each purchase of the institution\u2019s share is a separate sale at a price agreed at the time of that sale, not fixed at the outset at face value.',
        why:
          'A price fixed in advance at face value means the institution recovers its capital whatever happened to the asset. It has then taken rent without taking ownership risk.',
        evidence: 'sequence',
        authority: 'SS 12',
      },
      {
        id: 'buy-out-not-a-condition-of-the-partnership',
        requirement:
          'The undertaking to buy the institution\u2019s share is a separate promise and is not a term of the partnership contract.',
        why:
          'Two contracts written as one leave the parties unable to say which obligation they are performing, and a partnership that must end in a sale was never a partnership.',
        evidence: 'undertaking',
        authority: 'SS 12; SS 25 on combining contracts',
      },
      {
        id: 'rent-tracks-remaining-share',
        requirement:
          'Rent paid to the institution is calculated on the share it still owns and falls as that share falls.',
        why:
          'Rent that does not fall as ownership falls is a payment for the outstanding balance rather than for the use of what is owned.',
        evidence: 'figure',
        authority: 'SS 12; SS 9 on ijara',
      },
      {
        id: 'loss-shared-while-jointly-owned',
        requirement:
          'While the asset is jointly owned, loss to it is borne in proportion to the shares held at the time of the loss.',
        why:
          'If the client bears all of it, the institution owns a share on paper and none of the exposure that makes ownership real.',
        evidence: 'document',
        authority: 'SS 12',
      },
    ],
  },

  // ── agency ──────────────────────────────────────────────────────────────

  {
    id: 'wakala-investment',
    name: 'Investment wakala — agency to invest',
    family: 'agency',
    authority: 'AAOIFI Shariah Standard No. 23 on agency; No. 46 on investment agency',
    calculations: ['profit_distribution'],
    conditions: [
      {
        id: 'fee-not-tied-to-profit-as-a-share',
        requirement:
          'The agent\u2019s fee is a stated amount or a stated proportion of the capital, agreed whether or not a profit is made.',
        why:
          'An agent is paid for work. Paying them a share of profit makes them a partner in the result, and the contract is then a mudaraba wearing an agency label \u2014 with a different rule for losses.',
        evidence: 'document',
        authority: 'SS 46',
      },
      {
        id: 'incentive-clearly-separated',
        requirement:
          'Any incentive above an expected return is stated separately from the fee and is a gift the principal chooses to give, not a term the agent may enforce.',
        why:
          'An enforceable incentive over a target return is a share of profit by another name, and it also gives the agent a reason to take risk the principal did not agree to.',
        evidence: 'document',
        authority: 'SS 46',
      },
      {
        id: 'no-capital-guarantee',
        requirement:
          'The agent does not guarantee the capital or the expected return, and is liable only for negligence, misconduct or breach of the mandate.',
        why:
          'An agent who guarantees the capital has borrowed it. The whole difference between agency and a deposit is who carries the loss when nothing went wrong.',
        evidence: 'undertaking',
        authority: 'SS 46',
      },
      {
        id: 'mandate-states-what-may-be-invested-in',
        requirement:
          'The mandate states what the agent may invest in, and the agent invests within it.',
        why:
          'Without a stated mandate there is no line to have crossed, and a breach cannot be found because nothing was agreed to be breached.',
        evidence: 'document',
        authority: 'SS 23; SS 46',
      },
      {
        id: 'results-reported-to-principal',
        requirement:
          'The agent reports actual results to the principal, and the return paid is what the investment produced rather than what was expected.',
        why:
          'Paying the expected return regardless of the result turns the report into a formality and the expectation into an entitlement.',
        evidence: 'figure',
        authority: 'SS 46',
      },
    ],
  },

  // ── securities ──────────────────────────────────────────────────────────

  {
    id: 'sukuk',
    name: 'Sukuk — asset-backed and asset-based',
    family: 'security',
    authority: 'AAOIFI Shariah Standard No. 17; the 2008 resolution on sukuk',
    calculations: ['tangibility', 'profit_distribution', 'purification'],
    conditions: [
      {
        id: 'holders-own-the-assets',
        requirement:
          'Certificate holders own an undivided share in the underlying assets, with the rights and the exposures that ownership carries, rather than a claim against the originator.',
        why:
          'This is the whole distinction between asset-backed and asset-based. Holders who own nothing hold a debt against the originator, and the assets are decoration on a bond.',
        evidence: 'document',
        authority: 'SS 17; the 2008 resolution',
      },
      {
        id: 'no-purchase-undertaking-at-face-value',
        requirement:
          'Any undertaking by the originator to buy the assets back is at market value or a value agreed at the time, not at face value or at the outstanding principal.',
        why:
          'A buy-back at face value returns the holders\u2019 capital whatever happened to the assets. They then carry no ownership risk, and the return they were paid was a rate on money.',
        evidence: 'undertaking',
        authority: 'SS 17; the 2008 resolution',
      },
      {
        id: 'tangible-ratio-for-trading',
        requirement:
          'Where certificates are traded, the proportion of tangible assets in the pool meets the threshold the board sets, and the proportion is measured and reported.',
        why:
          'A pool that is mostly receivables is mostly debt, and trading debt at other than par is the sale of money for more money. Where the threshold sits is a question boards answer differently, which is why it is set rather than assumed.',
        evidence: 'figure',
        authority: 'SS 17; SS 21; SS 59 on sale of debt',
      },
      {
        id: 'returns-from-the-assets',
        requirement:
          'Distributions come from what the assets earn, and any shortfall met by the originator is a separate liquidity facility that is disclosed and is not a term of the certificates.',
        why:
          'A topped-up distribution that holders can rely on is a fixed coupon, and the topping up is where the fixed rate re-enters a structure built to avoid one.',
        evidence: 'figure',
        authority: 'SS 17',
      },
      {
        id: 'proceeds-used-as-stated',
        requirement:
          'The proceeds are applied to the purpose stated in the prospectus, and the assets are identified.',
        why:
          'Unapplied or unidentified proceeds mean the certificates rest on nothing in particular, and no later review can test what holders were told against what happened.',
        evidence: 'document',
        authority: 'SS 17',
      },
      {
        id: 'income-screened-where-mixed',
        requirement:
          'Where the underlying activity produces income from unlawful sources, the proportion is measured and the amount attributable to holders is worked out.',
        why:
          'A mixed pool does not become clean because it is securitised. What was owed on the underlying activity is still owed once it has been divided into certificates.',
        evidence: 'figure',
        authority: 'SS 21; SS 17',
      },
    ],
  },

  // ── exchange ────────────────────────────────────────────────────────────

  {
    id: 'sarf',
    name: 'Sarf — exchange of currency and monetary value',
    family: 'exchange',
    authority: 'AAOIFI Shariah Standard No. 1',
    calculations: [],
    conditions: [
      {
        id: 'both-legs-delivered-immediately',
        requirement:
          'Both amounts are delivered at the session of the contract, with no part of either leg deferred.',
        why:
          'Deferring one leg means one party holds the other\u2019s money for a period. That interval is the thing the rule exists to close, and it is worth money to whoever holds it.',
        evidence: 'sequence',
        authority: 'SS 1',
      },
      {
        id: 'equal-for-equal-where-same-kind',
        requirement:
          'Where the two amounts are of the same kind, they are equal in quantity as well as delivered together.',
        why:
          'An unequal exchange of the same thing is an increase for nothing but the exchange itself, which is the plainest form of the increase the rule prohibits.',
        evidence: 'figure',
        authority: 'SS 1',
      },
      {
        id: 'rate-fixed-at-contract',
        requirement:
          'The rate is fixed when the contract is concluded and does not move with a later reference.',
        why:
          'A rate settled afterwards means neither party knew what they were exchanging, and the party choosing the reference decides the price after the fact.',
        evidence: 'document',
        authority: 'SS 1',
      },
      {
        id: 'no-forward-promise-binding-both',
        requirement:
          'Any promise to exchange at a future date binds one party only, and no fee is charged for it.',
        why:
          'A promise binding both sides is a forward contract, which is a deferred exchange written as an intention. Charging for it sells the interval outright.',
        evidence: 'undertaking',
        authority: 'SS 1; SS 49 on unilateral promise',
      },
    ],
  },

  // ── support: securing, moving and promising an obligation ───────────────

  {
    id: 'kafala',
    name: 'Kafala — guarantee',
    family: 'support',
    authority: 'AAOIFI Shariah Standard No. 5',
    calculations: [],
    conditions: [
      {
        id: 'no-fee-for-the-guarantee-itself',
        requirement:
          'No fee is charged for giving the guarantee, beyond the documented actual expenses of providing it.',
        why:
          'A guarantee is a voluntary undertaking. Charging for it prices the risk of a debt, which is selling the use of money without lending it, and the fee rises with the exposure exactly as a rate would.',
        evidence: 'figure',
        authority: 'SS 5',
      },
      {
        id: 'guaranteed-obligation-is-valid',
        requirement:
          'The obligation guaranteed is itself a valid one that the board has not found against.',
        why:
          'Guaranteeing an obligation the board would not have approved makes the institution the party that makes it work, and it carries the consequences of the arrangement it enabled.',
        evidence: 'document',
        authority: 'SS 5',
      },
      {
        id: 'recourse-limited-to-what-was-paid',
        requirement:
          'What the guarantor may recover from the debtor is limited to what the guarantor actually paid.',
        why:
          'Recovering more than was paid turns a rescue into a trade, and the surplus is a return on an amount advanced for a period.',
        evidence: 'figure',
        authority: 'SS 5',
      },
    ],
  },

  {
    id: 'rahn',
    name: 'Rahn — pledge of an asset as security',
    family: 'support',
    authority: 'AAOIFI Shariah Standard No. 39',
    calculations: [],
    conditions: [
      {
        id: 'pledgee-does-not-use-the-asset',
        requirement:
          'The creditor does not use or take the produce of the pledged asset unless the owner permits it separately and without it being a condition of the debt.',
        why:
          'Benefit taken from a pledge because a debt exists is a return on the debt. The security was given to secure, not to yield.',
        evidence: 'document',
        authority: 'SS 39',
      },
      {
        id: 'asset-identified-and-owned',
        requirement: 'The pledged asset is identified and is owned by the pledgor.',
        why:
          'A pledge over something unidentified secures nothing, and one over something the pledgor does not own transfers a right they never had.',
        evidence: 'document',
        authority: 'SS 39',
      },
      {
        id: 'surplus-returned-on-sale',
        requirement:
          'If the asset is sold on default, the surplus over the debt and the documented costs is returned to the pledgor.',
        why:
          'Keeping the surplus makes the default profitable to the creditor, and gives them a reason to prefer the outcome the security exists to guard against.',
        evidence: 'figure',
        authority: 'SS 39',
      },
      {
        id: 'costs-of-custody-on-owner',
        requirement:
          'The cost of keeping and maintaining the asset falls on its owner, and any charge the creditor makes is the documented actual cost.',
        why:
          'A custody charge set above cost is a fee that grows with the debt, and it does the work of a rate while carrying another name.',
        evidence: 'figure',
        authority: 'SS 39',
      },
    ],
  },

  {
    id: 'hawala',
    name: 'Hawala — transfer of a debt to another party',
    family: 'support',
    authority: 'AAOIFI Shariah Standard No. 7',
    calculations: [],
    conditions: [
      {
        id: 'transferor-released',
        requirement:
          'On a valid transfer the original debtor is released, and the creditor looks only to the transferee.',
        why:
          'If the first debtor remains liable, nothing was transferred and the creditor has gained a second obligor for free. That is a guarantee, and it is judged by the rules of one.',
        evidence: 'document',
        authority: 'SS 7',
      },
      {
        id: 'no-fee-on-the-amount',
        requirement:
          'Any charge for arranging the transfer is for the service and is not set as a proportion of the amount transferred.',
        why:
          'A charge that scales with the amount is a price for the money rather than for the work, and the work does not become harder because the sum is larger.',
        evidence: 'figure',
        authority: 'SS 7',
      },
      {
        id: 'consent-of-the-parties',
        requirement: 'The parties whose consent the transfer requires have given it.',
        why:
          'A debt moved without the consent it needs leaves at least one party bound to somebody they did not agree to deal with.',
        evidence: 'document',
        authority: 'SS 7',
      },
    ],
  },

  {
    id: 'wad',
    name: "Wa'd — promise, and the bilateral promise",
    family: 'support',
    authority: 'AAOIFI Shariah Standard No. 49',
    calculations: [],
    conditions: [
      {
        id: 'binding-on-one-side-only',
        requirement:
          'The promise binds one party only, and the other remains free not to conclude the contract.',
        why:
          'Two promises binding both sides are a contract concluded in advance. The parties then hold the effect of a forward while calling it an intention, and the form was chosen to avoid exactly that.',
        evidence: 'undertaking',
        authority: 'SS 49',
      },
      {
        id: 'no-price-for-the-promise',
        requirement: 'No fee or premium is charged for giving the promise.',
        why:
          'Charging for a promise sells an option. What is being sold is the right to decide later, which is not property that existed before the promise was written.',
        evidence: 'figure',
        authority: 'SS 49',
      },
      {
        id: 'damages-are-actual-loss',
        requirement:
          'Where the promise is broken, any compensation is the actual loss suffered and is evidenced.',
        why:
          'A pre-set sum for breaking a promise is a price for the choice, and it makes the promise enforceable in substance while leaving it unilateral on paper.',
        evidence: 'figure',
        authority: 'SS 49',
      },
    ],
  },

  {
    id: 'qard-hasan',
    name: 'Qard hasan — a loan repaid in the same amount',
    family: 'gratuitous',
    authority: 'AAOIFI Shariah Standard No. 19',
    calculations: [],
    conditions: [
      {
        id: 'repaid-in-like-amount',
        requirement:
          'The borrower repays the same amount and kind that was lent, with no increase of any description.',
        why:
          'Any increase over what was lent is a return on money for time, and the description it is given on the statement does not change what produced it.',
        evidence: 'figure',
        authority: 'SS 19',
      },
      {
        id: 'no-benefit-conditioned-on-the-loan',
        requirement:
          'No benefit to the lender is made a condition of the loan, including services, deposits or preferential terms elsewhere.',
        why:
          'A benefit required as a condition is part of the price of the loan even when no money moves. Bundling it into another agreement moves where it is written, not what it is.',
        evidence: 'document',
        authority: 'SS 19',
      },
      {
        id: 'fees-limited-to-actual-cost',
        requirement:
          'Any administrative charge is the documented actual cost of administering the loan, and does not vary with the amount lent or the time it is outstanding.',
        why:
          'A charge that moves with the amount or the term is a rate. The cost of opening a file does not depend on how large the file is.',
        evidence: 'figure',
        authority: 'SS 19',
      },
    ],
  },

  // ── protection ──────────────────────────────────────────────────────────

  {
    id: 'takaful',
    name: 'Takaful — mutual protection',
    family: 'protection',
    authority: 'AAOIFI Shariah Standard No. 26',
    calculations: ['profit_distribution', 'zakat'],
    conditions: [
      {
        id: 'contributions-are-donations-to-the-fund',
        requirement:
          'Participants\u2019 contributions are made as donations into a fund that is separate from the operator\u2019s own assets.',
        why:
          'If contributions are a price paid to the operator, each participant has bought an uncertain payout with a certain payment, and one side gains exactly what the other loses. The donation is what makes the uncertainty shared rather than traded.',
        evidence: 'document',
        authority: 'SS 26',
      },
      {
        id: 'funds-segregated',
        requirement:
          'The participants\u2019 fund and the shareholders\u2019 fund are kept separate, and each is accounted for on its own.',
        why:
          'Once the two are mixed, a surplus belonging to participants can be reported as the operator\u2019s earnings, and nobody can afterwards say whose money paid a claim.',
        evidence: 'figure',
        authority: 'SS 26',
      },
      {
        id: 'operator-paid-a-stated-fee',
        requirement:
          'The operator is paid a stated wakala fee, a mudaraba share of investment profit, or both, on terms agreed in advance.',
        why:
          'An operator taking the underwriting surplus is carrying the risk itself, and the arrangement becomes the sale of protection it was structured not to be.',
        evidence: 'document',
        authority: 'SS 26',
      },
      {
        id: 'surplus-belongs-to-participants',
        requirement:
          'Any underwriting surplus belongs to the participants and is distributed or carried forward on a stated basis.',
        why:
          'Where the surplus goes is the test of whose fund it is. If it reaches the shareholders, the participants donated into somebody else\u2019s business.',
        evidence: 'figure',
        authority: 'SS 26',
      },
      {
        id: 'deficit-met-by-interest-free-loan',
        requirement:
          'A deficit in the participants\u2019 fund is met by an interest-free loan from the operator, recovered from later surpluses.',
        why:
          'Meeting a deficit for a return would make the operator a lender to the fund it manages, and the fund would be paying for time out of contributions given as donations.',
        evidence: 'document',
        authority: 'SS 26',
      },
      {
        id: 'fund-invested-within-the-mandate',
        requirement:
          'The fund is invested only in what the board has approved, and the investments are reported to participants.',
        why:
          'Participants gave into a pool on stated terms. Investing outside them spends other people\u2019s donations on something they did not agree to.',
        evidence: 'document',
        authority: 'SS 26',
      },
    ],
  },

  // ── combination, which is where most structures actually fail ───────────

  {
    id: 'combining-contracts',
    name: 'Combining contracts in one arrangement',
    family: 'combination',
    authority: 'AAOIFI Shariah Standard No. 25',
    calculations: [],
    conditions: [
      {
        id: 'not-prohibited-in-combination',
        requirement:
          'The combination is not one the sources address directly, such as a sale joined to a loan.',
        why:
          'Some pairings are named because together they do something neither does alone: a loan made attractive by a sale is a loan with a return attached to it.',
        evidence: 'document',
        authority: 'SS 25',
      },
      {
        id: 'no-contract-conditional-on-another',
        requirement:
          'No contract in the arrangement is made a condition of another, and each can be concluded, performed or refused on its own terms.',
        why:
          'Contracts made conditional on each other are one contract with several signatures. The parties cannot say which obligation they are performing, and a defect in one silently becomes a defect in all.',
        evidence: 'document',
        authority: 'SS 25',
      },
      {
        id: 'not-a-route-to-what-is-otherwise-refused',
        requirement:
          'The combination is not used to reach an outcome the board would not approve if it were sought directly.',
        why:
          'This is the condition most arrangements fail. Each contract passes on its own, and the sequence produces a fixed return on money — which is why the arrangement is judged as a whole and not as a list of parts.',
        evidence: 'sequence',
        authority: 'SS 25',
      },
      {
        id: 'no-circularity',
        requirement:
          'The arrangement does not return the subject to a party who sold it, at a different price, as part of the same sequence.',
        why:
          'A subject that comes back to where it started has not moved in substance. What moved was money, out and back with a difference, and the intervening steps are the form.',
        evidence: 'sequence',
        authority: 'SS 25; SS 30 on monetisation',
      },
      {
        id: 'each-contract-valid-on-its-own',
        requirement: 'Each contract in the arrangement satisfies its own conditions.',
        why:
          'A combination cannot repair a defective part. Judging the whole is in addition to judging the pieces, not instead of it.',
        evidence: 'document',
        authority: 'SS 25',
      },
    ],
  },
];

/** Lookup by id, so a matter can name the structure it is being judged against. */
export function structureById(id: string): Structure | undefined {
  return structures.find((s) => s.id === id);
}

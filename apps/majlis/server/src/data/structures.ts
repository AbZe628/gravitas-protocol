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
];

/** Lookup by id, so a matter can name the structure it is being judged against. */
export function structureById(id: string): Structure | undefined {
  return structures.find((s) => s.id === id);
}

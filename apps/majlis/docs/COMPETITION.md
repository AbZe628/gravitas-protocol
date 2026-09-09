# The competition, and what it makes easy that Majlis makes hard

Written **9 September 2026**.

Two rules held while writing this:

1. **Nothing is marked as *had* unless it was opened in the running
   application**, under a credential, at a stated width. The evidence is the
   sweep and the per-role act probe recorded in `AUDIT-FULL.md`.
2. **A claim about a competitor is either sourced or marked unverified.** Two
   figures this project has been repeating did not survive checking, and they
   are named in §5.

---

## 1. The four categories, and which one matters

| category | who | what they sell | do they compete? |
|---|---|---|---|
| **Board portals** | Diligent, Nasdaq Boardvantage, Convene, BoardEffect | the meeting cycle: pack, annotate, vote, minute, sign | **most**, and least obviously |
| **AI advisers** | Yani, ShariaTech AI, ShariahLab, Ansari | ask a question, get an answer against standards | partly, and on the axis Majlis refuses |
| **Screening data** | IdealRatings, Musaffa, Zoya, Islamicly | is this instrument compliant, and how much to purify | on figures only |
| **Islamic core banking** | Azentio iMAL, Oracle FLEXCUBE, Finacle, FIS, Newgen | the bank's ledger and products | not at all — but they own the desk |

**The board portals are the real competition** and the reason is not features.
They have spent twenty years making a board's work legible, and a Shariah board
is a board. If a bank already runs Diligent, the Shariah committee is offered a
seat on it, and the answer to *why not just use the portal we have* is the whole
of Majlis's case.

That case is: a corporate portal holds a meeting. It does not hold a **ruling
that stays in force between meetings**, the **register of what the bank may do
under it**, the **drift that puts a ruling back in question**, or the
**purification a breach creates**. Everything after the vote is the part no
board portal has, and it is most of a Shariah board's year.

---

## 2. Board portals, feature by feature

Diligent is used as the reference because its capabilities are the best
documented.

| capability | Diligent | Majlis | verified how |
|---|---|---|---|
| Board book / pack for a sitting | yes | **have it, reachable** | `/meetings/:id/book` opened as secretary and observer |
| Agenda in order, pack under each item | yes | **have it** | same |
| Annotations on a document, shared or private | yes | **have it, reachable** | `POST /annotations`, anchored to the quote not the offset |
| Voting inside and outside a meeting | yes | **have it** | matter votes are not tied to a sitting |
| Real-time tally | yes | **have it** | vote panel |
| **Anonymous voting** | yes | **do not have it** | Majlis records reasoning against a name by design |
| **Written consent / resolution in lieu of a meeting** | yes | **do not have it** | no such object |
| Minutes | yes, drafted from the agenda template | **have it, reachable — but invisible on the demonstration record** | see F16 in `AUDIT-FULL.md`: the only seeded meeting is `closed`, and the minute field renders only while it is not. Convening one made *Record attendance*, *Save the minute* and 8 fields appear for the secretary |
| Minutes circulated, corrected, adopted at the next meeting | yes | **do not have it** | no adoption-of-minutes step |
| E-signature on the finished document | yes | **have it** | `POST /matters/:id/sign`, with an unsealed installation saying so |
| **Routing a document to an external signer** | yes | **do not have it** | signing is by board members only |
| **Offline access to the pack** | yes | **do not have it** | no service worker, no offline store |
| Attendance record | yes | **have it** | `PUT /meetings/:id/attendance` |
| Calendar | yes | **have it** | `/calendar` and `/api/calendar.ics` |
| **Calendar subscription per member** | yes | **do not have it** | `.ics` is a download; STATE.md §0 item 2 |
| **Conflict of interest register** | yes | **do not have it** | and it is a named regulatory obligation — see `HOW-A-BOARD-WORKS.md` |
| Task / action tracking after a meeting | yes | **have it, reachable** | undertakings, closed by an account rather than a tick |
| Search across everything | yes | **have it but thin** | `/search` is 74 words and 0 results shown until you type |
| Secure messaging between members | yes | **do not have it** | deliberation is on the matter, not private |
| Skills / succession matrix | yes | **do not have it** | out of scope, correctly |

**Four gaps worth taking from this table**, in order: conflict of interest,
adoption of minutes, offline pack, calendar subscription. The rest are either
deliberate refusals or genuinely out of scope.

**What Majlis has that no board portal does:** a ruling that stays in force, the
register under it, drift detection against the board's own limits, the
examination comparing what was executed against what was approved, purification
arising from a breach, and the supersession chain. None of that exists in
Diligent because a corporate board does not need it.

---

## 3. The AI advisers

| product | what it is | what it outputs |
|---|---|---|
| **Yani** (`yanipro.ai`) | one of five modules in an audit and compliance suite aimed at SAMA-regulated institutions. The others are AI Auditor, business continuity, cybersecurity, IT governance | *"Validate Islamic finance instruments against Shariah standards clause by clause, with exportable reports."* All modules claim to be *"grounded entirely in your own evidence"* |
| ShariaTech AI, ShariahLab, ShariaBot, Ansari | assistant-style question answering over Islamic finance sources | an answer, with sources of varying quality |

**The axis they compete on is the one Majlis refuses.** Yani validates *against
Shariah standards*. Majlis names no standard, because which standard governs is
each board's own decision — that was settled deliberately, and 107 citations
were removed from `data/structures.ts` to make it true.

That refusal is a genuine commercial risk and should be stated as a position
rather than left implicit: a buyer comparing a tool that says *compliant* with
one that says *here is where each condition is answered and a scholar must
decide* will need to be told why the second is the correct product for a body
whose entire function is to be the one who decides.

**Majlis's equivalent is `services/reading-a-contract.ts`**, opened at `/check`.
It returns where each condition is answered in the text, with the sentence and
the offset, and stops. There is deliberately no `met`. It is the closest thing
in the product to what these tools sell, and — per finding F1 in the audit — an
observer clicking a contract shape gets the refusal **1,370 pixels below the
click**, at the bottom of the page. The one feature that competes head-on is
the one the demonstration instance appears to break.

---

## 4. Screening data

| product | coverage | basis |
|---|---|---|
| **IdealRatings** | institutional; used by Islamic banks and fund managers; also has a purification engine running weekly to quarterly | sold as a data feed |
| **Musaffa** | 120,000+ stocks, 8,500+ ETFs | AAOIFI-approved methodology |
| **Zoya** | 40,000+ stocks, ETFs, funds | AAOIFI standards |
| **Islamicly** | backed by IdealRatings | Dow Jones Islamic Market Index methodology |

The commonly cited AAOIFI thresholds are debt to market cap **below 30%**,
interest-bearing deposits **below 30%**, and impermissible income **below 5%**.

**Majlis is not in this market and should not enter it.** It has no security
master and no price feed, and building one would be competing with IdealRatings
on data rather than on governance.

What Majlis does instead is the deliberate inverse: `services/screening.ts`
carries **no thresholds at all**. The limits arrive from the board in
`Figures.thresholds`, there is no fallback, and a ratio sent without a limit
comes back computed in full but **untested**, carrying
`unknownBecause: 'no_limit_set'`.

That is the right relationship to this category: **a screening provider says
whether it passes; Majlis records whose threshold it was tested against.** A
bank can and should feed IdealRatings figures into Majlis. Worth saying out
loud in the material for banks, because it turns four competitors into four
inputs.

---

## 5. Two figures this project repeats that did not survive checking

**"AAOIFI Standard 62 (2023) obliges institutions to re-audit existing contract
templates."** It is still a **draft** — exposed November 2023, feedback extended
twice to 31 July 2024, no final text and no implementation date. It is also
about **sukuk**, specifically the transfer of legal title to the SPV, not
contract templates generally. Written up in `HOW-A-BOARD-WORKS.md` §1.

**"Azentio iMAL runs roughly 150 of the world's 250 Islamic banks."** Not
verifiable. Azentio's own material says iMAL is *"the world's leading Islamic
banking platform and the only AAOIFI-certified core built specifically for
Shari'ah-compliant finance"*, implemented in **more than 36 countries**. No
public source gives the 150-of-250 split. **Unverified — do not print it.**

**"Roughly 1,600 qualified scholars serve 250-odd institutions."** Not checked
in this pass. Treat as unverified until it is.

**One claim that did hold.** Searching for software that keeps a Shariah board's
minutes, resolutions and fatwas returns regulatory frameworks and academic
papers, not products. The secondary literature also confirms the shape Majlis
assumes: *"administrative duties such as recording and documenting meeting
minutes are typically handled by the bank's management"* — which is the
secretary role, and is why Majlis is right to give the secretary the pen.

---

## 6. What the competition makes easy that Majlis makes hard

The useful question, answered from the measurements in `AUDIT-FULL.md`.

| they make easy | Majlis today |
|---|---|
| Finding anything from anywhere | at 375px the navigation carries **7 of 17** destinations; the other ten need a return to home |
| Opening a pack and reading it on a plane | no offline anything |
| Seeing what needs me, first | the arrival screen contradicts itself for the observer, which is every demonstration visitor |
| Knowing what a button will do before pressing it | the bank's desk is shown **8 controls the server refuses** |
| Getting a PDF | **no PDF engine exists**; every document leaves as HTML or JSON |
| Being told what failed | **nine different failures print the same nine words** |
| Reaching the main work in one screen | the main *Deciding* screen puts the first record **2.07 screens down** behind 450 words of prose |

Every row is a measured fault from the audit rather than a missing feature.
**None of them needs a new capability.** That is the encouraging reading of this
document: the product's substance is ahead of every competitor on the things a
Shariah board does after the vote, and behind all of them on whether a person
can find it.

---

## Sources

- [Diligent Boards voting and resolutions](https://www.diligent.com/features/boards/boards-voting)
- [Diligent: board portal definition and features](https://www.diligent.com/resources/blog/board-portal)
- [Diligent: board meeting minutes software](https://www.diligent.com/resources/blog/best-ai-board-meeting-minutes)
- [Yani products](https://yanipro.ai/products/)
- [IdealRatings Shariah equity screening and purification brochure (PDF)](https://idealratings.s3.eu-west-1.amazonaws.com/Marketing/IdealRatings+Shariah+Equity+Screening+&+Purification+Solutions+Brochure.pdf)
- [Musaffa: rationale behind the screening benchmark](https://academy.musaffa.com/know-the-rationale-behind-the-halal-stock-screening-benchmark/)
- [Zoya vs Musaffa comparison](https://www.halalwallet.us/investing/stock-screeners)
- [Azentio iMAL Islamic banking](https://www.azentio.com/banking/imal-islamic-banking)
- [Gartner Peer Insights: Azentio iMAL alternatives](https://www.gartner.com/reviews/product/azentio-imal-islamic-banking/alternatives)
- [AAOIFI press release on draft Shariah Standard No. 62](https://aaoifi.com/announcement/press-release-from-the-accounting-and-auditing-organisation-for-islamic-financial-institutions-aaoifi-regarding-draft-shariah-standard-no-62/?lang=en)
- [Central Bank of Kuwait: Shariah supervisory board rules (PDF)](https://www.cbk.gov.kw/en/images/13part1-2783_v60_tcm10-2783.pdf)

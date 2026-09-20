import { describe, it, expect } from 'vitest';
import {
  readContractWithModel,
  readingOf,
  screenPassages,
} from '../src/services/reading-with-a-model.js';
import { ExtractionRefused } from '../src/services/extraction.js';
import { structures } from '../src/data/structures.js';
import type { Structure } from '../src/types.js';

/**
 * Reading a contract with a model, and everything it is not allowed to do.
 *
 * The reader exists because the word matcher reported the clause a board
 * would stop on first — *1.5% per month on late payment* — as absent. So the
 * first thing here is that it finds it. Everything after that is the line
 * the whole product stands on: it locates and quotes, and it never once says
 * whether a condition is met.
 */

const murabaha = structures.find((s) => s.id === 'murabaha') as Structure;

const DRAFT = `MURABAHA SALE AGREEMENT

1. PURCHASE BY THE BANK
1.1 The Bank shall purchase the Goods from the Supplier and shall take delivery at the Supplier's warehouse.

2. SALE TO THE CUSTOMER
2.1 The Bank shall sell the Goods to the Customer at the Cost Price plus a Profit Margin.
2.2 The Cost Price and the Profit Margin shall each be disclosed in writing.

3. PAYMENT
3.1 The Customer shall pay the Sale Price in 36 equal monthly instalments.
3.2 Should the Customer fail to pay any instalment when due, an additional amount of 1.5% per month shall accrue on the outstanding balance and shall be retained by the Bank as compensation for the delay.
`;

/** The model, replaced. Everything its answer passes through is the real thing. */
const saying = (text: string) =>
  ({
    messages: { create: async () => ({ content: [{ type: 'text', text }] }) },
  }) as never;

const nth = (id: string) => murabaha.conditions.findIndex((c) => c.id === id) + 1;

const read = (reply: unknown, over = DRAFT, mediaType = 'text/plain') =>
  readContractWithModel({
    structure: murabaha,
    adopted: true,
    bytes: Buffer.from(over, 'utf8'),
    mediaType,
    documentName: 'murabaha.txt',
    readAt: '2026-09-21T00:00:00.000Z',
    client: saying(typeof reply === 'string' ? reply : JSON.stringify(reply)),
  });

const of = (reading: Awaited<ReturnType<typeof read>>, id: string) =>
  reading.conditions.find((c) => c.conditionId === id)!;

const LATE = murabaha.conditions.find((c) => c.id === 'no-late-increase')!;

describe('the clause the word matcher missed', () => {
  it('is found, quoted and located', async () => {
    const reading = await read({
      passages: [
        {
          condition: nth('no-late-increase'),
          quote:
            'Should the Customer fail to pay any instalment when due, an additional amount of 1.5% per month shall accrue on the outstanding balance and shall be retained by the Bank as compensation for the delay.',
          page: 1,
          label: 'Clause 3.2 — PAYMENT',
          notAddressed: false,
        },
      ],
    });

    const late = of(reading, 'no-late-increase');
    expect(late.standing).toBe('found');
    expect(late.passages[0].text).toContain('1.5% per month');
    expect(late.passages[0].label).toBe('Clause 3.2 — PAYMENT');
    expect(reading.readBy).toBe('model');
  });

  it('is never called a breach, however plainly it is one', async () => {
    const reading = await read({
      passages: [
        {
          condition: nth('no-late-increase'),
          quote:
            'Should the Customer fail to pay any instalment when due, an additional amount of 1.5% per month shall accrue on the outstanding balance and shall be retained by the Bank as compensation for the delay.',
          page: 1,
          label: 'Clause 3.2',
          notAddressed: false,
        },
      ],
    });

    /*
     * This clause takes an increase to the bank's own income for the passage
     * of time. A scholar reading it will say so in one breath, and nothing
     * here may say it for them — not in the standing, not in the note.
     */
    const words = JSON.stringify(reading).toLowerCase();
    for (const verdict of [
      'non-compliant',
      'not compliant',
      'impermissible',
      'in breach',
      'violates',
      'is riba',
      'unacceptable',
    ]) {
      expect(words).not.toContain(verdict);
    }
    expect(of(reading, 'no-late-increase').standing).not.toBe('met');
  });
});

describe('a quote that is not in the document', () => {
  it('is thrown away, named, and never shown', async () => {
    const reading = await read({
      passages: [
        {
          condition: nth('cost-disclosed'),
          quote: 'The Bank warrants that this Agreement conforms to AAOIFI standards.',
          page: 1,
          notAddressed: false,
        },
      ],
    });

    const cost = of(reading, 'cost-disclosed');
    expect(cost.standing).toBe('unclear');
    expect(cost.passages).toHaveLength(0);
    expect(cost.note).toContain('not in the document');
    // And the reading itself says something was discarded, rather than
    // looking merely thin.
    expect(reading.limits.join(' ')).toContain('thrown away');
  });
});

describe('what "found" is allowed to mean', () => {
  it('needs a quote somebody checked, so a PDF never reaches it', async () => {
    const reading = await read(
      {
        passages: [
          {
            condition: nth('cost-disclosed'),
            quote: 'The Cost Price and the Profit Margin shall each be disclosed in writing.',
            page: 2,
            label: 'Clause 2.2',
            notAddressed: false,
          },
        ],
      },
      DRAFT,
      'application/pdf',
    );

    const cost = of(reading, 'cost-disclosed');
    expect(cost.standing).toBe('unclear');
    // The passage is still shown — a scholar needs it — and it is labelled
    // for what it is.
    expect(cost.passages[0].text).toContain('Profit Margin');
    expect(cost.note).toContain('account of the document');
    expect(reading.charactersRead).toBe(0);
    expect(reading.limits.join(' ')).toContain('sent whole');
  });

  it('is not reached by an order of events, which still needs a person', async () => {
    const reading = await read({
      passages: [
        {
          condition: nth('ownership-before-sale'),
          quote:
            "1.1 The Bank shall purchase the Goods from the Supplier and shall take delivery at the Supplier's warehouse.",
          page: 1,
          notAddressed: false,
        },
      ],
    });

    const owns = of(reading, 'ownership-before-sale');
    expect(owns.standing).toBe('found');
    expect(owns.needsAPerson).toBe(true);
    expect(owns.note).toContain('order');
  });
});

describe('a condition nothing was offered for', () => {
  it('comes back as a gap when the model says so', async () => {
    const reading = await read({
      passages: [{ condition: nth('asset-identified'), quote: null, notAddressed: true }],
    });
    expect(of(reading, 'asset-identified').standing).toBe('absent');
  });

  it('comes back as a gap when the model never mentions it', async () => {
    const reading = await read({ passages: [] });
    expect(reading.conditions).toHaveLength(murabaha.conditions.length);
    expect(reading.conditions.every((c) => c.standing === 'absent')).toBe(true);
  });

  it('says a gap is not the condition failing', async () => {
    const reading = await read({ passages: [] });
    expect(of(reading, 'asset-identified').note).toContain('not the condition failing');
  });
});

describe('the output gate', () => {
  it('refuses the whole answer when the model rules in its own prose', async () => {
    await expect(
      read(
        'Having reviewed the agreement, this is permissible.\n' +
          JSON.stringify({ passages: [{ condition: 1, notAddressed: true }] }),
      ),
    ).rejects.toBeInstanceOf(ExtractionRefused);
  });

  /*
   * The gate the assistant uses is built for sentences and wants a pronoun
   * and a verb. A clause label is a fragment, and
   * "Clause 2.2 — compliant with the disclosure requirement" walked straight
   * past every pattern in it. Found by this test, watching the gate not hold.
   */
  it('drops a clause pointer that carries a judgement, and keeps the passage', async () => {
    const reading = await read({
      passages: [
        {
          condition: nth('cost-disclosed'),
          quote: 'The Cost Price and the Profit Margin shall each be disclosed in writing.',
          page: 1,
          label: 'Clause 2.2 — compliant with the disclosure requirement',
          notAddressed: false,
        },
      ],
    });

    const cost = of(reading, 'cost-disclosed');
    expect(cost.passages[0].text).toContain('Profit Margin');
    expect(cost.passages[0].label).toBeUndefined();
    expect(reading.limits.join(' ')).toContain('carried a judgement');
  });

  it('tolerates one, because contracts really are headed REGULATORY COMPLIANCE', async () => {
    const reading = await read({
      passages: [
        {
          condition: nth('cost-disclosed'),
          quote: 'The Cost Price and the Profit Margin shall each be disclosed in writing.',
          label: 'Clause 7 — REGULATORY COMPLIANCE',
          notAddressed: false,
        },
      ],
    });
    expect(of(reading, 'cost-disclosed').standing).toBe('found');
  });

  it('refuses the whole answer at the second different one', async () => {
    await expect(
      read({
        passages: [
          {
            condition: nth('cost-disclosed'),
            quote: 'The Cost Price and the Profit Margin shall each be disclosed in writing.',
            label: 'Clause 2.2 — compliant',
            notAddressed: false,
          },
          {
            condition: nth('no-late-increase'),
            quote: 'The Customer shall pay the Sale Price in 36 equal monthly instalments.',
            label: 'Clause 3.1 — impermissible increase',
            notAddressed: false,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(ExtractionRefused);
  });

  it('shows a verdict the contract itself makes, which is the contract talking', async () => {
    const draft =
      DRAFT + '\n4. WARRANTY\n4.1 The Bank warrants that this Agreement is Shariah compliant.\n';

    const reading = await read(
      {
        passages: [
          {
            condition: nth('cost-disclosed'),
            quote: 'The Bank warrants that this Agreement is Shariah compliant.',
            page: 1,
            label: 'Clause 4.1',
            notAddressed: false,
          },
        ],
      },
      draft,
    );

    // Refusing to show a board what their own bank wrote would be the
    // opposite of the job.
    expect(of(reading, 'cost-disclosed').passages[0].text).toContain('Shariah compliant');
  });

  it('refuses an answer that is not JSON at all', async () => {
    await expect(read('I have read the contract and it looks fine to me.')).rejects.toBeInstanceOf(
      ExtractionRefused,
    );
  });
});

describe('the screening, without a model', () => {
  it('ignores a condition number nobody asked for', () => {
    const out = screenPassages([{ condition: 99, quote: 'anything' }], 3, null);
    expect(out).toHaveLength(3);
    expect(out.every((x) => x.quote === null)).toBe(true);
  });

  it('keeps the first of two answers and says there were two', () => {
    const out = screenPassages(
      [
        { condition: 1, quote: 'the first sentence' },
        { condition: 1, quote: 'a different sentence' },
      ],
      1,
      null,
    );
    expect(out[0].quote).toBe('the first sentence');
    expect(out[0].thrownAway).toContain('second');
    // Shown, and shown as not to be relied on: a reader must see both facts.
    expect(readingOf(LATE, out[0]).standing).toBe('unclear');
    expect(readingOf(LATE, out[0]).passages).toHaveLength(1);
  });

  it('verifies across whitespace, because a copied clause loses its line breaks', () => {
    const out = screenPassages(
      [{ condition: 1, quote: 'shall be   disclosed IN WRITING' }],
      1,
      'the cost shall be\ndisclosed in writing.',
    );
    expect(out[0].verified).toBe(true);
  });
});

describe('the measure itself', () => {
  /*
   * Every count in this repository has been wrong once. These two prove the
   * tests above can fail — a green suite that never reached the assertion is
   * the failure this project keeps finding.
   */
  it('would notice a reader that called everything found', async () => {
    const reading = await read({
      passages: murabaha.conditions.map((_, i) => ({
        condition: i + 1,
        quote: 'The Cost Price and the Profit Margin shall each be disclosed in writing.',
        notAddressed: false,
      })),
    });
    // Every quote is genuinely in the draft, so this is the honest worst
    // case: the reader pointing at one clause for everything. The standings
    // are `found`, and the test above that matters — the verdict scan —
    // still holds, which is the point.
    expect(reading.conditions.filter((c) => c.standing === 'found').length).toBeGreaterThan(1);
  });

  it('would notice a reading that lost a condition', async () => {
    const reading = await read({ passages: [{ condition: 1, notAddressed: true }] });
    expect(reading.conditions.map((c) => c.conditionId)).toEqual(
      murabaha.conditions.map((c) => c.id),
    );
  });
});

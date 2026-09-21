import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { I18nProvider } from './lib/i18n.js';
import ChangeTheConditions, { named } from './components/ChangeTheConditions.js';
import type { MatterSummary, StructureCondition } from './lib/api.js';

/**
 * A board writing its own version of a shape's conditions.
 *
 * ── what was missing ──────────────────────────────────────────────────────
 *
 * The server has taken an amended shape since adoption was written — its own
 * conditions, copied not referenced, refused without a decision behind it —
 * and no screen ever sent one. A board could take the shipped conditions
 * whole or refuse them, and the adoption panel said amending belonged
 * "beside the condition it changes" while there was no beside.
 *
 * ── what these hold ───────────────────────────────────────────────────────
 *
 * The three rules that make this a decision rather than a settings form:
 * it names a ruling that carried, it says what changed and why, and it
 * supersedes rather than overwrites. And the one that makes it usable: what
 * is missing is named before the press, not refused after it.
 */

const HELD: StructureCondition[] = [
  {
    id: 'ownership-before-sale',
    requirement: 'The institution owns the asset before selling it on.',
    why: 'Selling what one does not own turns the sale into a financing of money by money.',
    evidence: 'sequence',
  },
  {
    id: 'cost-disclosed',
    requirement: 'The original cost and the mark-up are disclosed to the buyer.',
    why: 'Murabaha is a sale of trust, and undisclosed cost makes it an ordinary sale.',
    evidence: 'document',
  },
];

const CARRIED: MatterSummary[] = [
  { id: 'matter-1', title: 'Adopting the murabaha conditions', status: 'in_force' } as MatterSummary,
];

function sent() {
  const calls: { url: string; body: Record<string, unknown> }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const json = (b: unknown) =>
        new Response(JSON.stringify(b), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });

      if (init?.method && init.body) {
        calls.push({ url, body: JSON.parse(String(init.body)) });
        return json({ adoption: {}, note: 'recorded' });
      }
      if (url.includes('/api/attention'))
        return json({ scholarId: 'member-a', role: 'signatory', office: null, outstanding: 0, overdue: 0, items: [] });
      return json({});
    }),
  );
  return calls;
}

afterEach(() => vi.unstubAllGlobals());

function show(carried = CARRIED, onDone = vi.fn()) {
  render(
    <I18nProvider>
      <ChangeTheConditions
        structureId="murabaha"
        boardId="board-1"
        held={HELD}
        supersedes="adoption-7"
        carried={carried}
        onDone={onDone}
      />
    </I18nProvider>,
  );
  return onDone;
}

/** Open the editor. It is folded until asked for, like every tool here. */
async function openIt(carried = CARRIED, onDone = vi.fn()) {
  const done = show(carried, onDone);
  fireEvent.click(await screen.findByRole('button', { name: /Change these conditions/ }));
  return done;
}

/*
 * The decision picker is the last of the selects: every condition carries
 * one for how it is shown, and the decision comes after them all.
 */
const decisionPicker = () => screen.getAllByRole('combobox').slice(-1)[0];

const boxes = (label: RegExp) =>
  screen.getAllByRole('textbox').filter((b) => label.test(b.closest('label')?.textContent ?? ''));

describe('the conditions can be changed', () => {
  it('starts from what the board holds today, not from an empty form', async () => {
    sent();
    await openIt();

    const wording = boxes(/What must be true/);
    expect(wording).toHaveLength(2);
    expect((wording[0] as HTMLTextAreaElement).value).toContain('owns the asset');
  });

  it('records a rewording under the decision it was made in', async () => {
    const calls = sent();
    await openIt();

    fireEvent.change(boxes(/What must be true/)[1], {
      target: { value: 'The cost, the mark-up and any discount are disclosed in writing.' },
    });
    fireEvent.change(boxes(/What changed, and why/)[0], {
      target: { value: 'Discounts were being left out of the disclosure.' },
    });
    fireEvent.change(decisionPicker(), { target: { value: 'matter-1' } });

    fireEvent.click(screen.getByRole('button', { name: /Record the amendment/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /Record the amendment/ }));

    await waitFor(() => expect(calls).toHaveLength(1));
    const body = calls[0].body as Record<string, unknown>;
    expect(calls[0].url).toContain('/api/adoptions');
    expect(body.standing).toBe('amended');
    expect(body.matterId).toBe('matter-1');
    /* Superseding, never overwriting: the earlier version has findings on it. */
    expect(body.supersedes).toBe('adoption-7');
    expect(body.amendments).toEqual(['Discounts were being left out of the disclosure.']);

    const conditions = body.conditions as StructureCondition[];
    expect(conditions).toHaveLength(2);
    /* A rewording is not a new condition: the id is what findings point at. */
    expect(conditions[1].id).toBe('cost-disclosed');
    expect(conditions[1].requirement).toContain('any discount');
  });

  it('says what is missing rather than letting the server refuse it', async () => {
    sent();
    await openIt();

    // Nothing changed, nothing said, no decision named.
    expect(screen.getByRole('button', { name: /Record the amendment/ })).toBeDisabled();
    expect(screen.getByText(/Name the decision this was made in/)).toBeInTheDocument();
    expect(screen.getByText(/Nothing has been changed yet/)).toBeInTheDocument();
  });

  it('names the condition whose reason is too thin, not just "something is wrong"', async () => {
    sent();
    await openIt();

    fireEvent.click(screen.getByRole('button', { name: /Add a condition/ }));
    const wording = boxes(/What must be true/);
    fireEvent.change(wording[2], { target: { value: 'The commodity is deliverable.' } });

    /*
     * One sentence naming one condition. "Something is missing" is what a
     * form says when it has not been written for a board with eleven
     * conditions in front of them.
     */
    expect(
      screen.getByText(/No reason given for .*The commodity is deliverable/),
    ).toBeInTheDocument();
  });

  it('offers no way through where no ruling carried', async () => {
    sent();
    await openIt([]);

    /*
      Nothing becomes binding by administration. Without a decision there is
      nothing for an amendment to stand on, so the picker is absent rather
      than empty and the sentence says why.
    */
    expect(screen.queryByText(/Name the decision this was made in/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Record the amendment/ })).toBeDisabled();
  });
});

describe('the board’s own standard', () => {
  it('is read here, named in the record, and not kept', async () => {
    const calls = sent();
    await openIt();

    /*
     * jsdom's File has no `text()`, which every browser has had since 2020.
     * Given here rather than worked around in the component: a fallback
     * added to the application to satisfy a test environment is a fallback
     * nobody in production ever runs, and it would be the only untested
     * path in the file.
     */
    const body = 'OUR STANDARD\n\n1. The bank owns before it sells.';
    const file = new File([body], 'standard.txt', { type: 'text/plain' });
    Object.defineProperty(file, 'text', { value: async () => body });
    const chooser = screen.getByLabelText(/Open the board’s own standard/) as HTMLInputElement;
    fireEvent.change(chooser, { target: { files: [file] } });

    // Shown beside the conditions while they are written.
    await screen.findByText(/OUR STANDARD/);

    fireEvent.change(boxes(/What must be true/)[0], {
      target: { value: 'The bank owns the asset before it sells it.' },
    });
    fireEvent.change(boxes(/What changed, and why/)[0], {
      target: { value: 'Brought into line with our own standard.' },
    });
    fireEvent.change(decisionPicker(), { target: { value: 'matter-1' } });

    fireEvent.click(screen.getByRole('button', { name: /Record the amendment/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /Record the amendment/ }));

    await waitFor(() => expect(calls).toHaveLength(1));
    const amendments = (calls[0].body as { amendments: string[] }).amendments;

    /* The name, as where the version came from. */
    expect(amendments.join(' ')).toContain('standard.txt');
    /* And never the document: this records conditions, not somebody's paper. */
    expect(JSON.stringify(calls[0].body)).not.toContain('OUR STANDARD');
  });
});

describe('naming a condition the board wrote', () => {
  /*
   * Pure, because this decides what a finding three years from now points
   * at. An id settled while the box was empty would put "condition-2" in
   * the record for a condition about ownership.
   */
  it('takes the id from the words, not from a counter', () => {
    const out = named([
      { id: 'new:0', requirement: 'The commodity is real and deliverable.', why: 'x', evidence: 'document' },
    ]);
    expect(out[0].id).toBe('the-commodity-is-real-and');
  });

  it('keeps the id of a condition that was already there', () => {
    const out = named([{ ...HELD[0], requirement: 'Reworded entirely.' }]);
    expect(out[0].id).toBe('ownership-before-sale');
  });

  it('does not let two new conditions collide', () => {
    const out = named([
      { id: 'new:0', requirement: 'The asset is identified.', why: 'x', evidence: 'document' },
      { id: 'new:1', requirement: 'The asset is identified.', why: 'y', evidence: 'document' },
    ]);
    expect(out[0].id).not.toBe(out[1].id);
  });

  it('does not collide with one that is already held', () => {
    const out = named([
      { id: 'the-asset-is-identified', requirement: 'kept', why: 'x', evidence: 'document' },
      { id: 'new:1', requirement: 'The asset is identified.', why: 'y', evidence: 'document' },
    ]);
    expect(out[1].id).toBe('the-asset-is-identified-2');
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ReadDocument from './components/ReadDocument.js';
import { I18nProvider } from './lib/i18n.js';

/**
 * Reading figures out of a document, on the screen.
 *
 * The server already refuses to confirm anything on a member's behalf. What
 * this file holds is the part only an interface can get wrong: that confirming
 * stays an act, one figure at a time, against the sentence the figure came
 * from — and that a gap arrives looking like a gap.
 *
 * The failure being designed against is not a wrong number. It is five right
 * numbers and a button that takes all of them, after which nobody has read
 * anything and the record says a scholar checked it.
 */

const CANDIDATES = [
  {
    field: 'nonPermissibleIncome',
    value: '3,200,000',
    quote: 'Total non-permissible income for the period was 3,200,000 AED.',
    locator: { page: 4 },
    quoteVerified: true,
    confirmedBy: null,
    confirmedAt: null,
    notFound: false,
  },
  {
    field: 'marketCapitalisation',
    value: null,
    quote: null,
    locator: null,
    quoteVerified: false,
    confirmedBy: null,
    confirmedAt: null,
    notFound: true,
  },
];

const EXTRACTION = {
  documentName: 'interim-accounts.txt',
  fields: ['nonPermissibleIncome', 'marketCapitalisation'],
  candidates: CANDIDATES,
  discarded: [{ field: 'totalIncome', reason: 'The value was not in the quote it was given with.' }],
  note: 'Nothing here is a figure until a member confirms it against the quote beside it.',
};

const DOCUMENT = {
  matterId: 'm1',
  matterTitle: 'Screening the issuer',
  sourceId: 's1',
  label: 'Interim accounts',
  name: 'interim-accounts.txt',
  bytes: 4096,
  mediaType: 'text/plain',
  addedBy: 'member-a',
  at: '2026-09-01T09:00:00.000Z',
  withdrawn: false,
};

function stub(over: Partial<typeof EXTRACTION> = {}, documents = [DOCUMENT]) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const json = (b: unknown) =>
        new Response(JSON.stringify(b), { status: 200, headers: { 'Content-Type': 'application/json' } });

      if (url.includes('/api/health')) {
        return json({ ok: true, stage: 2, documents: 'disk', reading: 'anthropic' });
      }
      if (url.includes('/api/attention')) {
        return json({ scholarId: 'member-a', role: 'signatory', office: null, outstanding: 0, overdue: 0, items: [] });
      }
      if (url.includes('/extract')) return json({ ...EXTRACTION, ...over });
      if (url.includes('/api/documents')) return json({ documents });
      return json({});
    }),
  );
}

const FIELDS = [
  { key: 'nonPermissibleIncome', label: 'Non-permissible income' },
  { key: 'marketCapitalisation', label: 'Market capitalisation' },
  { key: 'totalIncome', label: 'Total income' },
];

function show(onConfirm = vi.fn()) {
  render(
    <I18nProvider>
      <ReadDocument fields={FIELDS} onConfirm={onConfirm} />
    </I18nProvider>,
  );
  return onConfirm;
}

/** Open the panel, pick the document, read it. */
async function readIt() {
  fireEvent.click(await screen.findByRole('button', { name: /Read the figures from a document/ }));
  await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument());
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 's1' } });
  fireEvent.click(screen.getByRole('button', { name: /^Read it$/ }));
}

afterEach(() => vi.unstubAllGlobals());

describe('confirming is an act, and it is done one figure at a time', () => {
  it('offers no way to accept everything at once', async () => {
    stub();
    show();
    await readIt();

    await waitFor(() => expect(screen.getByText('3,200,000')).toBeInTheDocument());

    /*
     * The whole feature turns on this. A scholar checking five figures against
     * five quotes is doing the work; a control that took all five would turn
     * that work into a signature, and the record would then say a person
     * checked something nobody read.
     */
    const buttons = screen.getAllByRole('button').map((b) => b.textContent ?? '');
    expect(buttons.filter((b) => /Confirm this figure/.test(b))).toHaveLength(1);
    expect(buttons.some((b) => /all/i.test(b))).toBe(false);
  });

  it('fills nothing until the button beside the figure is pressed', async () => {
    stub();
    const onConfirm = show();
    await readIt();

    await waitFor(() => expect(screen.getByText('3,200,000')).toBeInTheDocument());
    // The figure is on the screen and the field is still empty.
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('hands back the figure with the sentence it came from and who agreed it', async () => {
    stub();
    const onConfirm = show();
    await readIt();

    fireEvent.click(await screen.findByRole('button', { name: /Confirm this figure/ }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    const [field, value, provenance] = onConfirm.mock.calls[0];
    expect(field).toBe('nonPermissibleIncome');
    expect(value).toBe('3,200,000');

    // Provenance is the point: a typed figure carries none at all, and this is
    // the sentence that ends up in the calculation's source and from there in
    // the fatwa.
    expect(provenance).toContain('interim-accounts.txt');
    expect(provenance).toContain('page 4');
    expect(provenance).toContain('Total non-permissible income for the period was 3,200,000 AED.');
    expect(provenance).toContain('member-a');
  });

  it('does not offer the same figure twice', async () => {
    stub();
    show();
    await readIt();

    fireEvent.click(await screen.findByRole('button', { name: /Confirm this figure/ }));
    await waitFor(() => expect(screen.getByText(/Confirmed, and put into the field/)).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /Confirm this figure/ })).toBeNull();
  });
});

describe('what the scholar is shown', () => {
  it('puts the quote on the screen beside the value, not behind a link', async () => {
    stub();
    show();
    await readIt();

    await waitFor(() =>
      expect(
        screen.getByText(/Total non-permissible income for the period was 3,200,000 AED\./),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText('3,200,000')).toBeInTheDocument();
  });

  it('shows a field it could not find as a gap, with no control on it', async () => {
    stub();
    show();
    await readIt();

    await waitFor(() => expect(screen.getByText(/Not in this document/)).toBeInTheDocument());
    // A gap is the answer. Not a zero, and not a button that would enter one.
    expect(screen.getByText(/a gap is the answer here, not a zero/)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Confirm this figure/ })).toHaveLength(1);
  });

  it('names the fields in the words the form used, not by their keys', async () => {
    stub();
    show();
    await readIt();

    await waitFor(() => expect(screen.getByText('Non-permissible income')).toBeInTheDocument());
    expect(screen.getByText('Market capitalisation')).toBeInTheDocument();
    expect(screen.queryByText('nonPermissibleIncome')).toBeNull();
  });

  it('shows what was thrown away, because a silent discard reads as a thin document', async () => {
    stub();
    show();
    await readIt();

    await waitFor(() => expect(screen.getByText(/Thrown away before you saw it/)).toBeInTheDocument());
    expect(screen.getByText(/was not in the quote it was given with/)).toBeInTheDocument();
    // Named by the label the form uses, like everything else on this panel.
    expect(screen.getByText('Total income')).toBeInTheDocument();
  });

  it('prints the server’s note rather than a sentence of its own', async () => {
    stub();
    show();
    await readIt();

    await waitFor(() => expect(screen.getByText(EXTRACTION.note)).toBeInTheDocument());
  });

  it('warns where the quote was never matched against the document', async () => {
    stub({ candidates: [{ ...CANDIDATES[0], quoteVerified: false }] });
    show();
    await readIt();

    // A PDF is sent as a file, so there was no text to check the quote against.
    // The quote is then the assistant's account of the document rather than an
    // excerpt anybody verified, and that difference is said on the screen.
    await waitFor(() =>
      expect(screen.getByText(/the reading assistant’s account of the document/)).toBeInTheDocument(),
    );
  });

  it('carries the unmatched-quote warning into the provenance itself', async () => {
    stub({ candidates: [{ ...CANDIDATES[0], quoteVerified: false }] });
    const onConfirm = show();
    await readIt();

    fireEvent.click(await screen.findByRole('button', { name: /Confirm this figure/ }));
    expect(onConfirm.mock.calls[0][2]).toContain('not matched against the document text');
  });
});

describe('where there is nothing to read', () => {
  it('says so, and says where a document would come from', async () => {
    stub({}, []);
    show();

    fireEvent.click(await screen.findByRole('button', { name: /Read the figures from a document/ }));

    await waitFor(() =>
      expect(screen.getByText(/No document has been attached to any matter of this board/)).toBeInTheDocument(),
    );
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('keeps a withdrawn citation in the list and marks it', async () => {
    stub({}, [{ ...DOCUMENT, withdrawn: true }]);
    show();

    fireEvent.click(await screen.findByRole('button', { name: /Read the figures from a document/ }));

    // The citation was withdrawn; the document the bank sent is still the
    // document the bank sent, and a board may still need to read it.
    await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument());
    expect(screen.getByRole('option', { name: /citation withdrawn/ })).toBeInTheDocument();
  });
});

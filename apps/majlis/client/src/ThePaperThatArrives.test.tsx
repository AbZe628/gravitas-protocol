import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nProvider } from './lib/i18n.js';
import AttachTheContract from './components/AttachTheContract.js';

/**
 * The format every real enquiry arrives in.
 *
 * ── what this closes ──────────────────────────────────────────────────────
 *
 * The way in read a file's text in the browser and refused a PDF **by
 * name**. That was honest, and it meant the path from a bank to a board
 * worked on every format except the one banks use — so every proof that the
 * path worked was a proof on text somebody had typed.
 *
 * ── the two answers a PDF can get ─────────────────────────────────────────
 *
 * One made by printing carries a text layer, and its words travel with the
 * question. One made by a scanner is a picture of a page: the right answer
 * there is **no**, said as *this is a scan*, because filling the box with
 * the twenty characters a stamp carries would produce a reading reporting
 * every condition absent — true of those characters and false of the
 * agreement.
 *
 * ── and the file still does not move ──────────────────────────────────────
 *
 * Read where it already is. Nothing is uploaded, which is what lets this
 * work on an installation with no mounted volume — every installation, by
 * default — and keeps a confidential draft off a server.
 */

/*
 * The reader is stubbed, not the file. What is under test is the screen's
 * behaviour on each of the three answers the reader can give; whether
 * pdf.js can read a PDF is pdf.js's business, and it is measured against a
 * real bank paper in `work/majlis-local/faza11.mjs` rather than pretended
 * at here.
 */
const wordsFrom = vi.hoisted(() => vi.fn());
vi.mock('./lib/pdf.js', async () => {
  const actual = await vi.importActual<typeof import('./lib/pdf.js')>('./lib/pdf.js');
  return { ...actual, wordsFrom };
});

const { TooFewWords } = await import('./lib/pdf.js');

const WORDS =
  'COMMODITY MURABAHA MASTER AGREEMENT\n\n1.1 The Bank shall purchase the Commodity from the Supplier for a Cost Price of AED 4,250,000.'.padEnd(
    600,
    ' .',
  );

function show(onDraft = vi.fn()) {
  render(
    <I18nProvider>
      <AttachTheContract draft={null} onDraft={onDraft} />
    </I18nProvider>,
  );
  return onDraft;
}

const choose = (name: string, type = 'application/pdf') => {
  const chooser = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(chooser, { target: { files: [new File(['%PDF-1.4'], name, { type })] } });
};

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('a PDF with words behind it', () => {
  it('is taken, and what travels is the words', async () => {
    wordsFrom.mockResolvedValue(WORDS);
    const onDraft = show();

    choose('treasury-enquiry.pdf');

    await waitFor(() => expect(onDraft).toHaveBeenCalledTimes(1));
    const [draft] = onDraft.mock.calls[0];
    expect(draft.name).toBe('treasury-enquiry.pdf');
    expect(draft.text).toContain('COMMODITY MURABAHA MASTER AGREEMENT');
  });

  it('says it is reading, because a press that looks dead is pressed twice', async () => {
    let release: (v: string) => void = () => {};
    wordsFrom.mockReturnValue(new Promise<string>((r) => (release = r)));
    show();

    choose('treasury-enquiry.pdf');

    await screen.findByRole('button', { name: /Reading the document/ });
    release(WORDS);
  });
});

describe('a PDF that is a picture of a page', () => {
  it('is refused, and called a scan', async () => {
    wordsFrom.mockRejectedValue(new TooFewWords(2));
    const onDraft = show();

    choose('treasury-enquiry-scanned.pdf');

    await screen.findByText(/That PDF is a scan/);
    /* And nothing was taken: an empty reading is worse than a refusal. */
    expect(onDraft).not.toHaveBeenCalled();
  });

  it('says what to send instead, while the desk still has it open', async () => {
    wordsFrom.mockRejectedValue(new TooFewWords(2));
    show();

    choose('treasury-enquiry-scanned.pdf');

    const said = await screen.findByText(/That PDF is a scan/);
    expect(said.textContent).toMatch(/exported from a word processor|your lawyers produced/);
  });
});

describe('a PDF that cannot be read at all', () => {
  it('is named, rather than failing quietly', async () => {
    wordsFrom.mockRejectedValue(new Error('broken'));
    const onDraft = show();

    choose('encrypted.pdf');

    await screen.findByText(/encrypted\.pdf/);
    expect(onDraft).not.toHaveBeenCalled();
  });
});

describe('what is not a PDF', () => {
  it('still goes through the plain reader', async () => {
    const onDraft = show();
    const text = 'A contract in plain text. '.padEnd(600, 'x');

    const file = new File([text], 'draft.txt', { type: 'text/plain' });
    Object.defineProperty(file, 'text', { value: async () => text });
    fireEvent.change(document.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [file] },
    });

    await waitFor(() => expect(onDraft).toHaveBeenCalledTimes(1));
    /* And the PDF reader was never fetched for it. */
    expect(wordsFrom).not.toHaveBeenCalled();
  });

  it('is refused by name where nothing here can read it', async () => {
    const onDraft = show();
    choose('contract.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    await screen.findByText(/contract\.docx/);
    expect(onDraft).not.toHaveBeenCalled();
  });
});

describe('what counts as a document, without a reader', () => {
  /*
   * The scan rule itself, reachable. Everything above stubs the reader, so
   * the threshold inside it could be set to zero and nothing would notice —
   * which an injected fault proved. It is a pure function now, and this is
   * the only thing that can fail when it moves.
   */
  it('takes a page of clauses', async () => {
    const { enoughWords } = await import('./lib/pdf.js');
    expect(enoughWords(WORDS)).toBe(true);
  });

  it('refuses what a stamp and a page number leave behind', async () => {
    const { enoughWords } = await import('./lib/pdf.js');
    for (const scrap of ['', '   ', 'Page 1 of 3', 'AL MANARA BANK', 'x'.repeat(199)]) {
      expect(enoughWords(scrap), JSON.stringify(scrap)).toBe(false);
    }
    expect(enoughWords('x'.repeat(200))).toBe(true);
  });
});

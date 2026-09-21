/**
 * The words out of a PDF, read on the desk's own machine.
 *
 * ── why this exists ───────────────────────────────────────────────────────
 *
 * A bank does not send typed text. It sends a letter on its own paper with a
 * reference number and a signature, and behind it a draft in the numbering
 * its lawyers used — as a PDF. Until now the way in read a file's text in the
 * browser and **refused a PDF by name**, which was honest and was also the
 * format every real enquiry arrives in.
 *
 * ── still in the browser, and that is the point ───────────────────────────
 *
 * The reading happens where the file already is. Nothing is uploaded, so this
 * works on an installation with no mounted volume — which is every
 * installation by default — and a confidential draft does not land on a
 * server for no gain the board can use. What travels with the question is
 * what the board actually needs: the sentences its conditions are read
 * against.
 *
 * ── loaded only when a PDF is chosen ──────────────────────────────────────
 *
 * The reader is about a megabyte. Importing it at the top of a module would
 * put that on every member who opens the application, for a file most of
 * them will never attach. It is imported at the moment somebody chooses a
 * PDF and not before.
 *
 * ── a scan has no words, and that is said ─────────────────────────────────
 *
 * A PDF is a container. One made by printing carries a text layer; one made
 * by a scanner carries a picture of a page and nothing else, and there is no
 * reading of it here. `TooFewWords` is thrown by name so the screen can say
 * *this is a scan* rather than handing the board an empty reading of a
 * document that is full of words on paper.
 */

/** A PDF this cannot read: a scan, or a page of pictures. */
export class TooFewWords extends Error {
  readonly code = 'too_few_words';
  constructor(readonly pages: number) {
    super(
      `Nothing readable came out of ${pages} ${pages === 1 ? 'page' : 'pages'}. ` +
        'A scanned document is a picture of a page, and there is no text behind it to take.',
    );
    this.name = 'TooFewWords';
  }
}

/**
 * Below this, whatever came out is not a document.
 *
 * A scan is not always empty: a stamp, a page number or a footer can carry a
 * text layer of twenty characters, and reading a contract against twenty
 * characters would report every condition absent — true of what was
 * extracted and false of the agreement.
 */
const ENOUGH = 200;

/**
 * Whether what came out of the pages is a document at all.
 *
 * Pure and exported, because it is the whole of the scan rule and it was
 * the one thing in this file nothing could reach: the screen's tests stub
 * the reader, so lowering the threshold to zero changed nothing anywhere
 * and every test stayed green. A rule nothing can fail is not a rule.
 */
export function enoughWords(text: string): boolean {
  return text.trim().length >= ENOUGH;
}

export async function wordsFrom(file: File): Promise<string> {
  /*
   * Imported here, on the press, so the reader's weight falls only on
   * somebody who actually attached a PDF.
   */
  const pdfjs = await import('pdfjs-dist');

  /*
   * The worker, from the same package rather than from a CDN.
   *
   * A bank's browser may not reach the internet at all, and a reader that
   * silently needed to would fail on exactly the installation this is for.
   * Vite resolves this at build time and ships it beside the application.
   */
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();

  const doc = await pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    /*
     * No fonts fetched, no fetching at all. The words are wanted; how the
     * page looked is not, and a reader reaching out for a font file is a
     * reader that behaves differently on a machine with no way out.
     */
    disableFontFace: true,
  }).promise;

  const pages: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();

    /*
     * A PDF has no sentences — it has positioned runs of glyphs, and a
     * clause is several of them. `hasEOL` is the reader's own account of
     * where the line ended, which is the only thing in the file that knows:
     * joining on it keeps "1.5% per month" one phrase and keeps clause 3.4
     * off the end of clause 3.3.
     */
    let text = '';
    for (const item of content.items) {
      if (!('str' in item)) continue;
      text += item.str;
      if (item.hasEOL) text += '\n';
      else if (item.str && !item.str.endsWith(' ')) text += ' ';
    }
    pages.push(text.trim());
    page.cleanup();
  }

  await doc.cleanup();

  /*
   * Page breaks kept as blank lines. A reader that ran page 1 into page 2
   * would join the letter's last sentence to the draft's title, and a quote
   * taken across that join is a quote that is in no paragraph of the
   * document.
   */
  const whole = pages.join('\n\n').replace(/[ \t]+\n/g, '\n').trim();

  if (!enoughWords(whole)) throw new TooFewWords(doc.numPages);
  return whole;
}

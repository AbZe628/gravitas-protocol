/**
 * Build the handbook: docs/HANDBOOK.md → one self-contained HTML file.
 *
 * The file is printed to PDF by scripts/print-guide.mjs, and that prints
 * through `Page.setDocumentContent`, which gives the page no base URL. So
 * everything has to travel inside the file: the faces, the screenshots and
 * the mark. Nothing is fetched while it prints.
 *
 * The typefaces are lifted out of docs/MAJLIS-GUIDE.html, which already
 * carries them as data URIs. One copy of the fonts in the repository, and
 * a document that sets the same way on whichever machine prints it.
 *
 *   node scripts/build-handbook.mjs
 *   node ../../../majlis-local/stampaj-prirucnik.mjs \
 *     docs/Gravitas-Majlis-Handbook.html docs/Gravitas-Majlis-Handbook.pdf
 *
 * **It has to be printed with a footer.** The page carries no margin, so
 * the ground colour reaches all four edges — with one exception, the 13mm
 * strip at the foot that holds the page number, and the footer template
 * paints that strip itself. Printed without one, every sheet comes out
 * with a white band along the bottom. `print-guide.mjs` prints without
 * one; it is for the older guide, which has margins of its own.
 *
 * The Markdown it understands is the Markdown the handbook uses: headings,
 * paragraphs, bullet and numbered lists, tables, block quotes, images,
 * horizontal rules, and bold, italic, code and links inline. Anything else
 * would be a renderer nobody asked for.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

const ROOT = join(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const DOCS = join(ROOT, 'docs');
const SOURCE = join(DOCS, 'HANDBOOK.md');
const OUT = join(DOCS, 'Gravitas-Majlis-Handbook.html');

/* ── the pieces that travel inside the file ──────────────────────────── */

/** The embedded faces, taken from the guide that already carries them. */
function faces() {
  const guide = join(DOCS, 'MAJLIS-GUIDE.html');
  if (!existsSync(guide)) throw new Error('no MAJLIS-GUIDE.html to take the faces from');
  const style = readFileSync(guide, 'utf8').match(/<style>([\s\S]*?)<\/style>/);
  if (!style) throw new Error('MAJLIS-GUIDE.html has no style block');
  const blocks = style[1].match(/@font-face\s*\{[\s\S]*?\}/g);
  if (!blocks || blocks.length < 3) throw new Error('found ' + (blocks?.length ?? 0) + ' faces, expected the full set');
  return blocks.join('\n');
}

/** A screenshot, as a data URI. Missing files fail the build rather than the print. */
const seen = new Set();
function picture(src) {
  seen.add(src);
  const kind = src.endsWith('.png') ? 'image/png' : 'image/jpeg';
  return `data:${kind};base64,` + bytes(src).toString('base64');
}

function bytes(src) {
  const path = join(DOCS, src);
  if (!existsSync(path)) throw new Error('no such screenshot: ' + src);
  return readFileSync(path);
}

/**
 * How tall a screenshot is, relative to its width.
 *
 * ── why the build needs to know ──────────────────────────────────────
 *
 * These are whole-page captures, so a screen with a long list in it comes
 * out three or four times taller than it is wide. Printed at the width of
 * the page, one of them filled a sheet on its own with an empty band down
 * the middle of it, and the document ran to seventy-nine pages of mostly
 * white. The top of a screen is the part that shows what the screen is,
 * so a landscape capture is cropped to a band and a phone capture is set
 * small and beside the text.
 *
 * Read out of the file's own header rather than by opening a browser: a
 * build step that needs a browser is a build step that breaks.
 */
function shape(src) {
  const b = bytes(src);

  if (b[0] === 0x89 && b[1] === 0x50) {
    return b.readUInt32BE(16) / b.readUInt32BE(20); // PNG: IHDR
  }

  /* JPEG: walk the markers to the frame header, which carries the size. */
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = b[i + 1];
    const size = b.readUInt16BE(i + 2);
    /* SOF0…SOF15, skipping the four that are not frame headers. */
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc, 0xd8].includes(marker)) {
      const h = b.readUInt16BE(i + 5);
      const w = b.readUInt16BE(i + 7);
      return w / h;
    }
    i += 2 + size;
  }
  throw new Error('cannot read the size of ' + src);
}

/* ── markdown ────────────────────────────────────────────────────────── */

const escape = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Bold, italic, code and links. Links keep their words and lose their href:
 *  a printed page cannot be clicked, and a bare fragment reads as a defect. */
function inline(s) {
  return escape(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}

const cell = (row) =>
  row.replace(/^\||\|$/g, '').split('|').map((c) => inline(c.trim()));

function render(markdown) {
  /*
   * Everything above the first chapter belongs to the cover and is not
   * printed twice. It was: page two opened with the same three paragraphs
   * the cover had just given, above the contents.
   */
  const body = markdown.slice(markdown.search(/^##\s+/m));
  const lines = body.split(/\r?\n/);
  const out = [];
  let i = 0;
  /** The first section has no page break before it; every later one does. */
  let sections = 0;
  /** The last heading, lower-cased, so a caption can avoid repeating it. */
  let heading = '';

  const paragraph = (buf) => {
    if (buf.length) out.push('<p>' + inline(buf.join(' ')) + '</p>');
    buf.length = 0;
  };

  while (i < lines.length) {
    const line = lines[i];

    /* An image on its own line is a figure with its alt text as the caption. */
    const fig = line.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/);
    if (fig) {
      const kind = shape(fig[2]) < 0.8 ? 'phone' : 'screen';
      /*
       * A caption that repeats the heading above it is noise. Under a
       * heading reading "Tradability", a caption reading TRADABILITY says
       * nothing and the eye reads the same word twice in two styles.
       */
      const caption = fig[1].trim().toLowerCase() === heading ? '' : fig[1];
      /*
       * A screenshot sits in a frame with a bar across the top of it.
       * Bare, a capture of a cream application on a cream page has no
       * edge at all and reads as part of the paper; the frame says this
       * is a picture of a screen.
       */
      out.push(
        `<figure class="${kind}">` +
          '<div class="frame"><div class="bar"><i></i><i></i><i></i></div>' +
          `<img src="${picture(fig[2])}" alt="${escape(fig[1])}" /></div>` +
          (caption ? `<figcaption>${inline(caption)}</figcaption>` : '') +
          '</figure>',
      );
      i++;
      continue;
    }

    if (/^##\s+/.test(line)) {
      /*
       * Close the one before opening the next.
       *
       * These were all closed at the end instead, which made every chapter
       * a child of the one above it — twenty-one sections deep by the last
       * one. Print did not show it because the padding is only on screen;
       * on screen the last chapter was 121 pixels wide inside a 779-pixel
       * page, and its table had no width at all.
       */
      if (sections) out.push('</section>');
      sections++;
      const title = line.replace(/^##\s+/, '').trim();
      heading = title.toLowerCase();
      /* The number set apart, so the band reads as a chapter opening. */
      const numbered = title.match(/^(\d+)\s*·\s*(.*)$/);
      const head = numbered
        ? `<span class="n">${numbered[1]}</span>${inline(numbered[2])}`
        : inline(title);
      out.push(
        `<section class="chapter${sections > 1 ? ' break' : ''}"><h2>${head}</h2>`,
      );
      i++;
      continue;
    }

    if (/^###\s+/.test(line)) {
      heading = line.replace(/^###\s+/, '').trim().toLowerCase();
      out.push(`<h3>${inline(line.replace(/^###\s+/, ''))}</h3>`);
      i++;
      continue;
    }

    if (/^#\s+/.test(line)) {
      i++;
      continue; // the title goes on the cover, built separately
    }

    if (/^---+\s*$/.test(line)) {
      i++;
      continue; // section rules are pages here
    }

    /* A table: a header row, a divider, then rows until a blank line. */
    if (/^\|/.test(line) && /^\|[\s:|-]+\|$/.test(lines[i + 1] ?? '')) {
      const head = cell(line);
      const rows = [];
      i += 2;
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(cell(lines[i++]));
      const empty = head.every((h) => !h);
      out.push(
        '<table>' +
          (empty ? '' : '<thead><tr>' + head.map((h) => `<th>${h}</th>`).join('') + '</tr></thead>') +
          '<tbody>' +
          rows
            .map((r) => '<tr>' + r.map((c) => `<td>${c}</td>`).join('') + '</tr>')
            .join('') +
          '</tbody></table>',
      );
      continue;
    }

    /* A quote is a note: one box, however many lines it runs to. */
    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
      out.push(`<div class="note">${inline(buf.join(' '))}</div>`);
      continue;
    }

    /* Lists, with continuation lines folded in. */
    const bullet = /^([-*])\s+/;
    const number = /^(\d+)\.\s+/;
    if (bullet.test(line) || number.test(line)) {
      const ordered = number.test(line);
      const items = [];
      while (i < lines.length) {
        const l = lines[i];
        if ((ordered ? number : bullet).test(l)) {
          items.push([l.replace(ordered ? number : bullet, '')]);
          i++;
        } else if (/^\s+\S/.test(l) && items.length) {
          items[items.length - 1].push(l.trim());
          i++;
        } else break;
      }
      out.push(
        `<${ordered ? 'ol' : 'ul'}>` +
          items.map((p) => `<li>${inline(p.join(' '))}</li>`).join('') +
          `</${ordered ? 'ol' : 'ul'}>`,
      );
      continue;
    }

    if (!line.trim()) {
      i++;
      continue;
    }

    /* Everything else is a paragraph, folded to its blank line. */
    const buf = [];
    while (i < lines.length && lines[i].trim() && !/^[#>|!-]/.test(lines[i]) && !/^\d+\.\s/.test(lines[i])) {
      buf.push(lines[i++].trim());
    }
    if (buf.length) paragraph(buf);
    else i++;
  }

  /* And close the last one. */
  return out.join('\n') + (sections ? '</section>' : '');
}

/* ── the cover ───────────────────────────────────────────────────────── */

/** The board's mark: the khatam inside an arch, as the application draws it. */
const MARK = `
<svg width="54" height="61" viewBox="0 0 36 41" fill="none" aria-hidden="true">
  <path d="M18 1.2 C26.9 1.2 33.6 8.3 33.6 17.6 L33.6 37.6 C33.6 38.7 32.7 39.6 31.6 39.6 L4.4 39.6 C3.3 39.6 2.4 38.7 2.4 37.6 L2.4 17.6 C2.4 8.3 9.1 1.2 18 1.2 Z"
        fill="#FFFFFF" stroke="#164470" stroke-width="1.3"/>
  <path d="M18 11.4 L20.3 16.5 L25.8 15.5 L23.6 20.6 L27.9 24.2 L22.6 25.6 L22.9 31.1 L18 28.4 L13.1 31.1 L13.4 25.6 L8.1 24.2 L12.4 20.6 L10.2 15.5 L15.7 16.5 Z"
        fill="#B08430"/>
</svg>`;

function cover(markdown) {
  /*
   * The wordmark at the top says the product's name, so the title under it
   * is the line that says what the document is. Setting "Gravitas Majlis"
   * twice on one page, once as the mark and once as a heading, was the
   * first thing that made the cover look like a template.
   */
  const after = markdown.split(/^#\s+.+$/m)[1] ?? '';
  const paragraphs = after
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p && !p.startsWith('#') && !p.startsWith('---'));
  const title = (paragraphs[0] ?? 'Handbook').replace(/\.$/, '');
  const lead = paragraphs.slice(1, 3);

  const figures = [
    ['19', 'contract types, in ten families'],
    ['89', 'conditions the board can rule against'],
    ['6', 'calculations, none of them a verdict'],
    ['3', 'languages, including right to left'],
  ];

  return `
<section class="cover">
  <div class="cover-top">
    <div class="mark">${MARK}<div>
      <div class="wordmark">Gravitas <span>Majlis</span></div>
      <div class="kicker">Shariah governance, from the question to the ruling</div>
    </div></div>
  </div>
  <h1>${inline(title)}</h1>
  ${lead.map((p) => `<p class="cover-lead">${inline(p)}</p>`).join('\n  ')}
  <div class="cover-shot"><img src="${picture('guide/10-pocetna.jpg')}" alt="" /></div>
  <div class="cover-figures">
    ${figures.map(([n, l]) => `<div><span class="n">${n}</span><span class="l">${l}</span></div>`).join('\n    ')}
  </div>
</section>`;
}

/* ── the page ────────────────────────────────────────────────────────── */

const CSS = `
:root {
  --vellum: #fbf8f1;
  --sheet: #ffffff;
  --ink: #191713;
  --muted: #6b6459;
  --sand: #8c8377;
  --rule: rgba(25, 23, 19, 0.1);
  --lapis: #164470;
  --gold: #b08430;
  --settled: #2c6b57;
  --display: Newsreader, Georgia, 'Times New Roman', serif;
  --body: Manrope, 'Segoe UI', -apple-system, sans-serif;
  --mono: 'IBM Plex Mono', Consolas, monospace;
}

/*
 * The page has its margins back, and the colour is painted underneath.
 *
 * ── the two wrong answers before this one ────────────────────────────
 *
 * A page margin is not painted. With 17mm of it the ground stopped 17mm
 * short of the paper on all four sides and every sheet was a cream panel
 * in a white frame. Setting the colour on the html element does not help;
 * Chrome does not carry it into the margin.
 *
 * So the margin was set to zero and padding put on the chapter instead.
 * That painted the whole sheet and broke the reading: padding applies
 * where the chapter begins, not on each page it runs onto, so a chapter
 * spilling over started hard against the top edge of the next sheet and
 * ran to the very bottom of it — where the page break cut through the
 * middle of a line of type.
 *
 * The answer is neither. The margins are real, and a fixed element paints
 * the ground: Chrome repeats a fixed element on every printed page, so
 * one div covers all forty-one sheets, edge to edge, underneath.
 */
@page { size: A4; margin: 16mm 15mm 14mm; }
/* The cover alone runs to the edge of the paper, so it keeps no margin.
   Its own bottom padding holds the figures clear of the footer strip,
   which is still drawn over it. */
@page :first { margin: 0; }

.ground {
  position: fixed;
  inset: 0;
  z-index: -1;
  background: var(--vellum);
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* On screen the sheet is centred, with the edge of the paper visible. */
@media screen {
  body { max-width: 210mm; margin: 0 auto; padding: 16mm 15mm; box-shadow: 0 0 0 1px rgba(25,23,19,.08); }
  .cover { margin: -16mm -15mm 0; }
}

html {
  background: var(--vellum);
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
body {
  margin: 0;
  background: var(--vellum);
  color: var(--ink);
  font-family: var(--body);
  font-size: 9.6pt;
  line-height: 1.6;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* ── cover ───────────────────────────────────────────────────────── */

.cover {
  box-sizing: border-box;
  /* 297 less the 13mm strip the footer sits in: at the full height
     the four figures at the foot of the cover were printed underneath
     it and came out with their second line sliced off. */
  min-height: 297mm;
  display: flex;
  flex-direction: column;
  padding: 0 18mm 24mm;
  background: linear-gradient(170deg, #ffffff 0%, var(--vellum) 40%, #f2ebdf 100%);
  break-after: page;
}

/*
 * The head of the cover is the board's own blue, full bleed.
 *
 * On a cream ground the document opened quietly and looked like a memo.
 * A field of colour at the head of the page is what makes it read as a
 * product's document at arm's length, which is how a cover is read.
 */
.cover-top {
  margin: 0 -18mm 0;
  padding: 16mm 18mm 13mm;
  background: linear-gradient(150deg, #1E5A8A 0%, #164470 55%, #10314f 100%);
  color: #fbf8f1;
  border-bottom: 1.4mm solid var(--gold);
}
.mark { display: flex; align-items: center; gap: 5mm; }
.wordmark { font-family: var(--display); font-size: 26pt; font-weight: 500; line-height: 1; letter-spacing: -.015em; color: #fbf8f1; }
.wordmark span { color: #e3c07a; }
.kicker { margin-top: 2.6mm; font-size: 7.4pt; font-weight: 700; letter-spacing: .15em; text-transform: uppercase; color: rgba(251,248,241,.72); }

.cover h1 { font-family: var(--display); font-size: 27pt; font-weight: 500; line-height: 1.14; letter-spacing: -.02em; margin: 11mm 0 5mm; max-width: 24ch; }
.cover-lead { font-size: 10.2pt; line-height: 1.62; color: var(--muted); max-width: 62ch; margin: 0 0 3mm; }

/*
 * The screenshot is cropped rather than scaled to fit. Shrunk to whatever
 * height was left it became a grey band with type too small to read, which
 * shows nothing; the top of the screen at a legible size shows what the
 * application actually looks like.
 */
.cover-shot { margin: 8mm 0 0; height: 72mm; border-radius: 3mm; overflow: hidden; background: var(--sheet);
  box-shadow: 0 0 0 .5px rgba(25,23,19,.12), 0 2mm 6mm rgba(25,23,19,.12); }
.cover-shot img { display: block; width: 100%; }

/* Pushed to the foot of the page: the four figures are what the eye
   should land on last, and a quarter of a cover left blank under them
   reads as a page that did not finish. */
.cover-figures { display: flex; gap: 10mm; margin-top: auto; padding-top: 12mm; }
.cover-figures div { display: flex; flex-direction: column; gap: 1.6mm; }
.cover-figures .n { font-family: var(--mono); font-size: 19pt; font-weight: 500; letter-spacing: -.03em; color: var(--lapis); line-height: 1; }
.cover-figures .l { font-size: 7.8pt; font-weight: 600; color: var(--sand); max-width: 33mm; line-height: 1.4; }

/* ── chapters ────────────────────────────────────────────────────── */

/*
 * Chapters run on; they do not each start a new sheet.
 *
 * One chapter per page is the tidy answer on paper and the wrong one
 * here. Several of these chapters are half a page long, so the document
 * came out as a run of sheets with a third of the ink at the top and
 * nothing underneath — and most of it is read on a telephone, where an
 * empty half-page is a swipe through nothing. What separates them
 * instead is a band the eye cannot miss, and a heading that will not be
 * left alone at the foot of a page.
 */
.chapter.break { margin-top: 9mm; }

h2 {
  font-family: var(--display); font-size: 17pt; font-weight: 500; line-height: 1.2;
  /* Inset rather than full bleed: with the page margins back, anything
     pushed into them is clipped by the printer, not printed. */
  letter-spacing: -.015em; margin: 0 0 6mm; padding: 4.6mm 6mm; border-radius: 1.5mm;
  /* A tint mixed as a colour rather than as black at low opacity: the
     transparent version came out grey on cream and read as a shadow. */
  background: linear-gradient(to right, #dbe5ef 0%, #eaf0f6 55%, rgba(234,240,246,0) 100%);
  border-top: .5px solid rgba(22,68,112,.22);
  border-bottom: .5px solid rgba(22,68,112,.22);
  box-shadow: inset 1.6mm 0 0 var(--lapis);
  break-after: avoid;
  break-inside: avoid;
}
/* The chapter's number, set in the mono face and in the board's own blue. */
h2 .n {
  font-family: var(--mono); font-size: 12pt; font-weight: 500; color: var(--lapis);
  margin-inline-end: 3.4mm;
}
h2 .n::after { content: '·'; margin-inline-start: 3.4mm; color: rgba(22,68,112,.4); }
h3 { font-family: var(--display); font-size: 12.5pt; font-weight: 600; margin: 7mm 0 2mm; letter-spacing: -.006em; break-after: avoid; }
h2 + p, h3 + p { margin-top: 0; }

p { margin: 0 0 3.4mm; max-width: 64ch; }
strong { font-weight: 700; }
em { font-style: italic; }
code { font-family: var(--mono); font-size: 8.6pt; background: rgba(22,68,112,.07); border-radius: 1mm; padding: .4mm 1.4mm; color: var(--lapis); }

/* 9mm, not 6: at six the marker on item ten was clipped to a nought and
   the contents page counted 8, 9, 0, 1, 2. */
ul, ol { margin: 0 0 4mm; padding-inline-start: 9mm; max-width: 64ch; }
li { margin-bottom: 1.8mm; }
ol { counter-reset: none; }
ol li::marker { font-family: var(--mono); color: var(--lapis); font-weight: 500; }
ul li::marker { color: var(--gold); }

.note {
  background: var(--sheet); border-inline-start: 2px solid var(--gold);
  border-radius: 0 2mm 2mm 0; padding: 3.6mm 5mm; margin: 0 0 4.5mm; max-width: 64ch;
  font-size: 9pt; line-height: 1.6; color: var(--muted);
  box-shadow: 0 0 0 .5px rgba(25,23,19,.07);
  break-inside: avoid;
}

/*
 * Wrapping inside the cells is not a nicety. The table of addresses holds
 * things like /dossier/matters/:id, which a browser will not break, and one
 * of them pushed the whole document to twice the width of the page: every
 * line of prose in the file was then set to that width and ran off the
 * paper. Measured at 1 576 pixels against a 779-pixel page.
 *
 * (No back-ticks in this block: the stylesheet is a template literal, and
 * one of them ends it.)
 */
table { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 9pt; margin: 0 0 5mm; break-inside: avoid; page-break-inside: avoid; }
th, td { overflow-wrap: anywhere; }
thead th { text-align: start; font-family: var(--body); font-size: 7.2pt; font-weight: 700;
  letter-spacing: .13em; text-transform: uppercase; color: var(--sand);
  padding: 0 4mm 2mm 0; border-bottom: .5px solid var(--rule); }
tbody td { padding: 2.4mm 4mm 2.4mm 0; border-bottom: .5px solid var(--rule); vertical-align: top; line-height: 1.55; }
tbody tr:last-child td { border-bottom: 0; }
td:first-child, th:first-child { padding-inline-end: 6mm; }

figure { margin: 0 0 5mm; break-inside: avoid; page-break-inside: avoid; }

/* The frame: a window with a bar across the top of it, so a picture of a
   cream screen on a cream page has an edge. */
.frame {
  position: relative; border-radius: 2.4mm; overflow: hidden; background: var(--sheet);
  box-shadow: 0 0 0 .5px rgba(22,68,112,.16), 0 1.4mm 4mm rgba(25,23,19,.11);
  /* On the figure alone this was not enough: the frame was still split
     across the page break, and half a screenshot went over the edge.
     Chrome honours the legacy spelling more reliably here. */
  break-inside: avoid;
  page-break-inside: avoid;
}
.frame img { break-inside: avoid; page-break-inside: avoid; }

/*
 * The foot of a cropped screenshot, faded into the page.
 *
 * These are whole-page captures cut to a band, and the cut goes through
 * whatever happens to be there — half a row of type, the top of a card.
 * Cut hard it reads as a printing fault. Faded, it reads as what it is:
 * the top of a screen, and there is more of it.
 */
.frame::after {
  content: "";
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  height: 12mm;
  background: linear-gradient(to bottom, rgba(251,248,241,0), rgba(251,248,241,.72) 55%, rgba(251,248,241,.97));
}
.bar {
  border-radius: 2.4mm 2.4mm 0 0;
  height: 4.6mm; padding: 0 2.4mm; display: flex; align-items: center; gap: 1.2mm;
  background: linear-gradient(to bottom, #f4efe4, #ece5d7);
  border-bottom: .5px solid rgba(25,23,19,.09);
}
.bar i { width: 1.3mm; height: 1.3mm; border-radius: 50%; background: rgba(25,23,19,.18); }
.frame img { display: block; width: 100%; }

/* A whole-page capture of a wide screen, cropped to the part that shows
   what the screen is. Uncropped, one of these filled a sheet on its own. */
figure.screen img { height: 76mm; object-fit: cover; object-position: top center; }

/* A phone is set small, because a phone screen printed the width of a
   page is a picture of nothing in particular. Two of them side by side:
   stacked, each one left two thirds of the page empty beside it. */
figure.phone { width: 56mm; display: inline-block; vertical-align: top; margin-inline-end: 7mm; }
figure.phone img { height: 100mm; object-fit: cover; object-position: top center; }
figure.phone .bar { height: 3.6mm; }
figcaption {
  margin-top: 2mm; font-size: 7.6pt; font-weight: 600; letter-spacing: .1em;
  text-transform: uppercase; color: var(--sand);
}
`;

const md = readFileSync(SOURCE, 'utf8');
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Gravitas Majlis — Handbook</title>
<style>
${faces()}
${CSS}
</style>
</head>
<body>
<div class="ground" aria-hidden="true"></div>
${cover(md)}
${render(md)}
</body>
</html>
`;

writeFileSync(OUT, html);
console.log(
  'wrote ' + OUT + '  (' + (html.length / 1048576).toFixed(1) + ' MB, ' + seen.size + ' screenshots)',
);

/**
 * Print the guide to PDF, headless, with the fonts that travel inside it.
 *
 * `printBackground` is not optional here: the cover's rules and the tags carry
 * the colour, and without it the document comes back looking like a draft.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { openPage } from './cdp.mjs'; // a CDP driver; see docs/STATE.md

const source = process.argv[2];
const out = process.argv[3];

const p = await openPage();
const html = readFileSync(source, 'utf8');

await p.send('Page.enable');
await p.send('Page.setDocumentContent', {
  frameId: (await p.send('Page.getFrameTree')).frameTree.frame.id,
  html,
});

// The faces are data URIs, so nothing is fetched — but layout still settles.
await new Promise((r) => setTimeout(r, 2500));

const { data } = await p.send('Page.printToPDF', {
  printBackground: true,
  preferCSSPageSize: true,
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
});

writeFileSync(out, Buffer.from(data, 'base64'));
console.log('wrote', out);

await p.close();
process.exit(0);

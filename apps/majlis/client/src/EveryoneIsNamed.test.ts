import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * A person on the screen is a name, never the key the record files them under.
 *
 * ── the fault this holds shut ─────────────────────────────────────────────
 *
 * The record attributes every act to a scholar id — `member-a` — because a
 * name is not a key and can change. Nineteen places drew that id as it came:
 * who spoke in the deliberation and whom a reply answers, who voted, who was
 * present at a sitting, who found a breach actual, who recorded a figure, who
 * adopted a shape, who gave an undertaking — and the top bar of every screen,
 * which told each member they were `member-b`. On the demonstration board
 * every avatar was the same letter, the first of `member-`.
 *
 * Found by looking at the screens, after the column that says who holds a step
 * had been fixed for the same fault and the rest had not been looked at.
 *
 * ── what this checks ──────────────────────────────────────────────────────
 *
 * Every screen, for a field that holds a person being drawn as text — as a
 * child of an element, or inside a string that is. A field passed as a prop
 * (`scholarId={…}`, `key={…}`) is not drawn and is left alone; `<Person>`
 * and `nameOf` are how a person is drawn.
 *
 * A static reading, like the dictionary guard beside it, because the nineteen
 * are on nineteen different screens and a guard that rendered each would be
 * nineteen fixtures that stop being kept up. It says what it cannot see: a
 * person held in a variable of some other name and drawn later is past it.
 */

/** The fields in this record that hold a person. */
const PERSON = ['scholarId', 'by', 'recordedBy', 'reportedBy', 'decidedBy', 'askedBy', 'who', 'holder'];
/*
 * Not `whoName`. It holds a name wherever it is left — the undertakings and the
 * margin notes resolve it on the server — and the passage's field that held an
 * id under that name is `who` now. See `Step.who` in services/passage-shape.ts.
 */

/**
 * The fields that hold several people at once.
 *
 * A list of ids joined into a string is a person drawn by key just as much as
 * a single one is, and it read past this file untouched: the endorsement panel
 * on a breach drew `plan.endorsedBy.join(', ')` and put `member-a, member-b`
 * on the screen beside lines that named everybody properly. This file said in
 * its own preamble that a person held in a variable of some other name is past
 * it; a list going through `.join` was past it too, and unlike that one it did
 * not have to be.
 *
 * `outstanding` came out of the same sweep: the vote said *not yet recorded:
 * member-c, member-d, member-e*. Of every line on that screen it is the one
 * where knowing who it is has a use — somebody has to be asked — and it was
 * the one line that did not say.
 *
 * ── this list is where the guard is weakest ───────────────────────────────
 *
 * It is kept by hand, so it watches the lists somebody remembered to add and
 * is silent about the rest. `unaccountedFor` proved it: the meetings screen
 * drew *Not accounted for, and not assumed absent: member-a, member-b,
 * member-c…* directly beneath the same seven people listed by name, through a
 * `.join` this file already knew how to see — and the field was not in this
 * list, so nothing looked. Found by opening the screen.
 *
 * There is no honest way to derive the list from the types: a `string[]` named
 * `sources` and one named `asked` look identical to a scanner. So the list
 * stays by hand and `every name here is a field somebody draws` below makes it
 * rot loudly instead of quietly — a name that no longer appears anywhere is a
 * field that was renamed, and a renamed field is exactly how this stops
 * watching.
 */
const PEOPLE = ['asked', 'endorsedBy', 'heard', 'outstanding', 'unaccountedFor', 'waitingOn'];

const chain = String.raw`[A-Za-z_$][\w$]*(?:\??\.[A-Za-z_$][\w$]*)*\??\.`;
const field = `(?:${PERSON.join('|')})`;
const many = `(?:${PEOPLE.join('|')})`;

/** `{x.by}`, `{x?.scholarId ?? …}`, `{x.who || …}` — a person as a child, not a prop. */
const AS_CHILD = new RegExp(String.raw`(?<!(?:=\s*|\$))\{\s*(${chain}${field})\s*(?:\}|\?\?|\|\|)`, 'g');
/** `${x.who}` or `${x.by ?? '—'}` inside a template — which, on these screens, is drawn. */
const IN_TEMPLATE = new RegExp(String.raw`\$\{\s*(${chain}${field})\s*(?:\}|\?\?|\|\|)`, 'g');
/** `{plan.endorsedBy.join(', ')}` — a list of people flattened into one string. */
const JOINED = new RegExp(String.raw`(?<!=\s*)\{\s*(${chain}${many})\.join\(`, 'g');
/** `{row.heard}` — a list of people handed straight to the renderer. */
const LIST_AS_CHILD = new RegExp(
  String.raw`(?<!(?:=\s*|\$))\{\s*(${chain}${many})\s*(?:\}|\?\?|\|\|)`,
  'g',
);

/**
 * The ids drawn on purpose, each with its reason.
 *
 * Named by file **and** field, so an exception for one line is not a licence
 * for the rest of the file.
 */
const ON_PURPOSE: Record<string, { fields: string[]; why: string }> = {
  'pages/Settings.tsx': {
    fields: ['m.scholarId'],
    why:
      'The settings screen compares the board’s list with the credential file, and the id is the ' +
      'one thing the two have in common: it answers *which line of MAJLIS_MEMBERS is this*, beside the name.',
  },
  'components/ReadDocument.tsx': {
    fields: ['identity?.scholarId'],
    why:
      'Not drawn: it goes into the provenance sentence stored with a confirmed figure. The record ' +
      'attributes by id, and a name frozen into a stored sentence could never be resolved again.',
  },
};

function screens(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...screens(path));
    else if (/\.tsx$/.test(path) && !path.includes('.test.')) out.push(path);
  }
  return out;
}

/** A template that is an attribute's value — `key={`${s.scholarId}-${i}`}` — is not drawn. */
const TEMPLATE_PROP = /[A-Za-z-]+=\{\s*`[^`]*`\s*\}/g;

function drawn(source: string): string[] {
  source = source.replace(TEMPLATE_PROP, '');
  const found: string[] = [];
  for (const re of [AS_CHILD, IN_TEMPLATE, JOINED, LIST_AS_CHILD]) {
    re.lastIndex = 0;
    for (let m = re.exec(source); m; m = re.exec(source)) found.push(m[1]);
  }
  return found;
}

describe('a person is drawn by name', () => {
  it('finds the shapes it is looking for, or it proves nothing', () => {
    // Each of these was on a screen.
    expect(drawn('<span className="x">{entry.scholarId}</span>')).toEqual(['entry.scholarId']);
    expect(drawn("{identity?.scholarId ?? t('shell.anonymous')}")).toEqual(['identity?.scholarId']);
    expect(drawn("{t('recorded.by')} {c.recordedBy} · {c.source}")).toEqual(['c.recordedBy']);
    expect(drawn("{theirs ? `${t('moved.theirs')} · ${theirs.who}` : x}")).toEqual(['theirs.who']);
    expect(drawn("`${t('read.confirmedBy')} ${identity?.scholarId ?? '—'} `")).toEqual(['identity?.scholarId']);
    // A list of people, flattened or handed over whole. Both were on a screen.
    expect(drawn("<span>{plan.endorsedBy.join(', ')}</span>")).toEqual(['plan.endorsedBy']);
    expect(drawn('<span>{row.heard}</span>')).toEqual(['row.heard']);
    // And these are not drawn.
    expect(drawn('<Endorsed by={plan.endorsedBy} />')).toEqual([]);
    expect(drawn('{plan.endorsedBy.map((who) => <Person key={who} id={who} />)}')).toEqual([]);
    expect(drawn('<li key={a.scholarId}>')).toEqual([]);
    expect(drawn('<Avatar id={identity?.scholarId} />')).toEqual([]);
    expect(drawn('<li key={`${s.scholarId}-${s.at}-${i}`}>')).toEqual([]);
    expect(drawn('{nameOf(members, row.who)}')).toEqual([]);
    expect(drawn('<Person id={row.who} />')).toEqual([]);
    expect(drawn("{t('recorded.by')}")).toEqual([]);
  });

  it('draws no id where a name belongs, on any screen', () => {
    const root = join(__dirname);
    const files = screens(root);
    expect(files.length, 'the walk found no screens').toBeGreaterThan(80);

    const wrong = files
      .map((f) => {
        const file = relative(root, f).replace(/\\/g, '/');
        const allowed = ON_PURPOSE[file]?.fields ?? [];
        return { file, hits: drawn(readFileSync(f, 'utf8')).filter((h) => !allowed.includes(h)) };
      })
      .filter((x) => x.hits.length > 0)
      .map((x) => `${x.file}: ${x.hits.join(', ')}`);

    expect(wrong).toEqual([]);
  });

  /*
   * The hand-kept list, kept honest.
   *
   * `PEOPLE` watches the lists somebody remembered to add, and a field that
   * is renamed simply stops being watched — silently, which is the only way
   * this guard can fail. So every name in it has to be a field some screen
   * actually reads. `unaccountedFor` was drawn through a `.join` this file
   * already knew how to see, on a screen it already walked, and was missed
   * only because the name was not in the list.
   */
  it('watches only fields that exist, so a rename fails here and not silently', () => {
    const root = join(__dirname);
    const sources = screens(root).map((f) => readFileSync(f, 'utf8'));
    for (const name of PEOPLE) {
      const used = sources.some((src) => src.includes('.' + name));
      expect(used, `no screen reads "${name}" any more; it was renamed or dropped`).toBe(true);
    }
  });

  it('still sees every exception, or an exception hides nothing', () => {
    for (const [file, { fields }] of Object.entries(ON_PURPOSE)) {
      const hits = drawn(readFileSync(join(__dirname, file), 'utf8'));
      for (const f of fields) expect(hits, `${file} no longer draws ${f}; drop the exception`).toContain(f);
    }
  });
});

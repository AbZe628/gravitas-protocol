import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from './lib/i18n.js';
import { forgetKept } from './lib/kept.js';
import Shell from './components/Shell.js';
import { PageHead } from './components/page.js';
import en from './locales/en.js';
import ar from './locales/ar.js';
import ur from './locales/ur.js';

/*
 * The language the frame opens in.
 *
 * It is read once, from where a reader's own choice is kept, before the first
 * screen is drawn — so a test chooses by writing there and rendering, which is
 * what a reader who chose Urdu yesterday actually arrives as. `test-setup`
 * holds all three dictionaries, so nothing waits on a chunk.
 */
const reading = (lang: 'en' | 'ar' | 'ur') => window.localStorage.setItem('majlis.lang', lang);

/**
 * What a phone spends on frame, and what it gets back.
 *
 * ── what was measured, at 375 × 812 ───────────────────────────────────────
 *
 * Two bars pinned to the top of every screen — the masthead and the row of
 * the group you are standing in — so 112 pixels were frame on every line a
 * member read. Four round controls in the masthead came to 176 of the 375
 * pixels across, which is why the board's own name read *Demonst…*. The
 * screen's name was on the screen three times at once: lit in the group row,
 * set in thirty-point type directly under it, and lit again in the tab bar at
 * the foot. And in Urdu the notice about the translation came to **329
 * pixels** of 812, which put the first row of work at 652 — the name of the
 * screen, a notice about the wording, and one row.
 *
 * ── what these hold shut ──────────────────────────────────────────────────
 *
 * The frame says a thing once; a control that is in two places leaves the
 * masthead; and a notice about the wording is a line, not a screen.
 *
 * jsdom applies no stylesheet, so nothing here can measure a pixel. What it
 * can hold is what is *in the document* and what is *said twice*, which is
 * what every one of those faults was. The pixels are measured by walking the
 * running application at three widths, which is how each of them was found.
 */

function stub() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const json = (b: unknown) =>
        new Response(JSON.stringify(b), { status: 200, headers: { 'Content-Type': 'application/json' } });

      if (url.includes('/api/health'))
        return json({ ok: true, store: 'memory', notice: 'none', signing: 'off', gaps: [] });
      if (url.includes('/api/attention'))
        return json({ scholarId: 'member-a', role: 'signatory', office: 'chair', items: [] });
      if (url.includes('/api/settings')) return json({ members: [], board: { name: 'A board' } });
      return json({});
    }),
  );
}

async function standingAt(path: string, children = <div />) {
  stub();
  render(
    <MemoryRouter initialEntries={[path]}>
      <I18nProvider>
        <Shell>{children}</Shell>
      </I18nProvider>
    </MemoryRouter>,
  );
  /*
   * The frame reads the installation before it draws. Waited on by shape
   * rather than by an English sentence: three of these render in Arabic or
   * Urdu, where that sentence is not in English and a test that waited for it
   * would hang rather than fail with a reason.
   */
  await screen.findAllByRole('navigation');
}

/** The phone's own masthead, which jsdom shows beside the desk's. */
const theMasthead = () =>
  [...document.querySelectorAll('header')].find((h) => h.className.includes('lg:hidden'))!;

beforeEach(() => {
  forgetKept();
  reading('en');
});
afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
  reading('en');
});

// ── the masthead ──────────────────────────────────────────────────────────

describe('the phone’s masthead', () => {
  /*
   * Search was in two places and one of them cost the masthead the board's
   * name. It is a destination of *what stands*, in the group row, which is
   * where the rail has always kept it and where `APhoneCarriesTheWholeRail`
   * counts it.
   */
  it('does not carry search, which the group row already does', async () => {
    await standingAt('/rules');

    /* The measure first: the row really does carry it, or this proves nothing. */
    const row = screen.getByRole('navigation', { name: en['shell.thisGroup'] });
    expect(within(row).getByRole('link', { name: en['rail.search'] })).toBeInTheDocument();

    const bar = theMasthead();
    expect(bar).toBeTruthy();
    expect(within(bar).queryByRole('link', { name: en['besides.search'] })).toBeNull();
    /* And nothing else of the four it used to carry crept back in its place. */
    expect(within(bar).queryByRole('button', { name: en['tools.title'] })).toBeNull();
  });

  /*
   * The two that belong to no screen stay. Putting something to the board is
   * the one act a secretary taking an enquiry by telephone needs, and it had
   * no way in on a phone at all before it was put here.
   */
  it('keeps the two that belong to no screen', async () => {
    await standingAt('/');
    const bar = theMasthead();
    expect(within(bar).getByRole('link', { name: en['door.asked.put'] })).toBeInTheDocument();
    expect(within(bar).getByRole('link', { name: en['besides.board'] })).toBeInTheDocument();
  });

  /* The calculators are not a masthead thing; they ride at the end of the row. */
  it('leaves the tools to the group row', async () => {
    await standingAt('/');
    const row = screen.getByRole('navigation', { name: en['shell.thisGroup'] }).parentElement!;
    expect(within(row).getByRole('button', { name: en['tools.title'] })).toBeInTheDocument();
  });
});

// ── the screen's name, said once ──────────────────────────────────────────

describe('the screen’s name', () => {
  it('is not set a second time where the row above has just said it', async () => {
    await standingAt('/', <PageHead title={en['rail.needsYou']} says="" />);

    const heading = screen.getByRole('heading', { level: 1, name: en['rail.needsYou'] });
    /*
     * Still in the document, and still the heading — a screen with none is a
     * worse fault than one said twice. What changes is that a phone does not
     * spend sixty-five pixels drawing it.
     */
    expect(heading.className).toContain('sr-only');
    expect(heading.className).toContain('sm:not-sr-only');
  });

  /*
   * And the measure looked at a heading that is not a repetition: *Events* in
   * the row and a screen called something else is two things, not one said
   * twice, and it keeps its heading at every width.
   */
  it('is drawn where it differs from the row’s word', async () => {
    await standingAt('/', <PageHead title="What went wrong" says="" />);

    const heading = screen.getByRole('heading', { level: 1, name: 'What went wrong' });
    expect(heading.className).not.toContain('sr-only');
  });

  /* And on a screen with no group row at all, nothing has been said above. */
  it('is drawn where no row is shown', async () => {
    await standingAt('/settings', <PageHead title={en['rail.needsYou']} says="" />);

    const heading = screen.getByRole('heading', { level: 1, name: en['rail.needsYou'] });
    expect(heading.className).not.toContain('sr-only');
  });
});

// ── the notice about the translation ──────────────────────────────────────

describe('the notice that a language has not been read', () => {
  it('is not shown in English, where there is nothing to explain', async () => {
    await standingAt('/');
    expect(screen.queryByText(en['lang.notReady'])).toBeNull();
  });

  it('is one line, with the rest of it one press away', async () => {
    reading('ur');
    await standingAt('/');

    /* The sentence is there; the paragraph is not, until it is asked for. */
    const line = screen.getByRole('button', { name: new RegExp(ur['lang.notReady'].slice(0, 12)) });
    expect(screen.queryByText(ur['lang.notReadyBody'])).toBeNull();

    fireEvent.click(line);
    expect(screen.getByText(ur['lang.notReadyBody'])).toBeInTheDocument();
  });

  /*
   * Closed, it stays closed — and only for the language it was closed in.
   * A reader who switches is owed the sentence again, because what it says
   * about the Urdu says nothing about the Arabic.
   */
  it('closes, and stays closed for that language alone', async () => {
    reading('ur');
    await standingAt('/');

    fireEvent.click(screen.getByRole('button', { name: ur['lang.notReadyClose'] }));
    expect(screen.queryByText(ur['lang.notReady'])).toBeNull();

    /* Drawn again, as a member moving to the next screen would. */
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
    await standingAt('/rules');
    expect(screen.queryByText(ur['lang.notReady'])).toBeNull();

    /*
     * And the other language is owed its own. This is the half that makes the
     * rest mean anything: a notice that never came back for anybody would
     * pass the two assertions above without being remembered per language at
     * all.
     */
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
    reading('ar');
    await standingAt('/');
    expect(screen.getByText(ar['lang.notReady'])).toBeInTheDocument();
  });
});

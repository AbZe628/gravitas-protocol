import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from './lib/i18n.js';
import { forgetMembers } from './lib/members.js';
import WhatWasUndertaken from './components/WhatWasUndertaken.js';
import en from './locales/en.js';

/**
 * A sitting's undertakings can be recorded from the interface at all.
 *
 * ── what was found, and it was not the reading ────────────────────────────
 *
 * `POST /api/undertakings` has always been there and **nothing in the client
 * called it**. The board's own clocks could be read and closed and never
 * started: every undertaking on every screen came from the seed. Found by
 * looking for where a secretary records what was undertaken at a sitting and
 * finding that there is nowhere.
 *
 * So the form is the thing here, and it stands whether or not anything was
 * read out of the minute.
 *
 * ── and the reading is a way to start it, not a way round it ──────────────
 *
 * The sentences the minute already contains are offered, each one filling the
 * form so it can be corrected before it is recorded. Pressing one records
 * nothing. The member it names is the board's own, never a guess, and a
 * sentence whose date is *next Tuesday* arrives with no date at all, because
 * a minute read a month later would set that clock wrong.
 */

const FOUND = [
  {
    what: 'Board Member C will confirm the custodian position by 20 November 2026.',
    who: 'member-c',
    dueAt: '2026-11-20T00:00:00.000Z',
    at: 56,
  },
  {
    what: 'Board Member A will circulate the revised schedule next Tuesday.',
    who: 'member-a',
    at: 295,
  },
];

const MEMBERS = [
  { scholarId: 'member-a', name: 'Board Member A', title: '', signatory: true, role: 'signatory', office: 'chair' },
  { scholarId: 'member-c', name: 'Board Member C', title: '', signatory: true, role: 'signatory', office: null },
];

let minuted: unknown[] = [];

function stub(found = FOUND) {
  minuted = [];
  forgetMembers();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const json = (b: unknown) =>
        new Response(JSON.stringify(b), { status: 200, headers: { 'Content-Type': 'application/json' } });

      if (init?.method === 'POST' && url.includes('/api/undertakings')) {
        minuted.push(JSON.parse(String(init.body)));
        return json({ undertaking: {} });
      }
      if (url.includes('/undertook')) return json({ meetingId: 'm1', readBy: 'words', found });
      if (url.includes('/api/settings')) return json({ members: MEMBERS });
      return json({});
    }),
  );
}

const draw = (canKeep = true) =>
  render(
    <I18nProvider>
      <MemoryRouter>
        <WhatWasUndertaken
          boardId="demo-board"
          meetingId="m1"
          minute="A minute with things in it."
          canKeep={canKeep}
          onMinuted={() => undefined}
        />
      </MemoryRouter>
    </I18nProvider>,
  );

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('minuting what was undertaken', () => {
  it('offers the sentences the minute itself holds, with the member and the day', async () => {
    stub();
    draw();

    expect(await screen.findByText(/confirm the custodian position/)).toBeInTheDocument();
    expect(screen.getByText(/circulate the revised schedule/)).toBeInTheDocument();
    /* The one with a day written out carries it; the one that says "next Tuesday" does not. */
    expect(screen.getByText(/2026-11-20/)).toBeInTheDocument();
  });

  /*
   * The line: a press fills a form. The board's own clocks are not started by
   * a machine reading prose.
   */
  it('records nothing when one is taken up', async () => {
    stub();
    draw();

    fireEvent.click((await screen.findAllByRole('button', { name: en['und.takeThis'] }))[0]);

    const what = screen.getByLabelText(en['und.whatHint']) as HTMLTextAreaElement;
    expect(what.value).toContain('confirm the custodian position');
    expect((screen.getByLabelText(en['und.whoHint']) as HTMLSelectElement).value).toBe('member-c');
    expect((screen.getByLabelText(en['und.byWhen']) as HTMLInputElement).value).toBe('2026-11-20');
    expect(minuted).toEqual([]);
  });

  it('records what the form holds, which is what a person left in it', async () => {
    stub();
    draw();

    fireEvent.click((await screen.findAllByRole('button', { name: en['und.takeThis'] }))[0]);
    fireEvent.change(screen.getByLabelText(en['und.whatHint']), {
      target: { value: 'Confirm the custodian position with the depositary.' },
    });
    fireEvent.click(screen.getByRole('button', { name: en['und.minuteIt'] }));

    await waitFor(() => expect(minuted).toHaveLength(1));
    expect(minuted[0]).toMatchObject({
      boardId: 'demo-board',
      meetingId: 'm1',
      who: 'member-c',
      what: 'Confirm the custodian position with the depositary.',
      dueAt: '2026-11-20T00:00:00.000Z',
    });
  });

  /*
   * The half that matters most: the form is the thing, and it was the thing
   * that was missing. A sitting whose minute reads as nothing but discussion
   * still has to be able to carry an undertaking.
   */
  it('stands on its own where the minute reads as nothing undertaken', async () => {
    stub([]);
    draw();

    await waitFor(() =>
      expect(screen.queryAllByRole('button', { name: en['und.takeThis'] })).toHaveLength(0),
    );
    fireEvent.change(screen.getByLabelText(en['und.whatHint']), {
      target: { value: 'Ask the depositary for the custody agreement.' },
    });
    fireEvent.change(screen.getByLabelText(en['und.whoHint']), { target: { value: 'member-a' } });
    fireEvent.click(screen.getByRole('button', { name: en['und.minuteIt'] }));

    await waitFor(() => expect(minuted).toHaveLength(1));
    expect(minuted[0]).toMatchObject({ who: 'member-a', what: 'Ask the depositary for the custody agreement.' });
    /* No day, because the board set none. Absent is a real answer. */
    expect(minuted[0]).not.toHaveProperty('dueAt');
  });

  /*
   * Dead rather than live-and-sorry, which is this application's rule for a
   * control it cannot honour: the route requires both and would refuse, and a
   * button that takes a press and then apologises reads as a button that does
   * nothing. What this holds is the control; the refusal behind it is the
   * server's, and is held there.
   */
  it('draws no live control for an undertaking with nobody on it', async () => {
    stub([]);
    draw();

    fireEvent.change(screen.getByLabelText(en['und.whatHint']), {
      target: { value: 'Ask the depositary for the custody agreement.' },
    });
    const act = screen.getByRole('button', { name: en['und.minuteIt'] });
    expect(act).toBeDisabled();

    fireEvent.click(act);
    expect(minuted).toEqual([]);
  });

  it('is absent for somebody who does not keep the minutes', () => {
    stub();
    const { container } = draw(false);
    expect(container.textContent).toBe('');
  });
});

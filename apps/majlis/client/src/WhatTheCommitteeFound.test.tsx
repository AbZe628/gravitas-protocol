import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WhatTheCommitteeFound from './components/WhatTheCommitteeFound.js';
import { I18nProvider } from './lib/i18n.js';

/**
 * What a committee found, on the screen a member votes from.
 *
 * What these hold to: **dissent is named at the same size as the account**, and
 * **nothing on this panel suggests the committee settled anything**. A board's
 * threshold is the number of signatures that bind the institution; a member
 * who read a committee's account and took it for a decision would be voting on
 * a summary of three colleagues instead of on the matter.
 */

const NOTE = 'A committee reports. What is decided, and by how many signatures, is unchanged by a referral.';

const reported = (over: Record<string, unknown> = {}) => ({
  matterId: 'matter-1',
  note: NOTE,
  referrals: [
    {
      referral: {
        id: 'referral-1',
        boardId: 'demo-board',
        committeeId: 'committee-1',
        matterId: 'matter-1',
        asking: 'Whether the wording reaches a fund that borrows at its own level.',
        referredBy: 'member-d',
        referredAt: '2026-08-12T00:00:00.000Z',
        report: {
          found: 'The wording reaches borrowing inside the index only.',
          by: 'member-a',
          at: '2026-08-18T00:00:00.000Z',
          standing: [],
        },
      },
      committee: {
        id: 'committee-1',
        boardId: 'demo-board',
        name: 'The contracts committee',
        remit: 'Read a contract shape before it comes to the board.',
        members: ['member-a', 'member-b', 'member-c'],
        formedIn: 'matter-founding',
        formedAt: '2026-04-09T00:00:00.000Z',
      },
      state: 'reported',
      referredByName: 'Board Member D',
      stood: {
        unanimous: false,
        agreedNames: ['Board Member A', 'Board Member B'],
        dissentedNames: [
          {
            scholarId: 'member-c',
            name: 'Board Member C',
            said: 'A fund borrowing at its own level reaches the same exposure by another route.',
          },
        ],
        silentNames: [],
      },
    },
  ],
  ...over,
});

function serve(body: unknown, role = 'signatory', committees: unknown = { committees: [], keepsNone: true }) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const json = (b: unknown) =>
        new Response(JSON.stringify(b), { status: 200, headers: { 'Content-Type': 'application/json' } });

      if (url.includes('/api/committees')) return json(committees);
      if (url.includes('/api/attention')) {
        return json({ scholarId: 'member-d', role, office: null, outstanding: 0, overdue: 0, items: [] });
      }
      return json(body);
    }),
  );
}

const show = () =>
  render(
    <I18nProvider>
      <MemoryRouter>
        <WhatTheCommitteeFound matterId="matter-1" />
      </MemoryRouter>
    </I18nProvider>,
  );

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('what the committee found', () => {
  it('shows the question the board asked and the account that came back', async () => {
    serve(reported());
    show();

    expect(await screen.findByText(/borrows at its own level/)).toBeTruthy();
    expect(screen.getByText(/reaches borrowing inside the index only/)).toBeTruthy();
    expect(screen.getByText('The contracts committee')).toBeTruthy();
  });

  it('names who did not stand behind it, and what they said instead', async () => {
    serve(reported());
    show();

    expect(await screen.findByText(/was not of one mind/i)).toBeTruthy();
    expect(screen.getByText(/reaches the same exposure by another route/)).toBeTruthy();
    expect(screen.getByText(/Board Member C/)).toBeTruthy();
  });

  /*
   * The sentence comes from the server and is shown verbatim. Two screens with
   * two versions of it is how one of them ends up softer than the other.
   */
  it('says a referral changes nothing about how the matter is decided', async () => {
    serve(reported());
    show();
    expect(await screen.findByText(NOTE)).toBeTruthy();
  });

  it('says plainly when nothing was sent to a committee', async () => {
    serve({ matterId: 'matter-1', note: NOTE, referrals: [] });
    show();
    expect(await screen.findByText(/reading it in the room/i)).toBeTruthy();
  });

  /*
   * A control that cannot be honoured is absent. A board with no committee has
   * nothing to refer to, so it is not offered a picker with nothing in it.
   */
  it('offers no referral where the board keeps no committee', async () => {
    serve(reported());
    show();
    await screen.findByText(NOTE);
    expect(screen.queryByText(/Ask a committee to look at this first/i)).toBeNull();
  });

  it('offers one where the board keeps a committee and the member may deliberate', async () => {
    serve(reported(), 'signatory', {
      keepsNone: false,
      committees: [
        {
          committee: { id: 'committee-1', name: 'The contracts committee', dissolvedAt: undefined },
          memberNames: [],
          convenorName: null,
          summary: { waiting: 0, reported: 1, withdrawn: 0, notUnanimous: 1 },
        },
      ],
    });
    show();
    expect(await screen.findByText(/Ask a committee to look at this first/i)).toBeTruthy();
  });

  it('offers nothing to an observer', async () => {
    serve(reported(), 'observer', {
      keepsNone: false,
      committees: [
        {
          committee: { id: 'committee-1', name: 'The contracts committee' },
          memberNames: [],
          convenorName: null,
          summary: { waiting: 0, reported: 0, withdrawn: 0, notUnanimous: 0 },
        },
      ],
    });
    show();
    await screen.findByText(NOTE);
    expect(screen.queryByText(/Ask a committee to look at this first/i)).toBeNull();
  });

  it('says it could not be read rather than showing nothing', async () => {
    serve({ nothing: 'of the expected shape' });
    show();
    expect(await screen.findByText(/could not be read/i)).toBeTruthy();
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { I18nProvider } from './lib/i18n.js';
import FollowInYourCalendar from './components/FollowInYourCalendar.js';

/**
 * The one address in this application that opens a door without a password.
 *
 * The server holds the boundary — the token answers for one route and
 * nothing else. What only a screen can get wrong is the telling: a member
 * who presses this is handing out a bearer credential, and they have to
 * know that before they press, not afterwards.
 *
 * So these hold three things. The cost is on the screen before the act. The
 * address is shown once and the screen says so. And withdrawing is offered
 * in the same place, because a secret you cannot take back is not one
 * anybody should be asked to make.
 */

const TOKEN = 'a-very-long-and-entirely-random-looking-token';

/*
 * Stateful on purpose. Issuing an address changes what `/api/me` says about
 * it, and a stub that answered the same thing before and after would let a
 * screen pass while showing a member no way to take back what they just
 * made.
 */
function stub(hasOne = false) {
  let stands = hasOne;
  const calls: { url: string; method: string }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      const json = (b: unknown, status = 200) =>
        new Response(JSON.stringify(b), {
          status,
          headers: { 'Content-Type': 'application/json' },
        });

      if (url.includes('/api/me/calendar-feed')) {
        calls.push({ url, method });
        if (method === 'DELETE') {
          stands = false;
          return new Response(null, { status: 204 });
        }
        stands = true;
        return json({ token: TOKEN, issuedAt: '2026-09-21T10:00:00.000Z' }, 201);
      }
      if (url.includes('/api/me'))
        return json({
          scholarId: 'member-a',
          role: 'signatory',
          office: 'chair',
          stillOnTheSeed: false,
          passwordMinimum: 12,
          resetsPossible: true,
          calendarFeed: stands ? { issuedAt: '2026-08-01T09:00:00.000Z' } : null,
        });
      return json({});
    }),
  );
  return calls;
}

afterEach(() => vi.unstubAllGlobals());

const show = () =>
  render(
    <I18nProvider>
      <FollowInYourCalendar />
    </I18nProvider>,
  );

/** Press the act and confirm it in the window, which is where it happens. */
async function press(name: RegExp) {
  fireEvent.click(await screen.findByRole('button', { name }));
  const w = await screen.findByRole('dialog');
  fireEvent.click(within(w).getByRole('button', { name }));
}

describe('before anybody presses anything', () => {
  it('says what the address hands over', async () => {
    stub();
    show();

    await screen.findByText(/Anyone who has it can read this board’s dates/);
    // And what it does not: the sentence that makes the cost survivable.
    expect(screen.getByText(/It opens nothing else/)).toBeInTheDocument();
  });

  it('offers nothing to withdraw where nothing stands', async () => {
    stub();
    show();

    await screen.findByRole('button', { name: /Make my address/ });
    expect(screen.queryByRole('button', { name: /Withdraw it/ })).not.toBeInTheDocument();
  });
});

describe('making one', () => {
  it('shows the whole address, once, and says it is once', async () => {
    stub();
    show();

    await press(/Make my address/);

    const address = await screen.findByText(new RegExp(TOKEN));
    /*
     * The whole thing, as it will be pasted: a calendar client is given an
     * address, not a token to assemble one from.
     */
    expect(address.textContent).toContain('/api/calendar.ics?feed=');
    expect(screen.getByText(/Shown once/)).toBeInTheDocument();
  });

  it('offers to withdraw it in the same place', async () => {
    stub();
    show();

    await press(/Make my address/);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Withdraw it/ })).toBeInTheDocument(),
    );
  });
});

describe('one that already stands', () => {
  it('says since when, and does not pretend it can show it again', async () => {
    stub(true);
    show();

    await screen.findByText(/An address stands, made on/);
    expect(screen.getByText(/2026-08-01/)).toBeInTheDocument();
    expect(screen.queryByText(new RegExp(TOKEN))).not.toBeInTheDocument();
    expect(screen.getByText(/make a new one/)).toBeInTheDocument();
  });

  it('withdraws it, and asks first', async () => {
    const calls = stub(true);
    show();

    await press(/Withdraw it/);

    await waitFor(() =>
      expect(calls.some((c) => c.method === 'DELETE')).toBe(true),
    );
  });
});

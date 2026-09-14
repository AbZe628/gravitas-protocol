import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import YourDevices from './components/YourDevices.js';
import { I18nProvider } from './lib/i18n.js';

/**
 * A device control that cannot be honoured is absent, and says why.
 *
 * ── the three ways a browser says no ──────────────────────────────────────
 *
 * Over plain HTTP the API is not there at all. In a browser that has never
 * had it, the same. On a desktop with no fingerprint reader, no face
 * recognition and no PIN, the API exists and has nothing to offer.
 *
 * All three are a real state a member will meet — the middle one at a bank
 * that standardised on something old, the last one on any tower under a desk —
 * and all three must produce a sentence rather than a button that opens a
 * dialog nobody can answer. Which sentence matters: "your machine has no PIN
 * set up" and "this page is not on a secure connection" send a member to two
 * different people.
 *
 * ── and the one way it says yes ───────────────────────────────────────────
 *
 * Guarded just as hard. A panel that hid the control in every case would pass
 * a test that only checked the hiding, and the feature would be gone with
 * nothing to show it.
 */

const originalFetch = globalThis.fetch;

function noDevicesFromTheServer() {
  globalThis.fetch = vi.fn(async () =>
    new Response(JSON.stringify({ devices: [], rpId: 'localhost', origin: 'http://localhost' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  ) as unknown as typeof fetch;
}

/** What the browser answers about itself, which is the whole of this test. */
function browserSays(opts: { secure: boolean; hasApi: boolean; hasAuthenticator?: boolean }) {
  vi.stubGlobal('isSecureContext', opts.secure);

  if (!opts.hasApi) {
    // Deleting is what it looks like in a browser that never had it.
    delete (window as unknown as Record<string, unknown>).PublicKeyCredential;
    return;
  }

  vi.stubGlobal('PublicKeyCredential', {
    isUserVerifyingPlatformAuthenticatorAvailable: async () => opts.hasAuthenticator ?? true,
  });
}

const show = () =>
  render(
    <I18nProvider>
      <YourDevices />
    </I18nProvider>,
  );

const held = {
  PublicKeyCredential: (window as unknown as Record<string, unknown>).PublicKeyCredential,
};

beforeEach(() => {
  noDevicesFromTheServer();
});

afterEach(() => {
  vi.unstubAllGlobals();
  globalThis.fetch = originalFetch;
  if (held.PublicKeyCredential === undefined) {
    delete (window as unknown as Record<string, unknown>).PublicKeyCredential;
  } else {
    (window as unknown as Record<string, unknown>).PublicKeyCredential = held.PublicKeyCredential;
  }
});

describe('where the browser cannot sign with a device', () => {
  it('offers nothing over a plain connection, and says that is why', async () => {
    browserSays({ secure: false, hasApi: true });
    show();

    await waitFor(() => expect(screen.getByText(/plain connection/i)).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /enrol/i })).toBeNull();
  });

  it('offers nothing in a browser without it, and does not call that a fault in the record', async () => {
    browserSays({ secure: true, hasApi: false });
    show();

    await waitFor(() =>
      expect(screen.getByText(/does not offer device signing/i)).toBeInTheDocument(),
    );
    expect(screen.getByText(/Nothing is missing from the record/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /enrol/i })).toBeNull();
  });

  it('names the actual obstacle where the machine has no fingerprint or PIN', async () => {
    browserSays({ secure: true, hasApi: true, hasAuthenticator: false });
    show();

    await waitFor(() =>
      expect(screen.getByText(/no fingerprint reader, face recognition or PIN/i)).toBeInTheDocument(),
    );
    // Not the secure-connection sentence: the two send a member to different
    // people, and answering with the wrong one wastes an afternoon.
    expect(screen.queryByText(/plain connection/i)).toBeNull();
  });
});

describe('where it can', () => {
  it('offers to enrol this device', async () => {
    browserSays({ secure: true, hasApi: true, hasAuthenticator: true });
    show();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /enrol this device/i })).toBeInTheDocument(),
    );
  });

  it('says what a device signature proves, and what it does not', async () => {
    browserSays({ secure: true, hasApi: true, hasAuthenticator: true });
    show();

    await waitFor(() =>
      expect(screen.getByText(/does not prove who that person was/i)).toBeInTheDocument(),
    );
  });

  it('tells a member with nothing enrolled that they can still sign', async () => {
    browserSays({ secure: true, hasApi: true, hasAuthenticator: true });
    show();

    await waitFor(() => expect(screen.getByText(/You can still sign/i)).toBeInTheDocument());
  });
});

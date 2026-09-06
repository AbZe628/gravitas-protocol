import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App.js';
import { I18nProvider } from './lib/i18n.js';
import { dirFor, translate, LANGS } from './locales/index.js';

function renderApp(route = '/') {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={[route]}>
        <App />
      </MemoryRouter>
    </I18nProvider>,
  );
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const json = (body: unknown) =>
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });

      if (url.includes('/api/attention')) {
        return json({ scholarId: 'member-a', role: 'signatory', outstanding: 0, overdue: 0, items: [] });
      }

      if (url.includes('/api/matters/')) {
        return json({
          id: 'm1',
          boardId: 'demo-board',
          title: 'Test matter',
          origin: 'compliance_concern',
          direction: 'permit',
          status: 'deliberation',
          openedAt: '2026-07-21T09:00:00Z',
          timelockEndsAt: null,
          affected: 47,
          deliberationCount: 0,
          proposal: 'A proposal.',
          notDecided: ['Not this.'],
          mechanism: 'It works like so.',
          interactsWith: [],
          proposedRule: {
            id: 'r1',
            boardId: 'demo-board',
            title: 'Rule',
            statement: 'Statement.',
            parameters: [{ key: 'k', value: 'v', meaning: 'means' }],
            parameterHash: '0xabc',
            parameterHashVerified: true,
            version: 1,
            inForceFrom: null,
            sources: [],
          },
          simulation: null,
          deliberation: [],
          reasoning: [],
          objections: [],
          inForceAt: null,
          sources: [],
        });
      }
      if (url.includes('/api/matters')) {
        return json([
          {
            id: 'm1',
            title: 'Test matter',
            origin: 'compliance_concern',
            direction: 'permit',
            status: 'deliberation',
            openedAt: '2026-07-21T09:00:00Z',
            timelockEndsAt: null,
            affected: 47,
            deliberationCount: 0,
          },
        ]);
      }
      if (url.includes('/api/registry')) {
        return json({ address: '0xabc', chainId: 421614, readAt: '', reachable: false });
      }
      if (url.includes('/api/rules')) return json([]);
      if (url.includes('/api/briefings')) return json([]);
      if (url.includes('/api/assistant/log')) return json([]);
      return json({});
    }),
  );
});

describe('localisation', () => {
  it('offers three languages', () => {
    expect(LANGS.map((l) => l.code)).toEqual(['en', 'ar', 'ur']);
  });

  it('marks Arabic and Urdu as right to left', () => {
    expect(dirFor('ar')).toBe('rtl');
    expect(dirFor('ur')).toBe('rtl');
    expect(dirFor('en')).toBe('ltr');
  });

  it('falls back rather than showing nothing when a key is missing', () => {
    // Arabic and Urdu now carry every key, so the only gap left is a key that
    // exists in no dictionary — a string reached before it is written. It
    // returns the key, isolated, rather than an empty label.
    const unwritten = 'not.yet.written';
    expect(translate('en', unwritten)).toBe(unwritten);
    expect(translate('ur', unwritten)).toContain(unwritten);
  });

  /*
   * A key added to English first is untranslated for as long as it takes the
   * next pass to reach it. Dropped into a right-to-left paragraph raw, the
   * bidi algorithm puts a Latin sentence's full stop at the start of the line,
   * and a board looking at the Arabic build would reasonably conclude the
   * software is broken rather than untranslated.
   */
  it('isolates a fallback on a right-to-left screen, and only there', () => {
    const FSI = String.fromCharCode(0x2068);
    const PDI = String.fromCharCode(0x2069);
    const missing = 'not.yet.written';

    expect(translate('ur', missing).startsWith(FSI)).toBe(true);
    expect(translate('ur', missing).endsWith(PDI)).toBe(true);

    // English is already laid out left to right; wrapping it would be noise.
    expect(translate('en', missing).includes(FSI)).toBe(false);
  });

  it('leaves a real translation alone', () => {
    // A string the language actually has is never wrapped: the isolate exists
    // for the gap, and marking a finished translation would outlive the gap.
    for (const l of LANGS) {
      expect(translate(l.code, 'asst.limits').includes(String.fromCharCode(0x2068))).toBe(false);
    }
  });

  it('returns the key itself when it does not exist anywhere', () => {
    expect(translate('en', 'no.such.key')).toBe('no.such.key');
  });

  it('translates the assistant constraint notice in every language', () => {
    for (const l of LANGS) {
      expect(translate(l.code, 'asst.limits').length).toBeGreaterThan(10);
    }
  });
});

describe('shell', () => {
  it('says the board decides here and that nothing here signs', async () => {
    // The distinction this has to keep making. Stage Two records a decision;
    // it does not execute one. If the interface ever stops saying so, it is
    // claiming an authority the application does not have.
    renderApp();
    expect(await screen.findAllByText(/nothing here signs/i)).not.toHaveLength(0);
  });

  /*
   * At /classic, because / now answers the one question a scholar arrives with
   * and stops. The Dashboard is unchanged and one link away, and these two hold
   * that nothing was removed by moving it.
   */
  it('shows matters before the board', async () => {
    renderApp('/classic');
    await waitFor(() => expect(screen.getByText('Test matter')).toBeInTheDocument());
  });

  it('surfaces the number of affected transactions on the list', async () => {
    renderApp('/classic');
    await waitFor(() => expect(screen.getByText(/47/)).toBeInTheDocument());
  });

  it('renders a matter with what is not being decided', async () => {
    renderApp('/matters/m1');
    await waitFor(() => expect(screen.getByText('Not this.')).toBeInTheDocument());
  });

  it('shows the assistant constraint prominently', async () => {
    renderApp('/assistant');
    expect(await screen.findByText(/does not give rulings/i)).toBeInTheDocument();
  });
});

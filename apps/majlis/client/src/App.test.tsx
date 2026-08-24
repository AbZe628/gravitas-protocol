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

  it('falls back to English for a key missing in a translation', () => {
    expect(translate('ur', 'rule.hashExplain')).toBe(translate('en', 'rule.hashExplain'));
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

  it('shows matters before the board', async () => {
    renderApp();
    await waitFor(() => expect(screen.getByText('Test matter')).toBeInTheDocument());
  });

  it('surfaces the number of affected transactions on the list', async () => {
    renderApp();
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

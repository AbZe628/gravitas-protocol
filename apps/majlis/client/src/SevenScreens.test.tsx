import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nProvider } from './lib/i18n.js';

import MatterPack from './pages/MatterPack.js';
import MatterDetail from './pages/MatterDetail.js';
import Settings from './pages/Settings.js';
import BoardBook from './pages/BoardBook.js';
import Examinations from './pages/Examinations.js';
import AssetDetail from './pages/AssetDetail.js';
import WhatStands from './pages/WhatStands.js';

import matterJson from './__fixtures__/matter.json';
import packJson from './__fixtures__/pack.json';
import bookJson from './__fixtures__/book.json';
import settingsJson from './__fixtures__/settings.json';
import assetJson from './__fixtures__/asset.json';
import rulesJson from './__fixtures__/rules.json';
import examinationsJson from './__fixtures__/examinations.json';
import mattersJson from './__fixtures__/matters.json';
import healthJson from './__fixtures__/health.json';
import attentionJson from './__fixtures__/attention.json';
import reviewsJson from './__fixtures__/reviews.json';

/**
 * The seven screens that had no test, and the three answers each owes.
 *
 * ── why these seven, and why together ─────────────────────────────────────
 *
 * The audit counted them: the matter pack, the older matter view, the board's
 * own page, the board book, examinations, one holding, and what stands. Every
 * one of them is a screen somebody opens in front of a bank, and none of them
 * had a line of test.
 *
 * They are in one file because what is being tested is one contract, not seven
 * features. A screen owes three different answers and must never give one in
 * place of another:
 *
 *   **it does not know yet** — the request is out, and the screen says so;
 *   **it could not find out** — the request failed, and the screen says *that*,
 *     which is a different sentence;
 *   **it found out** — and then it shows what it found.
 *
 * The failure this catches is the second collapsing into a claim about the
 * world. Five screens used to start at an empty array and swallow the error, so
 * a board whose server was unreachable read "nothing has been asked" and
 * "nothing has been examined" — Majlis making a statement about the bank when
 * what had happened was that it could not reach its own data.
 *
 * ── the fixtures are the server's own words ───────────────────────────────
 *
 * `src/__fixtures__` is what the real server answered, captured from a running
 * process rather than written by hand. A hand-written fixture tests the screen
 * against the shape its author remembered, which is exactly the shape that
 * cannot drift — so it never catches the drift.
 */

/* ── one stub, answering by path ───────────────────────────────────────── */

type Answer = 'ok' | 'fail' | 'silent';

function serve(mode: Answer) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const json = (b: unknown) =>
        new Response(JSON.stringify(b), { status: 200, headers: { 'Content-Type': 'application/json' } });

      // Never answers: the screen has to hold its "not yet" state.
      if (mode === 'silent') return new Promise<Response>(() => {});
      if (mode === 'fail') return new Response('no', { status: 500 });

      if (url.includes('/pack')) return json(packJson);
      if (url.includes('/book')) return json(bookJson);
      if (url.includes('/api/matters/')) return json(matterJson);
      if (url.includes('/api/matters')) return json(mattersJson);
      if (url.includes('/api/settings')) return json(settingsJson);
      if (url.includes('/api/assets/')) return json(assetJson);
      if (url.includes('/api/rules')) return json(rulesJson);
      if (url.includes('/api/examinations')) return json(examinationsJson);
      if (url.includes('/api/attention')) return json(attentionJson);
      if (url.includes('/api/reviews')) return json(reviewsJson);
      if (url.includes('/api/health')) return json(healthJson);
      if (url.includes('/api/assistant/log')) return json([]);
      return json({});
    }),
  );
}

function at(path: string, pattern: string, element: React.ReactNode) {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={pattern} element={element} />
        </Routes>
      </MemoryRouter>
    </I18nProvider>,
  );
}

const SCREENS = [
  {
    name: 'the matter pack',
    path: '/matters/matter-2026-08-11',
    pattern: '/matters/:id',
    element: <MatterPack />,
    shows: () => screen.findByText(matterJson.title),
  },
  {
    name: 'the older matter view',
    path: '/classic/matters/matter-2026-08-11',
    pattern: '/classic/matters/:id',
    element: <MatterDetail />,
    shows: () => screen.findByText(matterJson.title),
  },
  {
    name: 'the board',
    path: '/settings',
    pattern: '/settings',
    element: <Settings />,
    shows: () => screen.findByText(settingsJson.boardName),
  },
  {
    name: 'the board book',
    path: '/meetings/meeting-2026-08-20/book',
    pattern: '/meetings/:id/book',
    element: <BoardBook />,
    shows: () => screen.findByText(bookJson.items[0].item),
  },
  {
    name: 'examinations',
    path: '/examinations',
    pattern: '/examinations',
    element: <Examinations boardId="demo-board" />,
    shows: () => screen.findByText(examinationsJson.examinations[0].howChosen),
  },
  {
    name: 'one holding',
    path: '/register/asset-cash-backed',
    pattern: '/register/:id',
    element: <AssetDetail />,
    shows: () => screen.findByText(assetJson.asset.name),
  },
];

describe('the seven screens that had no test', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  for (const s of SCREENS) {
    it(`${s.name}: says it does not know yet, rather than showing an empty one`, async () => {
      serve('silent');
      at(s.path, s.pattern, s.element);
      expect(await screen.findByText(/Loading/i)).toBeTruthy();
    });

    it(`${s.name}: says it could not find out, which is not the same as nothing`, async () => {
      serve('fail');
      at(s.path, s.pattern, s.element);
      expect(await screen.findByText(/Could not load/i)).toBeTruthy();
      // The claim it must never make instead.
      expect(screen.queryByText(/^Nothing/)).toBeNull();
    });

    it(`${s.name}: shows what the server actually answered`, async () => {
      serve('ok');
      at(s.path, s.pattern, s.element);
      expect(await s.shows()).toBeTruthy();
    });
  }

  /*
   * What stands holds no request of its own: it is the two older screens under
   * one head, so what it owes is that both halves are reachable and that
   * neither of them arrives already claiming there is nothing.
   */
  it('what stands: both views are offered, and neither answers before it knows', async () => {
    serve('silent');
    at('/rules', '/rules', <WhatStands />);

    const tabs = await screen.findAllByRole('tab');
    expect(tabs).toHaveLength(2);
    expect(tabs.filter((b) => b.getAttribute('aria-selected') === 'true')).toHaveLength(1);
    expect(screen.queryByText(/Could not load/i)).toBeNull();
  });

  it('what stands: shows the rules once the server answers', async () => {
    serve('ok');
    at('/rules', '/rules', <WhatStands />);

    // The second view is the one that lists them, so switch to it.
    const [, inForce] = await screen.findAllByRole('tab');
    inForce.click();

    await waitFor(() => {
      expect(screen.getByText(rulesJson[0].title)).toBeTruthy();
    });
  });
});

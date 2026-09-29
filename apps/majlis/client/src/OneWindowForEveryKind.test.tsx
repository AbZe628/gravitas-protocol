import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WorkWindow from './components/WorkWindow.js';
import { I18nProvider } from './lib/i18n.js';
import en from './locales/en.js';
import type { Passage } from './lib/api.js';
import { buildIncidentPassage } from '../../server/src/services/passage-incident.js';
import { buildQuestionPassage } from '../../server/src/services/passage-question.js';
import { buildUndertakingPassage } from '../../server/src/services/passage-undertaking.js';
import { buildReviewPassage } from '../../server/src/services/passage-review.js';

/**
 * The same reading draws the same window, whatever the work is.
 *
 * ── what this holds shut ──────────────────────────────────────────────────
 *
 * Five kinds of the same thing — a breach, a question, an undertaking, a
 * ruling come round for review, a matter — were drawn five ways: nine cards
 * down a column, a card in a list, a line with a button, a date and nothing
 * else. A member learned five screens to do one job, and each screen made its
 * own claims about where the work stood, which is how two of them came to say
 * different things about the same breach on the same day.
 *
 * Each passage here is built by the function the server uses, from the kind
 * of record it reads, and the window is asked the same five questions of
 * every one: are all the steps in the strip, each named with whose it is; is
 * each half named; is the step the work is at the one the window opens on;
 * is the guidance beside it; and is there one bar for the act.
 */

const NOW = '2026-09-20T00:00:00Z';
const day = (n: number) => new Date(Date.parse(NOW) - n * 86_400_000).toISOString();

const BREACH = {
  id: 'i1', boardId: 'b', reference: 'SNC-1', title: 'A breach', report: 'What happened.',
  reportedBy: 'liaison-1', reportedAt: day(21), stage: 'reported', concurrences: [], determinedAt: null,
  actual: null, stopped: [], plans: [], directorsApprovedAt: null, submittedToRegulatorAt: null,
  purification: null, closedAt: null, plan: null, clock: null,
};
const QUESTION = {
  id: 'q1', boardId: 'b', institutionId: 'inst', arrivedAt: day(10), recordedAt: day(10), askedBy: 'desk',
  recordedBy: 'liaison-1', onBehalf: false, subject: 'A question', question: 'Is this permissible?',
  background: '', awaiting: '', attachments: [], draft: null, dispositions: [],
};
const UNDERTAKING = {
  id: 'u1', boardId: 'b', meetingId: 'm1', what: 'Bring the figures back', who: 'member-b',
  minutedBy: 'member-a', minutedAt: day(30), state: 'open',
};
const RULE = {
  id: 'r1', boardId: 'b', title: 'A ruling', statement: 'x', parameters: [], parameterHash: 'h', version: 1,
  inForceFrom: '2025-09-01T00:00:00Z', supersededBy: null, supersedes: null, sources: [],
};

const KINDS: { kind: string; passage: Passage }[] = [
  { kind: 'a breach', passage: buildIncidentPassage(BREACH as never, NOW) as unknown as Passage },
  { kind: 'a question', passage: buildQuestionPassage(QUESTION as never, NOW) as unknown as Passage },
  { kind: 'an undertaking', passage: buildUndertakingPassage(UNDERTAKING as never, NOW) as unknown as Passage },
  { kind: 'a ruling come round', passage: buildReviewPassage(RULE as never, NOW) as unknown as Passage },
];

/** The sentence a key reads as, with its gaps filled the way the window fills them. */
const said = (s: { key: string; vars?: Record<string, string | number> } | null | undefined) =>
  s ? en[s.key].replace(/\{(\w+)\}/g, (_, k: string) => String(s.vars?.[k] ?? '')) : '';

afterEach(() => vi.unstubAllGlobals());

describe('one window for every kind of work', () => {
  for (const { kind, passage } of KINDS) {
    it(`draws ${kind} as the window, from its reading and nothing else`, () => {
      vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { headers: { 'content-type': 'application/json' } })));
      render(
        <I18nProvider>
          <MemoryRouter>
            <WorkWindow passage={passage} title={`The ${kind}`} panels={[]} />
          </MemoryRouter>
        </I18nProvider>,
      );

      const steps = passage.groups.flatMap((g) => g.steps);
      expect(steps.length).toBeGreaterThan(0);

      // Every step is in the strip, named with its act and whose it is — the person, where it is with one.
      for (const s of steps) {
        const whose = s.who ?? en[`passage.whose.${s.whose}`];
        expect(screen.getByRole('button', { name: `${said(s.act)} — ${whose}` })).toBeInTheDocument();
      }

      // Each half is named once, in the strip.
      for (const g of passage.groups) {
        expect(screen.getAllByText(en[`passage.group.${g.key}`]).length).toBeGreaterThan(0);
      }

      // It opens on the step the work is at, which is the reading's, not the window's.
      const now = passage.next ?? steps.filter((s) => s.state === 'done').pop() ?? steps[0];
      expect(screen.getByRole('heading', { level: 2, name: said(now.act) })).toBeInTheDocument();
      expect(screen.getByText(said(now.why))).toBeInTheDocument();

      // One bar for the act — here, whose it is when it is nobody's on this screen.
      if (passage.next) {
        const bar = screen.getByRole('toolbar');
        const whose = passage.next.who ?? en[`passage.whose.${passage.next.whose}`];
        expect(within(bar).getByText((text) => text.includes(whose))).toBeInTheDocument();
      }

      // And what has happened, under the step.
      expect(screen.getByRole('heading', { level: 3, name: en['work.pane.record'] })).toBeInTheDocument();
    });
  }
});

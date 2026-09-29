import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nProvider } from './lib/i18n.js';
import { forgetMembers } from './lib/members.js';
import MatterFlow from './pages/MatterFlow.js';
import { buildPassage } from '../../server/src/services/passage.js';

/**
 * The matter's window says where the matter stands, and whom it waits on.
 *
 * ── the fault this holds shut ─────────────────────────────────────────────
 *
 * A vote had been open fifty-five days with three signatories who had not
 * spoken. The server knew both facts and said them: the passage carried
 * *2 recorded, 2 needed* and the three ids on the `positions` step, the queue
 * drew them, and the breach window had said the same about its own steps from
 * the beginning. The matter's window — the one screen a matter has — read
 * neither. A member could open it, work down the conditions and leave without
 * learning that the thing was waiting on three named people.
 *
 * ── why on this window and not only on the vote's ─────────────────────────
 *
 * A member arrives at the first unanswered condition, not at the vote. The
 * sentence has to be where they land, which is why it follows the passage's
 * `next` rather than whatever step the window happens to be showing.
 *
 * The vote's own window is the exception: the tally there already carries the
 * count, the threshold and who has not spoken, beside the figures they belong
 * to. Saying it again under the heading would be the same fact twice on one
 * screen, which is how a screen stops being read.
 */

const BOARD = {
  id: 'demo-board',
  institutionId: 'inst',
  name: 'Board',
  quorumPermit: 3,
  quorumRestrict: 2,
  totalSignatories: 5,
  ratificationWindowHours: 168,
  members: [
    { id: 'member-a', name: 'Amina Chair', title: '', board: 'demo-board', signatory: true },
    { id: 'member-b', name: 'Bilal Rahman', title: '', board: 'demo-board', signatory: true },
    { id: 'member-c', name: 'Casim Ode', title: '', board: 'demo-board', signatory: true },
  ],
};

const MEMBERS = BOARD.members.map((m) => ({
  scholarId: m.id,
  name: m.name,
  title: '',
  signatory: true,
  role: 'signatory',
  office: null,
}));

const ONE = {
  id: 'c1',
  requirement: 'The certificate holders own an undivided share in the assets.',
  why: 'Because it is what the contract turns on.',
  evidence: 'document',
};

const MATTER = {
  id: 'm1',
  boardId: 'demo-board',
  title: 'Whether the sukuk may be traded',
  origin: 'board',
  direction: 'restrict',
  status: 'voting',
  structureId: 'sukuk',
  openedAt: '2026-08-04T15:30:00Z',
  notDecided: [],
  mechanism: '',
  interactsWith: [],
  assetIds: [],
  findings: [],
  deliberation: [{ id: 'd1', scholarId: 'member-a', body: 'It holds.', at: '2026-08-05T00:00:00Z', replyTo: null, liaisonAnswer: false }],
  objections: [],
  sources: [],
  votes: [],
  proposal: '',
  proposedRule: { id: 'r1', boardId: 'demo-board', title: 'Sukuk', statement: '', parameters: [], parameterHash: '0x0', version: 1, inForceFrom: null, supersededBy: null, supersedes: null, sources: [], reviewEveryMonths: 6 },
  simulation: null,
  timelockStartedAt: null,
  timelockEndsAt: null,
  inForceAt: null,
  // One position recorded, so two signatories are still being waited on.
  reasoning: [{ scholarId: 'member-a', position: 'for', reason: 'It holds.', at: '2026-08-05T00:00:00Z' }],
};

const CHECKLIST = {
  structure: { id: 'sukuk', name: 'Sukuk', family: 'certificates', calculations: [], conditions: [ONE] },
  conditions: [{ condition: ONE, finding: null, history: [], answeredBy: [] }],
  source: 'draft',
  declined: false,
  basis: null,
  sourceNote: '',
  unanswered: ['c1'],
  contested: [],
  answered: 0,
  total: 1,
  note: '',
};

/*
 * The passage from the server's own function, not a fixture. What the window
 * says has to be what the server said, or this would be testing the screen
 * against an opinion written here.
 */
const PASSAGE = buildPassage(BOARD as never, MATTER as never, null, '2026-09-28T00:00:00Z');

function stub() {
  forgetMembers();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const json = (b: unknown) =>
        new Response(JSON.stringify(b), { status: 200, headers: { 'Content-Type': 'application/json' } });
      if (url.includes('/checklist')) return json(CHECKLIST);
      if (url.includes('/api/settings')) return json({ members: MEMBERS });
      if (url.includes('/tally')) {
        return json({ for: 1, against: 0, abstain: 0, required: 2, met: false, outstanding: ['member-b', 'member-c'] });
      }
      if (url.includes('/api/attention')) {
        return json({ scholarId: 'member-a', role: 'signatory', office: null, outstanding: 0, overdue: 0, items: [] });
      }
      if (url.includes('/api/matters/m1/passage')) return json(PASSAGE);
      if (url.includes('/api/matters/m1')) return json(MATTER);
      return json({});
    }),
  );
}

const show = (entry: string) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <I18nProvider>
        <Routes>
          <Route path="/matters/:id" element={<MatterFlow />} />
        </Routes>
      </I18nProvider>
    </MemoryRouter>,
  );

afterEach(() => vi.unstubAllGlobals());

describe('what the matter window says about where it stands', () => {
  it('has a passage that waits on somebody, or this proves nothing', () => {
    expect(PASSAGE.next?.key, 'the vote is not what this matter waits on').toBe('positions');
    expect(PASSAGE.next?.waitingOn).toEqual(['member-b', 'member-c']);
  });

  it('names them on the window a member lands on', async () => {
    stub();
    show('/matters/m1');

    // Arrived at the condition, which is not the step being waited on.
    await screen.findByText(/undivided share in the assets/);

    await waitFor(() => expect(screen.getByText(/Waiting on/)).toBeInTheDocument());
    const said = screen.getByText(/Waiting on/).textContent ?? '';
    expect(said).toContain('1 recorded, 2 needed');
    expect(said).toContain('Bilal Rahman');
    expect(said).toContain('Casim Ode');
    // Never the key the record files them under.
    expect(said).not.toMatch(/member-[a-c]/);
  });

  it('does not say it twice on the vote, where the tally already does', async () => {
    stub();
    show('/matters/m1?step=vote');

    await screen.findByText(/Not yet recorded/);
    expect(screen.queryByText(/Waiting on/), 'the same fact twice on one screen').toBeNull();
  });
});

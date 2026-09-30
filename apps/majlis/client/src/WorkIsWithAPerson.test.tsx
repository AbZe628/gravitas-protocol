import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Queue from './pages/Queue.js';
import QuestionDetail from './pages/QuestionDetail.js';
import { buildQuestionPassage } from '../../server/src/services/passage-question.js';
import RuleDetail from './pages/RuleDetail.js';
import { Route, Routes } from 'react-router-dom';
import Holding from './components/Holding.js';
import Person, { initialsOf } from './components/Person.js';
import WorkWindow from './components/WorkWindow.js';
import { I18nProvider } from './lib/i18n.js';
import en from './locales/en.js';
import { forgetIdentity, type Identity } from './lib/identity.js';
import { forgetMembers } from './lib/members.js';
import type { Passage, PassageStep, QueueRow } from './lib/api.js';

/**
 * Work placed with a person, as the screens show it.
 *
 * ── the faults these hold shut ────────────────────────────────────────────
 *
 *   - **the column that says who is holding something up said `member-a`.**
 *     The server names people by scholar id; drawn as it came, the column a
 *     board reads to see who has it showed a string from a configuration
 *     file.
 *   - **the card said *do this* to everybody** on a step placed with one
 *     member, which is how two people end up answering the same condition.
 *   - **what needs you** has to read the holder: a board step placed with a
 *     colleague is not yours, and a vote on something you carry is.
 *   - **the control offered what the server refuses** — taking work out of
 *     a colleague's hands.
 */

const MEMBERS = [
  { scholarId: 'member-a', name: 'Amina Chair', title: '', signatory: true, role: 'signatory', office: 'chair' },
  { scholarId: 'member-b', name: 'Bilal Rahman', title: '', signatory: true, role: 'signatory', office: null },
  { scholarId: 'member-c', name: 'Căsim Ode', title: '', signatory: true, role: 'signatory', office: null },
  { scholarId: 'advisor-1', name: 'Dunya Advises', title: '', signatory: false, role: 'advisory', office: null },
  { scholarId: 'liaison-1', name: 'Liaison Person', title: '', signatory: false, role: 'liaison', office: null },
];

function json(body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }),
  );
}

let posted: unknown[] = [];

function wire(me: Partial<Identity> & { scholarId: string }, rows: QueueRow[] = []) {
  posted = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === 'POST' && url.includes('/api/assignments')) {
        posted.push(JSON.parse(String(init.body)));
        return json({ assignment: {}, how: 'taken' });
      }
      if (init?.method === 'POST' && url.includes('/api/put-off')) {
        posted.push(JSON.parse(String(init.body)));
        return json({ putOff: {} });
      }
      if (url.includes('/api/attention'))
        return json({ role: 'signatory', office: null, items: [], ...me });
      if (url.includes('/api/settings')) return json({ members: MEMBERS });
      if (url.includes('/api/queue'))
        /*
         * The overdue count off the rows, as the server's is. Fixed at nought,
         * no test could tell a screen that kept the figure from one that quietly
         * dropped a set-aside row out of it.
         */
        return json({
          asOf: '2026-09-20T00:00:00Z',
          rows,
          waiting: rows.length,
          overdue: rows.filter((r) => r.overdue).length,
        });
      return json({});
    }),
  );
}

beforeEach(() => {
  forgetIdentity();
  forgetMembers();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const row = (over: Partial<QueueRow>): QueueRow => ({
  kind: 'matter',
  id: 'm1',
  to: '/matters/m1',
  title: 'A matter',
  phase: 'deciding',
  next: { key: 'step.conditions.act' },
  whose: 'board',
  days: 3,
  overdue: false,
  ...over,
});

describe('the queue', () => {
  it('names the person, never the scholar id', async () => {
    // Yours, so it is on the list the screen opens with.
    wire({ scholarId: 'member-b' }, [row({ who: 'member-b' })]);
    render(
      <I18nProvider>
        <MemoryRouter>
          <Queue />
        </MemoryRouter>
      </I18nProvider>,
    );
    await waitFor(() => expect(screen.getByText('Bilal Rahman')).toBeTruthy());
    expect(screen.queryByText('member-b')).toBeNull();
  });

  it('keeps a board step placed with a colleague off your list, and puts what you carry on it', async () => {
    wire({ scholarId: 'advisor-1', role: 'advisory' }, [
      row({ id: 'theirs', title: 'Placed with Bilal', who: 'member-b' }),
      row({ id: 'carried', title: 'Carried by you', whose: 'signatory', holder: 'advisor-1' }),
      row({ id: 'everyones', title: 'The board’s', whose: 'board' }),
    ]);
    render(
      <I18nProvider>
        <MemoryRouter>
          <Queue />
        </MemoryRouter>
      </I18nProvider>,
    );
    await waitFor(() => expect(screen.getByText('Carried by you')).toBeTruthy());
    expect(screen.getByText('The board’s')).toBeTruthy();
    expect(screen.queryByText('Placed with Bilal')).toBeNull();
  });

  it('keeps a vote you have cast off your list, while it is open for the others', async () => {
    wire({ scholarId: 'member-c' }, [
      row({ id: 'cast', title: 'Voted on already', whose: 'signatory', next: { key: 'step.positions.act' }, heard: ['member-a', 'member-c'] }),
      row({ id: 'uncast', title: 'Not voted on yet', whose: 'signatory', next: { key: 'step.positions.act' }, heard: ['member-a'] }),
    ]);
    render(
      <I18nProvider>
        <MemoryRouter>
          <Queue />
        </MemoryRouter>
      </I18nProvider>,
    );
    await waitFor(() => expect(screen.getByText('Not voted on yet')).toBeTruthy());
    expect(screen.queryByText('Voted on already')).toBeNull();
  });
});

/**
 * Taking it on without leaving the list.
 *
 * ── what a member had to do instead ───────────────────────────────────────
 *
 * Nine rows saying what needs them, and taking one on meant opening it,
 * finding the panel beside the work, pressing there, and coming back for the
 * next. Triage is the one thing this screen is for and it was the one thing
 * that could not be done on it.
 *
 * ── and the rule is the panel's, not a second one ─────────────────────────
 *
 * Written out twice, the row and the panel could disagree about whether a
 * member may take something on. Both read `holdingOf`, which states the rule
 * the route refuses on.
 */
describe('the act on the row', () => {
  const show = () =>
    render(
      <I18nProvider>
        <MemoryRouter>
          <Queue />
        </MemoryRouter>
      </I18nProvider>,
    );

  it('offers taking on what nobody holds, and writes it against that row', async () => {
    wire({ scholarId: 'member-b' }, [row({ title: 'Nobody has this', holdable: true })]);
    show();

    const take = await screen.findByRole('button', { name: /Take it on: Nobody has this/ });
    fireEvent.click(take);
    await waitFor(() => expect(posted).toHaveLength(1));
    expect(posted[0]).toEqual({ ofKind: 'matter', ofId: 'm1', to: 'member-b' });
  });

  it('offers handing back what you hold, and puts it back to the room', async () => {
    wire({ scholarId: 'member-b' }, [row({ title: 'Yours', holdable: true, holder: 'member-b' })]);
    show();

    fireEvent.click(await screen.findByRole('button', { name: /Hand it back to the board: Yours/ }));
    await waitFor(() => expect(posted).toHaveLength(1));
    expect(posted[0]).toEqual({ ofKind: 'matter', ofId: 'm1', to: null });
  });

  /*
   * A control that cannot be honoured is absent, not disabled. Taking work out
   * of a colleague's hands is not something one member does to another
   * quietly, and the route refuses it.
   */
  it('draws nothing on work in a colleague’s hands', async () => {
    wire({ scholarId: 'member-b' }, [
      row({ title: 'With Căsim', holdable: true, holder: 'member-c', whose: 'board' }),
    ]);
    show();
    await screen.findByText('With Căsim');
    expect(screen.queryByRole('button', { name: /Take it on/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Hand it back/ })).toBeNull();
  });

  /*
   * The chair may move work out of anybody's hands: that is what the office
   * is, and the route allows it. The row has to agree with the panel.
   */
  it('lets the chair hand back what a colleague holds', async () => {
    wire({ scholarId: 'member-a', office: 'chair' }, [
      row({ title: 'With Căsim', holdable: true, holder: 'member-c' }),
    ]);
    show();
    fireEvent.click(await screen.findByRole('button', { name: /Hand it back to the board/ }));
    await waitFor(() => expect(posted).toHaveLength(1));
    expect(posted[0]).toEqual({ ofKind: 'matter', ofId: 'm1', to: null });
  });

  /*
   * The passage has always said whether anything here could be carried at all.
   * Without it the row would have offered *take it on* by guessing, which puts
   * the control on work the route refuses.
   */
  it('draws nothing where nothing can be held', async () => {
    wire({ scholarId: 'member-b' }, [row({ title: 'Not holdable', holdable: false })]);
    show();
    await screen.findByText('Not holdable');
    expect(screen.queryByRole('button', { name: /Take it on/ })).toBeNull();
  });

  /* The bank's own people sit on the other side of the table. */
  it('draws nothing for the institution’s liaison', async () => {
    wire({ scholarId: 'liaison-1', role: 'liaison' }, [row({ title: 'A matter', holdable: true })]);
    show();
    await screen.findByText('A matter');
    expect(screen.queryByRole('button', { name: /Take it on/ })).toBeNull();
  });

  /*
   * Nine buttons all reading *Take it*: tabbing through them, or reading them
   * aloud, gave the same two words nine times with nothing saying which line
   * each belonged to.
   */
  it('says which row each act belongs to', async () => {
    wire({ scholarId: 'member-b' }, [
      row({ id: 'one', title: 'The first', holdable: true }),
      row({ id: 'two', title: 'The second', holdable: true }),
    ]);
    show();
    await screen.findByRole('button', { name: /Take it on: The first/ });
    expect(screen.getByRole('button', { name: /Take it on: The second/ })).toBeTruthy();
  });

  /*
   * Taking something on moves it between the two lists, and the row has to
   * move with it before the server has answered — otherwise the member presses
   * *take it* under *everyone* and watches nothing happen.
   */
  it('moves the row into your own list the moment you take it', async () => {
    /*
     * An advisory member, so the free row is not already theirs.
     *
     * Written with a signatory, every row was on *yours* before the press —
     * the whose-filter is not drawn at all when everything is already yours —
     * and the test passed without the row having moved anywhere.
     */
    wire({ scholarId: 'advisor-1', role: 'advisory' }, [
      row({ id: 'mine', title: 'Already yours', who: 'advisor-1' }),
      row({ id: 'free', title: 'Nobody has this', whose: 'signatory', holdable: true }),
      /*
       * A third, in somebody else's hands, so the whose-filter is still
       * drawn after the press. With two rows everything became theirs, the
       * filter stopped being offered at all, and the assertion could not be
       * made either way.
       */
      row({ id: 'theirs', title: 'With Căsim', who: 'member-c' }),
    ]);
    show();

    // Opens on *yours*, which the free signatory step is not part of.
    await screen.findByText('Already yours');
    fireEvent.click(screen.getByRole('button', { name: /Everyone/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Take it on: Nobody has this/ }));

    fireEvent.click(screen.getByRole('button', { name: /Yours/ }));
    await waitFor(() => expect(screen.getByText('Nobody has this')).toBeTruthy());
  });

  /*
   * The button is drawn only where the rule allows the act, so a refusal
   * should not happen — and when it does the member is owed the server's own
   * words rather than a row that quietly snaps back.
   */
  it('puts the row back, and says why, when the server refuses', async () => {
    wire({ scholarId: 'member-b' }, [row({ title: 'Nobody has this', holdable: true })]);
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (init?.method === 'POST' && url.includes('/api/assignments')) {
          return Promise.resolve(
            new Response(JSON.stringify({ message: 'Not yours to place.' }), { status: 403 }),
          );
        }
        if (url.includes('/api/attention'))
          return json({ scholarId: 'member-b', role: 'signatory', office: null, items: [] });
        if (url.includes('/api/settings')) return json({ members: MEMBERS });
        if (url.includes('/api/queue'))
          return json({
            asOf: '2026-09-20T00:00:00Z',
            rows: [row({ title: 'Nobody has this', holdable: true })],
            waiting: 1,
            overdue: 0,
          });
        return json({});
      }),
    );
    show();

    fireEvent.click(await screen.findByRole('button', { name: /Take it on: Nobody has this/ }));
    await screen.findByRole('alert');
    // And the act is offered again, rather than the row claiming to be held.
    expect(screen.getByRole('button', { name: /Take it on: Nobody has this/ })).toBeTruthy();
  });
});

/**
 * Coming back to something on a named day.
 *
 * ── the shape this is not ─────────────────────────────────────────────────
 *
 * *Remind me on Tuesday*, hidden from everybody else, was put to the board's
 * owner and refused in that shape: in a record whose rule is that what is
 * written is the board's and permanent, a member could otherwise push
 * something out of sight and nobody would know it had been pushed.
 *
 * So it carries a name, a day and a reason, the board reads all three, and it
 * changes one member's own list and nothing else. The count of what is
 * waiting and how many are past their date are what they were.
 */
describe('setting a row aside', () => {
  const show = () =>
    render(
      <I18nProvider>
        <MemoryRouter>
          <Queue />
        </MemoryRouter>
      </I18nProvider>,
    );

  const later = '2027-01-20T00:00:00.000Z';
  const because = 'Waiting on the desk to come back with the pricing feed.';

  it('takes it off your own list, and says how many are behind the chip', async () => {
    wire({ scholarId: 'member-b' }, [
      row({ id: 'plain', title: 'Still here' }),
      row({ id: 'aside', title: 'Put off', putOff: [{ by: 'member-b', until: later, reason: because }] }),
    ]);
    show();

    await screen.findByText('Still here');
    expect(screen.queryByText('Put off')).toBeNull();

    const chip = screen.getByRole('button', { name: /Set aside/ });
    fireEvent.click(chip);
    await waitFor(() => expect(screen.getByText('Put off')).toBeTruthy());
  });

  /*
   * A colleague stepping back from something says nothing about whether this
   * member should look at it. A list that thinned out because somebody else
   * was busy would be the screen deciding what the board attends to.
   */
  it('leaves it on everybody else’s list, and says who stepped back', async () => {
    wire({ scholarId: 'member-c' }, [
      row({ id: 'aside', title: 'Put off by Bilal', putOff: [{ by: 'member-b', until: later, reason: because }] }),
    ]);
    show();

    await screen.findByText('Put off by Bilal');
    expect(screen.queryByRole('button', { name: /Set aside/ })).toBeNull();
    expect(screen.getByText(en['needs.othersPutOff'].replace('{n}', '1'))).toBeTruthy();
  });

  /*
   * The figure this product is sold on. A set-aside that quieted the count
   * would be a way to make the board's own pace measure lie.
   */
  it('changes nothing about what is waiting or what is past its date', async () => {
    wire({ scholarId: 'member-b' }, [
      row({ id: 'plain', title: 'Still here' }),
      row({ id: 'aside', title: 'Put off', overdue: true, putOff: [{ by: 'member-b', until: later, reason: because }] }),
    ]);
    show();
    await screen.findByText('Still here');

    /*
     * Both figures, read off the line that carries them rather than by asking
     * the page whether the character 2 appears anywhere on it — which it does,
     * on a chip, in a date, and in the days column.
     */
    const waiting = screen.getByText(en['needs.waiting']).closest('div')!;
    expect(waiting.textContent).toContain(`2 ${en['needs.waiting']}`);
    expect(waiting.textContent).toContain(`1 ${en['needs.overdue']}`);

    // And the row itself is off the list, which is the whole of what changed.
    expect(screen.queryByText('Put off')).toBeNull();
  });

  it('writes the day and the reason, and reads it back on the row', async () => {
    wire({ scholarId: 'member-b' }, [row({ id: 'plain', title: 'A matter' })]);
    show();

    // Right-click, which is also what the Menu key sends.
    fireEvent.contextMenu(await screen.findByText('A matter'));

    fireEvent.change(await screen.findByLabelText(en['row.until']), {
      target: { value: '2027-01-20' },
    });
    fireEvent.change(screen.getByLabelText(en['row.why']), { target: { value: because } });
    fireEvent.click(screen.getByRole('button', { name: en['row.setAside'] }));

    await waitFor(() => expect(posted).toHaveLength(1));
    expect(posted[0]).toMatchObject({ ofKind: 'matter', ofId: 'plain', reason: because });
    expect(String((posted[0] as { until: string }).until)).toContain('2027-01-20');
  });

  /*
   * Said before it is done, because it is not what a member expects: every
   * other application's *remind me later* is private, and one who found out
   * afterwards that the board reads it would rightly feel tricked.
   */
  it('says the board will read it, before the member writes anything', async () => {
    wire({ scholarId: 'member-b' }, [row({ id: 'plain', title: 'A matter' })]);
    show();
    fireEvent.contextMenu(await screen.findByText('A matter'));
    expect(await screen.findByText(en['row.putOffMeans'])).toBeTruthy();
  });

  /* A control that cannot be honoured is absent: the route refuses both. */
  it('offers nothing to set aside until there is a day and a reason', async () => {
    wire({ scholarId: 'member-b' }, [row({ id: 'plain', title: 'A matter' })]);
    show();
    fireEvent.contextMenu(await screen.findByText('A matter'));

    await screen.findByLabelText(en['row.until']);
    expect(screen.queryByRole('button', { name: en['row.setAside'] })).toBeNull();

    fireEvent.change(screen.getByLabelText(en['row.until']), { target: { value: '2027-01-20' } });
    expect(screen.queryByRole('button', { name: en['row.setAside'] })).toBeNull();

    fireEvent.change(screen.getByLabelText(en['row.why']), { target: { value: because } });
    expect(screen.getByRole('button', { name: en['row.setAside'] })).toBeTruthy();
  });

  it('picks it back up, and asks for no reason to do it', async () => {
    wire({ scholarId: 'member-b' }, [
      row({ id: 'aside', title: 'Put off', putOff: [{ by: 'member-b', until: later, reason: because }] }),
    ]);
    show();

    fireEvent.click(await screen.findByRole('button', { name: /Set aside/ }));
    fireEvent.contextMenu(await screen.findByText('Put off'));
    fireEvent.click(await screen.findByRole('button', { name: en['row.pickUp'] }));

    await waitFor(() => expect(posted).toHaveLength(1));
    expect(posted[0]).toEqual({ ofKind: 'matter', ofId: 'aside', until: null, reason: '' });
  });

  /* What a colleague wrote, read in the window where the acts are. */
  it('shows a colleague’s reason where the member can read it', async () => {
    wire({ scholarId: 'member-c' }, [
      row({ id: 'aside', title: 'Put off by Bilal', putOff: [{ by: 'member-b', until: later, reason: because }] }),
    ]);
    show();
    fireEvent.contextMenu(await screen.findByText('Put off by Bilal'));
    expect(await screen.findByText(because, { exact: false })).toBeTruthy();
  });
});

describe('the window, on a step placed with somebody', () => {
  const step = (over: Partial<PassageStep>): PassageStep => ({
    key: 'conditions',
    act: { key: 'step.conditions.act' },
    whose: 'board',
    state: 'open',
    at: null,
    standing: null,
    enforced: false,
    why: { key: 'step.conditions.why' },
    ...over,
  });
  const passage = (next: PassageStep): Passage => ({
    of: { kind: 'matter', id: 'm1' },
    groups: [{ key: 'shaping', order: 'set', steps: [next] }],
    next,
    waiting: null,
    settled: null,
  });
  /* The page offers the act to anybody the route would let press it; the window decides whether it is theirs now. */
  const offered = [{ key: 'conditions', action: <button type="button">Answer the condition</button> }];
  const draw = (next: PassageStep, me: string, panels = offered) => {
    wire({ scholarId: me });
    return render(
      <I18nProvider>
        <MemoryRouter>
          <WorkWindow passage={passage(next)} title="A matter" panels={panels} />
        </MemoryRouter>
      </I18nProvider>,
    );
  };

  it('is quiet, and names the colleague, on a step placed with somebody else', async () => {
    draw(step({ who: 'member-b' }), 'member-c');
    const bar = screen.getByRole('toolbar');
    await waitFor(() => expect(bar.textContent).toContain('With Bilal Rahman'));
    expect(within(bar).queryByRole('button', { name: 'Answer the condition' })).toBeNull();
  });

  it('still offers the act to the person it was placed with', async () => {
    draw(step({ who: 'member-c' }), 'member-c');
    const bar = screen.getByRole('toolbar');
    await waitFor(() => expect(within(bar).getByRole('button', { name: 'Answer the condition' })).toBeInTheDocument());
  });

  it('says whom a vote still waits on by name, never by id', async () => {
    const { container } = draw(
      step({
        key: 'positions',
        whose: 'signatory',
        act: { key: 'step.positions.act' },
        standing: { key: 'step.positions.standing', vars: { recorded: 1, needed: 2 } },
        heard: ['member-a'],
        waitingOn: ['member-b', 'member-c'],
      }),
      'member-c',
    );
    await waitFor(() => expect(container.textContent).toContain('Waiting on Bilal Rahman, Căsim Ode.'));
    expect(container.textContent).not.toMatch(/member-[a-z]/);
  });

  it('tells a member who has said theirs that it waits on the others', async () => {
    draw(step({ whose: 'signatory', heard: ['member-c'] }), 'member-c', []);
    await waitFor(() =>
      expect(screen.getByRole('toolbar').textContent).toContain('You have said yours. It waits on the others.'),
    );
  });
});

/**
 * The same control, placing one step instead of the whole thing.
 *
 * ── why a step at all ─────────────────────────────────────────────────────
 *
 * The route has taken a step key since it was written and nothing ever sent
 * one, so a board could hand over a breach but not the answer to the
 * regulator inside it. The member who reads the contract is rarely the member
 * who writes to the regulator, and handing over the whole of it to arrange
 * that moved four other steps with it.
 *
 * ── what it must not read ─────────────────────────────────────────────────
 *
 * Not the step's `who`. That is whoever the step is with for any reason at
 * all, and an undertaking's reading puts the member who gave the promise on
 * it. A control reading that would have offered *put this step back to the
 * board* on a promise nobody placed.
 */
describe('the control, on one step', () => {
  const whole = (holder: string | null): Passage => ({
    of: { kind: 'breach', id: 'b1' },
    groups: [],
    next: null,
    waiting: null,
    settled: null,
    holder: holder ? { to: holder, by: holder, at: '2026-09-20T00:00:00Z' } : null,
    holdable: true,
  });

  const aStep = (over: Partial<PassageStep> = {}): PassageStep =>
    ({
      key: 'regulator',
      act: { key: 'breach.step.regulator.act' },
      whose: 'signatory',
      state: 'open',
      at: null,
      standing: null,
      enforced: false,
      why: { key: 'breach.step.regulator.why' },
      holdable: true,
      holder: null,
      ...over,
    }) as PassageStep;

  const draw = async (
    who: Partial<Identity> & { scholarId: string },
    step: PassageStep,
    passage: Passage = whole(null),
  ) => {
    wire(who);
    const onChanged = vi.fn();
    const r = render(
      <I18nProvider>
        <Holding passage={passage} step={step} onChanged={onChanged} />
      </I18nProvider>,
    );
    await waitFor(() => expect(r.container.textContent).not.toBe(''));
    await new Promise((ok) => setTimeout(ok, 0));
    return { ...r, onChanged };
  };

  it('writes the step key, and says which this is', async () => {
    const { container, onChanged } = await draw({ scholarId: 'member-c' }, aStep());
    expect(container.textContent).toContain('Nobody has taken this step yet.');

    fireEvent.click(await screen.findByRole('button', { name: /take this step/i }));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(posted).toEqual([
      { ofKind: 'breach', ofId: 'b1', stepKey: 'regulator', to: 'member-c' },
    ]);
  });

  it('reads the step’s own holder, not the holder of the whole', async () => {
    const { container } = await draw(
      { scholarId: 'member-c' },
      aStep({ holder: { to: 'member-b', by: 'member-a', at: '2026-09-20T00:00:00Z' } }),
      // Somebody else holds the whole of it. That is not who holds this step.
      whole('member-c'),
    );
    await waitFor(() => expect(container.textContent).toContain('Bilal Rahman'));
    expect(container.textContent).toContain('Amina Chair');
    // With a colleague and not the chair: nothing to press, and whom to ask.
    expect(within(container).queryAllByRole('button')).toHaveLength(0);
    expect(container.textContent).toContain('Ask them to hand this step on');
  });

  it('puts a step back without touching the rest', async () => {
    const { onChanged } = await draw(
      { scholarId: 'member-c' },
      aStep({ holder: { to: 'member-c', by: 'member-c', at: '2026-09-20T00:00:00Z' } }),
      whole('member-a'),
    );
    fireEvent.click(await screen.findByRole('button', { name: /put this step back/i }));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(posted).toEqual([{ ofKind: 'breach', ofId: 'b1', stepKey: 'regulator', to: null }]);
  });

  /*
   * A control that cannot be honoured is absent, not disabled. The bank's own
   * filing is not a step anybody on this board can be given.
   */
  it('draws nothing on a step nobody here could take', async () => {
    // Rendered without the helper above, which waits for something to appear.
    wire({ scholarId: 'member-c' });
    const { container } = render(
      <I18nProvider>
        <Holding passage={whole(null)} step={aStep({ holdable: false })} onChanged={() => undefined} />
      </I18nProvider>,
    );
    await new Promise((ok) => setTimeout(ok, 0));
    expect(container.textContent).toBe('');
    // And the same step, holdable, does draw — or this passes by never looking.
    const other = render(
      <I18nProvider>
        <Holding passage={whole(null)} step={aStep()} onChanged={() => undefined} />
      </I18nProvider>,
    );
    await waitFor(() => expect(other.container.textContent).not.toBe(''));
  });
});

describe('the control', () => {
  const p = (holder: string | null, holdable = true): Passage => ({
    of: { kind: 'breach', id: 'b1' },
    groups: [],
    next: null,
    waiting: null,
    settled: null,
    holder: holder ? { to: holder, by: holder, at: '2026-09-20T00:00:00Z' } : null,
    holdable,
  });

  const draw = async (who: Partial<Identity> & { scholarId: string }, passage: Passage) => {
    wire(who);
    const onChanged = vi.fn();
    const r = render(
      <I18nProvider>
        <Holding passage={passage} onChanged={onChanged} />
      </I18nProvider>,
    );
    // Settled once the list of members has been read.
    await waitFor(() => expect(r.container.textContent).not.toBe(''));
    await new Promise((ok) => setTimeout(ok, 0));
    return { ...r, onChanged };
  };

  it('offers taking what nobody holds, and writes it for you', async () => {
    const { onChanged } = await draw({ scholarId: 'member-c' }, p(null));
    fireEvent.click(await screen.findByRole('button', { name: /take this on/i }));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(posted).toEqual([{ ofKind: 'breach', ofId: 'b1', stepKey: null, to: 'member-c' }]);
  });

  it('offers nothing to press on work in a colleague’s hands, and says whom to ask', async () => {
    const { container } = await draw({ scholarId: 'member-c' }, p('member-b'));
    await waitFor(() => expect(container.textContent).toContain('Bilal Rahman'));
    expect(within(container).queryAllByRole('button')).toHaveLength(0);
    expect(container.textContent).toMatch(/ask them/i);
  });

  it('lets the holder hand on or put back, and never lists the bank’s liaison', async () => {
    const { container } = await draw({ scholarId: 'member-b' }, p('member-b'));
    await waitFor(() => expect(screen.getByRole('button', { name: /put back/i })).toBeTruthy());
    const options = within(container)
      .getAllByRole('option')
      .map((o) => o.textContent);
    expect(options).toContain('Căsim Ode');
    expect(options).toContain('Dunya Advises');
    expect(options).not.toContain('Liaison Person');
    expect(options).not.toContain('Bilal Rahman');
  });

  it('lets the chair move work out of anybody’s hands', async () => {
    await draw({ scholarId: 'member-a', office: 'chair' }, p('member-b'));
    await waitFor(() => expect(screen.getByRole('button', { name: /put back/i })).toBeTruthy());
    expect(screen.getAllByRole('option').length).toBeGreaterThan(1);
  });

  /*
   * The act is drawn at once and the server's answer replaces it. Both halves:
   * a test that only waited for the write would pass on the old screen, which
   * spun until the second read came back.
   */
  it('draws the new holder the moment the member takes it, before the server has answered', async () => {
    const { onChanged, container } = await draw({ scholarId: 'member-c' }, p(null));
    let answer: (r: Response) => void = () => undefined;
    const pending = new Promise<Response>((ok) => (answer = ok));
    const underneath = globalThis.fetch;
    vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
      init?.method === 'POST' ? pending : underneath(input, init),
    );

    fireEvent.click(await screen.findByRole('button', { name: /take this on/i }));
    expect(container.textContent).toContain('With you');
    expect(container.textContent).not.toContain('Nobody has taken this on');
    expect(onChanged).not.toHaveBeenCalled();

    answer(new Response(JSON.stringify({ assignment: {}, how: 'taken' }), { status: 201 }));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it('puts the holder back, and says why, when the server refuses', async () => {
    const { onChanged, container } = await draw({ scholarId: 'member-c' }, p(null));
    const underneath = globalThis.fetch;
    vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
      init?.method === 'POST'
        ? Promise.resolve(
            new Response(JSON.stringify({ error: 'forbidden', message: 'Somebody took it a moment ago.' }), {
              status: 403,
            }),
          )
        : underneath(input, init),
    );

    fireEvent.click(await screen.findByRole('button', { name: /take this on/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Somebody took it a moment ago.');
    expect(container.textContent).toContain('Nobody has taken this on');
    expect(container.textContent).not.toContain('With you');
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('is not drawn where there is nothing left to hold', async () => {
    wire({ scholarId: 'member-c' });
    const { container } = render(
      <I18nProvider>
        <Holding passage={p(null, false)} onChanged={() => undefined} />
      </I18nProvider>,
    );
    expect(container.textContent).toBe('');
  });
});

describe('a person, drawn', () => {
  it('is their name, and what the record holds where the board does not know them', async () => {
    wire({ scholarId: 'member-c' });
    const { container } = render(
      <I18nProvider>
        <p>
          <Person id="member-b" /> | <Person id="Treasury desk" />
        </p>
      </I18nProvider>,
    );
    await waitFor(() => expect(container.textContent).toContain('Bilal Rahman'));
    expect(container.textContent).toContain('Treasury desk');
    expect(container.textContent).not.toContain('member-b');
  });

  it('gives an avatar the initials of the name, not the first letter of the id', () => {
    expect(initialsOf('Bilal Rahman')).toBe('BR');
    expect(initialsOf('Amina')).toBe('A');
    expect(initialsOf('  ')).toBe('?');
    // The fault: every id on the demonstration board begins `member-`.
    expect(initialsOf('member-b')).toBe('M');
  });
});

describe('a question, in its own window', () => {
  const question = {
    id: 'sub-1',
    boardId: 'demo-board',
    institutionId: 'inst-1',
    arrivedAt: '2026-09-01T08:00:00.000Z',
    recordedAt: '2026-09-01T08:00:00.000Z',
    askedBy: 'Layla Haddad, Treasury',
    recordedBy: 'desk-treasury',
    onBehalf: false,
    subject: 'Wrapped sukuk for the treasury desk',
    question: 'May we hold the wrapped form?',
    background: '',
    awaiting: '',
    attachments: [],
    draft: null,
    dispositions: [],
    standing: 'waiting',
    matterId: null,
    waitedHours: 145,
  };
  /* Built by the function the server uses, so the window is read against the real reading. */
  const passage = (holder: string | null) => ({
    ...buildQuestionPassage(question as never, '2026-09-20T00:00:00Z'),
    holder: holder ? { to: holder, by: 'member-a', at: '2026-09-02T00:00:00Z' } : null,
    holdable: true,
  });

  const open = (holder: string | null) => {
    posted = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (init?.method === 'POST') {
          posted.push(JSON.parse(String(init.body)));
          return json({ assignment: {}, how: 'taken' });
        }
        if (url.includes('/api/attention')) return json({ scholarId: 'member-c', role: 'signatory', office: null, items: [] });
        if (url.includes('/api/settings')) return json({ members: MEMBERS });
        if (url.includes('/api/passages/question/sub-1')) return json(passage(holder));
        if (url.includes('/api/submissions/sub-1')) return json({ submission: question });
        return json({});
      }),
    );
    return render(
      <I18nProvider>
        <MemoryRouter initialEntries={['/questions/sub-1']}>
          <Routes>
            <Route path="/questions/:id" element={<QuestionDetail />} />
          </Routes>
        </MemoryRouter>
      </I18nProvider>,
    );
  };

  it('offers taking it up, and writes it for the question', async () => {
    open(null);
    fireEvent.click(await screen.findByRole('button', { name: /take this on/i }));
    await waitFor(() => expect(posted).toEqual([{ ofKind: 'question', ofId: 'sub-1', stepKey: null, to: 'member-c' }]));
  });

  it('says whom it is with, by name, and who placed it there', async () => {
    const { container } = open('member-b');
    await waitFor(() => expect(container.textContent).toContain('With Bilal Rahman'));
    expect(container.textContent).toContain('placed by Amina Chair');
    expect(screen.queryByRole('button', { name: /take this on/i })).toBeNull();
  });

  it('puts the one act where every window puts it, and names the step it is', async () => {
    open(null);
    const bar = await screen.findByRole('toolbar');
    expect(within(bar).getByRole('button', { name: /take it up as a matter/i })).toBeInTheDocument();
    expect(within(bar).getByRole('button', { name: /do not take it up/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /take it up as a matter, or say why not/i })).toBeInTheDocument();
  });
});

describe('a ruling, on its own page', () => {
  const rule = {
    id: 'rule-1',
    boardId: 'demo-board',
    title: 'Tangible asset ratio for secondary trading',
    statement: 'Secondary trading is suspended while the ratio is below the threshold.',
    parameters: [],
    parameterHash: '0xabc',
    parameterHashVerified: true,
    version: 1,
    inForceFrom: '2026-01-01T00:00:00Z',
    supersededBy: null,
    supersedes: null,
    sources: [],
  };
  const open = (holdable: boolean) => {
    posted = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (init?.method === 'POST') {
          posted.push(JSON.parse(String(init.body)));
          return json({ assignment: {}, how: 'taken' });
        }
        if (url.includes('/api/attention')) return json({ scholarId: 'member-c', role: 'signatory', office: null, items: [] });
        if (url.includes('/api/settings')) return json({ members: MEMBERS });
        if (url.includes('/api/passages/review/rule-1'))
          return json({ of: { kind: 'review', id: 'rule-1' }, groups: [], next: null, waiting: null, settled: null, holder: null, holdable });
        if (url.includes('/api/reviews')) return json({ items: [{ ruleId: 'rule-1', state: 'unscheduled', overdue: false, dueAt: null }] });
        if (url.includes('/api/rules')) return json([rule]);
        return json({});
      }),
    );
    return render(
      <I18nProvider>
        <MemoryRouter initialEntries={['/rules/rule-1']}>
          <Routes>
            <Route path="/rules/:id" element={<RuleDetail />} />
          </Routes>
        </MemoryRouter>
      </I18nProvider>,
    );
  };

  it('offers taking the review on, where there is something to bring back', async () => {
    open(true);
    fireEvent.click(await screen.findByRole('button', { name: /take this on/i }));
    await waitFor(() => expect(posted).toEqual([{ ofKind: 'review', ofId: 'rule-1', stepKey: null, to: 'member-c' }]));
  });

  it('offers nothing where the server says there is nothing to hold', async () => {
    const { container } = open(false);
    await waitFor(() => expect(container.textContent).toContain('Tangible asset ratio'));
    await new Promise((ok) => setTimeout(ok, 50));
    expect(screen.queryByRole('button', { name: /take this on/i })).toBeNull();
  });
});

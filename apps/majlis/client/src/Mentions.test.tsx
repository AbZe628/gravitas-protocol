import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Deliberation from './components/Deliberation.js';
import { I18nProvider } from './lib/i18n.js';

/**
 * Naming a colleague in the deliberation.
 *
 * What these hold to: the composer offers **the board and nobody else**, the
 * names in a body come already resolved from the server, and where they do not
 * the body is still readable rather than parsed a second time here.
 */

const posted: { url: string; body: unknown }[] = [];
let identity: Record<string, unknown> = { scholarId: 's2', role: 'signatory', office: null };

const entry = (over: Record<string, unknown> = {}) => ({
  id: 'd1',
  scholarId: 's1',
  body: 'Does @s2 agree the ratio holds?',
  at: '2026-09-04T09:00:00.000Z',
  replyTo: null,
  liaisonAnswer: false,
  segments: [
    { text: 'Does ' },
    { text: '@s2', scholarId: 's2' },
    { text: ' agree the ratio holds?' },
  ],
  ...over,
});

const matter = (over: Record<string, unknown> = {}) => ({
  id: 'm1',
  boardId: 'b',
  title: 'A matter',
  origin: 'institution_request',
  direction: 'permit',
  status: 'deliberation',
  openedAt: '2026-09-04T08:00:00.000Z',
  timelockEndsAt: null,
  affected: null,
  deliberationCount: 1,
  proposal: '',
  notDecided: [],
  mechanism: '',
  interactsWith: [],
  proposedRule: {
    id: 'r', boardId: 'b', title: '', statement: '', parameters: [],
    parameterHash: '0x0', version: 1, inForceFrom: null, sources: [],
  },
  simulation: null,
  deliberation: [entry()],
  reasoning: [],
  objections: [],
  inForceAt: null,
  sources: [],
  mentionable: [
    { id: 's1', name: 'Mufti One', title: 'Chair' },
    { id: 's2', name: 'Shaykh Two', title: 'Member' },
  ],
  ...over,
});

function stub() {
  posted.length = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const json = (b: unknown) =>
        new Response(JSON.stringify(b), { status: 200, headers: { 'Content-Type': 'application/json' } });

      if (init?.method && init.method !== 'GET') {
        posted.push({ url, body: init.body ? JSON.parse(String(init.body)) : null });
        return json(matter());
      }
      if (url.includes('/api/attention')) return json(identity);
      return json({});
    }),
  );
}

const show = (m: Record<string, unknown> = matter(), canSpeak = true) =>
  render(
    <I18nProvider>
      <MemoryRouter>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Deliberation matter={m as any} canSpeak={canSpeak} onChanged={() => undefined} />
      </MemoryRouter>
    </I18nProvider>,
  );

afterEach(() => {
  vi.unstubAllGlobals();
  identity = { scholarId: 's2', role: 'signatory', office: null };
});

describe('the names in a body are shown as names', () => {
  it('renders the whole body, marked and unmarked parts together', async () => {
    stub();
    const { container } = show();

    await waitFor(() => expect(container.textContent).toContain('Does @s2 agree the ratio holds?'));
  });

  it('marks your own name more strongly than anybody else’s', async () => {
    stub();
    show();

    // The useful question when reading a long thread is whether any of it was
    // addressed to you.
    //
    // The mark is a tinted ground, and the hue moved with the palette: a
    // name is a reference to a person, which is lapis, and gold is now the
    // clock. What the test holds is that your own name carries a ground and
    // somebody else's does not.
    /*
     * Wait for the mark, not for the name.
     *
     * The name renders as soon as the body does; whether it is yours is not
     * known until the identity request answers, and until then it is drawn
     * like anybody else's. Waiting for the text and asserting the ground
     * passed here and failed on CI, where the answer arrived a moment
     * later — a measure whose result depends on which machine ran it.
     */
    await waitFor(() => expect(screen.getByText('@s2').className).toContain('bg-lapis'));
  });

  it('marks somebody else’s name without the emphasis', async () => {
    identity = { scholarId: 's1', role: 'signatory', office: null };
    /*
     * Both names in the body, so the absence can be read against a
     * presence. With only @s2 there was nothing in the rendered output to
     * say the identity had arrived, and "no ground on @s2" was true before
     * it did.
     */
    stub();
    show(
      matter({
        deliberation: [
          entry({
            body: 'Does @s2 agree, @s1?',
            segments: [
              { text: 'Does ' },
              { text: '@s2', scholarId: 's2' },
              { text: ' agree, ' },
              { text: '@s1', scholarId: 's1' },
              { text: '?' },
            ],
          }),
        ],
      }),
    );

    /*
     * An absence proves nothing until the thing that would fill it has
     * arrived. Before the identity request answers, no name carries the
     * ground — so this passed whether or not the rule works, which is the
     * failure this project keeps finding in its own measures.
     *
     * So: wait for the component to have settled on an identity, by
     * watching the case that does mark, then assert this one does not.
     */
    // Their own name carries the ground: the identity has arrived.
    await waitFor(() => expect(screen.getByText('@s1').className).toContain('bg-lapis'));
    // And only then does the absence on the other name mean anything.
    expect(screen.getByText('@s2').className).not.toContain('bg-lapis');
  });

  it('shows the body as it is where the server sent no segments', async () => {
    // The right failure: text a reader can still read, rather than a second
    // parser here quietly disagreeing with the first.
    stub();
    const plain = matter({ deliberation: [entry({ segments: undefined })] });
    const { container } = show(plain);

    await waitFor(() => expect(container.textContent).toContain('Does @s2 agree the ratio holds?'));
  });
});

describe('the composer offers the board and nobody else', () => {
  it('lists the members by name', async () => {
    stub();
    show();

    await waitFor(() => expect(screen.getByText('Ask someone')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Mufti One' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Shaykh Two' })).toBeInTheDocument();
  });

  it('inserts the id, because names are ambiguous and ids are what the record uses', async () => {
    stub();
    show();

    await waitFor(() => screen.getByRole('button', { name: 'Mufti One' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mufti One' }));

    const box = screen.getAllByRole('textbox')[0] as HTMLTextAreaElement;
    expect(box.value).toBe('@s1 ');
  });

  it('does not run two names together', async () => {
    stub();
    show();

    await waitFor(() => screen.getByRole('button', { name: 'Mufti One' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mufti One' }));
    fireEvent.click(screen.getByRole('button', { name: 'Shaykh Two' }));

    const box = screen.getAllByRole('textbox')[0] as HTMLTextAreaElement;
    expect(box.value).toBe('@s1 @s2 ');
  });

  it('offers nothing where the matter did not say who is on the board', async () => {
    stub();
    show(matter({ mentionable: undefined }));

    await waitFor(() => screen.getAllByRole('textbox'));
    expect(screen.queryByText('Ask someone')).toBeNull();
  });

  it('offers an observer no composer at all', async () => {
    stub();
    show(matter(), false);

    await waitFor(() => expect(screen.getByText('@s2')).toBeInTheDocument());
    expect(screen.queryByText('Ask someone')).toBeNull();
    expect(screen.queryAllByRole('textbox')).toHaveLength(0);
  });
});

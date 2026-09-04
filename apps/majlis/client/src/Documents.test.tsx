import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Evidence from './components/Evidence.js';
import { I18nProvider } from './lib/i18n.js';

/**
 * Attaching a document to a matter.
 *
 * The one thing these hold to above all: **the control appears only where the
 * installation can actually keep a file.** An upload offered on a deployment
 * with no volume is a control that lies, and the lie is discovered later, by a
 * board citing something that is gone.
 */

const posted: { url: string; type: string | undefined }[] = [];
/**
 * This file is the installation that has somewhere to keep a document.
 *
 * The one that does not is a separate file, because health is cached at module
 * level — it describes how the server was started and does not change while
 * anyone is looking — and vitest isolates a module graph per file. One file per
 * installation shape is the honest structure; a way to clear the cache would be
 * a test-only export sitting in shipped code.
 */
const documents = 'disk';
let refusal: { status: number; body: unknown } | null = null;

const source = (over: Record<string, unknown> = {}) => ({
  id: 's1',
  kind: 'document',
  label: 'Issuer term sheet',
  ref: 'a'.repeat(64),
  addedBy: 'member-a',
  at: '2026-09-04T09:00:00.000Z',
  withdrawnAt: null,
  file: { name: 'terms.pdf', bytes: 20480, mediaType: 'application/pdf', key: 'a'.repeat(64) },
  ...over,
});

const matter = (over: Record<string, unknown> = {}) =>
  ({
    id: 'm1',
    boardId: 'b',
    title: 'A matter',
    origin: 'institution_request',
    direction: 'permit',
    status: 'deliberation',
    openedAt: '2026-09-04T08:00:00.000Z',
    timelockEndsAt: null,
    affected: null,
    deliberationCount: 0,
    proposal: '',
    notDecided: [],
    mechanism: '',
    interactsWith: [],
    proposedRule: {
      id: 'r', boardId: 'b', title: '', statement: '', parameters: [],
      parameterHash: '0x0', version: 1, inForceFrom: null, sources: [],
    },
    simulation: null,
    deliberation: [],
    reasoning: [],
    objections: [],
    inForceAt: null,
    sources: [source()],
    ...over,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;

function stub() {
  posted.length = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const json = (b: unknown, status = 200) =>
        new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } });

      if (url.includes('/api/health')) return json({ ok: true, stage: 2, documents });

      if (init?.method && init.method !== 'GET') {
        posted.push({ url, type: new Headers(init.headers).get('content-type') ?? undefined });
        if (refusal) return json(refusal.body, refusal.status);
        return json(matter());
      }
      return json({});
    }),
  );
}

const show = (m = matter(), canAttach = true) =>
  render(
    <I18nProvider>
      <MemoryRouter>
        <Evidence matter={m} scholarId="member-a" canAttach={canAttach} onChanged={() => undefined} />
      </MemoryRouter>
    </I18nProvider>,
  );

const pick = (file: File) => {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  fireEvent.change(input);
};

afterEach(() => {
  vi.unstubAllGlobals();
  refusal = null;
});

describe('the control appears only where a file can be kept', () => {
  it('offers it where the installation has a volume', async () => {
    stub();
    show();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Attach a document/ })).toBeInTheDocument(),
    );
  });

  it('does not offer it to somebody who may not attach anything', async () => {
    stub();
    show(matter(), false);
    await waitFor(() => expect(screen.queryByRole('button', { name: /Attach a document/ })).toBeNull());
  });

  it('does not offer it once the matter has closed', async () => {
    stub();
    show(matter({ status: 'in_force' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: /Attach a document/ })).toBeNull());
  });
});

describe('attaching one', () => {
  it('sends the bytes with their type, and the filename as the label', async () => {
    stub();
    show();
    await waitFor(() => screen.getByRole('button', { name: /Attach a document/ }));

    pick(new File(['%PDF-1.7'], 'terms.pdf', { type: 'application/pdf' }));

    await waitFor(() => expect(posted).toHaveLength(1));
    expect(posted[0].url).toContain('/api/matters/m1/sources/file');
    expect(posted[0].url).toContain('name=terms.pdf');
    // No label typed, so the filename is the suggestion rather than nothing.
    expect(posted[0].url).toContain('label=terms.pdf');
    expect(posted[0].type).toBe('application/pdf');
  });

  it('shows the server’s refusal in its own words', async () => {
    stub();
    refusal = {
      status: 413,
      body: {
        error: 'too_large',
        message: 'That file is 40.0 MB, and the limit is 20 MB.',
      },
    };
    show();
    await waitFor(() => screen.getByRole('button', { name: /Attach a document/ }));

    pick(new File(['x'], 'huge.pdf', { type: 'application/pdf' }));
    await waitFor(() => expect(screen.getByText(/the limit is 20 MB/)).toBeInTheDocument());
  });

  it('lets the same file be chosen again after a refusal', async () => {
    stub();
    refusal = { status: 413, body: { error: 'too_large', message: 'Too large.' } };
    show();
    await waitFor(() => screen.getByRole('button', { name: /Attach a document/ }));

    const file = new File(['x'], 'terms.pdf', { type: 'application/pdf' });
    pick(file);
    await waitFor(() => expect(posted).toHaveLength(1));

    // The chooser is cleared either way, so a second attempt at the same file
    // still fires rather than doing nothing.
    refusal = null;
    pick(file);
    await waitFor(() => expect(posted).toHaveLength(2));
  });
});

describe('a document on the list', () => {
  it('shows its name and size rather than its key', async () => {
    stub();
    show();

    await waitFor(() => expect(screen.getByText(/terms\.pdf/)).toBeInTheDocument());
    expect(screen.getByText(/20 kB/)).toBeInTheDocument();
    // A reader scanning citations is looking for a document, not a hash.
    expect(screen.queryByText('a'.repeat(64))).toBeNull();
  });

  it('links through the source that cites it, never by key', async () => {
    stub();
    show();

    await waitFor(() => screen.getByText(/terms\.pdf/));
    expect(screen.getByText(/terms\.pdf/).closest('a')).toHaveAttribute(
      'href',
      '/api/matters/m1/sources/s1/file',
    );
  });

  it('still links a withdrawn document, because the citation stays', async () => {
    stub();
    show(matter({ sources: [source({ withdrawnAt: '2026-09-05T00:00:00.000Z' })] }));

    await waitFor(() => expect(screen.getByText(/terms\.pdf/)).toBeInTheDocument());
    expect(screen.getByText(/terms\.pdf/).closest('a')).toHaveAttribute(
      'href',
      '/api/matters/m1/sources/s1/file',
    );
  });

  it('shows an ordinary citation as its reference, unchanged', async () => {
    stub();
    show(
      matter({
        sources: [source({ id: 's2', kind: 'standard', ref: 'AAOIFI SS 17', file: null })],
      }),
    );

    await waitFor(() => expect(screen.getByText('AAOIFI SS 17')).toBeInTheDocument());
    expect(screen.getByText('AAOIFI SS 17').closest('a')).toBeNull();
  });
});

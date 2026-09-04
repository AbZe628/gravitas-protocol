import { describe, it, expect } from 'vitest';
import { Refused } from '../src/services/lifecycle.js';
import {
  WHAT_RECORDING_MEANS,
  buildComputation,
  currentFor,
  forYear,
  history,
  isSuperseded,
  standing,
  type RecordInput,
} from '../src/services/computation.js';
import type { Computation } from '../src/types.js';

const input: RecordInput = {
  kind: 'zakat',
  boardId: 'board-1',
  assetId: null,
  periodFrom: '2026-01-01',
  periodTo: '2026-12-31',
  method: 'net_assets',
  methodStated: 'Zakatable assets less liabilities falling due within the year.',
  currency: 'AED',
  source: 'Audited financial statements',
  figures: { cash: '4000000', shortTermLiabilities: '2000000' },
  headline: 'Due',
  amount: '200000',
  steps: [{ label: 'At 2.5%', working: '2.5% of 8000000', value: '200000 AED' }],
  note: 'Whether the base is the right one is not answered here.',
};

const build = (over: Partial<RecordInput> = {}, existing: Computation[] = []) =>
  buildComputation({ ...input, ...over }, 'scholar-a', '2027-01-15T09:00:00Z', existing);

const code = (fn: () => unknown): string | null => {
  try {
    fn();
    return null;
  } catch (e) {
    return e instanceof Refused ? e.code : `threw ${String(e)}`;
  }
};

describe('what has to be true before a figure joins the record', () => {
  it('records the figures, the working and who supplied them', () => {
    const c = build();

    expect(c.amount).toBe('200000');
    expect(c.figures.cash).toBe('4000000');
    expect(c.source).toBe('Audited financial statements');
    expect(c.recordedBy).toBe('scholar-a');
    expect(c.steps).toHaveLength(1);
  });

  it('refuses without a period, because a computation nobody can find is not a record', () => {
    expect(code(() => build({ periodTo: '' }))).toBe('no_period');
    expect(code(() => build({ periodFrom: '   ' }))).toBe('no_period');
  });

  it('refuses a period that ends before it begins', () => {
    expect(code(() => build({ periodFrom: '2026-12-31', periodTo: '2026-01-01' }))).toBe('no_period');
  });

  it('refuses a period that is not dates, so one year can be told from another', () => {
    expect(code(() => build({ periodTo: 'the last quarter' }))).toBe('no_period');
  });

  it('refuses without a source, using the same sentence the calculations use', () => {
    expect(code(() => build({ source: '' }))).toBe('no_source');
    try {
      build({ source: '' });
      expect.unreachable();
    } catch (e) {
      expect((e as Refused).message).toContain('one somebody typed');
    }
  });

  it('refuses a figure with no working behind it', () => {
    expect(code(() => build({ steps: [] }))).toBe('no_steps');
    try {
      build({ steps: [] });
      expect.unreachable();
    } catch (e) {
      expect((e as Refused).message).toContain('rather than something it can check');
    }
  });

  it('starts standing, not withdrawn and replacing nothing', () => {
    const c = build();
    expect(c.withdrawnAt).toBeNull();
    expect(c.supersedes).toBeNull();
  });
});

describe('a correction replaces, and never edits', () => {
  it('names the one it replaces', () => {
    const first = build();
    const second = build({ amount: '210000', supersedes: first.id }, [first]);

    expect(second.supersedes).toBe(first.id);
    expect(second.id).not.toBe(first.id);
    // The first is untouched. Somebody may have acted on it.
    expect(first.amount).toBe('200000');
  });

  it('does not make a second computation a replacement just because a first exists', () => {
    const first = build();
    const alsoRecorded = build({ periodFrom: '2027-01-01', periodTo: '2027-12-31' }, [first]);

    // Next year's zakat is not a correction of last year's, and inferring that
    // from the order they were recorded in would quietly retire a live figure.
    expect(alsoRecorded.supersedes).toBeNull();
    expect(standing([first, alsoRecorded])).toHaveLength(2);
  });

  it('refuses to replace something that is not there', () => {
    expect(code(() => build({ supersedes: 'nothing-like-this' }))).toBe('no_such_prior');
  });

  it('refuses to replace a computation of another kind', () => {
    const screening = build({ kind: 'screening' });
    expect(code(() => build({ supersedes: screening.id }, [screening]))).toBe('wrong_kind');
  });

  it('refuses to replace one about a different holding, because they are different things', () => {
    const onAsset = build({ assetId: 'asset-1' });
    expect(code(() => build({ supersedes: onAsset.id }, [onAsset]))).toBe('different_holding');
  });

  it('refuses to replace a withdrawn one', () => {
    const withdrawn = { ...build(), withdrawnAt: '2027-02-01T00:00:00Z' };
    expect(code(() => build({ supersedes: withdrawn.id }, [withdrawn]))).toBe('already_withdrawn');
  });

  it('refuses to replace the same one twice, which would leave two claiming to be current', () => {
    const first = build();
    const second = build({ amount: '210000', supersedes: first.id }, [first]);
    expect(code(() => build({ amount: '220000', supersedes: first.id }, [first, second]))).toBe(
      'already_replaced',
    );
  });

  it('allows a replacement of a replacement, which is an ordinary second correction', () => {
    const first = build();
    const second = build({ amount: '210000', supersedes: first.id }, [first]);
    const third = build({ amount: '220000', supersedes: second.id }, [first, second]);
    expect(third.supersedes).toBe(second.id);
  });
});

describe('what stands is derived, never stored', () => {
  const first = build();
  const second = { ...build({ amount: '210000', supersedes: first.id }, [first]) };
  const all = [first, second];

  it('treats a replaced computation as superseded without a field saying so', () => {
    expect(isSuperseded(first, all)).toBe(true);
    expect(isSuperseded(second, all)).toBe(false);
    // Nothing on the record itself claims it.
    expect(Object.keys(first)).not.toContain('supersededBy');
  });

  it('leaves the original standing when its replacement was itself withdrawn', () => {
    const pulled = { ...second, withdrawnAt: '2027-03-01T00:00:00Z' };
    expect(isSuperseded(first, [first, pulled])).toBe(false);
    expect(standing([first, pulled]).map((c) => c.id)).toEqual([first.id]);
  });

  it('drops the withdrawn from what stands', () => {
    const gone = { ...first, withdrawnAt: '2027-02-01T00:00:00Z' };
    expect(standing([gone]).map((c) => c.id)).toEqual([]);
  });
});

describe('finding the one a reader should be looking at', () => {
  it('takes the latest period, not the latest recording', () => {
    const q1 = build({ periodFrom: '2026-01-01', periodTo: '2026-03-31', amount: '1' });
    const q4 = build({ periodFrom: '2026-10-01', periodTo: '2026-12-31', amount: '4' });
    // Recorded out of order on purpose.
    expect(currentFor([q4, q1], 'zakat')?.amount).toBe('4');
  });

  it('keeps one holding’s computation out of another’s', () => {
    const onA = build({ kind: 'purification', assetId: 'asset-a', amount: '10' });
    const onB = build({ kind: 'purification', assetId: 'asset-b', amount: '20' });

    expect(currentFor([onA, onB], 'purification', 'asset-a')?.amount).toBe('10');
    expect(currentFor([onA, onB], 'purification', 'asset-b')?.amount).toBe('20');
    // And an institution-level question finds neither.
    expect(currentFor([onA, onB], 'purification', null)).toBeNull();
  });

  it('says nothing rather than something when there is none', () => {
    expect(currentFor([], 'zakat')).toBeNull();
  });
});

describe('the year a computation belongs to', () => {
  it('is the year its period ends in, which is the year the board reported on it', () => {
    const straddling = build({ periodFrom: '2025-12-01', periodTo: '2026-02-28' });
    expect(forYear([straddling], 2026).map((c) => c.id)).toEqual([straddling.id]);
    expect(forYear([straddling], 2025)).toEqual([]);
  });

  it('leaves out what was superseded, because the report should carry one figure', () => {
    const first = build();
    const second = build({ amount: '210000', supersedes: first.id }, [first]);
    expect(forYear([first, second], 2026).map((c) => c.amount)).toEqual(['210000']);
  });
});

describe('the history shows the revisions, not only the survivor', () => {
  it('keeps the superseded and says what replaced it', () => {
    const first = build();
    const second = build({ amount: '210000', supersedes: first.id }, [first]);
    const h = history([first, second]);

    expect(h).toHaveLength(2);
    expect(h[0].state).toBe('superseded');
    expect(h[0].replacedBy).toBe(second.id);
    expect(h[1].state).toBe('standing');
  });

  it('keeps the withdrawn and marks it as such', () => {
    const gone = { ...build(), withdrawnAt: '2027-02-01T00:00:00Z', withdrawalReason: 'Wrong holding.' };
    expect(history([gone])[0].state).toBe('withdrawn');
  });
});

describe('recording is not approving, and the sentence says so', () => {
  it('says what it records and what it does not', () => {
    expect(WHAT_RECORDING_MEANS).toContain('was shown these figures');
    expect(WHAT_RECORDING_MEANS).toContain('not a finding that the figures are correct');
    expect(WHAT_RECORDING_MEANS).toContain('not approval of the method');
  });

  it('reaches no verdict anywhere in a built record', () => {
    const text = JSON.stringify(build()).toLowerCase();
    for (const claim of ['halal', 'haram', 'is compliant', 'approved by the board', 'therefore']) {
      expect(text).not.toContain(claim);
    }
  });
});

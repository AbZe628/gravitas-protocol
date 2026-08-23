import { describe, it, expect } from 'vitest';
import type { Address, PublicClient } from 'viem';
import { ComplianceService } from '../src/compliance.js';
import { ShariahViolationError } from '../src/types.js';

const REGISTRY = '0x6f3bfb896DD9964C9c05dA88692bDf1b1b2C3F23' as Address;
const TOKEN = '0x1111111111111111111111111111111111111111' as Address;
const ROUTER = '0x2222222222222222222222222222222222222222' as Address;
const EXECUTOR = '0x3333333333333333333333333333333333333333' as Address;

type Call = { functionName: string; args: readonly unknown[] };

/**
 * A stand-in for a viem client that records what was asked of the registry and
 * answers from a table. The point of most of these tests is *which* function the
 * SDK reaches for, so the record matters as much as the answer.
 */
function fakeClient(
  answers: Record<string, unknown>,
  opts: { revertOn?: string[]; revertMessage?: string } = {}
): { client: PublicClient; calls: Call[] } {
  const calls: Call[] = [];
  const client = {
    async readContract({ functionName, args }: { functionName: string; args: readonly unknown[] }) {
      calls.push({ functionName, args });
      if (opts.revertOn?.includes(functionName)) {
        throw new Error(
          opts.revertMessage ??
            'The contract function "' + functionName + '" reverted. Error: EnforcedPause()'
        );
      }
      if (!(functionName in answers)) throw new Error('unexpected call: ' + functionName);
      return answers[functionName];
    },
  } as unknown as PublicClient;
  return { client, calls };
}

const names = (calls: Call[]) => calls.map(c => c.functionName);

describe('every enforcement decision goes through the gated read', () => {
  it('validateAsset asks verifyAssetCompliance, not the raw mapping', async () => {
    const { client, calls } = fakeClient({ verifyAssetCompliance: true });
    await new ComplianceService(client, REGISTRY).validateAsset(TOKEN);

    expect(names(calls)).toEqual(['verifyAssetCompliance']);
    expect(names(calls)).not.toContain('isAssetCompliant');
  });

  it('validateRouter asks verifyRouterAuthorization', async () => {
    const { client, calls } = fakeClient({ verifyRouterAuthorization: true });
    await new ComplianceService(client, REGISTRY).validateRouter(ROUTER);

    expect(names(calls)).toEqual(['verifyRouterAuthorization']);
    expect(names(calls)).not.toContain('isRouterAuthorized');
  });

  it('validateExecutor asks verifyExecutorStatus', async () => {
    const { client, calls } = fakeClient({ verifyExecutorStatus: true });
    await new ComplianceService(client, REGISTRY).validateExecutor(EXECUTOR);

    expect(names(calls)).toEqual(['verifyExecutorStatus']);
    expect(names(calls)).not.toContain('isExecutor');
  });

  it('getComplianceStatus reads the gated pair as well', async () => {
    const { client, calls } = fakeClient({
      verifyAssetCompliance: true,
      areTokensCompliant: true,
    });
    const status = await new ComplianceService(client, REGISTRY).getComplianceStatus(TOKEN, ROUTER);

    expect(status).toEqual({ tokenACompliant: true, tokenBCompliant: true, pairCompliant: true });
    expect(names(calls)).not.toContain('isAssetCompliant');
  });
});

describe('a halted registry fails closed and says so', () => {
  // The gated functions revert with EnforcedPause() rather than returning false.
  // That is deliberate: a halt must not be readable as "not compliant, but the
  // call worked". What the SDK must not do is pass the raw revert up and leave a
  // caller guessing which of the two happened.
  const paused = () =>
    fakeClient({}, { revertOn: ['verifyAssetCompliance', 'verifyRouterAuthorization', 'verifyExecutorStatus'] });

  it('validateAsset refuses, and names the pause', async () => {
    const { client } = paused();
    const service = new ComplianceService(client, REGISTRY);

    await expect(service.validateAsset(TOKEN)).rejects.toBeInstanceOf(ShariahViolationError);
    await expect(service.validateAsset(TOKEN)).rejects.toThrow(/paused/i);
  });

  it('validateRouter refuses', async () => {
    const { client } = paused();
    await expect(new ComplianceService(client, REGISTRY).validateRouter(ROUTER)).rejects.toThrow(/paused/i);
  });

  it('validateExecutor refuses', async () => {
    const { client } = paused();
    await expect(new ComplianceService(client, REGISTRY).validateExecutor(EXECUTOR)).rejects.toThrow(/paused/i);
  });

  it('a pause is never reported as a clean negative', async () => {
    const { client } = paused();
    // If this ever resolves, something is treating a halt as an answer.
    await expect(
      new ComplianceService(client, REGISTRY).validateAsset(TOKEN)
    ).rejects.toThrow();
  });
});

describe('an ordinary refusal still reads as a refusal', () => {
  it('a non-compliant asset throws ShariahViolationError naming the address', async () => {
    const { client } = fakeClient({ verifyAssetCompliance: false });
    await expect(new ComplianceService(client, REGISTRY).validateAsset(TOKEN))
      .rejects.toThrow(new RegExp(TOKEN, 'i'));
  });

  it('an unauthorised router throws', async () => {
    const { client } = fakeClient({ verifyRouterAuthorization: false });
    await expect(new ComplianceService(client, REGISTRY).validateRouter(ROUTER))
      .rejects.toBeInstanceOf(ShariahViolationError);
  });

  it('an unauthorised executor throws', async () => {
    const { client } = fakeClient({ verifyExecutorStatus: false });
    await expect(new ComplianceService(client, REGISTRY).validateExecutor(EXECUTOR))
      .rejects.toBeInstanceOf(ShariahViolationError);
  });

  it('validateTokens uses the gated pair check', async () => {
    const { client, calls } = fakeClient({ areTokensCompliant: true });
    await new ComplianceService(client, REGISTRY).validateTokens(TOKEN, ROUTER);
    expect(names(calls)).toEqual(['areTokensCompliant']);
  });
});

describe('errors that are not a pause are not disguised as one', () => {
  it('a transport failure propagates unchanged', async () => {
    const { client } = fakeClient(
      {},
      { revertOn: ['verifyAssetCompliance'], revertMessage: 'fetch failed: ECONNREFUSED' }
    );
    await expect(new ComplianceService(client, REGISTRY).validateAsset(TOKEN))
      .rejects.toThrow(/ECONNREFUSED/);
  });

  it('and it is not turned into a compliance verdict', async () => {
    const { client } = fakeClient(
      {},
      { revertOn: ['verifyAssetCompliance'], revertMessage: 'fetch failed: ECONNREFUSED' }
    );
    await expect(new ComplianceService(client, REGISTRY).validateAsset(TOKEN))
      .rejects.not.toBeInstanceOf(ShariahViolationError);
  });
});

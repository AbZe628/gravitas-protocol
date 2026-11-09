/*
 * REFERENCE IMPLEMENTATION, UNAUDITED, FOR EVALUATION, NOT FOR PRODUCTION.
 * Dependency-free read-only adapter for the existing registry ABI.
 */
const SELECTOR = Object.freeze({
  paused: '0x5c975abb',
  verifyAssetCompliance: '0x6095c14d',
  getPolicyVersion: '0x5e7770c8',
  policyHistory: '0x505119f3',
});

function word(value) {
  return BigInt(value).toString(16).padStart(64, '0');
}
function addressWord(value) {
  return value.slice(2).toLowerCase().padStart(64, '0');
}
function decodeUint(value) {
  if (typeof value !== 'string' || !/^0x[0-9a-fA-F]{64,}$/.test(value)) throw new Error('Invalid uint256 ABI response');
  return BigInt(value);
}
function decodeBool(value) {
  const n = decodeUint(value);
  if (n !== 0n && n !== 1n) throw new Error('Invalid bool ABI response');
  return n === 1n;
}
function decodeBytes32(value) {
  if (typeof value !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(value)) throw new Error('Invalid bytes32 ABI response');
  return value.toLowerCase();
}

export class RpcUnavailable extends Error {
  constructor(message, cause) { super(message, { cause }); this.name = 'RpcUnavailable'; }
}

export class RegistryReader {
  constructor({ rpcUrl, registryAddress, timeoutMs = 2000, retries = 1, fetchImpl = fetch }) {
    this.rpcUrl = rpcUrl;
    this.registryAddress = registryAddress.toLowerCase();
    this.timeoutMs = timeoutMs;
    this.retries = retries;
    this.fetchImpl = fetchImpl;
    this.requestId = 0;
  }

  async rpc(method, params) {
    let lastError;
    for (let attempt = 0; attempt <= this.retries; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await this.fetchImpl(this.rpcUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: ++this.requestId, method, params }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
        const payload = await response.json();
        if (payload.error) throw new Error(`RPC ${method} error: ${payload.error.message || 'unspecified error'}`);
        if (!Object.hasOwn(payload, 'result')) throw new Error(`RPC ${method} omitted result`);
        return payload.result;
      } catch (error) {
        lastError = error;
        if (attempt >= this.retries) break;
      } finally {
        clearTimeout(timer);
      }
    }
    throw new RpcUnavailable(`Registry RPC unavailable after ${this.retries + 1} attempt(s)`, lastError);
  }

  async callAt(data, blockTag) {
    return this.rpc('eth_call', [{ to: this.registryAddress, data }, blockTag]);
  }

  async snapshot(asset) {
    try {
      const block = await this.rpc('eth_getBlockByNumber', ['latest', false]);
      if (!block || typeof block.number !== 'string' || typeof block.timestamp !== 'string') {
        throw new Error('RPC returned an invalid latest block');
      }
      const blockTag = block.number;
      const chainIdHex = await this.rpc('eth_chainId', []);
      const chainId = BigInt(chainIdHex).toString(10);
      const [pausedData, versionData] = await Promise.all([
        this.callAt(SELECTOR.paused, blockTag),
        this.callAt(SELECTOR.getPolicyVersion, blockTag),
      ]);
      const paused = decodeBool(pausedData);
      const version = decodeUint(versionData);
      const hashData = await this.callAt(SELECTOR.policyHistory + word(version), blockTag);
      const policyHash = decodeBytes32(hashData);
      let assetApproved = false;
      if (!paused && asset) {
        const complianceData = await this.callAt(
          SELECTOR.verifyAssetCompliance + addressWord(asset), blockTag,
        );
        assetApproved = decodeBool(complianceData);
      }
      const timestampSeconds = Number(BigInt(block.timestamp));
      if (!Number.isSafeInteger(timestampSeconds)) throw new Error('Block timestamp exceeds safe date range');
      return {
        paused,
        assetApproved,
        policyVersion: version.toString(10),
        policyHash,
        blockNumber: BigInt(block.number).toString(10),
        chainId,
        timestamp: new Date(timestampSeconds * 1000).toISOString(),
      };
    } catch (error) {
      if (error instanceof RpcUnavailable) throw error;
      throw new RpcUnavailable('Registry read failed; no decision can be made', error);
    }
  }
}

export const registrySelectors = SELECTOR;

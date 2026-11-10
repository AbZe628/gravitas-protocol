/*
 * REFERENCE CLIENT, UNAUDITED, FOR EVALUATION, NOT FOR PRODUCTION.
 * Transport/API failure is a local UNAVAILABLE result, never an API-generated DENY or ALLOW.
 */
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const HASH = /^0x[0-9a-fA-F]{64}$/;
const DECIMAL = /^(0|[1-9][0-9]*)$/;

function unavailable(reasonCode, attempts) {
  return { decision: 'UNAVAILABLE', reasonCode, attempts };
}

function isValidDecision(body, expectedRequestId, expectedChainId, expectedRegistry) {
  return Boolean(
    body && typeof body === 'object' && !Array.isArray(body)
    && (body.decision === 'ALLOW' || body.decision === 'DENY')
    && ((body.decision === 'ALLOW' && body.reasonCode === 'ASSET_APPROVED')
      || (body.decision === 'DENY' && ['ASSET_NOT_APPROVED', 'REGISTRY_PAUSED'].includes(body.reasonCode)))
    && DECIMAL.test(body.policyVersion || '')
    && HASH.test(body.policyHash || '')
    && DECIMAL.test(body.blockNumber || '')
    && DECIMAL.test(body.chainId || '')
    && ADDRESS.test(body.registry || '')
    && body.chainId === expectedChainId
    && body.registry.toLowerCase() === expectedRegistry.toLowerCase()
    && typeof body.timestamp === 'string' && Number.isFinite(Date.parse(body.timestamp))
    && body.requestId === expectedRequestId
  );
}

function isRegistryUnavailable(body) {
  return body && body.decision === 'DENY' && body.reasonCode === 'REGISTRY_UNAVAILABLE';
}

/**
 * Request a fresh decision. No decision is cached. Only a schema-valid HTTP 200
 * response can return ALLOW. Transport/timeouts get a bounded retry; HTTP errors
 * and malformed responses fail closed without retrying ambiguous data.
 */
export async function verifyForTransfer({
  baseUrl,
  apiKey,
  request,
  expectedChainId,
  expectedRegistry,
  timeoutMs = 2000,
  maxRetries = 1,
  totalTimeoutMs = 5000,
  fetchImpl = fetch,
}) {
  if (typeof baseUrl !== 'string' || !/^https?:\/\//.test(baseUrl)) throw new TypeError('baseUrl must be an HTTP(S) URL');
  if (typeof apiKey !== 'string' || apiKey.length === 0) throw new TypeError('apiKey is required');
  if (!request || typeof request.context?.requestId !== 'string') throw new TypeError('request.context.requestId is required');
  if (!DECIMAL.test(expectedChainId || '') || !ADDRESS.test(expectedRegistry || '')) throw new TypeError('expectedChainId and expectedRegistry are required');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30000) throw new RangeError('timeoutMs must be 1..30000');
  if (!Number.isInteger(maxRetries) || maxRetries < 0 || maxRetries > 2) throw new RangeError('maxRetries must be 0..2');
  if (!Number.isInteger(totalTimeoutMs) || totalTimeoutMs < 1 || totalTimeoutMs > 30000) throw new RangeError('totalTimeoutMs must be 1..30000');

  let attempts = 0;
  const deadline = performance.now() + totalTimeoutMs;
  for (; attempts <= maxRetries; attempts += 1) {
    const remainingMs = Math.floor(deadline - performance.now());
    if (remainingMs <= 0) return unavailable('API_TIMEOUT', attempts);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(timeoutMs, remainingMs));
    try {
      const response = await fetchImpl(`${baseUrl.replace(/\/$/, '')}/v1/verify`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify(request),
        cache: 'no-store',
        signal: controller.signal,
      });
      let body;
      try { body = await response.json(); } catch { return unavailable('INVALID_API_RESPONSE', attempts + 1); }

      if (response.status === 503 && isRegistryUnavailable(body)) {
        return { decision: 'DENY', reasonCode: 'REGISTRY_UNAVAILABLE', attempts: attempts + 1 };
      }
      if (response.status !== 200) return unavailable('API_HTTP_ERROR', attempts + 1);
      if (!isValidDecision(body, request.context.requestId, expectedChainId, expectedRegistry)) return unavailable('INVALID_API_RESPONSE', attempts + 1);
      return { ...body, attempts: attempts + 1 };
    } catch {
      // Retry only transport or timeout exceptions, never a response that is ambiguous.
      if (attempts >= maxRetries) return unavailable('API_UNAVAILABLE', attempts + 1);
    } finally {
      clearTimeout(timer);
    }
  }
  return unavailable('API_UNAVAILABLE', attempts);
}

/** Invoke the transfer function only after a current, fully validated ALLOW. */
export async function executeTransferAfterAllow({ verifyOptions, executeTransfer }) {
  if (typeof executeTransfer !== 'function') throw new TypeError('executeTransfer must be a function');
  const decision = await verifyForTransfer(verifyOptions);
  if (decision.decision !== 'ALLOW') return { executed: false, decision };
  await executeTransfer();
  return { executed: true, decision };
}

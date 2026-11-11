const $ = (selector) => document.querySelector(selector);
const statusEl = $('#read-status');
const refreshButton = $('#refresh');
const numberFmt = new Intl.NumberFormat('en-US');

function fieldText(field, formatter = (value) => String(value)) {
  if (!field) return '<span class="unavailable">Not read</span>';
  if (field.status !== 'read') return `<span class="unavailable" title="${escapeHtml(field.error || '')}">Unavailable</span>`;
  return escapeHtml(formatter(field.value));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function shortAddress(value) {
  if (!value || value.status !== 'read') return fieldText(value);
  return `<code title="${escapeHtml(value.value)}">${escapeHtml(value.value.slice(0, 8))}…${escapeHtml(value.value.slice(-6))}</code>`;
}

function contractCard(title, info, rows, explorer) {
  const code = info ? (info.error ? `<span class="unavailable">Unavailable: ${escapeHtml(info.error)}</span>` : info.hasCode ? `${numberFmt.format(info.runtimeBytes)} runtime bytes` : 'No runtime code') : 'Not read';
  return `<article class="contract-card"><div class="card-top"><span class="eyebrow">${escapeHtml(title)}</span><span class="tag tag-live">LIVE READ</span></div><code class="address">${escapeHtml(info?.address || '')}</code><div class="code-state">${code}</div><dl>${rows.map(([label, value, kind]) => `<div><dt>${escapeHtml(label)}</dt><dd>${kind === 'address' ? shortAddress(value) : fieldText(value, kind === 'number' ? numberFmt.format : undefined)}</dd></div>`).join('')}</dl><a class="text-link" href="${explorer}" target="_blank" rel="noopener noreferrer">View source and ABI on Arbiscan ↗</a></article>`;
}

function renderSnapshot(snapshot) {
  const n = snapshot.network;
  const networkText = n.matchesExpected ? 'Expected chain' : 'Unexpected chain ID';
  $('#network-card').hidden = false;
  $('#network-card').innerHTML = `<div><span class="eyebrow">NETWORK</span><strong>${escapeHtml(networkText)}</strong></div><div><span class="eyebrow">CHAIN ID</span><strong>${escapeHtml(n.chainId)} <small>(expected ${escapeHtml(n.expectedChainId)})</small></strong></div><div><span class="eyebrow">OBSERVED BLOCK</span><strong>${escapeHtml(numberFmt.format(Number(n.blockNumber)))}</strong></div><div><span class="eyebrow">OBSERVED AT</span><strong>${escapeHtml(new Date(snapshot.observedAt).toLocaleString())}</strong></div>`;
  const c = snapshot.contracts;
  const cards = [
    contractCard('POLICY REGISTRY', c.registry, [['Owner', snapshot.registry.owner, 'address'], ['Pending owner', snapshot.registry.pendingOwner, 'address'], ['Paused', snapshot.registry.paused], ['Policy version', snapshot.registry.currentVersion, 'number'], ['Version 1 policy hash', snapshot.registry.version1PolicyHash]], `https://sepolia.arbiscan.io/address/${c.registry.address}#code`),
    contractCard('TELEPORT V2', c.teleportV2, [['Owner', snapshot.teleportV2.owner, 'address'], ['Registry binding', snapshot.teleportV2.registry, 'address'], ['Cooldown (s)', snapshot.teleportV2.cooldownSeconds, 'number'], ['Max LP movement (bps)', snapshot.teleportV2.maxMoveBps, 'number']], `https://sepolia.arbiscan.io/address/${c.teleportV2.address}#code`),
    contractCard('TELEPORT V3', c.teleportV3, [['Owner', snapshot.teleportV3.owner, 'address'], ['Registry binding', snapshot.teleportV3.registry, 'address'], ['Position manager', snapshot.teleportV3.positionManager, 'address'], ['Swap router', snapshot.teleportV3.swapRouter, 'address'], ['Paused', snapshot.teleportV3.paused]], `https://sepolia.arbiscan.io/address/${c.teleportV3.address}#code`),
    contractCard('TIMELOCK', c.timelock, [['Minimum delay (s)', snapshot.timelock.minimumDelaySeconds, 'number'], ['Proposer role for observed owner', snapshot.timelock.proposerRoleForObservedOwner], ['Executor role for observed owner', snapshot.timelock.executorRoleForObservedOwner], ['Open executor role (zero address)', snapshot.timelock.executorRoleForZeroAddress]], `https://sepolia.arbiscan.io/address/${c.timelock.address}#code`),
  ];
  $('#contracts-grid').innerHTML = cards.join('');
  $('#snapshot-error').hidden = true;
  statusEl.innerHTML = `<span class="status-pill status-ok">RPC READ COMPLETE</span><span>${escapeHtml(snapshot.scope)}</span>`;
}

async function refresh() {
  refreshButton.disabled = true;
  statusEl.innerHTML = '<span class="spinner"></span> Requesting current read-only state…';
  $('#snapshot-error').hidden = true;
  let failureKind = 'api';
  try {
    const response = await fetch('/api/snapshot', { headers: { accept: 'application/json' }, cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok && response.status === 502 && payload.status === 'unavailable') {
      failureKind = 'rpc';
      throw new Error(payload.error || 'Upstream RPC read failed');
    }
    if (!response.ok) throw new Error(payload.error || `Local API returned HTTP ${response.status}`);
    renderSnapshot(payload);
  } catch (error) {
    $('#network-card').hidden = true;
    $('#contracts-grid').innerHTML = '';
    $('#snapshot-error').hidden = false;
    const label = failureKind === 'rpc' ? 'RPC UNAVAILABLE' : 'API / SERVICE UNAVAILABLE';
    $('#snapshot-error').textContent = `${label}: ${error instanceof Error ? error.message : 'unknown error'}. No cached value is shown as live.`;
    const detail = failureKind === 'rpc'
      ? 'The local API returned an upstream RPC error. This is distinct from the local service being unavailable.'
      : 'The local API or browser-to-service request failed. This is not evidence of a negative Registry policy flag.';
    statusEl.innerHTML = `<span class="status-pill status-error">${label}</span><span>${detail}</span>`;
  } finally {
    refreshButton.disabled = false;
  }
}

$('#flag-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const address = $('#flag-address').value.trim();
  const kind = $('#flag-kind').value;
  const resultEl = $('#flag-result');
  resultEl.hidden = false;
  resultEl.textContent = 'Reading Registry flag…';
  let failureKind = 'api';
  try {
    const response = await fetch(`/api/registry/${kind}?address=${encodeURIComponent(address)}`, { headers: { accept: 'application/json' }, cache: 'no-store' });
    const body = await response.json();
    if (response.status === 400) {
      resultEl.textContent = `Invalid request: ${body.error || 'check the EVM address format.'}`;
      return;
    }
    if (!response.ok && response.status === 502 && body.status === 'unavailable') {
      failureKind = 'rpc';
      throw new Error(body.error || 'Upstream RPC read failed');
    }
    if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
    resultEl.textContent = `${body.kind} flag for ${body.address}: ${body.compliantOrAuthorized ? 'true' : 'false'}\nObserved: ${body.observedAt}\nBlock: ${body.blockNumber} (${body.blockTag})\nCaveat: ${body.caveat}`;
  } catch (error) {
    const label = failureKind === 'rpc' ? 'RPC UNAVAILABLE' : 'API / SERVICE UNAVAILABLE';
    resultEl.textContent = `${label}: ${error instanceof Error ? error.message : 'unknown error'}. This is distinct from a negative policy flag.`;
  }
});

for (const button of document.querySelectorAll('.run-local-test')) {
  button.addEventListener('click', async () => {
    const buttons = [...document.querySelectorAll('.run-local-test')];
    const status = $('#local-test-status');
    const output = $('#local-test-output');
    for (const item of buttons) item.disabled = true;
    status.innerHTML = '<span class="spinner"></span> Running a fixed Foundry command in the local EVM…';
    output.hidden = false;
    output.textContent = 'Waiting for local test output…';
    try {
      const response = await fetch('/api/local-test/run', {
        method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ testId: button.dataset.testId }), cache: 'no-store',
      });
      const result = await response.json();
      const statusText = String(result.status || 'unavailable').toUpperCase();
      status.innerHTML = `<span class="status-pill ${result.status === 'pass' ? 'status-ok' : 'status-error'}">${escapeHtml(statusText)}</span><span>${escapeHtml(result.environment || result.error || 'Local test execution result')}</span>`;
      output.textContent = [
        `Test: ${result.testId || button.dataset.testId} — ${result.label || 'local test'}`,
        `Environment: ${result.environment || 'LOCAL EVM'}`,
        `Command: ${result.command || 'not executed'}`,
        `Exit code: ${result.exitCode ?? 'not available'}`,
        `Network transaction: ${result.networkTransaction === false ? 'No' : 'not established'}`,
        `Transaction hash: ${result.transactionHash || 'not applicable (local Foundry test)'}`,
        result.truncated ? '[Output truncated at the safe response limit.]' : '',
        '', result.output || result.error || result.hint || `HTTP ${response.status}`,
      ].filter((line) => line !== undefined).join('\n');
      if (!response.ok && result.status !== 'not-available') status.setAttribute('aria-label', `Local test request returned HTTP ${response.status}`);
    } catch (error) {
      status.innerHTML = '<span class="status-pill status-error">LOCAL TEST UNAVAILABLE</span><span>The local API/test runner could not be reached.</span>';
      output.textContent = error instanceof Error ? error.message : 'Unknown local test request error.';
    } finally {
      for (const item of buttons) item.disabled = false;
    }
  });
}

for (const button of document.querySelectorAll('[data-copy]')) {
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      const previous = button.textContent;
      button.textContent = 'Copied';
      setTimeout(() => { button.textContent = previous; }, 1000);
    } catch { button.textContent = 'Copy unavailable'; }
  });
}

refreshButton.addEventListener('click', refresh);
refresh();

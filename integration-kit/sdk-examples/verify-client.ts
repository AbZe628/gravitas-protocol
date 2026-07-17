/**
 * PoC verify client — runs the six Annex-A test scenarios
 * (3 ALLOW / 3 DENY) against the Compliance API and prints
 * a pass/fail table.
 *
 *   Terminal 1:  cd ../mock-server && npm install && npm start
 *   Terminal 2:  npm install && npm run verify
 *
 * Point BASE_URL at the hosted sandbox (key required) to run the
 * same scenarios against live infrastructure.
 */
const BASE_URL = process.env.GRAVITAS_API || "http://localhost:8787";

interface Scenario {
  id: string;
  title: string;
  expected: "ALLOW" | "DENY";
  body: Record<string, unknown>;
}

const ctx = (requestId: string) => ({
  channel: "transactli-orchestrator",
  merchantId: "M-1001",
  direction: "settlement",
  requestId,
});

const scenarios: Scenario[] = [
  {
    id: "S1", title: "Approved stable asset (USDC)", expected: "ALLOW",
    body: { asset: { symbol: "USDC", address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" }, amount: "25000.00", context: ctx("poc-s1") },
  },
  {
    id: "S2", title: "Approved utility asset (WETH)", expected: "ALLOW",
    body: { asset: { symbol: "WETH", address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1" }, amount: "3.5000", context: ctx("poc-s2") },
  },
  {
    id: "S3", title: "Approved asset, payout direction", expected: "ALLOW",
    body: { asset: { symbol: "USDC", address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" }, amount: "980.00", context: { ...ctx("poc-s3"), direction: "payout" } },
  },
  {
    id: "S4", title: "Interest-bearing instrument (riba)", expected: "DENY",
    body: { asset: { symbol: "yUSD-INT", category: "interest-bearing" }, amount: "10000.00", context: ctx("poc-s4") },
  },
  {
    id: "S5", title: "Speculative instrument (maysir)", expected: "DENY",
    body: { asset: { symbol: "CASINO", category: "speculative-gaming" }, amount: "500.00", context: ctx("poc-s5") },
  },
  {
    id: "S6", title: "Unknown asset → default DENY", expected: "DENY",
    body: { asset: { symbol: "RANDOM", address: "0x00000000000000000000000000000000000000AA" }, amount: "1.00", context: ctx("poc-s6") },
  },
];

async function run(): Promise<void> {
  console.log(`Gravitas PoC scenarios → ${BASE_URL}\n`);
  let passed = 0;

  for (const s of scenarios) {
    const res = await fetch(`${BASE_URL}/v1/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Gravitas-Key": "sandbox" },
      body: JSON.stringify(s.body),
    });
    const data = (await res.json()) as { decision: string; reason?: string };
    const ok = data.decision === s.expected;
    if (ok) passed++;
    console.log(
      `${ok ? "PASS" : "FAIL"}  ${s.id}  ${s.title.padEnd(38)} expected=${s.expected}  got=${data.decision}` +
        (data.reason ? `  (${data.reason})` : "")
    );
  }

  console.log(`\n${passed}/${scenarios.length} scenarios passed`);
  if (passed !== scenarios.length) process.exit(1);
}

run().catch((e) => { console.error(e); process.exit(1); });

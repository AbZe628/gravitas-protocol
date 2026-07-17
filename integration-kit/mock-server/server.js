/**
 * Gravitas Compliance API — local mock sandbox
 * ------------------------------------------------------------
 * Implements the OpenAPI contract in /openapi so an integrating
 * team (e.g. a payment orchestrator) can run the full PoC flow
 * locally, with zero external dependencies.
 *
 * Decisions are driven by /policies/sandbox-policies.json —
 * the same policy semantics enforced on-chain by
 * GravitasPolicyRegistry (Arbitrum Sepolia, source-verified).
 *
 * This mock is for PoC evaluation only. Hosted sandbox keys are
 * issued under Phase 0 of the partnership (NDA).
 *
 *   npm install && npm start        →  http://localhost:8787
 */
const express = require("express");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 8787;
const POLICY_PATH = path.join(__dirname, "..", "policies", "sandbox-policies.json");
const policySet = JSON.parse(fs.readFileSync(POLICY_PATH, "utf8"));

const app = express();
app.use(express.json());

/** Minimal request-shape guard (mirrors OpenAPI `required` fields). */
function validate(body) {
  if (!body || typeof body !== "object") return "body must be a JSON object";
  if (!body.asset || typeof body.asset !== "object") return "asset is required";
  if (!body.asset.address && !body.asset.category && !body.asset.symbol)
    return "asset.address, asset.category or asset.symbol is required";
  if (typeof body.amount !== "string") return "amount must be a decimal string";
  if (!body.context || !body.context.channel) return "context.channel is required";
  return null;
}

/** Core decision logic — same order of evaluation as the protocol:
 *  1. explicit asset entries (active policies)   2. category rules   3. default DENY. */
function decide(asset) {
  const norm = (s) => (s || "").toLowerCase();

  for (const pol of policySet.policies) {
    for (const a of pol.assets || []) {
      const hit =
        (asset.address && norm(a.address) === norm(asset.address)) ||
        (asset.symbol && a.symbol === asset.symbol);
      if (hit) {
        if (pol.status !== "active") {
          return { decision: "DENY", reason: `${pol.policyId}: ${a.reason || "Policy inactive"}`, ruleId: pol.policyId, policyId: pol.policyId };
        }
        return { decision: a.decision, reason: a.reason, ruleId: null, policyId: pol.policyId };
      }
    }
  }
  for (const pol of policySet.policies) {
    if (pol.status !== "active") continue;
    for (const r of pol.rules || []) {
      if (asset.category && norm(r.category) === norm(asset.category)) {
        return { decision: r.decision, reason: `${r.ruleId}: ${r.reason}`, ruleId: r.ruleId, policyId: pol.policyId };
      }
    }
  }
  return {
    decision: "DENY",
    reason: "DEFAULT-DENY: asset not present in the active policy set",
    ruleId: "DEFAULT-DENY",
    policyId: null,
  };
}

app.post("/v1/verify", (req, res) => {
  const err = validate(req.body);
  if (err) return res.status(422).json({ error: err });

  const d = decide(req.body.asset);
  const response = {
    decision: d.decision,
    ...(d.reason ? { reason: d.reason } : {}),
    ...(d.ruleId ? { ruleId: d.ruleId } : {}),
    ...(d.policyId ? { policyId: d.policyId } : {}),
    policySetId: policySet.policySetId,
    timestamp: new Date().toISOString(),
    onchainRef: { network: policySet.network, registry: policySet.registry },
  };

  // Audit trail — JSON lines, Transactli-reporting friendly (Annex A requirement).
  const audit = {
    ts: response.timestamp,
    requestId: req.body.context?.requestId || null,
    channel: req.body.context?.channel,
    asset: req.body.asset,
    amount: req.body.amount,
    decision: response.decision,
    reason: response.reason || null,
  };
  fs.appendFileSync(path.join(__dirname, "audit.log.jsonl"), JSON.stringify(audit) + "\n");

  res.json(response);
});

app.get("/v1/policies", (_req, res) => res.json(policySet));

app.listen(PORT, () =>
  console.log(`Gravitas mock sandbox listening on http://localhost:${PORT}  (policy set: ${policySet.policySetId})`)
);

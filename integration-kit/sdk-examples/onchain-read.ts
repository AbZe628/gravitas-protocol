/**
 * Trustless verification example — read GravitasPolicyRegistry
 * directly from Arbitrum Sepolia, without trusting any Gravitas
 * server. The contract is source-verified on the explorer, so
 * this script fetches the verified ABI at runtime and lists the
 * public read surface before calling it.
 *
 *   npm install && npm run onchain
 *
 * Requires outbound access to an Arbitrum Sepolia RPC.
 * Fetches verified ABI via:
 *   1. Sourcify (primary, decentralized, keyless)
 *   2. Etherscan V2 (secondary, optional, set ARBISCAN_API_KEY)
 */
import { ethers, type InterfaceAbi } from "ethers";

const REGISTRY = "0xbcaE3069362B0f0b80f44139052f159456C84679";
const RPC = process.env.ARB_SEPOLIA_RPC || "https://sepolia-rollup.arbitrum.io/rpc";

// Sourcify V2 — public, no key required, decentralised verification.
const SOURCIFY_ENDPOINT =
  `https://sourcify.dev/server/v2/contract/421614/${REGISTRY}?fields=abi`;

// Etherscan API V2 — requires an API key (free tier sufficient).
const ETHERSCAN_V2_ENDPOINT =
  `https://api.etherscan.io/v2/api?chainid=421614&module=contract&action=getabi` +
  `&address=${REGISTRY}&apikey=${process.env.ARBISCAN_API_KEY ?? ""}`;

async function fetchAbi(): Promise<InterfaceAbi> {
  // 1. Try Sourcify first (keyless, decentralized).
  try {
    const res = await fetch(SOURCIFY_ENDPOINT);
    const json = (await res.json()) as { abi?: InterfaceAbi };
    if (json.abi && json.abi.length > 0) {
      console.log("ABI source   : Sourcify (decentralised verified source)");
      return json.abi;
    }
  } catch {
    console.warn("Sourcify fetch failed, trying Etherscan fallback...");
  }

  // 2. Try Etherscan V2 if API key is provided.
  const apiKey = process.env.ARBISCAN_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch(ETHERSCAN_V2_ENDPOINT);
      const json = (await res.json()) as { status: string; result: string };
      if (json.status === "1") {
        console.log("ABI source   : Etherscan API V2 (verified source)");
        return JSON.parse(json.result) as InterfaceAbi;
      }
    } catch {
      console.warn("Etherscan fetch failed.");
    }
  }

  // 3. Final failure — print manual retrieval instructions.
  const explorerUrl = `https://sepolia.arbiscan.io/address/${REGISTRY}#code`;
  console.error(`\nERROR: Could not fetch verified ABI from Sourcify or Etherscan.`);
  console.error(`Please retrieve the ABI manually from: ${explorerUrl}`);
  process.exit(1);
}

type AbiEntry = { type?: string; stateMutability?: string; inputs?: unknown[]; name: string };

async function main(): Promise<void> {
  console.log(`Registry : ${REGISTRY}`);
  console.log(`Network  : arbitrum-sepolia\n`);

  // 1) Pull the verified ABI from the explorer — the same
  //    source any independent reviewer would use.
  const abi = await fetchAbi();
  const abiEntries = abi as AbiEntry[];

  // 2) List every public read function so reviewers see the full
  //    on-chain policy surface at a glance.
  const iface = new ethers.Interface(abi);
  console.log("Public read surface (from verified ABI):");
  iface.forEachFunction((fn) => {
    if (fn.stateMutability === "view" || fn.stateMutability === "pure") {
      console.log(`  • ${fn.format("sighash")}`);
    }
  });

  // 3) Live read — connect and call a zero-argument view as a
  //    connectivity + integrity check.
  const provider = new ethers.JsonRpcProvider(RPC);
  const contract = new ethers.Contract(REGISTRY, abi, provider);

  let called = false;
  for (const fn of abiEntries) {
    if (
      fn.type === "function" &&
      (fn.stateMutability === "view" || fn.stateMutability === "pure") &&
      (fn.inputs?.length ?? 0) === 0
    ) {
      try {
        const value = await contract[fn.name]();
        console.log(`\nLive read  ${fn.name}() → ${value}`);
        called = true;
        break;
      } catch { /* try the next zero-arg view */ }
    }
  }
  if (!called) {
    console.log("\n(no zero-argument view succeeded — inspect the surface above and call a specific getter)");
  }

  console.log("\nEvery policy decision returned by the API can be cross-checked against this contract.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

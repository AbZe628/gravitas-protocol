/**
 * Gravitas Protocol — Smart Contract Error Decoder
 * Maps on-chain revert reasons to human-readable messages.
 */

const CONTRACT_ERRORS: Record<string, string> = {
  // PolicyRegistry errors
  AssetNotCompliant: "This token is not on the Shariah-compliant whitelist",
  RouterNotAuthorized: "This router is not authorized in the PolicyRegistry",
  ExecutorNotAuthorized: "This executor is not authorized",
  PolicyViolation: "Transaction violates compliance policy",

  // TeleportV2 / TeleportV3 errors
  CooldownNotMet: "Cooldown period has not elapsed — please wait before migrating again",
  MaxMoveBpsExceeded: "Price movement exceeds the maximum allowed slippage",
  InvalidSignature: "Invalid EIP-712 signature — please sign again",
  NonceAlreadyUsed: "This nonce has already been used — signature is replayed",
  DeadlineExpired: "Transaction deadline has expired — please rebuild the migration",
  InsufficientLiquidity: "Insufficient liquidity in the position",
  ZeroLiquidity: "Cannot migrate a position with zero liquidity",
  InvalidTokenId: "Invalid Uniswap V3 NFT token ID",
  InvalidFeeTier: "Invalid fee tier — use 100, 500, 3000, or 10000",
  SlippageTooHigh: "Received amounts are below your minimum — increase slippage tolerance",

  // General EVM errors
  OwnableUnauthorizedAccount: "You are not the contract owner",
  Unauthorized: "You are not authorized to perform this action",
};

/**
 * Decode a wagmi / viem error into a user-friendly message.
 */
export function decodeContractError(error: unknown): string {
  if (!error) return "An unknown error occurred";

  const err = error as {
    message?: string;
    shortMessage?: string;
    cause?: { data?: { errorName?: string }; shortMessage?: string };
    data?: { errorName?: string };
  };

  // 1. Try to extract named error from viem cause
  const errorName =
    err?.cause?.data?.errorName ||
    err?.data?.errorName;

  if (errorName && CONTRACT_ERRORS[errorName]) {
    return CONTRACT_ERRORS[errorName];
  }

  // 2. Scan message string for known error names
  const rawMessage = err?.shortMessage || err?.cause?.shortMessage || err?.message || "";

  for (const [key, friendly] of Object.entries(CONTRACT_ERRORS)) {
    if (rawMessage.includes(key)) return friendly;
  }

  // 3. Handle common user-facing cases
  if (/user rejected|user denied/i.test(rawMessage)) {
    return "Transaction rejected by user";
  }
  if (/already processing/i.test(rawMessage)) {
    return "A connection request is already pending — check your wallet";
  }
  if (/insufficient funds/i.test(rawMessage)) {
    return "Insufficient ETH balance for gas fees";
  }
  if (/network changed/i.test(rawMessage)) {
    return "Network changed during transaction — please retry";
  }
  if (/execution reverted/i.test(rawMessage)) {
    return "Transaction reverted — verify your inputs and compliance status";
  }

  // 4. Fallback: truncate raw message
  return rawMessage.length > 0
    ? rawMessage.slice(0, 120)
    : "Transaction failed — please try again";
}

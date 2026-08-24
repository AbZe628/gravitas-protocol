/**
 * Wallet rejections that are not faults.
 *
 * On every page load wagmi tries to reconnect to whichever wallet was used
 * last. When the browser has a wallet extension that is locked, or installed
 * with no account in it, the provider rejects and nothing is listening — so an
 * uncaught promise rejection lands in the console of a page that is working
 * exactly as intended. Edge ships a wallet, so this is the default experience
 * for anyone who has never set one up, which is most first-time visitors to a
 * testnet application.
 *
 * That matters for more than tidiness. A console full of uncaught rejections is
 * where a real fault goes to hide, and error monitoring counts them as
 * incidents.
 *
 * Only EIP-1193 provider errors are swallowed, and only the ones that mean the
 * person or their wallet declined rather than something broke. Anything else —
 * including a provider error with a code outside this set — is left alone to be
 * reported, because the point is to remove noise, not evidence.
 */

/** https://eips.ethereum.org/EIPS/eip-1193#provider-errors */
const DECLINED = new Set([
  4001, // the request was rejected: by the person, or by a wallet with nothing to offer
  4100, // not authorised: the account is not permitted or the wallet is locked
  4900, // disconnected from all chains
  4901, // disconnected from the requested chain
]);

interface ProviderError {
  code: number;
  message?: string;
}

function isDeclined(reason: unknown): reason is ProviderError {
  if (typeof reason !== 'object' || reason === null) return false;
  const code = (reason as { code?: unknown }).code;
  return typeof code === 'number' && DECLINED.has(code);
}

/**
 * Returns a function that removes the listener again, so a test can install it
 * and clean up rather than leaking a global between cases.
 */
export function quietenWalletRejections(target: Window = window): () => void {
  const onRejection = (event: PromiseRejectionEvent) => {
    if (!isDeclined(event.reason)) return;
    // Handled: the application already treats "not connected" as a state
    // rather than an error, and the interface says so where it matters.
    event.preventDefault();
  };

  target.addEventListener('unhandledrejection', onRejection);
  return () => target.removeEventListener('unhandledrejection', onRejection);
}

import { http, createConfig } from 'wagmi';
import { arbitrumSepolia } from 'wagmi/chains';
import { injected, metaMask, coinbaseWallet, walletConnect } from 'wagmi/connectors';

/* WalletConnect needs a project id from cloud.walletconnect.com. Without one its
   backend refuses every call, and the build used to fall back to the literal
   string YOUR_WALLETCONNECT_PROJECT_ID, which shipped to production and left a
   wallet option in the list that could not succeed. Offer it only when a real id
   is present. The other three connectors need no such key and always work. */
const WC_PROJECT_ID = (import.meta.env.VITE_WC_PROJECT_ID || '').trim();
const WC_CONFIGURED = /^[0-9a-f]{32}$/i.test(WC_PROJECT_ID);

if (import.meta.env.DEV && !WC_CONFIGURED) {
  console.warn(
    'WalletConnect is not offered: set VITE_WC_PROJECT_ID to a project id from cloud.walletconnect.com.'
  );
}

export const walletConnectAvailable = WC_CONFIGURED;

export const config = createConfig({
  chains: [arbitrumSepolia],
  connectors: [
    injected(),
    metaMask(),
    coinbaseWallet({ appName: 'Gravitas Protocol' }),
    ...(WC_CONFIGURED ? [walletConnect({ projectId: WC_PROJECT_ID, showQrModal: true })] : []),
  ],
  transports: {
    [arbitrumSepolia.id]: http('https://sepolia-rollup.arbitrum.io/rpc'),
  },
});

// Contract addresses on Arbitrum Sepolia. All four are deployed and verified;
// listing only the two the dashboard calls made the deployment look half-finished
// on every page that renders from this object.
export const CONTRACTS = {
  POLICY_REGISTRY: '0x6f3bfb896DD9964C9c05dA88692bDf1b1b2C3F23' as const,
  TELEPORT_V3: '0x6702C2CE6eD58ca3934eBBd785CaC1De8DCd85B4' as const,
  TELEPORT_V2: '0xEDfF3dFdcdd7C04B11d9B614d5E0cd368f1e93c0' as const,
  TIMELOCK: '0xbFFAd90B2607e3E5926260B640BbcD1E128680Ba' as const,
} as const;

export const ARBISCAN = 'https://sepolia.arbiscan.io/address/';

/** What each address is, in the order a reader should meet them. */
export const DEPLOYMENT = [
  {
    name: 'GravitasPolicyRegistry',
    address: CONTRACTS.POLICY_REGISTRY,
    role: 'The ruling, on chain. Every other contract asks it before it moves anything.',
  },
  {
    name: 'TeleportV3',
    address: CONTRACTS.TELEPORT_V3,
    role: 'Migrates a Uniswap V3 position in one transaction, against a signed intent.',
  },
  {
    name: 'TeleportV2',
    address: CONTRACTS.TELEPORT_V2,
    role: 'The constant-product path. Deployed, but Arbitrum Sepolia hosts no Uniswap V2 to route through.',
  },
  {
    name: 'GravitasTimelock',
    address: CONTRACTS.TIMELOCK,
    role: 'Holds delay over privileged changes. Ownership moves to it before mainnet, after the audit.',
  },
] as const;

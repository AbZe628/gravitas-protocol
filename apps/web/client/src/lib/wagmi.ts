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

// Contract addresses on Arbitrum Sepolia
export const CONTRACTS = {
  POLICY_REGISTRY: '0xbcaE3069362B0f0b80f44139052f159456C84679' as const,
  TELEPORT_V3: '0x5D423f8d01539B92D3f3953b91682D9884D1E993' as const,
} as const;

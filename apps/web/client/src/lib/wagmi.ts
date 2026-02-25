import { http, createConfig } from 'wagmi';
import { arbitrumSepolia } from 'wagmi/chains';
import { injected, metaMask, coinbaseWallet, walletConnect } from 'wagmi/connectors';

// WalletConnect project ID — replace with your own from https://cloud.walletconnect.com
const WC_PROJECT_ID = import.meta.env.VITE_WC_PROJECT_ID || 'a8d1d5c2f3e4b6a7c8d9e0f1a2b3c4d5';

export const config = createConfig({
  chains: [arbitrumSepolia],
  connectors: [
    injected(),
    metaMask(),
    coinbaseWallet({ appName: 'Gravitas Protocol' }),
    walletConnect({ projectId: WC_PROJECT_ID }),
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

import { http, createConfig } from 'wagmi';
import { arbitrumSepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

export const config = createConfig({
  chains: [arbitrumSepolia],
  connectors: [
    injected(),
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

# Gravitas Protocol Frontend - Implementation Roadmap

## ✅ Completed (MVP)

- [x] Professional landing page with protocol overview
- [x] Wallet connection (MetaMask via wagmi)
- [x] Network auto-switch to Arbitrum Sepolia
- [x] Basic dashboard layout with tabs
- [x] Contract address display with copy/Arbiscan links
- [x] Responsive design with institutional theme
- [x] Typography system (IBM Plex Sans + Space Grotesk)
- [x] Color palette (Navy + Gold institutional theme)

## 🚧 Phase 1: Contract Read Interfaces (Priority: HIGH)

### Policy Registry Reader

**File:** `client/src/components/PolicyRegistryReader.tsx`

**Features:**
- Display current policy version
- Check if an asset is compliant (input address → boolean)
- Check if an executor is authorized (input address → boolean)
- List recent policy updates (if events are indexed)

**Implementation Guide:**

```typescript
import { useReadContract } from 'wagmi';
import { CONTRACTS } from '@/lib/wagmi';

// ABI for Policy Registry
const POLICY_REGISTRY_ABI = [
  {
    inputs: [{ name: 'asset', type: 'address' }],
    name: 'isAssetCompliant',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Add other read functions...
] as const;

export function PolicyRegistryReader() {
  const { data: version } = useReadContract({
    address: CONTRACTS.POLICY_REGISTRY,
    abi: POLICY_REGISTRY_ABI,
    functionName: 'getPolicyVersion',
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Policy Version: {version?.toString()}</CardTitle>
      </CardHeader>
      {/* Add asset compliance checker form */}
    </Card>
  );
}
```

**Estimated Time:** 2-3 hours

---

### Teleport V2 State Viewer

**File:** `client/src/components/TeleportV2Viewer.tsx`

**Features:**
- Display current cooldown period
- Display maxMoveBps limit
- Check cooldown status for a specific migration (requires user input)
- Show recent migrations (if events are available)

**Implementation Guide:**

```typescript
const TELEPORT_V2_ABI = [
  {
    inputs: [],
    name: 'cooldownSeconds',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'maxMoveBps',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export function TeleportV2Viewer() {
  const { data: cooldown } = useReadContract({
    address: CONTRACTS.TELEPORT_V2, // Add this to wagmi.ts
    abi: TELEPORT_V2_ABI,
    functionName: 'cooldownSeconds',
  });

  const { data: maxMoveBps } = useReadContract({
    address: CONTRACTS.TELEPORT_V2,
    abi: TELEPORT_V2_ABI,
    functionName: 'maxMoveBps',
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>V2 Migration Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2">
            <div>
              <dt className="text-sm text-muted-foreground">Cooldown Period</dt>
              <dd className="text-2xl font-bold">{cooldown?.toString()} seconds</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Max Move (bps)</dt>
              <dd className="text-2xl font-bold">{maxMoveBps?.toString()}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Estimated Time:** 2 hours

---

### Teleport V3 State Viewer

**File:** `client/src/components/TeleportV3Viewer.tsx`

**Features:**
- Display user's current nonce
- Show valid fee tiers (100, 500, 3000, 10000)
- Display recent migrations (if events available)

**Implementation Guide:**

```typescript
const TELEPORT_V3_ABI = [
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'nonces',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export function TeleportV3Viewer() {
  const { address } = useAccount();
  
  const { data: nonce } = useReadContract({
    address: CONTRACTS.TELEPORT_V3,
    abi: TELEPORT_V3_ABI,
    functionName: 'nonces',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Migration Nonce</CardTitle>
        <CardDescription>
          Used for EIP-712 signature replay protection
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{nonce?.toString() ?? '—'}</p>
      </CardContent>
    </Card>
  );
}
```

**Estimated Time:** 1.5 hours

---

## 🚧 Phase 2: Write Transaction Interfaces (Priority: HIGH)

### Teleport V2 Migration Form

**File:** `client/src/components/TeleportV2MigrationForm.tsx`

**Features:**
- Input fields for all migration parameters
- Validation (check compliance, cooldown, maxMoveBps)
- Gas estimation before submission
- Transaction submission with loading states
- Success/error handling with toast notifications

**Implementation Guide:**

```typescript
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const migrationSchema = z.object({
  factoryFrom: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  pairFrom: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  routerTo: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  tokenA: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  tokenB: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  amountLiquidity: z.string(),
  deadline: z.number(),
});

export function TeleportV2MigrationForm() {
  const form = useForm({
    resolver: zodResolver(migrationSchema),
  });

  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const onSubmit = (data: z.infer<typeof migrationSchema>) => {
    writeContract({
      address: CONTRACTS.TELEPORT_V2,
      abi: TELEPORT_V2_ABI,
      functionName: 'migrateLiquidityV2',
      args: [
        data.factoryFrom,
        data.pairFrom,
        data.routerTo,
        data.tokenA,
        data.tokenB,
        BigInt(data.amountLiquidity),
        BigInt(data.deadline),
      ],
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Add form fields for each parameter */}
        <Button type="submit" disabled={isConfirming}>
          {isConfirming ? 'Confirming...' : 'Migrate Liquidity'}
        </Button>
      </form>
    </Form>
  );
}
```

**Estimated Time:** 4-5 hours

---

### Teleport V3 EIP-712 Signing Flow

**File:** `client/src/components/TeleportV3SigningFlow.tsx`

**Features:**
- Form for all AtomicMigration parameters
- EIP-712 domain construction
- Signature generation with `useSignTypedData`
- Transaction submission with signature
- Nonce management

**Implementation Guide:**

```typescript
import { useSignTypedData, useWriteContract } from 'wagmi';

const EIP712_DOMAIN = {
  name: 'TeleportV3',
  version: '1',
  chainId: 421614,
  verifyingContract: CONTRACTS.TELEPORT_V3,
} as const;

const EIP712_TYPES = {
  AtomicMigration: [
    { name: 'owner', type: 'address' },
    { name: 'tokenId', type: 'uint256' },
    { name: 'newFee', type: 'uint24' },
    { name: 'tickLower', type: 'int24' },
    { name: 'tickUpper', type: 'int24' },
    { name: 'amount0MinMint', type: 'uint256' },
    { name: 'amount1MinMint', type: 'uint256' },
    { name: 'amount0MinDecrease', type: 'uint256' },
    { name: 'amount1MinDecrease', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
    { name: 'swapExecuted', type: 'bool' },
    { name: 'zeroForOne', type: 'bool' },
    { name: 'amountIn', type: 'uint256' },
    { name: 'amountOutMin', type: 'uint256' },
    { name: 'feeTierSwap', type: 'uint24' },
    { name: 'nonce', type: 'uint256' },
  ],
} as const;

export function TeleportV3SigningFlow() {
  const { address } = useAccount();
  const { signTypedData, data: signature } = useSignTypedData();
  const { writeContract } = useWriteContract();

  const handleSign = () => {
    signTypedData({
      domain: EIP712_DOMAIN,
      types: EIP712_TYPES,
      primaryType: 'AtomicMigration',
      message: {
        owner: address!,
        tokenId: 123n, // From form
        newFee: 3000,
        // ... other parameters
        nonce: currentNonce,
      },
    });
  };

  const handleExecute = () => {
    if (!signature) return;
    
    writeContract({
      address: CONTRACTS.TELEPORT_V3,
      abi: TELEPORT_V3_ABI,
      functionName: 'atomicMigrateWithSignature',
      args: [migrationParams, signature],
    });
  };

  return (
    <div className="space-y-4">
      <Button onClick={handleSign}>Sign Migration</Button>
      {signature && (
        <Button onClick={handleExecute}>Execute Migration</Button>
      )}
    </div>
  );
}
```

**Estimated Time:** 6-8 hours

---

## 🚧 Phase 3: Advanced Features (Priority: MEDIUM)

### Transaction History Viewer

**File:** `client/src/components/TransactionHistory.tsx`

**Features:**
- Query past transactions from Arbiscan API or subgraph
- Display migration history with status (success/failed)
- Filter by contract (V2/V3)
- Export to CSV

**Implementation Approach:**
1. Use Arbiscan API to fetch transactions for connected wallet
2. Filter by contract address (TELEPORT_V2, TELEPORT_V3)
3. Decode transaction data to show human-readable parameters
4. Display in a table with pagination

**Estimated Time:** 5-6 hours

---

### Event Viewer

**File:** `client/src/components/EventViewer.tsx`

**Features:**
- Subscribe to contract events using `useWatchContractEvent`
- Display real-time migration events
- Show event parameters (from, to, amounts, etc.)
- Link to Arbiscan transaction

**Implementation Guide:**

```typescript
import { useWatchContractEvent } from 'wagmi';

export function EventViewer() {
  const [events, setEvents] = useState([]);

  useWatchContractEvent({
    address: CONTRACTS.TELEPORT_V3,
    abi: TELEPORT_V3_ABI,
    eventName: 'MigrationExecuted',
    onLogs(logs) {
      setEvents((prev) => [...logs, ...prev]);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Migrations</CardTitle>
      </CardHeader>
      <CardContent>
        {events.map((event) => (
          <div key={event.transactionHash}>
            {/* Display event data */}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

**Estimated Time:** 3-4 hours

---

### Gas Estimation

**File:** `client/src/hooks/useGasEstimate.ts`

**Features:**
- Estimate gas before transaction submission
- Display estimated cost in ETH and USD
- Show gas price recommendations (slow/standard/fast)

**Implementation Guide:**

```typescript
import { useEstimateGas, useGasPrice } from 'wagmi';

export function useGasEstimate(txParams) {
  const { data: gasEstimate } = useEstimateGas(txParams);
  const { data: gasPrice } = useGasPrice();

  const estimatedCost = gasEstimate && gasPrice 
    ? (gasEstimate * gasPrice) / 10n**18n 
    : null;

  return { gasEstimate, gasPrice, estimatedCost };
}
```

**Estimated Time:** 2 hours

---

### Error Decoding

**File:** `client/src/lib/errorDecoder.ts`

**Features:**
- Decode contract revert reasons
- Map error selectors to human-readable messages
- Display helpful error messages in UI

**Implementation Guide:**

```typescript
const ERROR_MESSAGES: Record<string, string> = {
  'AssetNotCompliant': 'This asset is not Shariah-compliant',
  'CooldownNotMet': 'Cooldown period has not elapsed',
  'InvalidSignature': 'Invalid EIP-712 signature',
  // Add all contract errors
};

export function decodeError(error: any): string {
  const errorName = error?.data?.errorName;
  return ERROR_MESSAGES[errorName] || 'Transaction failed';
}
```

**Estimated Time:** 2 hours

---

### SDK Snippet Generator

**File:** `client/src/components/SDKSnippetGenerator.tsx`

**Features:**
- Generate TypeScript code snippets for current transaction
- Copy to clipboard
- Support for Node.js and browser environments

**Implementation Guide:**

```typescript
export function SDKSnippetGenerator({ params }) {
  const snippet = `
import { GravitasClient } from '@gravitas/sdk';

const client = new GravitasClient({
  rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
  chainId: 421614,
  registryAddress: '${CONTRACTS.POLICY_REGISTRY}',
  teleportV3Address: '${CONTRACTS.TELEPORT_V3}',
});

const migration = client.migration()
  .tokenId(${params.tokenId}n)
  .newFee(${params.newFee})
  .ticks(${params.tickLower}, ${params.tickUpper})
  .slippage(0n, 0n, 0n, 0n)
  .deadline(${params.deadline}n);

const result = await migration.simulate('${params.owner}');
  `.trim();

  return (
    <Card>
      <CardHeader>
        <CardTitle>SDK Snippet</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="p-4 rounded-lg bg-muted overflow-x-auto">
          <code>{snippet}</code>
        </pre>
        <Button onClick={() => navigator.clipboard.writeText(snippet)}>
          Copy Snippet
        </Button>
      </CardContent>
    </Card>
  );
}
```

**Estimated Time:** 2-3 hours

---

### Exportable JSON Configs

**File:** `client/src/components/ConfigExporter.tsx`

**Features:**
- Export migration parameters as JSON
- Import JSON to pre-fill forms
- Save/load configurations locally

**Implementation Guide:**

```typescript
export function ConfigExporter({ params }) {
  const exportConfig = () => {
    const config = JSON.stringify(params, null, 2);
    const blob = new Blob([config], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gravitas-migration-${Date.now()}.json`;
    a.click();
  };

  return <Button onClick={exportConfig}>Export Config</Button>;
}
```

**Estimated Time:** 2 hours

---

## 🚧 Phase 4: WalletConnect Integration (Priority: LOW)

**File:** `client/src/lib/wagmi.ts` (update)

**Features:**
- Add WalletConnect connector
- Support multiple wallets (MetaMask, WalletConnect, Coinbase Wallet)
- Wallet modal with options

**Implementation Guide:**

```typescript
import { walletConnect, coinbaseWallet } from 'wagmi/connectors';

export const config = createConfig({
  chains: [arbitrumSepolia],
  connectors: [
    injected(),
    walletConnect({ projectId: 'YOUR_PROJECT_ID' }),
    coinbaseWallet({ appName: 'Gravitas Protocol' }),
  ],
  transports: {
    [arbitrumSepolia.id]: http(),
  },
});
```

**Requirements:**
- Create WalletConnect project at https://cloud.walletconnect.com
- Add project ID to environment variables

**Estimated Time:** 2-3 hours

---

## 📚 Additional Documentation Needed

### INTEGRATION.md

Create `docs/INTEGRATION.md` with:
- Complete SDK integration guide
- Frontend integration examples
- API reference
- Common patterns and best practices

**Estimated Time:** 3-4 hours

---

### CONTRIBUTING.md

Create `CONTRIBUTING.md` with:
- Development setup instructions
- Code style guidelines
- Testing requirements
- PR process

**Estimated Time:** 2 hours

---

## 🚀 Deployment

### GitHub Pages Configuration

**File:** `.github/workflows/deploy.yml`

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: cd gravitas-web && pnpm install
        
      - name: Build
        run: cd gravitas-web && pnpm build
        env:
          VITE_BASE_PATH: /gravitas-protocol/
          
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./gravitas-web/dist/public
```

**Additional Steps:**
1. Update `vite.config.ts` with base path: `/gravitas-protocol/`
2. Enable GitHub Pages in repository settings
3. Set source to `gh-pages` branch

**Estimated Time:** 1-2 hours

---

## 📊 Total Estimated Time

| Phase | Estimated Time |
|-------|----------------|
| Phase 1: Read Interfaces | 5-6 hours |
| Phase 2: Write Interfaces | 10-13 hours |
| Phase 3: Advanced Features | 16-19 hours |
| Phase 4: WalletConnect | 2-3 hours |
| Documentation | 5-6 hours |
| Deployment | 1-2 hours |
| **TOTAL** | **39-49 hours** |

---

## 🎯 Priority Order

1. **Immediate (Phase 1):** Contract read interfaces - provides immediate value
2. **High (Phase 2):** Write transaction interfaces - core functionality
3. **Medium (Phase 3):** Advanced features - enhances UX
4. **Low (Phase 4):** WalletConnect - nice-to-have for broader wallet support

---

## 📝 Notes

- All ABIs need to be extracted from contract artifacts in `/home/ubuntu/gravitas-protocol/out/`
- Consider using a subgraph for event indexing instead of direct RPC calls
- Add comprehensive error handling for all network requests
- Implement loading skeletons for better UX
- Add unit tests for critical components
- Consider adding E2E tests with Playwright

---

## 🔗 Useful Resources

- [wagmi Documentation](https://wagmi.sh)
- [viem Documentation](https://viem.sh)
- [EIP-712 Specification](https://eips.ethereum.org/EIPS/eip-712)
- [Uniswap V3 Documentation](https://docs.uniswap.org/contracts/v3/overview)
- [Arbiscan API](https://docs.arbiscan.io/)

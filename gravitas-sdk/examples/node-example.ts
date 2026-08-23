/**
 * Node.js Example: Gravitas SDK Integration
 * 
 * This example demonstrates how to use the Gravitas SDK in a Node.js environment
 * to check compliance and simulate a Uniswap V3 liquidity migration.
 */

import { GravitasClient } from '../src/index.js';

async function main() {
  // Initialize the Gravitas client
  const client = new GravitasClient({
    rpcUrl: process.env.RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc',
    chainId: 421614, // Arbitrum Sepolia
    registryAddress: '0x6f3bfb896DD9964C9c05dA88692bDf1b1b2C3F23',
    teleportV3Address: '0x6702C2CE6eD58ca3934eBBd785CaC1De8DCd85B4',
  });

  console.log('✅ Gravitas client initialized');

  // Example 1: Check asset compliance
  const tokenAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3'; // Example token address
  try {
    await client.compliance.validateAsset(tokenAddress);
    console.log(`Asset ${tokenAddress} compliance: ✅ Compliant`);
  } catch (error) {
    console.error('Error checking compliance:', error);
  }

  // Example 2: Check executor authorization
  const executorAddress = '0x70997970C51812dc3A01088eB04e2e082E20bEBa'; // Example executor address
  try {
    await client.compliance.validateExecutor(executorAddress);
    console.log(`Executor ${executorAddress} authorization: ✅ Authorized`);
  } catch (error) {
    console.error('Error checking authorization:', error);
  }

  // Example 3: Get current policy version
  try {
    const version = await client.compliance.getPolicyVersion();
    console.log('Current policy version:', version);
  } catch (error) {
    console.error('Error getting policy version:', error);
  }

  // Example 4: Build a migration (simulation only)
  const ownerAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'; // Example owner address
  const tokenId = 123n;

  try {
    const migration = client.migration()
      .tokenId(tokenId)
      .newFee(3000) // 0.3% fee tier
      .ticks(-887220, 887220) // Full range
      .slippage(0n, 0n, 0n, 0n) // No slippage protection (for testing)
      .deadline(BigInt(Math.floor(Date.now() / 1000) + 3600)); // 1 hour from now

    console.log('Migration builder created successfully');

    // Simulate the migration
    const result = await migration.simulate(ownerAddress, '0x');
    console.log('Migration simulation result:', result);
  } catch (error) {
    console.error('Error simulating migration:', error);
  }
}

main().catch(console.error);

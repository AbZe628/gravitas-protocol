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
    registryAddress: '0xbcaE3069362B0f0b80f44139052f159456C84679',
    teleportV3Address: '0x5D423f8d01539B92D3f3953b91682D9884D1E993',
  });

  console.log('✅ Gravitas client initialized');

  // Example 1: Check asset compliance
  const tokenAddress = '0x...'; // Replace with actual token address
  try {
    const isCompliant = await client.compliance.isAssetCompliant(tokenAddress);
    console.log(`Asset ${tokenAddress} compliance:`, isCompliant ? '✅ Compliant' : '❌ Non-compliant');
  } catch (error) {
    console.error('Error checking compliance:', error);
  }

  // Example 2: Check executor authorization
  const executorAddress = '0x...'; // Replace with actual executor address
  try {
    const isAuthorized = await client.compliance.isExecutorAuthorized(executorAddress);
    console.log(`Executor ${executorAddress} authorization:`, isAuthorized ? '✅ Authorized' : '❌ Unauthorized');
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
  const ownerAddress = '0x...'; // Replace with actual owner address
  const tokenId = 123n; // Replace with actual NFT position ID

  try {
    const migration = client.migration()
      .tokenId(tokenId)
      .newFee(3000) // 0.3% fee tier
      .ticks(-887220, 887220) // Full range
      .slippage(0n, 0n, 0n, 0n) // No slippage protection (for testing)
      .deadline(BigInt(Math.floor(Date.now() / 1000) + 3600)); // 1 hour from now

    console.log('Migration builder created successfully');

    // Simulate the migration
    const result = await migration.simulate(ownerAddress);
    console.log('Migration simulation result:', result);
  } catch (error) {
    console.error('Error simulating migration:', error);
  }
}

main().catch(console.error);

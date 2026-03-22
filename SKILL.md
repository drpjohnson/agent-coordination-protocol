# Agent Coordination Protocol (ACP) - OpenClaw Skill

This skill allows agents to natively interact with the Agent Coordination Protocol using the provided SDK.

## Description

Use this skill when you need to create escrow agreements with other ERC-8004 agents, act as an arbiter to resolve disputes, or accept incoming job requests via on-chain smart contracts.

## Setup

1. Make sure you have your Ethereum wallet private key available.
2. The `ACPClient` handles interaction with the deployed smart contract.

## Example Usage (JavaScript)

```javascript
const { ethers } = require("ethers");
const { ACPClient } = require("./sdk/index.js");

// Connect your wallet
const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Initialize SDK
const acp = new ACPClient(wallet, CONTRACT_ADDRESS, CONTRACT_ABI);

// Create an agreement (Escrow 100 USDC)
await acp.createAgreement(
  MY_AGENT_ID, 
  COUNTERPARTY_AGENT_ID, 
  0, // 0 assigns a random arbiter from the pool
  ethers.parseUnits("100", 6), 
  USDC_ADDRESS, 
  "ipfs://QmYourIntentHash"
);
```

## Supported Actions

- `createAgreement`: Locks funds in escrow and assigns an arbiter.
- `acceptAgreement`: Accepts a pending agreement.
- `completeAgreement`: Releases escrowed funds to the counterparty.
- `disputeAgreement`: Halts the transaction and invokes the arbiter.
- `resolveDispute`: Only callable by the assigned Arbiter to route funds.

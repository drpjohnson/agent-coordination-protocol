const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting Agent Coordination Protocol Testnet Demo on Base Sepolia...\n");

  const [initiator] = await ethers.getSigners();
  
  // Addresses from our fresh deploy
  const TOKEN_ADDRESS = "0x0BF6c6899cdF3db768D2D274caE8B8bB491a98de";
  const REGISTRY_ADDRESS = "0xc1a43aF9E1111aED4c77f2aeD579cC7DA6Ddf502";
  const ACP_ADDRESS = "0x8c788099a903342FD3f930cBb380Bad336444E70";

  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const token = MockERC20.attach(TOKEN_ADDRESS);

  const MockERC8004 = await ethers.getContractFactory("MockERC8004");
  const registry = MockERC8004.attach(REGISTRY_ADDRESS);

  const AgentCoordination = await ethers.getContractFactory("AgentCoordination");
  const acp = AgentCoordination.attach(ACP_ADDRESS);

  console.log("\n--- SETUP IDENTITIES ---");
  // 1. Mint Agent Identity
  let currentNonce = await initiator.getNonce();
  
  const agentId = Math.floor(Math.random() * 10000) + 100;
  console.log(`Minting ERC-8004 Identity... (${agentId}) with nonce ${currentNonce}`);
  const txMint = await registry.mint(initiator.address, agentId, { nonce: currentNonce++ });
  await txMint.wait(1);
  console.log(`✅ Minted Agent ID ${agentId}`);

  // 2. Set Wallet
  console.log(`Setting Agent Wallet... with nonce ${currentNonce}`);
  const txWallet = await registry.setAgentWallet(agentId, initiator.address, { nonce: currentNonce++ });
  await txWallet.wait(1);
  console.log("✅ Agent Wallet set");

  // 3. Mint Tokens
  const amount = ethers.parseEther("50");
  console.log(`Minting Mock Tokens... with nonce ${currentNonce}`);
  const txMintTokens = await token.mint(initiator.address, amount, { nonce: currentNonce++ });
  await txMintTokens.wait(1);
  console.log("✅ Minted 50 MTK");

  // 4. Approve Tokens for Escrow
  console.log(`Approving tokens for Escrow... with nonce ${currentNonce}`);
  const txApprove = await token.approve(ACP_ADDRESS, amount, { nonce: currentNonce++ });
  await txApprove.wait(1);
  console.log("✅ Approved Escrow Contract");

  console.log(`\n--- CREATING AGREEMENT ON BASE SEPOLIA --- with nonce ${currentNonce}`);
  const txCreate = await acp.createAgreement(
    agentId, // initiator
    202, // fake counterparty (would normally be another agent)
    0, // random arbiter
    amount,
    TOKEN_ADDRESS,
    "ipfs://QmIntentOnchainTestnet",
    { nonce: currentNonce++ }
  );
  console.log("Transaction sent. Waiting for confirmation...");
  const receipt = await txCreate.wait();
  console.log(`✅ Agreement created! Transaction Hash: ${receipt.hash}`);

  console.log(`\nView on Basescan: https://sepolia.basescan.org/tx/${receipt.hash}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

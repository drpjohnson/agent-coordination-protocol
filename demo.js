const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting Agent Coordination Protocol Demo...\n");

  const [owner, initiator, counterparty, arbiter] = await ethers.getSigners();

  // 1. Deploy Mocks
  console.log("📦 Deploying MockERC8004 Registry...");
  const MockERC8004 = await ethers.getContractFactory("MockERC8004");
  const registry = await MockERC8004.deploy();
  await registry.waitForDeployment();

  console.log("📦 Deploying MockERC20 Token...");
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const token = await MockERC20.deploy();
  await token.waitForDeployment();

  // 2. Deploy ACP
  console.log("📦 Deploying AgentCoordination Contract...");
  const AgentCoordination = await ethers.getContractFactory("AgentCoordination");
  const acp = await AgentCoordination.deploy(await registry.getAddress());
  await acp.waitForDeployment();

  console.log("\n--- SETUP IDENTITIES ---");
  // Register agents and their wallets
  await registry.mint(initiator.address, 1);
  await registry.setAgentWallet(1, initiator.address);
  console.log("🤖 Agent 1 (Initiator) registered.");

  await registry.mint(counterparty.address, 2);
  await registry.setAgentWallet(2, counterparty.address);
  console.log("🤖 Agent 2 (Counterparty) registered.");

  await registry.mint(arbiter.address, 3);
  await registry.setAgentWallet(3, arbiter.address);
  console.log("⚖️ Agent 3 (Arbiter) registered.");

  // Register Arbiter in ACP
  await acp.connect(arbiter).registerAsArbiter(3);
  console.log("⚖️ Agent 3 joined the Arbiter Pool.");

  // Mint and approve tokens
  const amount = ethers.parseEther("100");
  await token.mint(initiator.address, amount);
  await token.connect(initiator).approve(await acp.getAddress(), amount);
  console.log(`\n💰 Minted 100 MTK to Agent 1 and approved escrow.`);

  console.log("\n--- CREATING AGREEMENT ---");
  const txCreate = await acp.connect(initiator).createAgreement(
    1, // initiator
    2, // counterparty
    0, // random arbiter from pool
    amount,
    await token.getAddress(),
    "ipfs://QmIntentHashDemo"
  );
  await txCreate.wait();
  console.log("✅ Agreement created and funds locked in escrow!");

  const agreement = await acp.agreements(0);
  console.log(`📌 Agreement Status: ${agreement.status} (0 = Pending)`);
  console.log(`📌 Assigned Arbiter ID: ${agreement.arbiterAgentId}`);

  console.log("\n--- ACCEPTING AGREEMENT ---");
  await acp.connect(counterparty).acceptAgreement(0);
  console.log("✅ Agent 2 accepted the agreement.");

  console.log("\n--- DISPUTE SIMULATION ---");
  await acp.connect(initiator).disputeAgreement(0);
  console.log("⚠️ Agent 1 raised a dispute! Funds frozen.");

  console.log("\n--- RESOLVING DISPUTE ---");
  const balBefore = await token.balanceOf(counterparty.address);
  console.log(`💰 Agent 2 Balance before resolution: ${ethers.formatEther(balBefore)} MTK`);

  await acp.connect(arbiter).resolveDispute(0, 2); // Resolving in favor of Agent 2
  console.log("⚖️ Arbiter (Agent 3) resolved the dispute in favor of Agent 2.");

  const balAfter = await token.balanceOf(counterparty.address);
  console.log(`💰 Agent 2 Balance after resolution: ${ethers.formatEther(balAfter)} MTK`);
  
  console.log("\n🎉 Demo completed successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

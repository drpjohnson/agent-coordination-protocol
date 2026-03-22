const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AgentCoordination", function () {
  let agentRegistry, token, agentCoordination;
  let owner, addr1, addr2, addr3;

  const INITIATOR_AGENT_ID = 1;
  const COUNTERPARTY_AGENT_ID = 2;
  const ARBITER_AGENT_ID = 3;
  const AMOUNT = ethers.parseEther("100");
  const INTENT_HASH = "ipfs://QmTest123";

  beforeEach(async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();

    // Deploy Mock ERC8004
    const MockERC8004 = await ethers.getContractFactory("MockERC8004");
    agentRegistry = await MockERC8004.deploy();
    await agentRegistry.waitForDeployment();

    // Deploy Mock ERC20
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy();
    await token.waitForDeployment();

    // Deploy AgentCoordination
    const AgentCoordination = await ethers.getContractFactory("AgentCoordination");
    agentCoordination = await AgentCoordination.deploy(await agentRegistry.getAddress());
    await agentCoordination.waitForDeployment();

    // Setup Agent 1 (Initiator) -> owner = addr1
    await agentRegistry.mint(addr1.address, INITIATOR_AGENT_ID);
    await agentRegistry.setAgentWallet(INITIATOR_AGENT_ID, addr1.address);

    // Setup Agent 2 (Counterparty) -> owner = addr2
    await agentRegistry.mint(addr2.address, COUNTERPARTY_AGENT_ID);
    await agentRegistry.setAgentWallet(COUNTERPARTY_AGENT_ID, addr2.address);

    // Setup Agent 3 (Arbiter) -> owner = addr3
    await agentRegistry.mint(addr3.address, ARBITER_AGENT_ID);
    await agentRegistry.setAgentWallet(ARBITER_AGENT_ID, addr3.address);

    // Mint tokens to Initiator's owner (addr1)
    await token.mint(addr1.address, ethers.parseEther("1000"));

    // Approve AgentCoordination contract to spend tokens
    await token.connect(addr1).approve(await agentCoordination.getAddress(), ethers.MaxUint256);
  });

  describe("createAgreement", function () {
    it("Should create a new agreement and hold funds", async function () {
      await expect(
        agentCoordination.connect(addr1).createAgreement(
          INITIATOR_AGENT_ID,
          COUNTERPARTY_AGENT_ID,
          ARBITER_AGENT_ID,
          AMOUNT,
          await token.getAddress(),
          INTENT_HASH
        )
      ).to.emit(agentCoordination, "AgreementCreated")
       .withArgs(0, INITIATOR_AGENT_ID, COUNTERPARTY_AGENT_ID);

      const agreement = await agentCoordination.agreements(0);
      expect(agreement.status).to.equal(0); // Pending

      // Verify contract balance increased
      expect(await token.balanceOf(await agentCoordination.getAddress())).to.equal(AMOUNT);
    });
  });

  describe("Lifecycle", function () {
    beforeEach(async function () {
      await agentCoordination.connect(addr1).createAgreement(
        INITIATOR_AGENT_ID,
        COUNTERPARTY_AGENT_ID,
        ARBITER_AGENT_ID,
        AMOUNT,
        await token.getAddress(),
        INTENT_HASH
      );
    });

    it("Should accept agreement", async function () {
      await expect(agentCoordination.connect(addr2).acceptAgreement(0))
        .to.emit(agentCoordination, "AgreementAccepted")
        .withArgs(0);

      const agreement = await agentCoordination.agreements(0);
      expect(agreement.status).to.equal(1); // Active
    });

    it("Should complete agreement and pay counterparty", async function () {
      await agentCoordination.connect(addr2).acceptAgreement(0);

      await expect(agentCoordination.connect(addr1).completeAgreement(0))
        .to.emit(agentCoordination, "AgreementCompleted")
        .withArgs(0);

      const agreement = await agentCoordination.agreements(0);
      expect(agreement.status).to.equal(2); // Completed

      // Check balance of counterparty wallet
      expect(await token.balanceOf(addr2.address)).to.equal(AMOUNT);
    });

    it("Should dispute and resolve to counterparty", async function () {
      await agentCoordination.connect(addr2).acceptAgreement(0);

      await expect(agentCoordination.connect(addr2).disputeAgreement(0))
        .to.emit(agentCoordination, "AgreementDisputed")
        .withArgs(0);

      // Arbiter resolves in favor of counterparty
      await expect(agentCoordination.connect(addr3).resolveDispute(0, COUNTERPARTY_AGENT_ID))
        .to.emit(agentCoordination, "AgreementResolved")
        .withArgs(0, COUNTERPARTY_AGENT_ID);

      expect(await token.balanceOf(addr2.address)).to.equal(AMOUNT);
    });
  });
});

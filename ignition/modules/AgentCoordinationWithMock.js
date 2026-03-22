const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("AgentCoordinationWithMockModule", (m) => {
  // 1. Deploy the Mock ERC-8004 Registry
  const mockRegistry = m.contract("MockERC8004");

  // 2. Deploy the Mock ERC-20 Token (for testing payouts)
  const mockToken = m.contract("MockERC20");

  // 3. Deploy the Agent Coordination Protocol, passing the Mock Registry address
  const agentCoordination = m.contract("AgentCoordination", [mockRegistry]);

  return { mockRegistry, mockToken, agentCoordination };
});

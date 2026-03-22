const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("AgentCoordinationModule", (m) => {
  // We expect the address of the ERC-8004 Identity Registry to be passed as a parameter during deployment.
  // Example deployment command:
  // npx hardhat ignition deploy ignition/modules/AgentCoordination.js --network base_sepolia --parameters ignition/parameters.json
  const agentRegistry = m.getParameter("agentRegistry");

  const agentCoordination = m.contract("AgentCoordination", [agentRegistry]);

  return { agentCoordination };
});

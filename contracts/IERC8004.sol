// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title IERC8004
 * @dev Interface for the ERC-8004 Trustless Agents standard
 */
interface IERC8004 is IERC721 {
    /**
     * @notice Get the wallet address designated to receive payments for an agent
     * @param agentId The identifier of the agent
     * @return The wallet address for the agent
     */
    function getAgentWallet(uint256 agentId) external view returns (address);
}

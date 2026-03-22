// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./IERC8004.sol";

contract MockERC8004 is ERC721, IERC8004 {
    mapping(uint256 => address) public agentWallets;

    constructor() ERC721("Mock ERC8004", "M8004") {}

    function mint(address to, uint256 tokenId) public {
        _mint(to, tokenId);
    }

    function setAgentWallet(uint256 agentId, address wallet) public {
        agentWallets[agentId] = wallet;
    }

    function getAgentWallet(uint256 agentId) external view override returns (address) {
        return agentWallets[agentId];
    }
}

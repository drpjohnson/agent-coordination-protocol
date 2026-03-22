// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./IERC8004.sol";

/**
 * @title AgentCoordination
 * @dev Facilitates trustless agreements, escrow, and settlements between ERC-8004 agents.
 */
contract AgentCoordination {
    using SafeERC20 for IERC20;

    IERC8004 public immutable agentRegistry;

    struct Agreement {
        uint256 initiatorAgentId;
        uint256 counterpartyAgentId;
        uint256 arbiterAgentId; // 0 means no specific arbiter assigned yet
        uint256 amount;
        address token;
        string intentIpfsHash;
        uint8 status; // 0 = Pending, 1 = Active, 2 = Completed, 3 = Disputed, 4 = Resolved, 5 = Canceled
    }
    
    mapping(uint256 => Agreement) public agreements;
    uint256 public agreementCounter;

    event AgreementCreated(uint256 indexed id, uint256 indexed initiatorAgentId, uint256 indexed counterpartyAgentId);
    event AgreementAccepted(uint256 indexed id);
    event AgreementCompleted(uint256 indexed id);
    event AgreementDisputed(uint256 indexed id);
    event AgreementResolved(uint256 indexed id, uint256 winningAgentId);
    event AgreementCanceled(uint256 indexed id);

    constructor(address _agentRegistry) {
        require(_agentRegistry != address(0), "Invalid registry address");
        agentRegistry = IERC8004(_agentRegistry);
    }
    
    // Check if the caller is the owner of the given agent
    modifier onlyAgentOwner(uint256 _agentId) {
        require(agentRegistry.ownerOf(_agentId) == msg.sender, "Caller is not the agent owner");
        _;
    }

    /**
     * @dev Create a new agreement and escrow funds.
     */
    function createAgreement(
        uint256 _initiatorAgentId, 
        uint256 _counterpartyAgentId, 
        uint256 _arbiterAgentId,
        uint256 _amount, 
        address _token, 
        string memory _intentIpfsHash
    ) external onlyAgentOwner(_initiatorAgentId) returns (uint256) {
        require(_amount > 0, "Amount must be greater than 0");
        
        // Transfer funds from initiator to this contract (Escrow)
        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
        
        uint256 newId = agreementCounter++;
        agreements[newId] = Agreement({
            initiatorAgentId: _initiatorAgentId,
            counterpartyAgentId: _counterpartyAgentId,
            arbiterAgentId: _arbiterAgentId,
            amount: _amount,
            token: _token,
            intentIpfsHash: _intentIpfsHash,
            status: 0 // Pending
        });
        
        emit AgreementCreated(newId, _initiatorAgentId, _counterpartyAgentId);
        return newId;
    }

    /**
     * @dev Counterparty accepts the agreement.
     */
    function acceptAgreement(uint256 _id) external onlyAgentOwner(agreements[_id].counterpartyAgentId) {
        Agreement storage agg = agreements[_id];
        require(agg.status == 0, "Agreement not pending");
        
        agg.status = 1; // Active
        emit AgreementAccepted(_id);
    }

    /**
     * @dev Initiator confirms the work is done and releases funds to counterparty.
     */
    function completeAgreement(uint256 _id) external onlyAgentOwner(agreements[_id].initiatorAgentId) {
        Agreement storage agg = agreements[_id];
        require(agg.status == 1, "Agreement not active");
        
        agg.status = 2; // Completed
        
        // Fetch the registered wallet for the counterparty agent
        address counterpartyWallet = agentRegistry.getAgentWallet(agg.counterpartyAgentId);
        require(counterpartyWallet != address(0), "Counterparty wallet not set");

        IERC20(agg.token).safeTransfer(counterpartyWallet, agg.amount);
        
        emit AgreementCompleted(_id);
    }

    /**
     * @dev Either party can raise a dispute, halting funds and calling the arbiter.
     */
    function disputeAgreement(uint256 _id) external {
        Agreement storage agg = agreements[_id];
        require(agg.status == 1, "Agreement not active");
        
        address initiatorOwner = agentRegistry.ownerOf(agg.initiatorAgentId);
        address counterpartyOwner = agentRegistry.ownerOf(agg.counterpartyAgentId);
        require(msg.sender == initiatorOwner || msg.sender == counterpartyOwner, "Not a party to the agreement");
        
        agg.status = 3; // Disputed
        emit AgreementDisputed(_id);
    }

    /**
     * @dev The designated arbiter resolves the dispute and routes funds.
     */
    function resolveDispute(uint256 _id, uint256 _winningAgentId) external onlyAgentOwner(agreements[_id].arbiterAgentId) {
        Agreement storage agg = agreements[_id];
        require(agg.status == 3, "Agreement not disputed");
        require(agg.arbiterAgentId != 0, "No arbiter assigned");
        require(_winningAgentId == agg.initiatorAgentId || _winningAgentId == agg.counterpartyAgentId, "Invalid winner");
        
        agg.status = 4; // Resolved
        
        // Fetch the registered wallet for the winning agent
        address winnerWallet = agentRegistry.getAgentWallet(_winningAgentId);
        require(winnerWallet != address(0), "Winner wallet not set");

        IERC20(agg.token).safeTransfer(winnerWallet, agg.amount);
        
        emit AgreementResolved(_id, _winningAgentId);
    }

    /**
     * @dev Initiator can cancel the agreement if it hasn't been accepted yet.
     */
    function cancelAgreement(uint256 _id) external onlyAgentOwner(agreements[_id].initiatorAgentId) {
        Agreement storage agg = agreements[_id];
        require(agg.status == 0, "Agreement cannot be canceled");

        agg.status = 5; // Canceled

        // Refund the initiator
        IERC20(agg.token).safeTransfer(msg.sender, agg.amount);

        emit AgreementCanceled(_id);
    }
}
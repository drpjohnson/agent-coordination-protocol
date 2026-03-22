// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./IERC8004.sol";

/**
 * @title AgentCoordination
 * @dev Trustless agreements, escrow, and settlements with Arbiter Pools & EIP-712 support for ERC-8004 agents.
 */
contract AgentCoordination is EIP712 {
    using SafeERC20 for IERC20;

    IERC8004 public immutable agentRegistry;

    struct Agreement {
        uint256 initiatorAgentId;
        uint256 counterpartyAgentId;
        uint256 arbiterAgentId; // 0 means randomly assigned from pool
        uint256 amount;
        address token;
        string intentIpfsHash;
        uint8 status; // 0=Pending, 1=Active, 2=Completed, 3=Disputed, 4=Resolved, 5=Canceled
    }
    
    mapping(uint256 => Agreement) public agreements;
    uint256 public agreementCounter;

    // Arbiter Pool
    uint256[] public registeredArbiters;
    mapping(uint256 => bool) public isArbiter;

    // EIP-712 TypeHash
    bytes32 private constant INTENT_TYPEHASH = keccak256("Intent(uint256 initiatorAgentId,uint256 counterpartyAgentId,uint256 amount,address token,string intentIpfsHash)");

    event AgreementCreated(uint256 indexed id, uint256 indexed initiatorAgentId, uint256 indexed counterpartyAgentId, uint256 arbiterAgentId);
    event AgreementAccepted(uint256 indexed id);
    event AgreementCompleted(uint256 indexed id);
    event AgreementDisputed(uint256 indexed id);
    event AgreementResolved(uint256 indexed id, uint256 winningAgentId);
    event AgreementCanceled(uint256 indexed id);
    event ArbiterRegistered(uint256 indexed arbiterAgentId);

    constructor(address _agentRegistry) EIP712("AgentCoordination", "1") {
        require(_agentRegistry != address(0), "Invalid registry address");
        agentRegistry = IERC8004(_agentRegistry);
    }
    
    modifier onlyAgentOwner(uint256 _agentId) {
        require(agentRegistry.ownerOf(_agentId) == msg.sender, "Caller is not the agent owner");
        _;
    }

    /**
     * @dev Register an agent into the public arbiter pool
     */
    function registerAsArbiter(uint256 _agentId) external onlyAgentOwner(_agentId) {
        require(!isArbiter[_agentId], "Already registered");
        isArbiter[_agentId] = true;
        registeredArbiters.push(_agentId);
        emit ArbiterRegistered(_agentId);
    }

    /**
     * @dev Get total arbiters
     */
    function getArbiterCount() external view returns (uint256) {
        return registeredArbiters.length;
    }

    /**
     * @dev Create agreement with EIP-712 signature verification
     */
    function createAgreementWithSignature(
        uint256 _initiatorAgentId, 
        uint256 _counterpartyAgentId, 
        uint256 _amount, 
        address _token, 
        string memory _intentIpfsHash,
        bytes memory _signature
    ) external returns (uint256) {
        require(_amount > 0, "Amount must be greater than 0");

        // Verify EIP-712 signature from initiator
        bytes32 structHash = keccak256(abi.encode(INTENT_TYPEHASH, _initiatorAgentId, _counterpartyAgentId, _amount, _token, keccak256(bytes(_intentIpfsHash))));
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, _signature);
        require(agentRegistry.ownerOf(_initiatorAgentId) == signer, "Invalid signature or not owner");

        // Transfer funds from msg.sender (can be relay/counterparty) to this contract
        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);

        // Assign arbiter from pool pseudo-randomly
        uint256 arbiterId = 0;
        if (registeredArbiters.length > 0) {
            uint256 randIndex = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, agreementCounter))) % registeredArbiters.length;
            arbiterId = registeredArbiters[randIndex];
        }

        uint256 newId = agreementCounter++;
        agreements[newId] = Agreement({
            initiatorAgentId: _initiatorAgentId,
            counterpartyAgentId: _counterpartyAgentId,
            arbiterAgentId: arbiterId,
            amount: _amount,
            token: _token,
            intentIpfsHash: _intentIpfsHash,
            status: 0 // Pending
        });
        
        emit AgreementCreated(newId, _initiatorAgentId, _counterpartyAgentId, arbiterId);
        return newId;
    }

    /**
     * @dev Standard create agreement (no off-chain signature, directly via TX)
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
        
        uint256 assignedArbiter = _arbiterAgentId;
        if (assignedArbiter == 0 && registeredArbiters.length > 0) {
            uint256 randIndex = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, agreementCounter))) % registeredArbiters.length;
            assignedArbiter = registeredArbiters[randIndex];
        }

        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
        
        uint256 newId = agreementCounter++;
        agreements[newId] = Agreement({
            initiatorAgentId: _initiatorAgentId,
            counterpartyAgentId: _counterpartyAgentId,
            arbiterAgentId: assignedArbiter,
            amount: _amount,
            token: _token,
            intentIpfsHash: _intentIpfsHash,
            status: 0 // Pending
        });
        
        emit AgreementCreated(newId, _initiatorAgentId, _counterpartyAgentId, assignedArbiter);
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
        IERC20(agg.token).safeTransfer(msg.sender, agg.amount);
        emit AgreementCanceled(_id);
    }
}
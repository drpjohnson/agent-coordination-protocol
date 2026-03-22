const { ethers } = require("ethers");

/**
 * Agent Coordination Protocol (ACP) SDK
 * A JavaScript wrapper for interacting with the AgentCoordination smart contract.
 */
class ACPClient {
  /**
   * @param {ethers.Signer} signer - The ethers.js signer (wallet)
   * @param {string} contractAddress - Address of the deployed AgentCoordination contract
   * @param {Array} abi - The ABI of the AgentCoordination contract
   */
  constructor(signer, contractAddress, abi) {
    this.signer = signer;
    this.contract = new ethers.Contract(contractAddress, abi, signer);
  }

  /**
   * Create a new agreement and escrow funds.
   * @param {number} initiatorAgentId - ERC-8004 ID of the initiator
   * @param {number} counterpartyAgentId - ERC-8004 ID of the counterparty
   * @param {number} arbiterAgentId - ERC-8004 ID of the arbiter (0 for pool random selection if implemented)
   * @param {bigint} amount - The amount of tokens to escrow
   * @param {string} tokenAddress - The ERC-20 token address
   * @param {string} intentIpfsHash - IPFS hash of the formalized intent/agreement
   */
  async createAgreement(initiatorAgentId, counterpartyAgentId, arbiterAgentId, amount, tokenAddress, intentIpfsHash) {
    // Requires that the signer has already approved the ERC20 token for the contract
    const tx = await this.contract.createAgreement(
      initiatorAgentId,
      counterpartyAgentId,
      arbiterAgentId,
      amount,
      tokenAddress,
      intentIpfsHash
    );
    return await tx.wait();
  }

  /**
   * Counterparty accepts the pending agreement.
   * @param {number} agreementId - The ID of the agreement
   */
  async acceptAgreement(agreementId) {
    const tx = await this.contract.acceptAgreement(agreementId);
    return await tx.wait();
  }

  /**
   * Initiator confirms completion and releases escrow to counterparty.
   * @param {number} agreementId - The ID of the agreement
   */
  async completeAgreement(agreementId) {
    const tx = await this.contract.completeAgreement(agreementId);
    return await tx.wait();
  }

  /**
   * Either party triggers a dispute.
   * @param {number} agreementId - The ID of the agreement
   */
  async disputeAgreement(agreementId) {
    const tx = await this.contract.disputeAgreement(agreementId);
    return await tx.wait();
  }

  /**
   * Arbiter resolves the dispute.
   * @param {number} agreementId - The ID of the agreement
   * @param {number} winningAgentId - The ERC-8004 ID of the winning agent
   */
  async resolveDispute(agreementId, winningAgentId) {
    const tx = await this.contract.resolveDispute(agreementId, winningAgentId);
    return await tx.wait();
  }

  /**
   * Fetch details of an agreement.
   * @param {number} agreementId - The ID of the agreement
   */
  async getAgreement(agreementId) {
    return await this.contract.agreements(agreementId);
  }
}

module.exports = { ACPClient };

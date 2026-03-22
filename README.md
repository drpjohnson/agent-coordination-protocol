# Agent Coordination Protocol (ACP)

An on-chain protocol for independent AI agents to negotiate, coordinate, and settle complex economic transactions with one another without human intervention, building upon the ERC-8004 identity standard.

## Features

- **ERC-8004 Integration:** Uses agent identity primitives for reputation and verification.
- **Trustless Escrow:** Smart contract mechanisms to encode agent agreements safely.
- **On-chain Arbiter Pools:** Independent agents can register as arbiters. The protocol randomly selects an arbiter for each agreement if none is explicitly provided.
- **EIP-712 Support:** Agents can negotiate off-chain, and only one needs to pay gas to deploy the agreement by submitting the counterparty's signature.

## Architecture

```mermaid
sequenceDiagram
    participant A as Agent 1 (Initiator)
    participant C as Smart Contract (Escrow)
    participant B as Agent 2 (Counterparty)
    participant Arb as Arbiter Agent

    A->>C: createAgreement(Agent2, amount, intentHash)
    Note over A,C: Funds locked in contract
    C-->>B: Event: AgreementCreated
    B->>C: acceptAgreement()
    Note over B: Agent 2 works on the task...
    
    alt Happy Path
        A->>C: completeAgreement()
        C-->>B: Transfers funds to Agent 2
    else Dispute
        A->>C: disputeAgreement()
        Note over C: Status changed to Disputed
        Arb->>C: resolveDispute(winningAgent)
        C-->>Arb: Transfers funds to winner
    end
```

## Local Demo

You can run the full lifecycle simulation locally using Hardhat.

```bash
npx hardhat run demo.js
```

**Output:**
```
🚀 Starting Agent Coordination Protocol Demo...

📦 Deploying MockERC8004 Registry...
📦 Deploying MockERC20 Token...
📦 Deploying AgentCoordination Contract...

--- SETUP IDENTITIES ---
🤖 Agent 1 (Initiator) registered.
🤖 Agent 2 (Counterparty) registered.
⚖️ Agent 3 (Arbiter) registered.
⚖️ Agent 3 joined the Arbiter Pool.

💰 Minted 100 MTK to Agent 1 and approved escrow.

--- CREATING AGREEMENT ---
✅ Agreement created and funds locked in escrow!
📌 Agreement Status: 0 (0 = Pending)
📌 Assigned Arbiter ID: 3

--- ACCEPTING AGREEMENT ---
✅ Agent 2 accepted the agreement.

--- DISPUTE SIMULATION ---
⚠️ Agent 1 raised a dispute! Funds frozen.

--- RESOLVING DISPUTE ---
💰 Agent 2 Balance before resolution: 0.0 MTK
⚖️ Arbiter (Agent 3) resolved the dispute in favor of Agent 2.
💰 Agent 2 Balance after resolution: 100.0 MTK

🎉 Demo completed successfully!
```

---
*Built for The Synthesis Hackathon*
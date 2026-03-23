import { useState, useEffect } from 'react';
import { createPublicClient, http, getContract } from 'viem';
import { baseSepolia } from 'viem/chains';

const ACP_ADDRESS = "0x8c788099a903342FD3f930cBb380Bad336444E70";

const ABI = [
  {
    "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "name": "agreements",
    "outputs": [
      { "internalType": "uint256", "name": "initiatorAgentId", "type": "uint256" },
      { "internalType": "uint256", "name": "counterpartyAgentId", "type": "uint256" },
      { "internalType": "uint256", "name": "arbiterAgentId", "type": "uint256" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "address", "name": "token", "type": "address" },
      { "internalType": "string", "name": "intentIpfsHash", "type": "string" },
      { "internalType": "uint8", "name": "status", "type": "uint8" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "agreementCounter",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

const STATUS_MAP = ["Pending", "Active", "Completed", "Disputed", "Resolved", "Canceled"];

export default function Home() {
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const client = createPublicClient({
          chain: baseSepolia,
          transport: http("https://sepolia.base.org")
        });

        const contract = getContract({
          address: ACP_ADDRESS,
          abi: ABI,
          client
        });

        const counter = await contract.read.agreementCounter();
        const numAgreements = Number(counter);
        
        const fetchedAgreements = [];
        for (let i = 0; i < numAgreements; i++) {
          const agg = await contract.read.agreements([BigInt(i)]);
          fetchedAgreements.push({
            id: i,
            initiator: Number(agg[0]),
            counterparty: Number(agg[1]),
            arbiter: Number(agg[2]),
            amount: (Number(agg[3]) / 1e18).toFixed(2), // Assuming 18 decimals for mock token
            token: agg[4],
            intent: agg[5],
            status: STATUS_MAP[agg[6]]
          });
        }
        
        setAgreements(fetchedAgreements.reverse()); // Show newest first
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: '800px', margin: '0 auto', padding: '2rem', color: '#fff', backgroundColor: '#111', minHeight: '100vh' }}>
      <h1 style={{ borderBottom: '2px solid #333', paddingBottom: '1rem' }}>🤖 Agent Coordination Protocol Explorer</h1>
      <p style={{ color: '#aaa' }}>Live view of autonomous agent agreements on Base Sepolia.</p>
      
      <div style={{ background: '#222', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><strong>Contract Address:</strong> <code>{ACP_ADDRESS}</code></div>
        <a href={`https://sepolia.basescan.org/address/${ACP_ADDRESS}`} target="_blank" style={{ color: '#4ade80' }}>View on Basescan ↗</a>
      </div>

      {loading ? (
        <p>Loading on-chain data...</p>
      ) : agreements.length === 0 ? (
        <p>No agreements found yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {agreements.map((agg) => (
            <div key={agg.id} style={{ border: '1px solid #333', padding: '1.5rem', borderRadius: '8px', background: '#1a1a1a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>Agreement #{agg.id}</h3>
                <span style={{ 
                  background: agg.status === 'Completed' || agg.status === 'Resolved' ? '#064e3b' : agg.status === 'Disputed' ? '#7f1d1d' : '#422006',
                  color: agg.status === 'Completed' || agg.status === 'Resolved' ? '#34d399' : agg.status === 'Disputed' ? '#f87171' : '#fbbf24',
                  padding: '0.25rem 0.75rem', 
                  borderRadius: '999px', 
                  fontSize: '0.875rem',
                  fontWeight: 'bold'
                }}>
                  {agg.status}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem', color: '#ccc' }}>
                <div><strong>Initiator (ERC-8004 ID):</strong> {agg.initiator}</div>
                <div><strong>Counterparty (ERC-8004 ID):</strong> {agg.counterparty}</div>
                <div><strong>Arbiter (ERC-8004 ID):</strong> {agg.arbiter === 0 ? "Random Pool" : agg.arbiter}</div>
                <div><strong>Escrow Amount:</strong> {agg.amount} Tokens</div>
                <div style={{ gridColumn: '1 / -1' }}><strong>Intent Hash:</strong> <code style={{ background: '#000', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>{agg.intent}</code></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

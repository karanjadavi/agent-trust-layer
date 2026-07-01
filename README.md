\# AgentTrust — Verifiable Credentials for AI Agents



\*\*On-chain trust layer for autonomous AI agents, built on Stellar/Soroban.\*\*



Submitted to \[UK AI Agent Hackathon EP5 × Conduct](https://dorahacks.io/hackathon/2272) (DoraHacks) — \[BUIDL page](https://dorahacks.io/buidl/46244)



\## The Problem



AI agents are starting to act and transact on each other's behalf — paying for data, delegating tasks, executing on-chain actions. But there's no neutral way for one agent (or a human) to know whether another agent is trustworthy, without either blindly trusting it or exposing private details that justify that trust (which model it runs, what data it was checked against, etc).



\## The Solution



AgentTrust is a Soroban smart contract that lets an authorized \*\*verifier\*\* attest, on-chain, that a given \*\*agent\*\* holds a specific capability or has passed a safety check — backed by a ZK proof hash, never the underlying private data.



Any other agent or contract can then call `has\_credential(agent, capability)` before trusting or transacting with it, and get a real, on-chain-verified answer — no blind trust required.



This builds on our earlier work with \[StellarProof](https://dorahacks.io/buidl/46002), a ZK-powered KYC verification system on Stellar, applying the same "verify off-chain, attest on-chain" pattern to the emerging problem of agent-to-agent trust.



\## How It Works



1\. \*\*Admin\*\* initializes the contract and authorizes trusted \*\*verifiers\*\* (e.g. off-chain ZK proof-checking services).

2\. A \*\*verifier\*\* checks an agent's proof off-chain (e.g. "this agent's policy passed safety check X") and calls `issue\_credential`, storing only a commitment (proof hash) on-chain — never the private inputs.

3\. Any agent, contract, or dApp can call `has\_credential(agent, capability)` before trusting/transacting with that agent.

4\. Credentials \*\*expire automatically\*\* and can be \*\*revoked\*\* early by the issuer or admin if an agent is later found to misbehave.



\## Contract Functions



| Function | Description |

|---|---|

| `initialize(admin)` | One-time setup, sets contract admin |

| `register\_verifier(verifier)` | Admin-only: authorizes an address to issue credentials |

| `issue\_credential(verifier, agent, capability, proof\_hash, validity\_seconds)` | Verifier issues a credential to an agent |

| `revoke\_credential(caller, agent, capability)` | Admin or original issuer revokes a credential early |

| `has\_credential(agent, capability)` | Read-only check — returns `true`/`false` |

| `get\_credential(agent, capability)` | Full credential lookup (issuer, proof hash, timestamps) |



\## Verified: Live on Stellar Testnet



This isn't just code that compiles — it's deployed and proven end-to-end with real transactions.



\- \*\*Contract ID:\*\* `CDDWCPMK53VWWDGQ7O3HLXFOQOFTQOTRGJMPCUEBGBUBX2QA365OH2JU`

\- \*\*Explorer:\*\* https://lab.stellar.org/r/testnet/contract/CDDWCPMK53VWWDGQ7O3HLXFOQOFTQOTRGJMPCUEBGBUBX2QA365OH2JU

\- Full deployment record with transaction hashes: \[`DEPLOYMENT.md`](./DEPLOYMENT.md)



Verified flow:

1\. ✅ Contract initialized with admin

2\. ✅ Verifier registered on-chain (event confirmed)

3\. ✅ Credential issued to a test agent (event confirmed)

4\. ✅ `has\_credential()` independently confirmed `true` for the credentialed agent



\## Tests



5/5 unit tests passing, covering:

\- Issuing and checking a valid credential

\- Rejecting unauthorized verifiers

\- Revocation

\- Expiry

\- Missing-credential handling (safe `false`, no panics)



```bash

cargo test --manifest-path contracts/agent-credential/Cargo.toml

```



\## Tech Stack



Rust · Soroban SDK · Stellar Testnet · Stellar CLI



\## Project Structure


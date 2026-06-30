//! Agent Credential Contract
//!
//! A trust layer for autonomous AI agents on Stellar/Soroban.
//!
//! Problem: as AI agents start acting and transacting with each other
//! (paying for data, delegating tasks, executing on-chain actions),
//! there is no neutral, verifiable way for one agent (or a human) to know
//! whether another agent is allowed to perform a given action, *without*
//! revealing the private details that justify that authorization
//! (which model it runs, what data it was checked against, etc).
//!
//! This contract lets an authorized verifier attest, on-chain, that a given
//! agent holds a specific capability/credential — backed by a ZK proof whose
//! hash is recorded here (the proof itself is verified off-chain by the
//! verifier service, mirroring the StellarProof flow). Any other contract or
//! agent can then check `has_credential` before trusting/transacting with it,
//! without ever seeing the private inputs behind the proof.

#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, BytesN, Env,
    Symbol,
};

#[derive(Clone)]
#[contracttype]
pub struct Credential {
    pub agent: Address,
    pub capability: Symbol,
    pub issuer: Address,
    pub proof_hash: BytesN<32>,
    pub issued_at: u64,
    pub expires_at: u64,
    pub revoked: bool,
}

#[derive(Clone)]
#[contracttype]
enum DataKey {
    Admin,
    Verifier(Address),
    Credential(Address, Symbol),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    NotAdmin = 3,
    NotAuthorizedVerifier = 4,
    CredentialNotFound = 5,
    CredentialExpired = 6,
    CredentialRevoked = 7,
    InvalidExpiry = 8,
}

// Events are published directly via `env.events().publish(...)` below,
// using simple topic tuples — this SDK version doesn't have the newer
// `#[contractevent]` macro, so we use the standard lower-level API.

#[contract]
pub struct AgentCredentialContract;

#[contractimpl]
impl AgentCredentialContract {
    /// One-time setup. `admin` controls which verifier services are trusted.
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        Ok(())
    }

    /// Admin-only: authorize an address (typically an off-chain ZK verifier
    /// relayer/service) to issue credentials on this contract's behalf.
    pub fn register_verifier(env: Env, verifier: Address) -> Result<(), Error> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();

        env.storage()
            .persistent()
            .set(&DataKey::Verifier(verifier.clone()), &true);

        env.events()
            .publish((symbol_short!("v_reg"), verifier.clone()), true);
        Ok(())
    }

    /// Called by an authorized verifier after it has checked a ZK proof
    /// off-chain (e.g. "this agent's policy/model passed safety check X").
    /// Only `proof_hash` — a commitment to that proof — is stored on-chain,
    /// never the underlying private inputs.
    pub fn issue_credential(
        env: Env,
        verifier: Address,
        agent: Address,
        capability: Symbol,
        proof_hash: BytesN<32>,
        validity_seconds: u64,
    ) -> Result<(), Error> {
        verifier.require_auth();

        let is_verifier: bool = env
            .storage()
            .persistent()
            .get(&DataKey::Verifier(verifier.clone()))
            .unwrap_or(false);
        if !is_verifier {
            return Err(Error::NotAuthorizedVerifier);
        }
        if validity_seconds == 0 {
            return Err(Error::InvalidExpiry);
        }

        let now = env.ledger().timestamp();
        let expires_at = now + validity_seconds;

        let credential = Credential {
            agent: agent.clone(),
            capability: capability.clone(),
            issuer: verifier.clone(),
            proof_hash,
            issued_at: now,
            expires_at,
            revoked: false,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Credential(agent.clone(), capability.clone()), &credential);

        env.events().publish(
            (symbol_short!("cred_iss"), agent, capability),
            (verifier, expires_at),
        );

        Ok(())
    }

    /// Admin or original issuer can revoke a credential early (e.g. the
    /// agent was later found to misbehave).
    pub fn revoke_credential(
        env: Env,
        caller: Address,
        agent: Address,
        capability: Symbol,
    ) -> Result<(), Error> {
        caller.require_auth();

        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;

        let key = DataKey::Credential(agent.clone(), capability.clone());
        let mut credential: Credential = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::CredentialNotFound)?;

        if caller != admin && caller != credential.issuer {
            return Err(Error::NotAdmin);
        }

        credential.revoked = true;
        env.storage().persistent().set(&key, &credential);

        env.events().publish(
            (symbol_short!("cred_rev"), agent, capability),
            caller,
        );

        Ok(())
    }

    /// Read-only check any contract or off-chain agent can call before
    /// trusting/transacting with `agent`. Returns true only if a credential
    /// exists, is not revoked, and has not expired.
    pub fn has_credential(env: Env, agent: Address, capability: Symbol) -> bool {
        let key = DataKey::Credential(agent, capability);
        match env.storage().persistent().get::<DataKey, Credential>(&key) {
            Some(c) => !c.revoked && c.expires_at > env.ledger().timestamp(),
            None => false,
        }
    }

    /// Full credential lookup (for UIs / explorers / other agents that want
    /// the issuer, proof hash, and timestamps, not just a boolean).
    pub fn get_credential(
        env: Env,
        agent: Address,
        capability: Symbol,
    ) -> Result<Credential, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Credential(agent, capability))
            .ok_or(Error::CredentialNotFound)
    }
}

mod test;
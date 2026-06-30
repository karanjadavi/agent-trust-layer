#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    Env,
};

fn setup(env: &Env) -> (Address, AgentCredentialContractClient) {
    let admin = Address::generate(env);
    let contract_id = env.register_contract(None, AgentCredentialContract);
    let client = AgentCredentialContractClient::new(env, &contract_id);
    client.initialize(&admin);
    (admin, client)
}

#[test]
fn test_issue_and_check_credential() {
    let env = Env::default();
    env.mock_all_auths();

    let (admin, client) = setup(&env);
    let verifier = Address::generate(&env);
    let agent = Address::generate(&env);

    client.register_verifier(&verifier);

    let capability = Symbol::new(&env, "safety_checked");
    let proof_hash = BytesN::from_array(&env, &[1u8; 32]);

    client.issue_credential(&verifier, &agent, &capability, &proof_hash, &3600);

    assert!(client.has_credential(&agent, &capability));

    let cred = client.get_credential(&agent, &capability);
    assert_eq!(cred.agent, agent);
    assert_eq!(cred.issuer, verifier);
    assert!(!cred.revoked);

    let _ = admin; // admin used only for setup/initialize in this test
}

#[test]
fn test_unauthorized_verifier_cannot_issue() {
    let env = Env::default();
    env.mock_all_auths();

    let (_admin, client) = setup(&env);
    let random_caller = Address::generate(&env);
    let agent = Address::generate(&env);
    let capability = Symbol::new(&env, "safety_checked");
    let proof_hash = BytesN::from_array(&env, &[2u8; 32]);

    let result = client.try_issue_credential(&random_caller, &agent, &capability, &proof_hash, &3600);
    assert!(result.is_err());
}

#[test]
fn test_revoke_credential() {
    let env = Env::default();
    env.mock_all_auths();

    let (admin, client) = setup(&env);
    let verifier = Address::generate(&env);
    let agent = Address::generate(&env);
    let capability = Symbol::new(&env, "payment_authorized");
    let proof_hash = BytesN::from_array(&env, &[3u8; 32]);

    client.register_verifier(&verifier);
    client.issue_credential(&verifier, &agent, &capability, &proof_hash, &3600);
    assert!(client.has_credential(&agent, &capability));

    client.revoke_credential(&admin, &agent, &capability);
    assert!(!client.has_credential(&agent, &capability));
}

#[test]
fn test_credential_expires() {
    let env = Env::default();
    env.mock_all_auths();

    let (_admin, client) = setup(&env);
    let verifier = Address::generate(&env);
    let agent = Address::generate(&env);
    let capability = Symbol::new(&env, "task_delegate");
    let proof_hash = BytesN::from_array(&env, &[4u8; 32]);

    client.register_verifier(&verifier);
    client.issue_credential(&verifier, &agent, &capability, &proof_hash, &100);

    assert!(client.has_credential(&agent, &capability));

    env.ledger().with_mut(|l| l.timestamp += 200);

    assert!(!client.has_credential(&agent, &capability));
}

#[test]
fn test_missing_credential_returns_false() {
    let env = Env::default();
    env.mock_all_auths();

    let (_admin, client) = setup(&env);
    let agent = Address::generate(&env);
    let capability = Symbol::new(&env, "never_issued");

    assert!(!client.has_credential(&agent, &capability));
}
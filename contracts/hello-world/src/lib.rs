#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Env, Address, Vec, Symbol};

#[contracttype]
pub enum DataKey {
    Owners,
    Threshold,
}

#[contract]
pub struct MultiSigWallet;

#[contractimpl]
impl MultiSigWallet {
    // Initialize wallet with owners and required signatures
    pub fn init(env: Env, owners: Vec<Address>, threshold: u32) {
        if env.storage().has(&DataKey::Owners) {
            panic!("Already initialized");
        }

        if threshold == 0 || threshold > owners.len() as u32 {
            panic!("Invalid threshold");
        }

        env.storage().set(&DataKey::Owners, &owners);
        env.storage().set(&DataKey::Threshold, &threshold);
    }

    // Verify if enough valid signatures are provided
    pub fn execute(
        env: Env,
        signers: Vec<Address>,
        action: Symbol,
    ) {
        let owners: Vec<Address> = env.storage().get_unchecked(&DataKey::Owners).unwrap();
        let threshold: u32 = env.storage().get_unchecked(&DataKey::Threshold).unwrap();

        let mut valid_count = 0;

        for signer in signers.iter() {
            if owners.contains(signer) {
                signer.require_auth();
                valid_count += 1;
            }
        }

        if valid_count < threshold {
            panic!("Not enough valid signatures");
        }

        // Placeholder for actual execution logic
        env.log().publish(("Action executed:", action));
    }

    // Get wallet details
    pub fn get_config(env: Env) -> (Vec<Address>, u32) {
        let owners: Vec<Address> = env.storage().get_unchecked(&DataKey::Owners).unwrap();
        let threshold: u32 = env.storage().get_unchecked(&DataKey::Threshold).unwrap();
        (owners, threshold)
    }
}
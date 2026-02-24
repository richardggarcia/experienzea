use soroban_sdk::{Address, Env};

use crate::errors::ContractError;
use crate::types::DataKey;

pub fn is_initialized(env: &Env) -> bool {
    env.storage().instance().has(&DataKey::Admin)
}

pub fn set_admin(env: &Env, admin: &Address) {
    env.storage().instance().set(&DataKey::Admin, admin);
}

pub fn get_admin(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&DataKey::Admin)
        .unwrap_or_else(|| env.panic_with_error(ContractError::NotInitialized))
}

pub fn require_admin_auth(env: &Env) {
    let admin = get_admin(env);
    admin.require_auth();
}

pub fn set_token_count(env: &Env, count: u64) {
    env.storage().instance().set(&DataKey::TokenCount, &count);
}

pub fn get_token_count(env: &Env) -> u64 {
    env.storage().instance().get(&DataKey::TokenCount).unwrap_or(0)
}

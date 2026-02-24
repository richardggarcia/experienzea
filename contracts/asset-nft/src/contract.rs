use soroban_sdk::{contract, contractimpl, Address, Env, String};

use crate::errors::ContractError;
use crate::events::publish_mint;
use crate::storage::{
    get_admin, get_token_count, is_initialized, require_admin_auth, set_admin, set_token_count,
};
use crate::types::{AssetNFT, DataKey};

#[contract]
pub struct AssetNFTContract;

#[contractimpl]
impl AssetNFTContract {
    pub fn initialize(env: Env, admin: Address) {
        if is_initialized(&env) {
            env.panic_with_error(ContractError::AlreadyInitialized);
        }

        admin.require_auth();
        set_admin(&env, &admin);
        set_token_count(&env, 0);
    }

    pub fn mint(
        env: Env,
        to: Address,
        asset_id: String,
        asset_type: String,
        value: u64,
        metadata_uri: String,
    ) -> u64 {
        require_admin_auth(&env);

        let token_id = get_token_count(&env) + 1;
        let nft = AssetNFT {
            owner: to.clone(),
            asset_id: asset_id.clone(),
            asset_type,
            value,
            metadata_uri,
        };

        env.storage().persistent().set(&DataKey::Token(token_id), &nft);
        env.storage()
            .persistent()
            .set(&DataKey::AssetToToken(asset_id), &token_id);

        let owner_count: u64 = env
            .storage()
            .persistent()
            .get(&DataKey::OwnerTokenCount(to.clone()))
            .unwrap_or(0);
        env.storage()
            .persistent()
            .set(&DataKey::OwnerTokenCount(to.clone()), &(owner_count + 1));

        set_token_count(&env, token_id);
        publish_mint(&env, token_id, to);

        token_id
    }

    pub fn owner_of(env: Env, token_id: u64) -> Option<Address> {
        let nft: Option<AssetNFT> = env.storage().persistent().get(&DataKey::Token(token_id));
        nft.map(|n| n.owner)
    }

    pub fn balance_of(env: Env, owner: Address) -> u64 {
        env.storage()
            .persistent()
            .get(&DataKey::OwnerTokenCount(owner))
            .unwrap_or(0)
    }

    pub fn get_nft(env: Env, token_id: u64) -> Option<AssetNFT> {
        env.storage().persistent().get(&DataKey::Token(token_id))
    }

    pub fn get_asset_id(env: Env, token_id: u64) -> Option<String> {
        let nft: Option<AssetNFT> = env.storage().persistent().get(&DataKey::Token(token_id));
        nft.map(|n| n.asset_id)
    }

    pub fn get_token_id_by_asset_id(env: Env, asset_id: String) -> Option<u64> {
        env.storage().persistent().get(&DataKey::AssetToToken(asset_id))
    }

    pub fn total_supply(env: Env) -> u64 {
        get_token_count(&env)
    }

    pub fn get_admin(env: Env) -> Address {
        get_admin(&env)
    }
}

#![cfg(test)]

use crate::contract::{AssetNFTContract, AssetNFTContractClient};
use soroban_sdk::{testutils::Address as _, Address, Env, String};

#[test]
fn test_mint() {
    let env = Env::default();
    let contract_id = env.register_contract(None, AssetNFTContract);
    let client = AssetNFTContractClient::new(&env, &contract_id);

    // Crear direcciones de prueba
    let admin = Address::generate(&env);
    let borrower = Address::generate(&env);

    // Inicializar
    env.mock_all_auths();
    client.initialize(&admin);

    // Mintear un NFT
    env.mock_all_auths();
    let asset_id = String::from_str(&env, "asset-123");
    let asset_type = String::from_str(&env, "tractor");
    let metadata = String::from_str(&env, "https://ipfs.io/ipfs/Qm...");
    
    let token_id = client.mint(
        &borrower,
        &asset_id,
        &asset_type,
        &50000u64,
        &metadata,
    );

    // Verificar que se creó correctamente
    assert_eq!(token_id, 1);
    
    // Verificar dueño
    let owner = client.owner_of(&token_id);
    assert_eq!(owner, Some(borrower.clone()));
    
    // Verificar balance
    let balance = client.balance_of(&borrower);
    assert_eq!(balance, 1);
    
    // Verificar asset_id
    let stored_asset_id = client.get_asset_id(&token_id);
    assert_eq!(stored_asset_id, Some(asset_id));
    let looked_up_token = client.get_token_id_by_asset_id(&String::from_str(&env, "asset-123"));
    assert_eq!(looked_up_token, Some(token_id));
    
    // Verificar total supply
    assert_eq!(client.total_supply(), 1);
}

#[test]
fn test_get_nft() {
    let env = Env::default();
    let contract_id = env.register_contract(None, AssetNFTContract);
    let client = AssetNFTContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let borrower = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    env.mock_all_auths();
    let token_id = client.mint(
        &borrower,
        &String::from_str(&env, "asset-456"),
        &String::from_str(&env, "car"),
        &25000u64,
        &String::from_str(&env, "https://ipfs.io/ipfs/xyz"),
    );

    let nft = client.get_nft(&token_id).unwrap();
    assert_eq!(nft.owner, borrower);
    assert_eq!(nft.value, 25000u64);
    assert_eq!(nft.asset_type, String::from_str(&env, "car"));
    let looked_up_token = client.get_token_id_by_asset_id(&String::from_str(&env, "asset-456"));
    assert_eq!(looked_up_token, Some(token_id));
}

#[test]
fn test_multiple_mints() {
    let env = Env::default();
    let contract_id = env.register_contract(None, AssetNFTContract);
    let client = AssetNFTContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let borrower1 = Address::generate(&env);
    let borrower2 = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    // Mint para borrower 1
    env.mock_all_auths();
    client.mint(
        &borrower1,
        &String::from_str(&env, "asset-1"),
        &String::from_str(&env, "tractor"),
        &50000u64,
        &String::from_str(&env, "ipfs://1"),
    );

    // Mint para borrower 2
    env.mock_all_auths();
    client.mint(
        &borrower2,
        &String::from_str(&env, "asset-2"),
        &String::from_str(&env, "car"),
        &30000u64,
        &String::from_str(&env, "ipfs://2"),
    );

    // Mint otro para borrower 1
    env.mock_all_auths();
    client.mint(
        &borrower1,
        &String::from_str(&env, "asset-3"),
        &String::from_str(&env, "house"),
        &100000u64,
        &String::from_str(&env, "ipfs://3"),
    );

    // Verificar balances
    assert_eq!(client.balance_of(&borrower1), 2);
    assert_eq!(client.balance_of(&borrower2), 1);
    assert_eq!(client.total_supply(), 3);
}

#[test]
#[should_panic]
fn test_initialize_only_once() {
    let env = Env::default();
    let contract_id = env.register_contract(None, AssetNFTContract);
    let client = AssetNFTContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let another_admin = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    env.mock_all_auths();
    client.initialize(&another_admin);
}

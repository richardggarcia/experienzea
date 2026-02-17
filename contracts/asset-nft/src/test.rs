#![cfg(test)]

use super::*;
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
        &50000u64,  // $50,000
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
}

#![no_std]

#[cfg(test)]
mod test;

use soroban_sdk::{
    contract, contractimpl, contracttype, 
    Address, Env, String, Symbol
};

/// Tipo de dato para almacenar información del NFT
#[contracttype]
#[derive(Clone, Debug)]
pub struct AssetNFT {
    pub owner: Address,
    pub asset_id: String,      // ID del activo en nuestra BD
    pub asset_type: String,    // "tractor", "car", "house"
    pub value: u64,            // Valor en USD
    pub metadata_uri: String,  // URL a IPFS o metadata
}

/// Enum para las claves de almacenamiento
#[contracttype]
pub enum DataKey {
    Token(u64),              // token_id -> AssetNFT
    OwnerTokenCount(Address), // address -> cantidad de NFTs
    TokenCount,              // total de NFTs minteados
    Admin,                   // address del admin
}

/// El contrato NFT
#[contract]
pub struct AssetNFTContract;

#[contractimpl]
impl AssetNFTContract {
    
    /// Inicializar el contrato (llamar una sola vez al deployar)
    pub fn initialize(env: Env, admin: Address) {
        admin.require_auth();
        
        // Guardar el admin
        env.storage().instance().set(&DataKey::Admin, &admin);
        
        // Inicializar contador en 0
        env.storage().instance().set(&DataKey::TokenCount, &0u64);
    }

    /// Mintear un nuevo NFT (solo el admin puede)
    pub fn mint(
        env: Env,
        to: Address,
        asset_id: String,
        asset_type: String,
        value: u64,
        metadata_uri: String,
    ) -> u64 {
        // Verificar que sea el admin
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        
        // NOTA: El borrower no necesita firmar, solo recibe el NFT

        // Obtener el siguiente token_id
        let token_count: u64 = env.storage().instance().get(&DataKey::TokenCount).unwrap_or(0);
        let token_id = token_count + 1;

        // Crear el NFT
        let nft = AssetNFT {
            owner: to.clone(),
            asset_id,
            asset_type,
            value,
            metadata_uri,
        };

        // Guardar el NFT
        env.storage().persistent().set(&DataKey::Token(token_id), &nft);

        // Actualizar contador del owner
        let owner_count: u64 = env.storage()
            .persistent()
            .get(&DataKey::OwnerTokenCount(to.clone()))
            .unwrap_or(0);
        env.storage()
            .persistent()
            .set(&DataKey::OwnerTokenCount(to.clone()), &(owner_count + 1));

        // Actualizar contador total
        env.storage().instance().set(&DataKey::TokenCount, &token_id);

        // Emitir evento
        env.events().publish(
            (Symbol::new(&env, "mint"), token_id),
            (to,),
        );

        token_id
    }

    /// Obtener el dueño de un token
    pub fn owner_of(env: Env, token_id: u64) -> Option<Address> {
        let nft: Option<AssetNFT> = env.storage().persistent().get(&DataKey::Token(token_id));
        nft.map(|n| n.owner)
    }

    /// Obtener el balance (cantidad de NFTs) de una dirección
    pub fn balance_of(env: Env, owner: Address) -> u64 {
        env.storage()
            .persistent()
            .get(&DataKey::OwnerTokenCount(owner))
            .unwrap_or(0)
    }

    /// Obtener información completa de un NFT
    pub fn get_nft(env: Env, token_id: u64) -> Option<AssetNFT> {
        env.storage().persistent().get(&DataKey::Token(token_id))
    }

    /// Obtener el asset_id asociado a un token
    pub fn get_asset_id(env: Env, token_id: u64) -> Option<String> {
        let nft: Option<AssetNFT> = env.storage().persistent().get(&DataKey::Token(token_id));
        nft.map(|n| n.asset_id)
    }

    /// Obtener el total de NFTs minteados
    pub fn total_supply(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::TokenCount).unwrap_or(0)
    }

    /// Obtener el admin del contrato
    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }
}

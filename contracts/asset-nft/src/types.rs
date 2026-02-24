use soroban_sdk::{contracttype, Address, String};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AssetNFT {
    pub owner: Address,
    pub asset_id: String,
    pub asset_type: String,
    pub value: u64,
    pub metadata_uri: String,
}

#[contracttype]
pub enum DataKey {
    Token(u64),
    AssetToToken(String),
    OwnerTokenCount(Address),
    TokenCount,
    Admin,
}

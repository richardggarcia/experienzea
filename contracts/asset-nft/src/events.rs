use soroban_sdk::{Address, Env, Symbol};

pub fn publish_mint(env: &Env, token_id: u64, to: Address) {
    env.events()
        .publish((Symbol::new(env, "mint"), token_id), (to,));
}

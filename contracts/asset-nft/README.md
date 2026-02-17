# Asset NFT Contract (Soroban)

Minimal NFT contract for collateral tokenization.

## Functions

- initialize(admin)
- mint(to, asset_id, asset_type, value, uri)
- owner_of(token_id)
- balance_of(address)
- get_nft(token_id)
- total_supply()

## Local setup

Install Rust:

```
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Install Soroban CLI:

```
cargo install soroban-cli --features opt
```

## Build

```
cd contracts/asset-nft
cargo build --target wasm32-unknown-unknown --release
```

## Deploy (testnet)

From repo root:

```
chmod +x scripts/deploy-nft.sh
./scripts/deploy-nft.sh
```

The script prints a contract ID. Set it in Vercel:

```
NEXT_PUBLIC_NFT_CONTRACT_ID=<contract_id>
```

## Frontend integration

Replace the mock tokenization in `handleTokenize` to call `mint`.

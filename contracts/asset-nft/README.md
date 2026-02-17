# Asset NFT Contract

Contrato NFT para tokenizar activos reales (tractores, vehículos, inmuebles) en Stellar.

## 🎯 Funcionalidad

Este contrato permite:
- **Mintear NFTs** que representan activos físicos
- **Almacenar metadata** del activo (tipo, valor, ID)
- **Consultar ownership** de los tokens
- **Emitir eventos** para integración con frontend

## 📋 Funciones

| Función | Descripción |
|---------|-------------|
| `initialize(admin)` | Inicializar contrato (una sola vez) |
| `mint(to, asset_id, asset_type, value, metadata_uri)` | Crear nuevo NFT |
| `owner_of(token_id)` | Obtener dueño de un token |
| `balance_of(address)` | Cantidad de NFTs de una wallet |
| `get_nft(token_id)` | Información completa del NFT |
| `get_asset_id(token_id)` | ID del activo asociado |
| `total_supply()` | Total de NFTs minteados |

## 🛠️ Compilar

### Requisitos
- [Rust](https://rustup.rs/) instalado
- [Soroban CLI](https://developers.stellar.org/docs/build/smart-contracts/getting-started/setup)

### Comandos

```bash
# Entrar al directorio
cd contracts/asset-nft

# Compilar a WASM
cargo build --target wasm32-unknown-unknown --release

# El archivo resultante estará en:
# target/wasm32-unknown-unknown/release/asset_nft.wasm
```

## 🧪 Testear

```bash
# Correr tests
cargo test
```

## 🚀 Deploy a Testnet

### 1. Configurar Soroban CLI
```bash
soroban config network add testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"
```

### 2. Fundar la cuenta
```bash
# Crear cuenta (guardar el secret key)
soroban keys generate admin --network testnet

# Fundar con el faucet
# Ir a: https://laboratory.stellar.org/#account-creator?network=test
# O usar: curl https://friendbot.stellar.org?addr=<TU_ADDRESS>
```

### 3. Deployar contrato
```bash
# Usar la cuenta admin
soroban keys address admin

# Deployar
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/asset_nft.wasm \
  --source admin \
  --network testnet

# Guardar el Contract ID que devuelve
```

### 4. Inicializar
```bash
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source admin \
  --network testnet \
  -- \
  initialize \
  --admin <ADMIN_ADDRESS>
```

### 5. Mintear un NFT (test)
```bash
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source admin \
  --network testnet \
  -- \
  mint \
  --to <BORROWER_ADDRESS> \
  --asset_id "asset-123" \
  --asset_type "tractor" \
  --value 50000 \
  --metadata_uri "https://ipfs.io/ipfs/..."
```

## 🔗 Integración con Frontend

### Configurar Contract ID
```env
NEXT_PUBLIC_NFT_CONTRACT_ID=<CONTRACT_ID_DEL_DEPLOY>
```

### Llamar desde Next.js
```typescript
import { contract } from '@stellar/stellar-sdk';

// Mintear NFT
const mintNFT = async (borrowerAddress, assetId, assetType, value) => {
  const client = await contract.Client.from({
    contractId: process.env.NEXT_PUBLIC_NFT_CONTRACT_ID,
    networkPassphrase: "Test SDF Network ; September 2015",
    rpcUrl: "https://soroban-testnet.stellar.org",
  });
  
  const tx = await client.mint({
    to: borrowerAddress,
    asset_id: assetId,
    asset_type: assetType,
    value: BigInt(value),
    metadata_uri: `https://ipfs.io/ipfs/${ipfsHash}`,
  });
  
  // Firmar y enviar
  const { signedTxXdr } = await freighter.signTransaction(tx.toXDR());
  // ... enviar a la red
};
```

## 📁 Estructura de Datos

```rust
AssetNFT {
    owner: Address,        // Wallet del dueño
    asset_id: String,      // ID en nuestra BD (UUID)
    asset_type: String,    // "tractor" | "car" | "house"
    value: u64,            // Valor en USD
    metadata_uri: String,  // URL a IPFS
}
```

## 🔒 Seguridad

- Solo el **admin** puede mintear NFTs
- Se requiere **autorización** del recipiente
- Los datos se almacenan en **storage persistente** (blockchain)

## 📝 Notas

- Este es un **MVP** (Minimum Viable Product)
- No incluye transferencia (para simplificar)
- No incluye quemado (burn) - se puede agregar después
- Metadata almacenada off-chain (IPFS) para reducir costos

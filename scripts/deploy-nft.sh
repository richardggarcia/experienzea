#!/bin/bash

# Script para deployar el contrato NFT a Stellar Testnet
# Uso: ./scripts/deploy-nft.sh

set -e

echo "🚀 Deploy de Asset NFT Contract"
echo "================================"

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar prerequisitos
echo -e "${BLUE}Verificando prerequisitos...${NC}"

if ! command -v cargo &> /dev/null; then
    echo "❌ Rust/Cargo no instalado. Instalar desde: https://rustup.rs/"
    exit 1
fi

if ! command -v soroban &> /dev/null; then
    echo "❌ Soroban CLI no instalado. Instalar con: cargo install soroban-cli"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisitos OK${NC}"

# Ir al directorio del contrato
cd contracts/asset-nft

# Compilar
echo -e "${BLUE}Compilando contrato...${NC}"
cargo build --target wasm32-unknown-unknown --release

WASM_FILE="target/wasm32-unknown-unknown/release/asset_nft.wasm"

if [ ! -f "$WASM_FILE" ]; then
    echo "❌ Error: No se encontró el archivo WASM"
    exit 1
fi

echo -e "${GREEN}✅ Compilación exitosa${NC}"
echo ""

# Verificar si existe cuenta admin
echo -e "${YELLOW}Configuración${NC}"
echo "-------------"

if ! soroban keys address admin 2>/dev/null; then
    echo -e "${BLUE}Creando cuenta admin...${NC}"
    soroban keys generate admin --network testnet
    echo -e "${GREEN}✅ Cuenta creada${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANTE:${NC}"
    echo "1. Guarda tu secret key: soroban keys show admin"
    echo "2. Funda la cuenta en: https://laboratory.stellar.org/#account-creator?network=test"
    echo "   o con: curl https://friendbot.stellar.org?addr=<TU_ADDRESS>"
    echo ""
    read -p "Presiona Enter cuando la cuenta esté fundada..."
else
    echo -e "${GREEN}✅ Cuenta admin existe${NC}"
fi

ADMIN_ADDRESS=$(soroban keys address admin)
echo "Admin: $ADMIN_ADDRESS"
echo ""

# Deployar
echo -e "${BLUE}Deployando contrato...${NC}"

CONTRACT_ID=$(soroban contract deploy \
    --wasm "$WASM_FILE" \
    --source admin \
    --network testnet)

echo -e "${GREEN}✅ Contrato deployado!${NC}"
echo "Contract ID: $CONTRACT_ID"
echo ""

# Inicializar
echo -e "${BLUE}Inicializando contrato...${NC}"

soroban contract invoke \
    --id "$CONTRACT_ID" \
    --source admin \
    --network testnet \
    -- \
    initialize \
    --admin "$ADMIN_ADDRESS"

echo -e "${GREEN}✅ Contrato inicializado!${NC}"
echo ""

# Guardar en .env.local
echo -e "${BLUE}Actualizando .env.local...${NC}"
cd ../..

if grep -q "NEXT_PUBLIC_NFT_CONTRACT_ID" .env.local 2>/dev/null; then
    # Actualizar valor existente
    sed -i '' "s/NEXT_PUBLIC_NFT_CONTRACT_ID=.*/NEXT_PUBLIC_NFT_CONTRACT_ID=$CONTRACT_ID/" .env.local 2>/dev/null || \
    sed -i "s/NEXT_PUBLIC_NFT_CONTRACT_ID=.*/NEXT_PUBLIC_NFT_CONTRACT_ID=$CONTRACT_ID/" .env.local
else
    # Agregar nueva línea
    echo "" >> .env.local
    echo "# NFT Contract (Testnet)" >> .env.local
    echo "NEXT_PUBLIC_NFT_CONTRACT_ID=$CONTRACT_ID" >> .env.local
fi

echo -e "${GREEN}✅ .env.local actualizado${NC}"
echo ""

# Summary
echo -e "${GREEN}🎉 Deploy completado!${NC}"
echo "====================="
echo "Contract ID: $CONTRACT_ID"
echo "Admin: $ADMIN_ADDRESS"
echo ""
echo "Variables guardadas en .env.local"
echo ""
echo "Para testear el mint:"
echo "  soroban contract invoke --id $CONTRACT_ID --source admin --network testnet -- mint --to <ADDRESS> --asset_id 'test-123' --asset_type 'tractor' --value 50000 --metadata_uri 'https://ipfs.io/ipfs/...'"

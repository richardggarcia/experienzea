#!/bin/bash

# Script para deployar el contrato NFT a Stellar Testnet
# Compatible con Soroban CLI 22.0.0+
# Uso: ./scripts/deploy-nft.sh

set -e

echo "🚀 Deploy de Asset NFT Contract"
echo "================================"

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar prerequisitos
echo -e "${BLUE}Verificando prerequisitos...${NC}"

if ! command -v cargo &> /dev/null; then
    echo -e "${RED}❌ Rust/Cargo no instalado. Instalar desde: https://rustup.rs/${NC}"
    exit 1
fi

if ! command -v stellar &> /dev/null; then
    echo -e "${RED}❌ Stellar CLI no instalado. Instalar con: cargo install stellar-cli${NC}"
    echo "   O ver: https://developers.stellar.org/docs/build/smart-contracts/getting-started/setup"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisitos OK${NC}"

# Verificar versión de stellar
echo ""
echo "Versión de Stellar CLI:"
stellar --version

# Ir al directorio del contrato
cd contracts/asset-nft

# Agregar target wasm32 si no existe
if ! rustup target list --installed | grep -q wasm32-unknown-unknown; then
    echo -e "${BLUE}Instalando target wasm32-unknown-unknown...${NC}"
    rustup target add wasm32-unknown-unknown
fi

# Compilar
echo ""
echo -e "${BLUE}Compilando contrato...${NC}"
cargo build --target wasm32-unknown-unknown --release

WASM_FILE="target/wasm32-unknown-unknown/release/asset_nft.wasm"

if [ ! -f "$WASM_FILE" ]; then
    echo -e "${RED}❌ Error: No se encontró el archivo WASM${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Compilación exitosa${NC}"
echo ""

# Configurar red testnet
echo -e "${BLUE}Configurando red testnet...${NC}"
stellar network add testnet \
    --rpc-url https://soroban-testnet.stellar.org \
    --network-passphrase "Test SDF Network ; September 2015" 2>/dev/null || true

# Verificar si existe cuenta admin
echo ""
echo -e "${YELLOW}Configuración${NC}"
echo "-------------"

if ! stellar keys address admin 2>/dev/null; then
    echo -e "${BLUE}Creando cuenta admin...${NC}"
    stellar keys generate admin --network testnet --no-fund
    echo -e "${GREEN}✅ Cuenta creada${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANTE:${NC}"
    ADMIN_PUBKEY=$(stellar keys address admin)
    echo "1. Tu dirección: $ADMIN_PUBKEY"
    echo "2. Funda la cuenta en: https://laboratory.stellar.org/#account-creator?network=test"
    echo "   o con: curl https://friendbot.stellar.org?addr=$ADMIN_PUBKEY"
    echo ""
    read -p "Presiona Enter cuando la cuenta esté fundada..."
else
    echo -e "${GREEN}✅ Cuenta admin existe${NC}"
fi

ADMIN_ADDRESS=$(stellar keys address admin)
echo "Admin: $ADMIN_ADDRESS"
echo ""

# Deployar
echo -e "${BLUE}Deployando contrato...${NC}"
echo "(Esto puede tardar unos segundos...)"

# Usar el comando install para subir el wasm
WASM_HASH=$(stellar contract install \
    --wasm "$WASM_FILE" \
    --source admin \
    --network testnet 2>&1 | grep -oP 'wasm hash\s+\K[a-f0-9]+' || echo "")

if [ -z "$WASM_HASH" ]; then
    echo -e "${RED}❌ Error al instalar el WASM${NC}"
    echo "Intentando método alternativo..."
    
    # Método alternativo: deploy directo
    CONTRACT_ID=$(stellar contract deploy \
        --wasm "$WASM_FILE" \
        --source admin \
        --network testnet 2>&1 | tail -1 | tr -d '[:space:]')
else
    echo -e "${GREEN}✅ WASM instalado${NC}"
    echo "WASM Hash: $WASM_HASH"
    
    # Deployar instancia del contrato
    CONTRACT_ID=$(stellar contract deploy \
        --wasm-hash "$WASM_HASH" \
        --source admin \
        --network testnet 2>&1 | tail -1 | tr -d '[:space:]')
fi

if [ -z "$CONTRACT_ID" ] || [ ${#CONTRACT_ID} -lt 50 ]; then
    echo -e "${RED}❌ Error al deployar el contrato${NC}"
    echo "Output: $CONTRACT_ID"
    exit 1
fi

echo -e "${GREEN}✅ Contrato deployado!${NC}"
echo "Contract ID: $CONTRACT_ID"
echo ""

# Inicializar
echo -e "${BLUE}Inicializando contrato...${NC}"

stellar contract invoke \
    --id "$CONTRACT_ID" \
    --source admin \
    --network testnet \
    -- \
    initialize \
    --admin "$ADMIN_ADDRESS"

echo -e "${GREEN}✅ Contrato inicializado!${NC}"
echo ""

# Guardar en .env.local
cd ../..

if [ -f .env.local ]; then
    if grep -q "NEXT_PUBLIC_NFT_CONTRACT_ID" .env.local; then
        # Actualizar valor existente
        sed -i.bak "s/NEXT_PUBLIC_NFT_CONTRACT_ID=.*/NEXT_PUBLIC_NFT_CONTRACT_ID=$CONTRACT_ID/" .env.local && rm -f .env.local.bak
    else
        # Agregar nueva línea
        echo "" >> .env.local
        echo "# NFT Contract (Testnet)" >> .env.local
        echo "NEXT_PUBLIC_NFT_CONTRACT_ID=$CONTRACT_ID" >> .env.local
    fi
else
    # Crear archivo
    cat > .env.local << EOF
# NFT Contract (Testnet)
NEXT_PUBLIC_NFT_CONTRACT_ID=$CONTRACT_ID
EOF
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
echo "  stellar contract invoke --id $CONTRACT_ID --source admin --network testnet -- mint --to <ADDRESS> --asset_id 'test-123' --asset_type 'tractor' --value 50000 --metadata_uri 'https://ipfs.io/ipfs/...'"

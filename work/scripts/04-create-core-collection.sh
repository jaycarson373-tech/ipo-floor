#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SITE_DIR="$ROOT/site"
DEPLOYER_KEYPAIR="$ROOT/keys/deployer-authority.json"
COLLECTION_KEYPAIR="$ROOT/keys/core-collection.json"
RPC_URL="${SOLANA_RPC_URL:-https://api.mainnet-beta.solana.com}"
METADATA_BASE_URL="${METADATA_BASE_URL:-}"
OWNER_WALLET="$(solana-keygen pubkey "$DEPLOYER_KEYPAIR")"

if [[ -z "$METADATA_BASE_URL" ]]; then
  echo "METADATA_BASE_URL is required. Upload site/public/collection first, then rerun."
  exit 1
fi

echo "Creating first Metaplex Core asset/collection authority check"
echo "RPC:        $RPC_URL"
echo "Authority:  $OWNER_WALLET"
echo "Collection: $(solana-keygen pubkey "$COLLECTION_KEYPAIR")"
echo

cd "$SITE_DIR"
SOLANA_RPC_URL="$RPC_URL" \
SOLANA_KEYPAIR="$DEPLOYER_KEYPAIR" \
METADATA_BASE_URL="$METADATA_BASE_URL" \
OWNER_WALLET="$OWNER_WALLET" \
CORE_COLLECTION_KEYPAIR="$COLLECTION_KEYPAIR" \
CREATE_COLLECTION=true \
COUNT=1 \
START_SERIAL=1 \
npm run mint:core

#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOYER_KEYPAIR="$ROOT/keys/deployer-authority.json"
IPO_MINT_KEYPAIR="$ROOT/keys/ipo-mint.json"
TREASURY_ADDRESS="$(solana-keygen pubkey "$ROOT/keys/treasury.json")"
IPO_MINT_ADDRESS="$(solana-keygen pubkey "$IPO_MINT_KEYPAIR")"
RPC_URL="${SOLANA_RPC_URL:-https://api.mainnet-beta.solana.com}"
DECIMALS="${IPO_DECIMALS:-6}"

echo "Creating IPO SPL token mint and treasury-owned vault"
echo "RPC:      $RPC_URL"
echo "Payer:    $(solana-keygen pubkey "$DEPLOYER_KEYPAIR")"
echo "IPO mint: $IPO_MINT_ADDRESS"
echo "Treasury: $TREASURY_ADDRESS"
echo

solana config set --url "$RPC_URL" --keypair "$DEPLOYER_KEYPAIR" >/dev/null

spl-token create-token \
  --decimals "$DECIMALS" \
  --fee-payer "$DEPLOYER_KEYPAIR" \
  "$IPO_MINT_KEYPAIR"

VAULT_ADDRESS="$(spl-token create-account "$IPO_MINT_ADDRESS" --owner "$TREASURY_ADDRESS" --fee-payer "$DEPLOYER_KEYPAIR" | awk '/Creating account/ {print $3}')"

echo
echo "IPO_VAULT=$VAULT_ADDRESS"
echo "Put this into work/site/.env.local as NEXT_PUBLIC_IPO_VAULT."

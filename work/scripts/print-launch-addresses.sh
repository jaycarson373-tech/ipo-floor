#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Fund this deployer/authority wallet first:"
echo "$(solana-keygen pubkey "$ROOT/keys/deployer-authority.json")"
echo
echo "Generated public addresses:"
echo "Treasury wallet:          $(solana-keygen pubkey "$ROOT/keys/treasury.json")"
echo "IPO mint:                 $(solana-keygen pubkey "$ROOT/keys/ipo-mint.json")"
echo "Metaplex Core collection: $(solana-keygen pubkey "$ROOT/keys/core-collection.json")"
echo "Anchor program id:        $(solana-keygen pubkey "$ROOT/program/target/deploy/program-keypair.json")"
echo
echo "Recommended setup funding: 2 SOL to the deployer wallet."

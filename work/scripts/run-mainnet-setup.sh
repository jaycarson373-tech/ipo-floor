#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

"$ROOT/scripts/check-funding.sh"
echo
read -r -p "This will spend mainnet SOL from the deployer wallet. Type RUN to continue: " CONFIRM
if [[ "$CONFIRM" != "RUN" ]]; then
  echo "Stopped."
  exit 1
fi

"$ROOT/scripts/01-deploy-program.sh"
"$ROOT/scripts/02-create-ipo-token-and-vault.sh"

echo
echo "Next:"
echo "1. Paste the printed IPO_VAULT into work/site/.env.local."
echo "2. Upload work/site/public/collection to permanent storage."
echo "3. Run METADATA_BASE_URL=https://your-storage/collection/metadata $ROOT/scripts/04-create-core-collection.sh"
echo "4. Run IPO_VAULT=<vault> node $ROOT/scripts/03-initialize-program.mjs"

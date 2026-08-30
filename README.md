# IPO Floor

IPO Floor is a Solana mint site and launch stack for 333 Metaplex Core NFTs.

The collection thesis:

```text
IPO FLOOR
333 anonymous insiders.
Every insider has a desk.
Every desk has access.
Burn IPO to move up the floor.
```

## Contents

- `work/site` - Vinext/Next mint site, generated NFT collection, and Metaplex Core mint worker
- `work/program` - Anchor program for mint gating, upgrades, rentals, treasury, and IPO token locking
- `work/scripts` - launch scripts for funding checks, program deploy, token/vault setup, program initialization, and Core collection creation
- `work/LAUNCH_RUNBOOK.md` - launch checklist and current public addresses
- `outputs/ipo-insider-preview-30.svg.png` - 30-piece visual preview sheet
- `outputs/launch-addresses.txt` - generated public launch addresses

Private keypairs and local environment files are intentionally ignored.

## Site

```bash
cd work/site
npm install
npm run generate:collection
npm run dev -- --port 3001
```

Open:

```text
http://localhost:3001/
```

Production build:

```bash
cd work/site
npm run build
```

## Collection

The generator is deterministic:

```bash
cd work/site
npm run generate:collection
```

Generated assets:

- `333` metadata files
- `1,998` SVG images: base image plus `L1-L5` upgrade art for every NFT
- Base rarity remains fixed
- Upgrade levels preserve the same insider identity and evolve the workstation

## Program

```bash
cd work/program
npm install
NO_DNA=1 anchor build
```

The compiled program artifact is produced locally at:

```text
work/program/target/deploy/program.so
```

`target/` is ignored in Git, so rebuild before deployment.

## Launch

Read the runbook first:

```text
work/LAUNCH_RUNBOOK.md
```

Current deployer / launch authority address:

```text
7vHThHyHXzEXyNwFYC4y2bVBAa5A4nAY2wUddr99dJ7C
```

Recommended setup funding: `2 SOL`.

Then run:

```bash
work/scripts/check-funding.sh
work/scripts/run-mainnet-setup.sh
```

Do not commit private keypairs or `.env.local`.

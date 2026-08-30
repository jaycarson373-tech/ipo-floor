# IPO Floor Launch Runbook

## What Is Built

- Mint site in `work/site`
- 333 generated anonymous insider NFT images in `work/site/public/collection/images`
- 333 matching metadata files in `work/site/public/collection/metadata`
- Metaplex Core mint worker in `work/site/scripts/mint-core-assets.mjs`
- Anchor mint gate program in `work/program`

## Economics

- Supply: 333
- Buyer pays: 0.25 SOL + 1,000,000 IPO
- Mint-funded treasury at sellout: 83.25 SOL
- NFT standard: Metaplex Core
- Collection concept: 333 anonymous insiders at trading desks
- Upgrade levels: 10

## Launch Values Needed

Generated public addresses:

- Deployer / launch authority: `7vHThHyHXzEXyNwFYC4y2bVBAa5A4nAY2wUddr99dJ7C`
- Treasury wallet: `5AjpQUTJSD4PJAx7v6saLv1wLwABk7pJn83q9tgiX875`
- IPO mint: `CG4jSsRE73DeL8PoBuusjiRgFhyJTGbogJttubM2GGdj`
- Metaplex Core collection: `3oWH9UQ2E8D7GuHUAfzn1GTkB9HAoEfbRo7JJ7e4o4RK`
- Anchor program id: `2P9ehfkHUgght4YmW43YG1vEqFatKa3zKAkaV5ona7wo`

Fund the deployer / launch authority with setup SOL first:

```text
7vHThHyHXzEXyNwFYC4y2bVBAa5A4nAY2wUddr99dJ7C
```

Recommended setup funding: `2 SOL`.

Before mainnet launch, fill these values in `work/site/.env`:

```bash
NEXT_PUBLIC_SOLANA_CLUSTER=mainnet-beta
NEXT_PUBLIC_SOLANA_RPC_URL=
NEXT_PUBLIC_IPO_PROGRAM_ID=
NEXT_PUBLIC_IPO_MINT=
NEXT_PUBLIC_IPO_VAULT=
NEXT_PUBLIC_TREASURY_WALLET=
NEXT_PUBLIC_CORE_COLLECTION=
NEXT_PUBLIC_METADATA_BASE_URL=
```

## Mainnet Safety Checklist

1. Create or confirm the IPO SPL token mint.
2. Create the treasury wallet.
3. Create the IPO vault token account owned by the launch authority or vault authority.
4. Upload `public/collection` to permanent storage.
5. Deploy the Anchor program.
6. Initialize the program with:
   - treasury wallet
   - IPO mint
   - IPO vault
   - total supply `333`
   - mint price `250000000` lamports
   - IPO token price in raw base units, usually `1000000 * 10 ** decimals`
7. Create the Metaplex Core collection.
8. Put the deployed program id, collection, token, vault, and treasury into the site environment.
9. Run a devnet mint first.
10. Run a mainnet mint with a team wallet before opening traffic.

## Mint Flow

1. Buyer connects wallet on the site.
2. Buyer submits `mint_desk`.
3. Program transfers 0.25 SOL to treasury.
4. Program transfers 1,000,000 IPO to the IPO vault.
5. Program records the desk account and emits `DeskMinted`.
6. Mint worker mints the Metaplex Core asset to the buyer using the matching metadata URI.

The Core asset minting step requires the collection/update authority keypair and must be run by the operator or a secured backend worker. Do not put that key in public frontend code.

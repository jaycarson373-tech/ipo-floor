export const launchConfig = {
  cluster: process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? 'devnet',
  rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? 'https://api.devnet.solana.com',
  programId: process.env.NEXT_PUBLIC_IPO_PROGRAM_ID ?? '2P9ehfkHUgght4YmW43YG1vEqFatKa3zKAkaV5ona7wo',
  ipoMint: process.env.NEXT_PUBLIC_IPO_MINT ?? '',
  ipoVault: process.env.NEXT_PUBLIC_IPO_VAULT ?? '',
  treasury: process.env.NEXT_PUBLIC_TREASURY_WALLET ?? '',
  coreCollection: process.env.NEXT_PUBLIC_CORE_COLLECTION ?? '',
  metadataBaseUrl: process.env.NEXT_PUBLIC_METADATA_BASE_URL ?? '/collection/metadata',
  mintPriceSol: 0.25,
  mintPriceIpo: 1_000_000,
  supply: 333,
};

import fs from 'node:fs';
import path from 'node:path';
import * as anchor from '@coral-xyz/anchor';
import { getMint } from '@solana/spl-token';
import { PublicKey, SystemProgram, Keypair, Connection } from '@solana/web3.js';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const programDir = path.join(root, 'program');
const deployerPath = path.join(root, 'keys', 'deployer-authority.json');
const idlPath = path.join(programDir, 'target', 'idl', 'ipo_program.json');

const rpcUrl = process.env.SOLANA_RPC_URL ?? 'https://api.mainnet-beta.solana.com';
const programId = new PublicKey(process.env.IPO_PROGRAM_ID ?? '2P9ehfkHUgght4YmW43YG1vEqFatKa3zKAkaV5ona7wo');
const treasury = new PublicKey(process.env.TREASURY_WALLET ?? '5AjpQUTJSD4PJAx7v6saLv1wLwABk7pJn83q9tgiX875');
const ipoMint = new PublicKey(process.env.IPO_MINT ?? 'CG4jSsRE73DeL8PoBuusjiRgFhyJTGbogJttubM2GGdj');
const ipoVault = new PublicKey(process.env.IPO_VAULT ?? '');

const secret = JSON.parse(fs.readFileSync(deployerPath, 'utf8'));
const payer = Keypair.fromSecretKey(Uint8Array.from(secret));
const connection = new Connection(rpcUrl, 'confirmed');
const wallet = new anchor.Wallet(payer);
const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' });
anchor.setProvider(provider);

const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));
idl.address = programId.toBase58();
const program = new anchor.Program(idl, provider);
const [config] = PublicKey.findProgramAddressSync([Buffer.from('config')], programId);
const mintInfo = await getMint(connection, ipoMint);
const ipoRawAmount = new anchor.BN(1_000_000).mul(new anchor.BN(10).pow(new anchor.BN(mintInfo.decimals)));

console.log('Initializing IPO program');
console.log('RPC:      ', rpcUrl);
console.log('Program:  ', programId.toBase58());
console.log('Authority:', payer.publicKey.toBase58());
console.log('Config:   ', config.toBase58());
console.log('Treasury: ', treasury.toBase58());
console.log('IPO mint: ', ipoMint.toBase58());
console.log('IPO vault:', ipoVault.toBase58());
console.log('IPO raw:  ', ipoRawAmount.toString());

const signature = await program.methods
  .initialize(treasury, 333, new anchor.BN(250_000_000), ipoRawAmount)
  .accounts({
    authority: payer.publicKey,
    config,
    ipoMint,
    ipoVault,
    systemProgram: SystemProgram.programId,
  })
  .rpc();

console.log('Initialized:', signature);

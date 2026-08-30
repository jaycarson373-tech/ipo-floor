import { readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { create, createCollection, mplCore } from '@metaplex-foundation/mpl-core';
import {
  createSignerFromKeypair,
  generateSigner,
  keypairIdentity,
  publicKey,
} from '@metaplex-foundation/umi';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';

const RPC_URL = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';
const KEYPAIR_PATH = process.env.SOLANA_KEYPAIR ?? path.join(os.homedir(), '.config/solana/id.json');
const METADATA_BASE_URL = process.env.METADATA_BASE_URL;
const OWNER = process.env.OWNER_WALLET;
const COLLECTION = process.env.CORE_COLLECTION;
const COLLECTION_KEYPAIR_PATH = process.env.CORE_COLLECTION_KEYPAIR;
const CREATE_COLLECTION = process.env.CREATE_COLLECTION === 'true';
const START_SERIAL = Number(process.env.START_SERIAL ?? '1');
const COUNT = Number(process.env.COUNT ?? '1');

if (!METADATA_BASE_URL) {
  throw new Error('METADATA_BASE_URL is required. Upload public/collection first, then pass its public metadata base URL.');
}

if (!OWNER) {
  throw new Error('OWNER_WALLET is required. Use the buyer wallet for final asset ownership.');
}

const secret = JSON.parse(await readFile(KEYPAIR_PATH, 'utf8'));
const umi = createUmi(RPC_URL).use(mplCore());
umi.use(keypairIdentity(umi.eddsa.createKeypairFromSecretKey(new Uint8Array(secret))));

function companyForSerial(serial) {
  return ['GTA', 'NLNK', 'ANTH'][(serial - 1) % 3];
}

async function ensureCollection() {
  if (COLLECTION_KEYPAIR_PATH && CREATE_COLLECTION) {
    const collectionSecret = JSON.parse(await readFile(COLLECTION_KEYPAIR_PATH, 'utf8'));
    const collectionKeypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(collectionSecret));
    const collection = createSignerFromKeypair(umi, collectionKeypair);
    const uri = `${METADATA_BASE_URL.replace(/\/$/, '')}/../manifest.json`;
    await createCollection(umi, {
      collection,
      name: 'IPO Floor Insiders',
      uri,
    }).sendAndConfirm(umi);
    console.log(`Created Core collection: ${collection.publicKey}`);
    return collection.publicKey;
  }

  if (COLLECTION) {
    return publicKey(COLLECTION);
  }

  const collection = generateSigner(umi);
  const uri = `${METADATA_BASE_URL.replace(/\/$/, '')}/../manifest.json`;
  await createCollection(umi, {
    collection,
    name: 'IPO Floor Insiders',
    uri,
  }).sendAndConfirm(umi);
  console.log(`Created Core collection: ${collection.publicKey}`);
  return collection.publicKey;
}

const collection = await ensureCollection();

for (let serial = START_SERIAL; serial < START_SERIAL + COUNT; serial += 1) {
  const ticker = companyForSerial(serial);
  const insiderId = `${ticker}-${String(serial).padStart(3, '0')}`;
  const asset = generateSigner(umi);
  const uri = `${METADATA_BASE_URL.replace(/\/$/, '')}/${insiderId}.json`;

  await create(umi, {
    asset,
    collection,
    owner: publicKey(OWNER),
    name: `IPO Insider ${insiderId}`,
    uri,
  }).sendAndConfirm(umi);

  console.log(`Minted Core asset ${insiderId}: ${asset.publicKey}`);
}

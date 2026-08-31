'use client';

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { launchConfig } from './launch-config';

declare global {
  interface Window {
    solana?: {
      connect: () => Promise<{ publicKey: { toString: () => string } }>;
      isPhantom?: boolean;
    };
  }
}

const MINT_SOL = launchConfig.mintPriceSol;
const MINT_IPO = launchConfig.mintPriceIpo;
const STARTING_SOL = 0;
const STARTING_IPO = 25_000_000;
const STARTING_WALLET_SOL = 4.25;
const TOTAL_SUPPLY = launchConfig.supply;

const insiderSamples = [
  {
    id: 'GTA-001',
    company: 'GTA',
    rarity: 'Common',
    level: 1,
    spec: 'hooded degen at a basic IPO desk',
    environment: 'bedroom terminal glow',
  },
  {
    id: 'GTA-181',
    company: 'GTA',
    rarity: 'Uncommon',
    level: 2,
    spec: 'masked analyst with upgraded screens',
    environment: 'private launch office',
  },
  {
    id: 'NLNK-251',
    company: 'Neuralink',
    rarity: 'Rare',
    level: 3,
    spec: 'anonymous trader inside a lab setup',
    environment: 'server-lit research floor',
  },
  {
    id: 'GTA-319',
    company: 'GTA',
    rarity: 'Epic',
    level: 4,
    spec: 'shadowed insider at an elite workstation',
    environment: 'trading floor',
  },
  {
    id: 'NLNK-332',
    company: 'Neuralink',
    rarity: 'Mythic',
    level: 5,
    spec: 'anonymous whale in a command setup',
    environment: 'server-lit office',
  },
  {
    id: 'ANTH-333',
    company: 'Anthropic',
    rarity: 'Mythic',
    level: 5,
    spec: 'partner-level insider with full floor access',
    environment: 'high-rise strategy floor',
  },
];

const launchCosts = [
  ['Mint site', '$0-$25 to start', 'Static hosting can be free or cheap. A custom domain usually adds about $10-$20/year.'],
  ['Core NFT minting', '~0.97-1.23 SOL', 'For 333 Metaplex Core assets, mint rent is still cheap while each desk behaves like a normal NFT.'],
  ['Buyer mint', '0.25 SOL + 1,000,000 IPO', 'Buyer also pays normal Solana transaction fees, usually tiny compared with the mint price.'],
  ['Treasury sellout', '83.25 SOL', 'The treasury starts at 0 SOL from mint sales and reaches 83.25 SOL if all 333 desks sell at 0.25 SOL.'],
];

const desks = [
  {
    ticker: 'GTA',
    name: 'GTA Desk',
    accent: '#bbff34',
    feed: 'game economy routes',
    market: 'entertainment IPO desk',
    seed: 'ipo:gta:vice-market',
  },
  {
    ticker: 'NLNK',
    name: 'Neuralink Desk',
    accent: '#42d8ff',
    feed: 'neuro hardware queue',
    market: 'deep tech IPO desk',
    seed: 'ipo:neuralink:synapse-line',
  },
  {
    ticker: 'ANTH',
    name: 'Anthropic Desk',
    accent: '#ffca3a',
    feed: 'AI launch allocation',
    market: 'frontier AI IPO desk',
    seed: 'ipo:anthropic:context-window',
  },
];

const upgrades = [
  ['Lead Sheet', 150_000, 0.03, '+1 allocation point'],
  ['Cold Caller', 250_000, 0.04, '+2 renter slots'],
  ['Pitch Deck', 400_000, 0.06, '+3 round priority'],
  ['KYC Desk', 650_000, 0.08, '+1 launchpad queue skip'],
  ['Broker License', 1_000_000, 0.11, '+5 allocation points'],
  ['Treasury Line', 1_500_000, 0.15, '+3 revenue weight'],
  ['Market Maker', 2_250_000, 0.21, '+8 renter yield weight'],
  ['Bookrunner', 3_300_000, 0.3, '+12 launch priority'],
  ['Syndicate Room', 4_800_000, 0.42, '+18 allocation points'],
  ['Bell Ring', 7_000_000, 0.6, 'max desk status'],
] as const;

const docs = [
  ['Mint', 'Pay 0.25 SOL and lock 1,000,000 IPO into the desk. The NFT is issued as the desk receipt.'],
  ['Rounds', 'The mint funds the treasury as desks sell. Launches use stockbroker-style rounds, with holder priority before public access.'],
  ['Launchpad', 'Teams submit, complete KYC, and book a call with the team. Tokens launching through the launchpad get priority.'],
  ['Allocation', 'Every launch reserves a 3.3% holder priority pool for desk NFTs. Upgrades decide weight inside that pool.'],
];

function artLevelFromUpgrade(upgradeLevel: number) {
  return Math.min(5, Math.floor(upgradeLevel / 2) + 1);
}

function sampleIdForTicker(ticker: string) {
  if (ticker === 'NLNK') return 'NLNK-002';
  if (ticker === 'ANTH') return 'ANTH-003';
  return 'GTA-001';
}

function InsiderCard({ desk }: { desk: (typeof insiderSamples)[number] }) {
  return (
    <article className="nftCard">
      <img
        alt={`${desk.rarity} ${desk.company} IPO Floor anonymous insider ${desk.id}`}
        className="nftImage"
        src={`/collection/images/${desk.id}-L${desk.level}.svg`}
      />
      <div className="nftMeta">
        <span>{desk.rarity}</span>
        <h3>{desk.id}</h3>
        <p>{desk.spec}</p>
        <small>{desk.environment} · Level {desk.level}</small>
      </div>
    </article>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
}

function makeDeskId(ticker: string, minted: number) {
  return `${ticker}-${String(334 - minted).padStart(3, '0')}`;
}

export default function Home() {
  const [connected, setConnected] = useState(false);
  const [selectedDesk, setSelectedDesk] = useState(desks[0]);
  const [remaining, setRemaining] = useState(TOTAL_SUPPLY);
  const [ipoBalance, setIpoBalance] = useState(STARTING_IPO);
  const [solBalance, setSolBalance] = useState(STARTING_WALLET_SOL);
  const [walletLabel, setWalletLabel] = useState('not connected');
  const [treasury, setTreasury] = useState(STARTING_SOL);
  const [ownedDesk, setOwnedDesk] = useState<string | null>(null);
  const [upgradeLevel, setUpgradeLevel] = useState(0);
  const [rentalDays, setRentalDays] = useState(7);
  const [rentPrice, setRentPrice] = useState(0.018);
  const [log, setLog] = useState([
    '$ ipo mint --desk GTA --ipo 1000000 --sol 0.25',
    '> connect wallet to open the book',
  ]);

  const canMint = connected && remaining > 0 && ipoBalance >= MINT_IPO && solBalance >= MINT_SOL;
  const nextUpgrade = upgrades[upgradeLevel];
  const canUpgrade =
    Boolean(ownedDesk && nextUpgrade) &&
    ipoBalance >= (nextUpgrade?.[1] ?? Infinity) &&
    solBalance >= (nextUpgrade?.[2] ?? Infinity);

  const allocationWeight = useMemo(() => 1 + upgradeLevel * 0.35, [upgradeLevel]);
  const displayedArtLevel = artLevelFromUpgrade(upgradeLevel);
  const ownedArtId = ownedDesk ?? sampleIdForTicker(selectedDesk.ticker);

  async function connectWallet() {
    let label = 'IPO-holder.demo';
    if (typeof window !== 'undefined' && window.solana) {
      try {
        const response = await window.solana.connect();
        const publicKey = response.publicKey.toString();
        label = `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}`;
      } catch {
        label = 'IPO-holder.demo';
      }
    }

    setConnected(true);
    setWalletLabel(label);
    setLog([
      '$ wallet connect',
      `> wallet found................ ${label}`,
      `> balances.................... ${formatNumber(ipoBalance)} IPO / ${solBalance.toFixed(2)} SOL`,
      '> mint desk ready',
    ]);
  }

  function mintDesk() {
    if (!canMint) {
      setLog([
        `$ ipo mint --desk ${selectedDesk.ticker} --ipo 1000000 --sol 0.25`,
        connected ? '> insufficient balance or sold out' : '> wallet required',
      ]);
      return;
    }

    const deskId = makeDeskId(selectedDesk.ticker, remaining);
    setRemaining((value) => value - 1);
    setIpoBalance((value) => value - MINT_IPO);
    setSolBalance((value) => Number((value - MINT_SOL).toFixed(3)));
    setTreasury((value) => Number((value + MINT_SOL).toFixed(3)));
    setOwnedDesk(deskId);
    setUpgradeLevel(0);
    setLog([
      `$ ipo mint --desk ${selectedDesk.ticker} --ipo 1000000 --sol 0.25`,
      '> charging wallet............. 0.25 SOL',
      '> locking IPO................. 1,000,000 IPO',
      `> metaplex core asset......... ${deskId}`,
      `> treasury.................... ${(treasury + MINT_SOL).toFixed(2)} SOL`,
      '> status...................... minted',
    ]);
  }

  function upgradeDesk() {
    if (!canUpgrade || !nextUpgrade || !ownedDesk) {
      setLog([
        '$ ipo desk upgrade',
        ownedDesk ? '> not enough IPO or SOL for next upgrade' : '> mint a desk first',
      ]);
      return;
    }

    setIpoBalance((value) => value - nextUpgrade[1]);
    setSolBalance((value) => Number((value - nextUpgrade[2]).toFixed(3)));
    setTreasury((value) => Number((value + nextUpgrade[2]).toFixed(3)));
    setUpgradeLevel((value) => value + 1);
    setLog([
      `$ ipo upgrade --desk ${ownedDesk} --level ${upgradeLevel + 1}`,
      `> upgrade..................... ${nextUpgrade[0]}`,
      `> IPO spent................... ${formatNumber(nextUpgrade[1])}`,
      `> SOL fee..................... ${nextUpgrade[2].toFixed(2)}`,
      `> perk........................ ${nextUpgrade[3]}`,
      '> status...................... upgraded',
    ]);
  }

  function createRental() {
    if (!ownedDesk) {
      setLog(['$ ipo rent create', '> mint a desk before listing rentals']);
      return;
    }

    setLog([
      `$ ipo rent create --desk ${ownedDesk} --days ${rentalDays} --price ${rentPrice.toFixed(3)}`,
      '> checking owner.............. ok',
      `> renter access............... ${selectedDesk.feed}`,
      `> lease total................. ${(rentalDays * rentPrice).toFixed(3)} SOL`,
      `> lease url................... desk://${ownedDesk}/rent/${rentalDays}d`,
      '> status...................... listed',
    ]);
  }

  return (
    <main>
      <nav className="topbar" aria-label="Primary">
        <a className="brand" href="#mint" aria-label="IPO home">
          <span className="brandMark" />
          IPO
        </a>
        <div className="navLinks">
          <a href="#mint">Mint</a>
          <a href="#art">Art</a>
          <a href="#costs">Costs</a>
          <a href="#upgrades">Upgrades</a>
          <a href="#market">Market</a>
          <a href="#terminal">Terminal</a>
        </div>
      </nav>

      <section className="hero" id="mint">
        <div className="heroCopy">
          <p className="eyebrow">333 Metaplex Core desks · 3 IPO markets · holder priority</p>
          <h1>Mint the desk before the book opens.</h1>
          <p className="lede">
            Pay 0.25 SOL and lock 1,000,000 IPO to mint one broker desk. Holders
            get priority allocation for every launchpad token, then upgrade their
            desk through ten heavy levels.
          </p>
          <div className="actions">
            <button id="connectOrMintButton" className="primaryBtn" type="button" onClick={connected ? mintDesk : connectWallet}>
              {connected ? 'Mint desk' : 'Connect wallet'}
            </button>
            <a className="ghostBtn" href="#market">Launchpad rules</a>
          </div>
        </div>

        <div className="mintPanel" aria-label="Mint panel">
          <div className="panelHeader">
            <span>mint book</span>
            <strong id="remainingSupply">{remaining} left</strong>
          </div>
          <dl className="stats">
            <div>
              <dt>Mint price</dt>
              <dd>0.25 SOL</dd>
            </div>
            <div>
              <dt>IPO lock</dt>
              <dd>1,000,000 IPO</dd>
            </div>
            <div>
              <dt>Treasury</dt>
              <dd id="treasuryValue">{treasury.toFixed(2)} SOL</dd>
            </div>
            <div>
              <dt>Your wallet</dt>
              <dd id="walletLabel">{connected ? walletLabel : 'not connected'}</dd>
            </div>
          </dl>
          <div className="selector" role="group" aria-label="Choose desk">
            {desks.map((desk) => (
              <button
                key={desk.ticker}
                className={desk.ticker === selectedDesk.ticker ? 'selected' : ''}
                data-desk-feed={desk.feed}
                data-desk-name={desk.name}
                data-desk-ticker={desk.ticker}
                type="button"
                onClick={() => setSelectedDesk(desk)}
              >
                {desk.ticker}
              </button>
            ))}
          </div>
          <img
            alt={`${selectedDesk.name} IPO Floor insider preview`}
            className="mintNftPreview"
            id="mintNftPreview"
            src={`/collection/images/${sampleIdForTicker(selectedDesk.ticker)}-L1.svg`}
          />
          <button className="mintButton" id="mintButton" type="button" onClick={mintDesk}>
            Mint {selectedDesk.name}
          </button>
        </div>
      </section>

      <section className="artBand" id="art" aria-labelledby="art-title">
        <div className="sectionHead">
          <p className="eyebrow">Metaplex Core art</p>
          <h2 id="art-title">Anonymous IPO insiders</h2>
        </div>
        <div className="nftGrid">
          {insiderSamples.map((desk) => (
            <InsiderCard desk={desk} key={desk.id} />
          ))}
        </div>
      </section>

      <section className="deskBand" id="desks" aria-labelledby="desk-title">
        <div className="sectionHead">
          <p className="eyebrow">Pick 1 of 3</p>
          <h2 id="desk-title">IPO desks</h2>
        </div>
        <div className="deskGrid">
          {desks.map((desk, index) => (
            <article className="deskCard" key={desk.ticker}>
              <div className="cardArt" style={{ '--accent': desk.accent } as CSSProperties}>
                <span className="serial">#{String(index + 1).padStart(3, '0')}</span>
                <span className="ticker">{desk.ticker}</span>
                <span className="plug" />
              </div>
              <h3>{desk.name}</h3>
              <p>{desk.market}</p>
              <div className="miniRows">
                <span>unique utility</span>
                <strong>{desk.feed}</strong>
              </div>
              <code>{desk.seed}</code>
            </article>
          ))}
        </div>
      </section>

      <section className="costBand" id="costs" aria-labelledby="cost-title">
        <div className="sectionHead">
          <p className="eyebrow">Cheap to run</p>
          <h2 id="cost-title">Mint costs</h2>
        </div>
        <div className="costGrid">
          {launchCosts.map(([title, amount, body]) => (
            <article className="costCard" key={title}>
              <span>{title}</span>
              <strong>{amount}</strong>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="upgradeBand" id="upgrades" aria-labelledby="upgrade-title">
        <div className="sectionHead">
          <p className="eyebrow">10 heavy upgrades</p>
          <h2 id="upgrade-title">Level the desk</h2>
        </div>
        <div className="upgradeLayout">
          <div className="upgradeStatus">
            <img
              alt={`Current IPO Floor desk art level ${displayedArtLevel}`}
              className="upgradePreview"
              id="upgradePreview"
              src={`/collection/images/${ownedArtId}-L${displayedArtLevel}.svg`}
            />
            <span>Current desk</span>
            <strong id="currentDesk">{ownedDesk ?? 'Mint first'}</strong>
            <span>Level</span>
            <strong id="upgradeLevel">{upgradeLevel}/10</strong>
            <span>Allocation weight</span>
            <strong id="allocationWeight">{allocationWeight.toFixed(2)}x</strong>
            <button id="upgradeButton" type="button" onClick={upgradeDesk}>
              Upgrade next level
            </button>
          </div>
          <div className="upgradeGrid">
            {upgrades.map(([name, ipoCost, solCost, perk], index) => (
              <article className={index < upgradeLevel ? 'upgrade done' : 'upgrade'} data-upgrade-index={index} key={name}>
                <span>{index + 1}</span>
                <h3>{name}</h3>
                <p>{formatNumber(ipoCost)} IPO + {solCost.toFixed(2)} SOL</p>
                <small>{perk}</small>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="docs" id="market" aria-labelledby="market-title">
        <div className="sectionHead">
          <p className="eyebrow">Future IPO marketplace</p>
          <h2 id="market-title">Launchpad priority</h2>
        </div>
        <div className="docList">
          {docs.map(([title, body], index) => (
            <article key={title} className="docRow">
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="terminalWrap" id="terminal" aria-labelledby="terminal-title">
        <div className="terminalIntro">
          <p className="eyebrow">Rental utility</p>
          <h2 id="terminal-title">Rent desks without selling them.</h2>
          <p>
            Set the term and daily price. Renters get the active utility window,
            while the holder keeps the NFT and launchpad allocation.
          </p>
          <div className="rentControls">
            <label>
              Days
              <input
                min="1"
                max="30"
                id="rentalDaysInput"
                type="number"
                value={rentalDays}
                onChange={(event) => setRentalDays(Number(event.target.value))}
              />
            </label>
            <label>
              SOL / day
              <input
                min="0.001"
                step="0.001"
                id="rentPriceInput"
                type="number"
                value={rentPrice}
                onChange={(event) => setRentPrice(Number(event.target.value))}
              />
            </label>
            <button id="rentalButton" type="button" onClick={createRental}>
              List rental
            </button>
          </div>
        </div>
        <div className="terminal" role="region" aria-label="Desk terminal">
          <div className="terminalChrome">
            <span />
            <span />
            <span />
          </div>
          <pre id="terminalLog">{log.join('\n')}</pre>
        </div>
      </section>
    </main>
  );
}

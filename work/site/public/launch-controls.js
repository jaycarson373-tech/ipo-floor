(() => {
  const MINT_SOL = 0.25;
  const MINT_IPO = 1000000;
  const TOTAL_SUPPLY = 333;
  const STARTING_IPO = 25000000;
  const STARTING_SOL = 4.25;
  const upgrades = [
    ['Lead Sheet', 150000, 0.03, '+1 allocation point'],
    ['Cold Caller', 250000, 0.04, '+2 renter slots'],
    ['Pitch Deck', 400000, 0.06, '+3 round priority'],
    ['KYC Desk', 650000, 0.08, '+1 launchpad queue skip'],
    ['Broker License', 1000000, 0.11, '+5 allocation points'],
    ['Treasury Line', 1500000, 0.15, '+3 revenue weight'],
    ['Market Maker', 2250000, 0.21, '+8 renter yield weight'],
    ['Bookrunner', 3300000, 0.3, '+12 launch priority'],
    ['Syndicate Room', 4800000, 0.42, '+18 allocation points'],
    ['Bell Ring', 7000000, 0.6, 'max desk status'],
  ];
  const samples = { GTA: 'GTA-001', NLNK: 'NLNK-002', ANTH: 'ANTH-003' };
  const names = { GTA: 'GTA Desk', NLNK: 'Neuralink Desk', ANTH: 'Anthropic Desk' };
  const feeds = { GTA: 'game economy routes', NLNK: 'neuro hardware queue', ANTH: 'AI launch allocation' };
  const state = {
    connected: false,
    selectedTicker: 'GTA',
    remaining: TOTAL_SUPPLY,
    ipoBalance: STARTING_IPO,
    solBalance: STARTING_SOL,
    treasury: 0,
    ownedDesk: null,
    upgradeLevel: 0,
    walletLabel: 'not connected',
  };

  function el(id) {
    return document.getElementById(id);
  }

  function formatNumber(value) {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
  }

  function artLevelFromUpgrade(level) {
    return Math.min(5, Math.floor(level / 2) + 1);
  }

  function deskId(ticker, remaining) {
    return `${ticker}-${String(334 - remaining).padStart(3, '0')}`;
  }

  function writeLog(lines) {
    const terminal = el('terminalLog');
    if (terminal) terminal.textContent = lines.join('\n');
  }

  function render() {
    const remainingSupply = el('remainingSupply');
    const treasuryValue = el('treasuryValue');
    const walletLabel = el('walletLabel');
    const primary = el('connectOrMintButton');
    const mintButton = el('mintButton');
    const mintPreview = el('mintNftPreview');
    const currentDesk = el('currentDesk');
    const upgradeLevel = el('upgradeLevel');
    const allocationWeight = el('allocationWeight');
    const upgradePreview = el('upgradePreview');

    if (remainingSupply) remainingSupply.textContent = `${state.remaining} left`;
    if (treasuryValue) treasuryValue.textContent = `${state.treasury.toFixed(2)} SOL`;
    if (walletLabel) walletLabel.textContent = state.connected ? state.walletLabel : 'not connected';
    if (primary) primary.textContent = state.connected ? 'Mint desk' : 'Connect wallet';
    if (mintButton) mintButton.textContent = `Mint ${names[state.selectedTicker]}`;
    if (mintPreview) {
      mintPreview.alt = `${names[state.selectedTicker]} IPO Floor terminal preview`;
      mintPreview.src = `/collection/images/${samples[state.selectedTicker]}-L1.svg`;
    }
    if (currentDesk) currentDesk.textContent = state.ownedDesk || 'Mint first';
    if (upgradeLevel) upgradeLevel.textContent = `${state.upgradeLevel}/10`;
    if (allocationWeight) allocationWeight.textContent = `${(1 + state.upgradeLevel * 0.35).toFixed(2)}x`;
    if (upgradePreview) {
      const artId = state.ownedDesk || samples[state.selectedTicker];
      const artLevel = artLevelFromUpgrade(state.upgradeLevel);
      upgradePreview.alt = `Current IPO Floor desk art level ${artLevel}`;
      upgradePreview.src = `/collection/images/${artId}-L${artLevel}.svg`;
    }

    document.querySelectorAll('[data-desk-ticker]').forEach((button) => {
      button.classList.toggle('selected', button.dataset.deskTicker === state.selectedTicker);
    });
    document.querySelectorAll('[data-upgrade-index]').forEach((card) => {
      const index = Number(card.dataset.upgradeIndex);
      card.classList.toggle('done', index < state.upgradeLevel);
    });
  }

  async function connectWallet() {
    let label = 'IPO-holder.demo';
    if (window.solana && typeof window.solana.connect === 'function') {
      try {
        const response = await window.solana.connect();
        const publicKey = response.publicKey.toString();
        label = `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}`;
      } catch {
        label = 'IPO-holder.demo';
      }
    }
    state.connected = true;
    state.walletLabel = label;
    writeLog([
      '$ wallet connect',
      `> wallet found................ ${label}`,
      `> balances.................... ${formatNumber(state.ipoBalance)} IPO / ${state.solBalance.toFixed(2)} SOL`,
      '> mint desk ready',
    ]);
    render();
  }

  function mintDesk() {
    if (!state.connected) {
      writeLog([`$ ipo mint --desk ${state.selectedTicker} --ipo 1000000 --sol 0.25`, '> wallet required']);
      return;
    }
    if (state.remaining <= 0 || state.ipoBalance < MINT_IPO || state.solBalance < MINT_SOL) {
      writeLog([`$ ipo mint --desk ${state.selectedTicker} --ipo 1000000 --sol 0.25`, '> insufficient balance or sold out']);
      return;
    }

    const mintedDesk = deskId(state.selectedTicker, state.remaining);
    state.remaining -= 1;
    state.ipoBalance -= MINT_IPO;
    state.solBalance = Number((state.solBalance - MINT_SOL).toFixed(3));
    state.treasury = Number((state.treasury + MINT_SOL).toFixed(3));
    state.ownedDesk = mintedDesk;
    state.upgradeLevel = 0;
    writeLog([
      `$ ipo mint --desk ${state.selectedTicker} --ipo 1000000 --sol 0.25`,
      '> charging wallet............. 0.25 SOL',
      '> locking IPO................. 1,000,000 IPO',
      `> metaplex core asset......... ${mintedDesk}`,
      `> treasury.................... ${state.treasury.toFixed(2)} SOL`,
      '> status...................... minted',
    ]);
    render();
  }

  function upgradeDesk() {
    const next = upgrades[state.upgradeLevel];
    if (!state.ownedDesk || !next) {
      writeLog(['$ ipo desk upgrade', state.ownedDesk ? '> desk already maxed' : '> mint a desk first']);
      return;
    }
    if (state.ipoBalance < next[1] || state.solBalance < next[2]) {
      writeLog(['$ ipo desk upgrade', '> not enough IPO or SOL for next upgrade']);
      return;
    }

    state.ipoBalance -= next[1];
    state.solBalance = Number((state.solBalance - next[2]).toFixed(3));
    state.treasury = Number((state.treasury + next[2]).toFixed(3));
    state.upgradeLevel += 1;
    writeLog([
      `$ ipo upgrade --desk ${state.ownedDesk} --level ${state.upgradeLevel}`,
      `> upgrade..................... ${next[0]}`,
      `> IPO spent................... ${formatNumber(next[1])}`,
      `> SOL fee..................... ${next[2].toFixed(2)}`,
      `> perk........................ ${next[3]}`,
      '> status...................... upgraded',
    ]);
    render();
  }

  function createRental() {
    if (!state.ownedDesk) {
      writeLog(['$ ipo rent create', '> mint a desk before listing rentals']);
      return;
    }
    const days = Math.max(1, Math.min(30, Number(el('rentalDaysInput')?.value || 7)));
    const price = Math.max(0.001, Number(el('rentPriceInput')?.value || 0.018));
    writeLog([
      `$ ipo rent create --desk ${state.ownedDesk} --days ${days} --price ${price.toFixed(3)}`,
      '> checking owner.............. ok',
      `> renter access............... ${feeds[state.selectedTicker]}`,
      `> lease total................. ${(days * price).toFixed(3)} SOL`,
      `> lease url................... desk://${state.ownedDesk}/rent/${days}d`,
      '> status...................... listed',
    ]);
  }

  function handleClick(event) {
    const target = event.target instanceof Element ? event.target.closest('button') : null;
    if (!target) return;
    if (target.id === 'connectOrMintButton') {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (state.connected) mintDesk();
      else void connectWallet();
    } else if (target.id === 'mintButton') {
      event.preventDefault();
      event.stopImmediatePropagation();
      mintDesk();
    } else if (target.id === 'upgradeButton') {
      event.preventDefault();
      event.stopImmediatePropagation();
      upgradeDesk();
    } else if (target.id === 'rentalButton') {
      event.preventDefault();
      event.stopImmediatePropagation();
      createRental();
    } else if (target.dataset.deskTicker) {
      event.preventDefault();
      event.stopImmediatePropagation();
      state.selectedTicker = target.dataset.deskTicker;
      render();
    }
  }

  function init() {
    if (document.documentElement.getAttribute('data-ipo-controls-ready') === 'true') return;
    document.documentElement.setAttribute('data-ipo-controls-ready', 'true');
    document.addEventListener('click', handleClick, true);
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

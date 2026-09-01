import Link from 'next/link';

const levelRows = [
  ['L1', 'Lead Sheet', '150,000 IPO', '0.03 SOL', '1.35x'],
  ['L2', 'Cold Caller', '250,000 IPO', '0.04 SOL', '1.70x'],
  ['L3', 'Pitch Deck', '400,000 IPO', '0.06 SOL', '2.05x'],
  ['L4', 'KYC Desk', '650,000 IPO', '0.08 SOL', '2.40x'],
  ['L5', 'Broker License', '1,000,000 IPO', '0.11 SOL', '2.75x'],
  ['L6', 'Treasury Line', '1,500,000 IPO', '0.15 SOL', '3.10x'],
  ['L7', 'Market Maker', '2,250,000 IPO', '0.21 SOL', '3.45x'],
  ['L8', 'Bookrunner', '3,300,000 IPO', '0.30 SOL', '3.80x'],
  ['L9', 'Syndicate Room', '4,800,000 IPO', '0.42 SOL', '4.15x'],
  ['L10', 'Bell Ring', '7,000,000 IPO', '0.60 SOL', '4.50x'],
];

function Status({ live = false }: { live?: boolean }) {
  return <span className={`statusBadge ${live ? 'live' : ''}`}>{live ? 'LIVE' : 'COMING SOON'}</span>;
}

export default function DocsPage() {
  return (
    <main className="docsPage">
      <nav className="topbar" aria-label="Documentation">
        <Link className="brand" href="/" aria-label="IPO Floor home"><span className="brandMark" />IPO</Link>
        <div className="navLinks"><Link href="/">Home</Link><a href="#levels">Levels</a><a href="#faq">FAQ</a></div>
      </nav>

      <header className="docsHero">
        <p className="eyebrow">IPO Floor docs</p>
        <h1>PUBLIC DOCUMENTATION</h1>
        <p>What is live, what is coming soon, and how the holder-priority model is intended to work.</p>
      </header>

      <div className="docsLayout">
        <aside className="docsNav" aria-label="On this page">
          {['overview', 'desks', 'markets-docs', 'mint-lock', 'levels', 'holder-priority', 'allocation-pool', 'launchpad-docs', 'rentals', 'ownership', 'faq'].map((id) => (
            <a href={`#${id}`} key={id}>{id.replaceAll('-', ' ')}</a>
          ))}
        </aside>

        <div className="docsContent">
          <section id="overview">
            <p className="eyebrow">Overview</p>
            <h2>Own an insider desk.</h2>
            <p>IPO Floor is a 333-piece Metaplex Core collection built around three themed markets and a 3.3% holder-priority pool for future IPO Floor launches.</p>
            <div className="statusRows"><div><Status live /><p>Public website, collection previews, docs, and wallet connection.</p></div><div><Status /><p>On-chain mint, upgrades, allocation rounds, launchpad, and rentals.</p></div></div>
          </section>

          <section id="desks">
            <p className="eyebrow">333 desks</p>
            <h2>Fixed supply.</h2>
            <p>The collection supply is 333 anonymous insider desks. Each visual uses a consistent centered insider silhouette, with rarity and progression expressed through the workstation and environment.</p>
          </section>

          <section id="markets-docs">
            <p className="eyebrow">GTA / NLNK / ANTH</p>
            <h2>Three themed markets.</h2>
            <div className="docsMarketGrid"><article><strong>GTA</strong><p>Entertainment / gaming market</p></article><article><strong>NLNK</strong><p>Deep-tech market</p></article><article><strong>ANTH</strong><p>Frontier-AI market</p></article></div>
            <p>Separate market utility has not been finalized. No additional market-specific benefit is currently promised.</p>
          </section>

          <section id="mint-lock">
            <p className="eyebrow">Mint + IPO lock</p>
            <h2>0.25 SOL + 1,000,000 $IPO.</h2>
            <p>The planned mint requires 0.25 SOL and locks 1,000,000 $IPO. Normal network fees may apply.</p>
            <Status />
          </section>

          <section id="levels">
            <p className="eyebrow">Levels 1–10</p>
            <h2>Upgrade economics.</h2>
            <p>An unupgraded desk begins at Base with 1.00x allocation weight. These ten upgrade costs preserve the existing economics.</p>
            <div className="levelTableWrap"><table className="levelTable"><thead><tr><th>Level</th><th>Upgrade</th><th>IPO cost</th><th>SOL fee</th><th>Weight</th></tr></thead><tbody>{levelRows.map((row) => <tr key={row[0]}>{row.map((cell) => <td key={cell}>{cell}</td>)}</tr>)}</tbody></table></div>
            <Status />
          </section>

          <section id="holder-priority">
            <p className="eyebrow">Holder priority</p>
            <h2>Level determines weight.</h2>
            <p>Desk holders are intended to receive priority inside the holder allocation. Higher desk levels carry more relative weight inside that pool. Exact round execution is not live.</p>
            <Status />
          </section>

          <section id="allocation-pool">
            <p className="eyebrow">3.3% allocation pool</p>
            <h2>Every IPO Floor launch reserves 3.3% for desk holders.</h2>
            <p>The 3.3% figure describes the planned holder pool, not a guaranteed individual allocation. Each holder&apos;s share depends on the final round rules and their level-based weight.</p>
            <Status />
          </section>

          <section id="launchpad-docs">
            <p className="eyebrow">Launchpad</p>
            <h2>Application to holder pool.</h2>
            <p>Project applies → project review / KYC → token launches → 3.3% holder pool → desk holders receive priority based on level.</p>
            <p>Project acceptance, launch timing, and individual allocations are not guaranteed.</p>
            <Status />
          </section>

          <section id="rentals">
            <p className="eyebrow">Rentals</p>
            <h2>Desk rentals.</h2>
            <p>Rentals are not currently functional. Terms, renter rights, payment flow, and allocation treatment have not been finalized.</p>
            <Status />
          </section>

          <section id="ownership">
            <p className="eyebrow">Transfer / ownership</p>
            <h2>Metaplex Core ownership.</h2>
            <p>After on-chain minting is implemented, each desk is intended to be represented by a Metaplex Core asset held by the owner&apos;s wallet. Transfer behavior will follow the final deployed asset configuration.</p>
            <Status />
          </section>

          <section id="faq">
            <p className="eyebrow">FAQ</p>
            <h2>Short answers.</h2>
            <div className="faqList"><article><h3>Can I mint now?</h3><p>No. Wallet connection is live; the on-chain mint transaction is coming soon.</p></article><article><h3>Is the 3.3% an individual guarantee?</h3><p>No. It is the planned total holder pool. Individual weight depends on level and final round rules.</p></article><article><h3>Do GTA, NLNK, and ANTH have separate live benefits?</h3><p>No separate market-specific benefits are currently implemented.</p></article><article><h3>Can I rent a desk?</h3><p>Not yet. Rentals are coming soon.</p></article></div>
          </section>
        </div>
      </div>
    </main>
  );
}

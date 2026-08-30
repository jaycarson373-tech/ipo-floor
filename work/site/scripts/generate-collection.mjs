import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';

const outDir = new URL('../public/collection/', import.meta.url);
const imageDir = new URL('./images/', outDir);
const metadataDir = new URL('./metadata/', outDir);

const companies = [
  { ticker: 'GTA', name: 'GTA', accent: '#b7ff36', accent2: '#ff4f9a', warm: '#f5d14c' },
  { ticker: 'NLNK', name: 'Neuralink', accent: '#39d6ff', accent2: '#9d8cff', warm: '#e7f8ff' },
  { ticker: 'ANTH', name: 'Anthropic', accent: '#ffc83d', accent2: '#ff7a35', warm: '#fff1bd' },
];

const rarityBands = [
  ['Common', 1, 180],
  ['Uncommon', 181, 250],
  ['Rare', 251, 305],
  ['Epic', 306, 328],
  ['Mythic', 329, 333],
];
const scores = { Common: 1, Uncommon: 2, Rare: 3, Epic: 4, Mythic: 5 };
const statuses = ['Intern', 'Analyst', 'Trader', 'Insider', 'Partner'];

const traitPools = {
  clothing: [
    ['black hoodie', '#101413', true, 1],
    ['grey hoodie', '#343b3b', true, 1],
    ['green hoodie', '#234221', true, 1],
    ['oversized hoodie', '#171b1c', true, 1],
    ['bomber jacket', '#202527', false, 2],
    ['trader vest', '#222820', false, 2],
    ['dark suit', '#18191f', false, 3],
    ['luxury coat', '#2a2420', false, 4],
  ],
  identity: [
    ['complete shadow', '#040606', true, 1],
    ['black mask', '#080909', true, 1],
    ['balaclava', '#0b0d0d', false, 1],
    ['reflective glasses and shadow', '#050707', true, 2],
    ['pixelated face', '#101313', false, 2],
    ['monitor reflection', '#071113', true, 3],
    ['bandana mask', '#11100e', true, 3],
    ['anonymous helmet', '#10171a', false, 5],
  ],
  eyewear: [
    ['none', 1],
    ['clear glasses', 1],
    ['dark glasses', 1],
    ['green terminal glasses', 2],
    ['reflective shades', 3],
    ['night-vision glasses', 5],
  ],
  desk: [
    ['cheap wooden desk', '#3a2418', 1],
    ['black workstation', '#111616', 1],
    ['metal trading desk', '#22282a', 2],
    ['glass desk', '#101b1d', 3],
    ['institutional desk', '#181e1d', 4],
    ['executive desk', '#2a241e', 5],
  ],
  monitor: [
    ['laptop', 1, false, 1],
    ['single monitor', 1, false, 1],
    ['dual monitor', 2, false, 1],
    ['triple monitor', 3, false, 2],
    ['4 monitor', 4, true, 3],
    ['6 monitor', 6, true, 4],
    ['terminal wall', 8, true, 5],
    ['command center', 10, true, 5],
  ],
  room: [
    ['bedroom', false, 1],
    ['basement', false, 1],
    ['small office', false, 1],
    ['trading floor', true, 3],
    ['server room', true, 3],
    ['penthouse', true, 4],
    ['executive office', true, 4],
    ['underground bunker', true, 5],
  ],
  screen: ['new IPO feed', 'charts', 'wallet tracker', 'Pump.fun feed', 'insider flow', 'order book', 'token scanner', 'multiple feeds'],
  item: ['coffee', 'energy drink', 'burner phone', 'multiple phones', 'notebook', 'confidential folder', 'hardware wallet', 'cash', 'laptop'],
  lighting: [
    ['green terminal glow', '#b7ff36', 1],
    ['blue monitor glow', '#39d6ff', 1],
    ['red market glow', '#ff4f57', 2],
    ['warm office light', '#f0b65a', 2],
    ['city-night lighting', '#7e88ff', 3],
    ['blackout room', '#9cff5e', 3],
    ['gold lighting', '#ffc83d', 5],
  ],
  background: [
    ['plain office', 1],
    ['city skyline', 2],
    ['charts wall', 2],
    ['server racks', 3],
    ['rainy skyline', 3],
    ['trading floor', 3],
    ['giant terminal wall', 4],
  ],
  special: [
    ['none', 1],
    ['confidential IPO documents', 2],
    ['multiple burner phones', 3],
    ['giant server rack', 3],
    ['wall of monitors', 4],
    ['penthouse view', 4],
    ['whale wallet screen', 5],
    ['INSIDER terminal', 5],
  ],
  access: ['floor pass', 'private queue', 'holder lane', 'syndicate line', 'partner room'],
};

const hashNumber = (input) => createHash('sha256').update(input).digest().readUInt32BE(0);
const rarity = (serial) => rarityBands.find(([, min, max]) => serial >= min && serial <= max)[0];
const idx = (seed, offset, length) => (((seed ^ Math.imul(offset + 1, 2654435761)) >>> 0) % length);
const pick = (list, seed, offset = 0) => list[idx(seed, offset, list.length)];
const allowed = (list, score, minIndex) => list.filter((item) => item[minIndex] <= score);
const pickAllowed = (list, score, seed, offset, minIndex) => pick(allowed(list, score, minIndex), seed, offset);

function makeTraits(serial) {
  const seed = hashNumber(`ipo-floor-insider-${serial}`);
  const rarityName = rarity(serial);
  const score = scores[rarityName];
  const company = companies[(serial - 1) % companies.length];
  let room = pickAllowed(traitPools.room, score, seed, 1, 2);
  let monitor = pickAllowed(traitPools.monitor, score, seed, 2, 3);
  if (monitor[2] && !room[1]) room = pick(allowed(traitPools.room, score, 2).filter((item) => item[1]), seed, 12);
  const identity = pickAllowed(traitPools.identity, score, seed, 3, 3);
  let eyewear = identity[2] ? pickAllowed(traitPools.eyewear, score, seed, 4, 1) : traitPools.eyewear[0];
  if (identity[0] === 'pixelated face' || identity[0] === 'anonymous helmet') eyewear = traitPools.eyewear[0];
  const deskPool = ['penthouse', 'executive office'].includes(room[0])
    ? traitPools.desk.filter((item) => item[2] >= 3 && item[2] <= score)
    : allowed(traitPools.desk, score, 2);
  const itemCount = Math.min(3 + score, traitPools.item.length);
  return {
    seed,
    company,
    rarityName,
    score,
    clothing: pickAllowed(traitPools.clothing, score, seed, 5, 3),
    identity,
    eyewear,
    desk: pick(deskPool, seed, 6),
    monitor,
    room,
    screen: pick(traitPools.screen, seed, 7),
    items: [...new Set(Array.from({ length: itemCount }, (_, i) => pick(traitPools.item, seed, 8 + i)))],
    lighting: pickAllowed(traitPools.lighting, score, seed, 18, 2),
    background: pickAllowed(traitPools.background, score, seed, 19, 1),
    special: pickAllowed(traitPools.special, score, seed, 20, 1),
    access: traitPools.access[score - 1],
  };
}

function rect(x, y, w, h, fill, stroke = '#050606', sw = 8, rx = 0, extra = '') {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`;
}
function p(d, fill, stroke = '#050606', sw = 8, extra = '') {
  return `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" ${extra}/>`;
}
function line(x1, y1, x2, y2, stroke, sw = 8, opacity = 1) {
  return `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" opacity="${opacity}" fill="none"/>`;
}

function backgroundSvg(t, level) {
  const c = t.company;
  const useTerminalWall = t.score >= 5 || (level >= 4 && t.score >= 4) || t.background[0] === 'giant terminal wall';
  if (useTerminalWall) {
    return `${rect(120, 205, 1160, 555, '#080c0c', '#1f2a29', 10, 10)}
      ${Array.from({ length: 12 }, (_, i) => rect(155 + (i % 6) * 184, 245 + Math.floor(i / 6) * 245, 145, 170, '#0d1515', c.accent, 4, 8, 'opacity=".58"')).join('')}
      ${Array.from({ length: 12 }, (_, i) => line(178 + (i % 6) * 184, 305 + Math.floor(i / 6) * 245, 278 + (i % 6) * 184, 305 + Math.floor(i / 6) * 245, t.lighting[1], 6, .55)).join('')}`;
  }
  if (t.background[0] === 'server racks' || t.room[0] === 'server room' || t.special[0] === 'giant server rack') {
    return `${rect(82, 230, 175, 550, '#0b1012', '#1d2a2b', 8, 10)}${rect(1142, 230, 175, 550, '#0b1012', '#1d2a2b', 8, 10)}
      ${Array.from({ length: 7 }, (_, i) => `${line(112, 304 + i * 62, 226, 304 + i * 62, i % 2 ? c.accent : c.accent2, 8, .38)}${line(1172, 304 + i * 62, 1286, 304 + i * 62, i % 2 ? c.accent2 : c.accent, 8, .38)}`).join('')}`;
  }
  if (t.background[0] === 'charts wall' || t.background[0] === 'trading floor') {
    return `${rect(150, 240, 1100, 455, '#080c0c', '#1f2a29', 8, 8)}
      ${Array.from({ length: 8 }, (_, i) => line(210 + i * 120, 635, 255 + i * 120, 410 - ((t.seed >> i) % 110), c.accent, 8, .52)).join('')}`;
  }
  return `<path d="M65 725V330h92v395M182 725V238h76v487M290 725V380h115v345M1060 725V282h98v443M1188 725V362h100v363" fill="#0c1111" stroke="#1c2726" stroke-width="8" opacity=".7"/>
    <path d="M88 390h48M88 468h48M202 306h34M202 382h34M1088 352h44M1088 434h44M1212 430h48" stroke="${c.accent}" stroke-width="7" opacity=".35"/>`;
}

function monitorSvg(x, y, w, h, t, label) {
  return `${rect(x, y, w, h, '#060909', '#111515', 10, 16)}
    ${rect(x + 18, y + 18, w - 36, h - 48, '#101819', t.company.accent, 4, 8, 'opacity=".88"')}
    ${line(x + 44, y + 62, x + w * .48, y + 62, t.lighting[1], 8, .85)}
    ${line(x + 44, y + 102, x + w * .67, y + 102, t.company.warm, 6, .55)}
    <path d="M${x + w * .5} ${y + h - 84}l36-46 52 36 70-78 70 86" stroke="${t.company.accent}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity=".85"/>
    <text x="${x + w / 2}" y="${y + h - 18}" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="${Math.max(14, Math.min(22, w / 12))}" fill="${t.company.warm}" opacity=".72">${label.toUpperCase()}</text>`;
}

function monitorsSvg(t, level) {
  const count = Math.min(10, t.monitor[1] + level - 1);
  const rows = count > 5 ? 2 : 1;
  const topCount = rows === 2 ? Math.ceil(count / 2) : count;
  const bottomCount = rows === 2 ? count - topCount : 0;
  const topW = count <= 3 ? 330 : Math.max(150, Math.floor(900 / topCount) - 18);
  const topStart = 700 - (topCount * topW + (topCount - 1) * 18) / 2;
  const top = Array.from({ length: topCount }, (_, i) => monitorSvg(topStart + i * (topW + 18), rows === 2 ? 230 : 280, topW, rows === 2 ? 185 : 255, t, pick(traitPools.screen, t.seed, i + level))).join('');
  const bottomW = bottomCount ? Math.max(150, Math.floor(780 / bottomCount) - 18) : 0;
  const bottomStart = 700 - (bottomCount * bottomW + (bottomCount - 1) * 18) / 2;
  const bottom = Array.from({ length: bottomCount }, (_, i) => monitorSvg(bottomStart + i * (bottomW + 18), 455, bottomW, 178, t, pick(traitPools.screen, t.seed, i + 11))).join('');
  return `${top}${bottom}`;
}

function insiderSvg(t, level) {
  const cx = 700;
  const bodyY = 690;
  const hoodFill = t.clothing[1];
  const faceFill = t.identity[1];
  const hood = t.clothing[2] || t.clothing[0].includes('hoodie');
  const bodyWidth = 270 + level * 14;
  const headY = 528;
  const head = t.identity[0] === 'anonymous helmet'
    ? rect(cx - 82, headY - 82, 164, 170, faceFill, '#050606', 12, 34)
    : `<ellipse cx="${cx}" cy="${headY}" rx="78" ry="92" fill="${faceFill}" stroke="#050606" stroke-width="10"/>`;
  const outer = hood
    ? p(`M${cx - 155} ${bodyY + 54}c22-210 74-314 155-314s133 104 155 314z`, hoodFill, '#050606', 12)
    : p(`M${cx - bodyWidth / 2} ${bodyY + 70}c42-122 112-184 ${bodyWidth / 2}-184s178 62 ${bodyWidth / 2} 184z`, hoodFill, '#050606', 12);
  const face = t.identity[0] === 'pixelated face'
    ? `${rect(cx - 56, headY - 36, 34, 34, '#111', '#050606', 3)}${rect(cx - 8, headY - 26, 36, 34, t.company.accent, '#050606', 3, 0, 'opacity=".55"')}${rect(cx + 32, headY + 10, 28, 28, '#202626', '#050606', 3)}`
    : t.identity[0] === 'bandana mask'
      ? p(`M${cx - 66} ${headY + 18}h132l-22 58h-88z`, '#18110f', t.company.accent2, 5, 'opacity=".9"')
      : t.identity[0].includes('reflection')
        ? `${p(`M${cx - 68} ${headY - 16}h54l20 28h-70z`, '#0c1716', t.company.accent, 5, 'opacity=".9"')}${p(`M${cx + 14} ${headY - 16}h54l-4 28h-70z`, '#0c1716', t.company.accent, 5, 'opacity=".9"')}`
        : line(cx - 48, headY - 10, cx + 48, headY - 10, t.company.accent, 8, .45);
  const glasses = t.eyewear[0] === 'none' ? '' : `${rect(cx - 76, headY - 28, 58, 34, '#061010', t.company.accent, 5, 10, 'opacity=".92"')}${rect(cx + 18, headY - 28, 58, 34, '#061010', t.company.accent, 5, 10, 'opacity=".92"')}${line(cx - 18, headY - 10, cx + 18, headY - 10, t.company.accent, 5, .9)}`;
  return `<ellipse cx="${cx}" cy="${bodyY + 230}" rx="${260 + level * 20}" ry="58" fill="#020303" opacity=".38"/>
    ${outer}
    ${p(`M${cx - bodyWidth / 2} ${bodyY + 50}c42-34 92-52 ${bodyWidth / 2}-52s${bodyWidth / 2 - 42} 18 ${bodyWidth / 2} 52l58 280H${cx - bodyWidth / 2 - 58}z`, hoodFill, '#050606', 12)}
    ${p(`M${cx - 104} ${bodyY + 60}c38 42 170 42 208 0l-28 112H${cx - 76}z`, '#090d0d', '#050606', 7, 'opacity=".36"')}
    ${line(cx - 54, bodyY + 80, cx - 74, bodyY + 240, t.company.accent, 5, .35)}${line(cx + 54, bodyY + 80, cx + 74, bodyY + 240, t.company.accent, 5, .35)}
    ${line(cx - 22, bodyY + 18, cx - 44, bodyY + 142, t.company.warm, 4, .55)}${line(cx + 22, bodyY + 18, cx + 44, bodyY + 142, t.company.warm, 4, .55)}
    ${head}${face}${glasses}
    ${p(`M${cx - 230} ${bodyY + 170}c-88 66-126 132-130 214h156c20-90 62-145 126-168z`, hoodFill, '#050606', 12)}
    ${p(`M${cx + 230} ${bodyY + 170}c88 66 126 132 130 214H${cx + 204}c-20-90-62-145-126-168z`, hoodFill, '#050606', 12)}`;
}

function itemSvg(kind, x, y, t) {
  if (kind === 'coffee') return `${rect(x, y, 48, 64, '#f4ead9', '#050606', 7, 12)}${p(`M${x + 48} ${y + 18}h18c18 0 18 28 0 28h-18`, 'none', '#050606', 7)}`;
  if (kind === 'energy drink') return `${rect(x, y, 34, 82, t.company.accent, '#050606', 7, 8)}${line(x + 9, y + 28, x + 25, y + 28, '#050606', 4, .6)}`;
  if (kind === 'burner phone') return `${rect(x, y, 84, 42, '#080c0c', '#050606', 7, 10)}${line(x + 14, y + 22, x + 64, y + 22, t.company.accent, 5, .75)}`;
  if (kind === 'multiple phones') return `${rect(x, y, 78, 40, '#080c0c', '#050606', 7, 10)}${rect(x + 34, y + 28, 78, 40, '#080c0c', '#050606', 7, 10)}${line(x + 46, y + 50, x + 94, y + 50, t.company.accent2, 5, .7)}`;
  if (kind === 'notebook') return `${rect(x, y, 108, 72, '#14191a', '#050606', 7, 8)}${line(x + 18, y + 25, x + 86, y + 25, t.company.warm, 4, .55)}${line(x + 18, y + 48, x + 70, y + 48, t.company.accent, 4, .55)}`;
  if (kind === 'confidential folder') return `${p(`M${x} ${y + 18}h48l18-16h88v82H${x}z`, '#d2b15a', '#050606', 7)}${line(x + 20, y + 52, x + 120, y + 52, '#050606', 4, .35)}`;
  if (kind === 'hardware wallet') return `${rect(x, y, 112, 38, '#d5d9ce', '#050606', 7, 18)}${rect(x + 72, y + 8, 28, 22, t.company.accent, '#050606', 4, 6)}`;
  if (kind === 'cash') return `${rect(x, y, 124, 58, '#9ccf7e', '#050606', 6, 6, 'transform="rotate(-6 0 0)"')}${line(x + 24, y + 30, x + 94, y + 30, '#050606', 4, .32)}`;
  return `${rect(x, y, 128, 58, '#101616', '#050606', 7, 8)}${line(x + 16, y + 28, x + 108, y + 28, t.company.accent, 5, .72)}`;
}

function deskSvg(t, level) {
  const y = 960 - level * 18;
  const items = t.items.slice(0, Math.min(t.items.length, 3 + level)).map((kind, i) => itemSvg(kind, 165 + i * 145 + ((t.seed >> i) % 26), 1045 + (i % 2) * 58, t)).join('');
  const special = t.special[0] === 'none' ? '' : itemSvg(t.special[0].includes('phone') ? 'multiple phones' : t.special[0].includes('document') ? 'confidential folder' : 'laptop', 1040, 1020, t);
  const sleeve = t.clothing[1];
  return `${p(`M130 ${y}h1140l96 330H34z`, t.desk[1], '#050606', 20)}
    <path d="M165 ${y + 28}h1070l58 210H108z" fill="#0d1111" opacity=".36"/>
    ${line(240, y + 64, 1160, y + 64, t.company.accent, 12, .48)}
    ${p(`M520 ${y + 56}c-70 38-128 82-178 134l90 42c48-52 94-86 142-104z`, sleeve, '#050606', 10)}
    ${p(`M880 ${y + 56}c70 38 128 82 178 134l-90 42c-48-52-94-86-142-104z`, sleeve, '#050606', 10)}
    ${rect(416, y + 206, 76, 42, '#e8e2d6', '#050606', 7, 16)}
    ${rect(908, y + 206, 76, 42, '#e8e2d6', '#050606', 7, 16)}
    ${rect(500, y + 95, 400, 118, '#070a0a', '#050606', 12, 18)}
    ${line(545, y + 140, 855, y + 140, t.company.accent, 13, .7)}${line(570, y + 184, 830, y + 184, t.company.warm, 10, .55)}
    ${rect(575, y + 245, 250, 54, '#080c0c', '#050606', 9, 14)}${line(608, y + 272, 792, y + 272, t.company.warm, 7, .58)}
    ${items}${special}`;
}

function svgFor(serial, level) {
  const t = makeTraits(serial);
  const c = t.company;
  const id = `${c.ticker}-${String(serial).padStart(3, '0')}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="1400" viewBox="0 0 1400 1400">
  <defs>
    <linearGradient id="room" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#040505"/><stop offset=".58" stop-color="#0b0f0e"/><stop offset="1" stop-color="#171b1a"/></linearGradient>
    <radialGradient id="glow" cx="50%" cy="47%" r="58%"><stop offset="0" stop-color="${t.lighting[1]}" stop-opacity=".62"/><stop offset=".45" stop-color="${c.accent2}" stop-opacity=".17"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="18"/></filter>
  </defs>
  <rect width="1400" height="1400" fill="url(#room)"/>
  <rect x="54" y="54" width="1292" height="1292" rx="46" fill="none" stroke="#27302f" stroke-width="16"/>
  <rect x="88" y="88" width="1224" height="1224" rx="26" fill="none" stroke="${c.accent}" stroke-width="4" opacity=".38"/>
  <circle cx="700" cy="620" r="${390 + t.score * 42 + level * 22}" fill="url(#glow)" filter="url(#soft)"/>
  ${backgroundSvg(t, level)}
  ${monitorsSvg(t, level)}
  ${insiderSvg(t, level)}
  ${deskSvg(t, level)}
  <rect x="114" y="112" width="220" height="58" rx="14" fill="#0a0d0d" stroke="${c.accent}" stroke-width="5"/>
  <text x="224" y="151" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="800" fill="${c.warm}">$IPO</text>
  <rect x="1058" y="112" width="228" height="58" rx="14" fill="#0a0d0d" stroke="#27302f" stroke-width="5"/>
  <text x="1172" y="151" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="25" font-weight="800" fill="${c.warm}">IPO #${String(serial).padStart(3, '0')}</text>
  <desc>IPO Floor anonymous insider ${id}: ${t.clothing[0]}, ${t.identity[0]}, ${t.eyewear[0]}, ${t.room[0]}, ${t.monitor[0]}, ${t.screen}, ${t.rarityName}, ${statuses[level - 1]}</desc>
</svg>`;
}

await mkdir(imageDir, { recursive: true });
await mkdir(metadataDir, { recursive: true });

for (let serial = 1; serial <= 333; serial += 1) {
  const t = makeTraits(serial);
  const id = `${t.company.ticker}-${String(serial).padStart(3, '0')}`;
  for (let level = 1; level <= 5; level += 1) {
    await writeFile(new URL(`${id}-L${level}.svg`, imageDir), svgFor(serial, level));
  }
  await writeFile(new URL(`${id}.svg`, imageDir), svgFor(serial, 1));
  await writeFile(new URL(`${id}.json`, metadataDir), `${JSON.stringify({
    name: `IPO Floor Insider ${id}`,
    symbol: 'IPO',
    description: 'An anonymous IPO Floor insider at a trading desk. Metaplex Core NFT for Initial Pump Offering access, upgrades, rentals, and launchpad priority.',
    image: `images/${id}.svg`,
    attributes: [
      { trait_type: 'Company Track', value: t.company.name },
      { trait_type: 'Rarity', value: t.rarityName },
      { trait_type: 'Hood / Clothing', value: t.clothing[0] },
      { trait_type: 'Face / Identity', value: t.identity[0] },
      { trait_type: 'Eyewear', value: t.eyewear[0] },
      { trait_type: 'Desk', value: t.desk[0] },
      { trait_type: 'Monitor Configuration', value: t.monitor[0] },
      { trait_type: 'Room', value: t.room[0] },
      { trait_type: 'Screen Content', value: t.screen },
      { trait_type: 'Desk Items', value: t.items.join(', ') },
      { trait_type: 'Lighting', value: t.lighting[0] },
      { trait_type: 'Background', value: t.background[0] },
      { trait_type: 'Special Trait', value: t.special[0] },
      { trait_type: 'Access / Status Visual', value: t.access },
      { trait_type: 'Upgrade Statuses', value: statuses.join(', ') },
      { trait_type: 'Insider Serial', value: serial },
    ],
    properties: {
      category: 'image',
      files: [
        { uri: `images/${id}.svg`, type: 'image/svg+xml' },
        ...Array.from({ length: 5 }, (_, i) => ({ uri: `images/${id}-L${i + 1}.svg`, type: 'image/svg+xml' })),
      ],
      upgrade_images: Array.from({ length: 5 }, (_, i) => ({ level: i + 1, status: statuses[i], uri: `images/${id}-L${i + 1}.svg` })),
      seed: `ipo-floor-insider-${serial}`,
    },
  }, null, 2)}\n`);
}

await writeFile(new URL('manifest.json', outDir), `${JSON.stringify({
  name: 'IPO Floor Insider Collection',
  symbol: 'IPO',
  standard: 'Metaplex Core',
  supply: 333,
  artDirection: 'IPO FLOOR: 333 anonymous insiders. Every insider has a desk. Every desk has access. Burn IPO to move up the floor.',
  traitCategories: [
    'Hood / Clothing',
    'Face / Identity',
    'Eyewear',
    'Desk',
    'Monitor Configuration',
    'Room',
    'Screen Content',
    'Desk Items',
    'Lighting',
    'Background',
    'Special Trait',
    'Access / Status Visual',
  ],
  upgradeStatuses: statuses,
  mintPrice: { sol: 0.25, ipo: 1000000 },
  companies: companies.map(({ ticker, name }) => ({ ticker, name })),
  rarities: rarityBands.map(([name, min, max]) => ({ name, min, max })),
  generatedAt: new Date().toISOString(),
}, null, 2)}\n`);

console.log('Generated 333 IPO Floor anonymous insider NFTs with deterministic traits and 5 upgrade art levels each.');

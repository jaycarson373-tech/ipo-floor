import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

/* eslint-disable @typescript-eslint/no-unused-vars */

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
  const premium = t.score >= 4 || level >= 4;
  const server = t.room[0].includes('server') || t.background[0] === 'server racks' || t.special[0] === 'giant server rack';
  const skyline = t.room[0] === 'penthouse' || t.background[0].includes('skyline') || t.special[0] === 'penthouse view';
  const wall = t.score >= 5 || t.background[0] === 'giant terminal wall' || level >= 5;
  const sidePanels = Array.from({ length: premium ? 6 : 3 }, (_, i) => {
    const left = 92 + i * 74;
    const right = 1308 - i * 74;
    const h = 260 + ((t.seed >> i) % 120);
    return `${rect(left, 302 + i * 18, 42, h, '#0b1111', '#20302e', 3, 5, 'opacity=".58"')}
      ${rect(right - 42, 302 + i * 18, 42, h, '#0b1111', '#20302e', 3, 5, 'opacity=".58"')}`;
  }).join('');
  const skylineView = skyline
    ? `<rect x="150" y="168" width="1100" height="420" rx="22" fill="#070b10" stroke="#22302e" stroke-width="5" opacity=".86"/>
      <path d="M190 548V420h54v128M270 548V342h78v206M382 548V392h62v156M948 548V370h86v178M1062 548V314h72v234M1166 548V430h44v118" fill="#121a1d" opacity=".92"/>
      <path d="M178 284c170 72 310 72 478 8s344-78 566 6" stroke="${c.accent}" stroke-width="5" opacity=".24" fill="none"/>`
    : '';
  const rackView = server
    ? `${rect(116, 250, 136, 430, '#080d0e', '#1c2a29', 5, 8, 'opacity=".78"')}
      ${rect(1148, 250, 136, 430, '#080d0e', '#1c2a29', 5, 8, 'opacity=".78"')}
      ${Array.from({ length: 6 }, (_, i) => `${line(142, 310 + i * 54, 226, 310 + i * 54, i % 2 ? c.accent2 : c.accent, 4, .42)}${line(1174, 310 + i * 54, 1258, 310 + i * 54, i % 2 ? c.accent : c.accent2, 4, .42)}`).join('')}`
    : '';
  const terminalWall = wall
    ? `${rect(202, 190, 996, 390, '#070b0b', '#20302e', 5, 18, 'opacity=".62"')}
      ${Array.from({ length: 10 }, (_, i) => {
        const x = 238 + (i % 5) * 184;
        const y = 224 + Math.floor(i / 5) * 162;
        return `${rect(x, y, 136, 104, '#0c1515', '#243331', 2, 8, 'opacity=".76"')}${line(x + 18, y + 34, x + 94, y + 34, i % 2 ? c.accent2 : c.accent, 4, .52)}`;
      }).join('')}`
    : '';
  return `<rect x="72" y="72" width="1256" height="1256" rx="38" fill="#070909" stroke="#1d2624" stroke-width="8"/>
    <rect x="104" y="104" width="1192" height="1192" rx="28" fill="url(#room)" stroke="${c.accent}" stroke-width="2" opacity=".84"/>
    ${sidePanels}${skylineView}${rackView}${terminalWall}
    <ellipse cx="700" cy="618" rx="${410 + t.score * 34}" ry="${250 + level * 20}" fill="url(#glow)" opacity=".9"/>
    <path d="M116 724h1168" stroke="${c.accent}" stroke-width="2" opacity=".18"/>
    <path d="M210 1190h980" stroke="#26312f" stroke-width="3" opacity=".55"/>`;
}

function monitorSvg(x, y, w, h, t, label, tilt = 0) {
  const screen = `<g transform="rotate(${tilt} ${x + w / 2} ${y + h / 2})">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="#050707" stroke="#1a2423" stroke-width="8"/>
    <rect x="${x + 18}" y="${y + 18}" width="${w - 36}" height="${h - 44}" rx="10" fill="url(#screen)" stroke="${t.company.accent}" stroke-width="3" opacity=".93"/>
    <path d="M${x + 44} ${y + 62}h${w * .32}M${x + 44} ${y + 104}h${w * .52}M${x + 44} ${y + 146}h${w * .24}" stroke="${t.lighting[1]}" stroke-width="7" stroke-linecap="round" opacity=".7"/>
    <path d="M${x + w * .42} ${y + h - 76}l34-42 50 32 58-66 70 78" stroke="${t.company.accent}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity=".82"/>
    <text x="${x + w / 2}" y="${y + h - 16}" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="${Math.max(12, Math.min(18, w / 14))}" fill="${t.company.warm}" opacity=".58">${label.toUpperCase()}</text>
  </g>`;
  return screen;
}

function monitorsSvg(t, level) {
  const count = Math.min(9, t.monitor[1] + level - 1);
  if (count <= 2) {
    return `${monitorSvg(218, 310, 320, 240, t, t.screen, -3)}
      ${monitorSvg(862, 310, 320, 240, t, pick(traitPools.screen, t.seed, 41), 3)}`;
  }
  if (count <= 4) {
    return `${monitorSvg(144, 292, 280, 212, t, pick(traitPools.screen, t.seed, 31), -4)}
      ${monitorSvg(430, 252, 250, 194, t, t.screen, -1)}
      ${monitorSvg(720, 252, 250, 194, t, pick(traitPools.screen, t.seed, 33), 1)}
      ${monitorSvg(976, 292, 280, 212, t, pick(traitPools.screen, t.seed, 34), 4)}`;
  }
  const top = Array.from({ length: Math.min(count, 5) }, (_, i) => monitorSvg(132 + i * 232, 220 + (i % 2) * 24, 200, 156, t, pick(traitPools.screen, t.seed, 50 + i), i - 2)).join('');
  const bottom = Array.from({ length: Math.min(count - 5, 4) }, (_, i) => monitorSvg(246 + i * 234, 410, 202, 152, t, pick(traitPools.screen, t.seed, 60 + i), i % 2 ? 2 : -2)).join('');
  return `${top}${bottom}`;
}

function insiderSvg(t) {
  const cx = 700;
  const hoodFill = t.clothing[1];
  const accent = t.company.accent;
  const suitMode = ['dark suit', 'luxury coat', 'trader vest', 'bomber jacket'].includes(t.clothing[0]);
  const torsoFill = suitMode ? '#101415' : hoodFill;
  const torsoShade = suitMode ? '#070a0a' : '#0e2113';
  const inner = '#040606';
  const faceCore = t.identity[0] === 'pixelated face'
    ? `<rect x="646" y="544" width="44" height="34" fill="#101716" opacity=".95"/><rect x="696" y="534" width="52" height="38" fill="${accent}" opacity=".26"/><rect x="668" y="594" width="76" height="20" fill="#0e1514" opacity=".9"/>`
    : t.identity[0] === 'bandana mask'
      ? `<path d="M620 586h160l-34 70H654z" fill="#171010" stroke="${t.company.accent2}" stroke-width="4" opacity=".86"/>`
      : t.identity[0].includes('reflection')
        ? `<path d="M622 548h64l26 34h-88zM714 548h64l-2 34h-88z" fill="#0b1a19" stroke="${accent}" stroke-width="4" opacity=".76"/>`
        : `<path d="M632 568h136" stroke="${accent}" stroke-width="6" stroke-linecap="round" opacity=".32"/><path d="M666 626h68" stroke="#17201e" stroke-width="6" stroke-linecap="round" opacity=".9"/>`;
  const eyewear = t.eyewear[0] === 'none' ? '' : `<g opacity=".88">
    <rect x="608" y="538" width="78" height="38" rx="9" fill="#071010" stroke="${accent}" stroke-width="4"/>
    <rect x="714" y="538" width="78" height="38" rx="9" fill="#071010" stroke="${accent}" stroke-width="4"/>
    <path d="M686 558h28" stroke="${accent}" stroke-width="4"/>
  </g>`;
  const jacketLines = suitMode
    ? `<path d="M566 748l86 300h-146l-88-250zM834 748l-86 300h146l88-250z" fill="#070909" opacity=".62"/>
      <path d="M630 746l54 252M770 746l-54 252" stroke="${t.company.warm}" stroke-width="4" opacity=".24"/>`
    : `<path d="M612 760c28 34 56 52 88 52s60-18 88-52" stroke="${accent}" stroke-width="5" opacity=".2" fill="none"/>
      <path d="M584 824l-28 214M816 824l28 214" stroke="${t.company.warm}" stroke-width="4" opacity=".18"/>`;
  return `<g filter="url(#portraitShadow)">
    <ellipse cx="700" cy="1062" rx="372" ry="86" fill="#000" opacity=".48"/>
    <path d="M400 1092c20-132 84-244 188-318 34-24 72-42 112-52 40 10 78 28 112 52 104 74 168 186 188 318z" fill="${torsoFill}" stroke="#050606" stroke-width="9"/>
    <path d="M500 1092c8-118 52-214 132-288 24-22 46-38 68-48 22 10 44 26 68 48 80 74 124 170 132 288z" fill="${torsoShade}" opacity=".5"/>
    <path d="M536 650c8-138 74-244 164-268 90 24 156 130 164 268-34-40-88-66-164-66s-130 26-164 66z" fill="${hoodFill}" stroke="#050606" stroke-width="10"/>
    <path d="M584 650c14-112 58-184 116-198 58 14 102 86 116 198-34-22-72-34-116-34s-82 12-116 34z" fill="#09100f" stroke="#050606" stroke-width="6" opacity=".96"/>
    <path d="M600 596c30-42 64-62 100-62s70 20 100 62c2 82-32 136-100 160-68-24-102-78-100-160z" fill="${inner}" stroke="#050606" stroke-width="5"/>
    <ellipse cx="700" cy="596" rx="96" ry="64" fill="${accent}" opacity=".08"/>
    <path d="M616 522c48-48 120-48 168 0" stroke="${accent}" stroke-width="4" stroke-linecap="round" opacity=".18" fill="none"/>
    ${faceCore}${eyewear}
    <path d="M560 734c40-36 86-54 140-54s100 18 140 54" stroke="${accent}" stroke-width="6" stroke-linecap="round" opacity=".24" fill="none"/>
    ${jacketLines}
    <path d="M606 790c26 44 58 66 94 66s68-22 94-66" stroke="${accent}" stroke-width="5" opacity=".18" fill="none"/>
    <path d="M674 806v260M726 806v260" stroke="${t.company.warm}" stroke-width="4" opacity=".2"/>
    <path d="M438 968c-84 22-150 66-198 132h228c44-42 92-70 144-84z" fill="${torsoFill}" stroke="#050606" stroke-width="8"/>
    <path d="M962 968c84 22 150 66 198 132H932c-44-42-92-70-144-84z" fill="${torsoFill}" stroke="#050606" stroke-width="8"/>
    <path d="M250 1098h900" stroke="${accent}" stroke-width="5" stroke-linecap="round" opacity=".16"/>
  </g>`;
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
  const y = 962 - level * 14;
  const items = t.items.slice(0, Math.min(t.items.length, 2 + level)).map((kind, i) => itemSvg(kind, 172 + i * 142 + ((t.seed >> i) % 22), 1084 + (i % 2) * 48, t)).join('');
  const special = t.special[0] === 'none' ? '' : itemSvg(t.special[0].includes('phone') ? 'multiple phones' : t.special[0].includes('document') ? 'confidential folder' : 'laptop', 1052, 1052, t);
  return `<g>
    <path d="M142 ${y}h1116l104 304H38z" fill="url(#deskTop)" stroke="#050606" stroke-width="10" stroke-linejoin="round"/>
    <path d="M184 ${y + 28}h1032l58 176H126z" fill="#0f1514" opacity=".46"/>
    <path d="M258 ${y + 52}h884" stroke="${t.company.accent}" stroke-width="7" stroke-linecap="round" opacity=".54"/>
    <path d="M514 ${y + 36}c-58 30-108 72-148 126l92 40c38-42 82-70 132-88z" fill="${t.clothing[1]}" stroke="#050606" stroke-width="7"/>
    <path d="M886 ${y + 36}c58 30 108 72 148 126l-92 40c-38-42-82-70-132-88z" fill="${t.clothing[1]}" stroke="#050606" stroke-width="7"/>
    <rect x="416" y="${y + 190}" width="82" height="42" rx="18" fill="#d9d3c8" stroke="#050606" stroke-width="5"/>
    <rect x="902" y="${y + 190}" width="82" height="42" rx="18" fill="#d9d3c8" stroke="#050606" stroke-width="5"/>
    <rect x="492" y="${y + 90}" width="416" height="116" rx="18" fill="#070a0a" stroke="#050606" stroke-width="8"/>
    <path d="M540 ${y + 130}h320M572 ${y + 170}h256" stroke="${t.company.accent}" stroke-width="9" stroke-linecap="round" opacity=".62"/>
    <rect x="574" y="${y + 238}" width="252" height="52" rx="13" fill="#080c0c" stroke="#050606" stroke-width="6"/>
    <path d="M610 ${y + 265}h180" stroke="${t.company.warm}" stroke-width="5" stroke-linecap="round" opacity=".48"/>
    ${items}${special}
  </g>`;
}

const visualStages = [
  { slug: 'common', room: 'bedroom desk', monitors: 'dual monitor', desk: 'basic black desk', items: 'coffee' },
  { slug: 'uncommon', room: 'private office', monitors: 'triple monitor', desk: 'professional workstation', items: 'coffee, burner phone' },
  { slug: 'rare', room: 'institutional trading room', monitors: 'four monitor', desk: 'institutional desk', items: 'confidential folder' },
  { slug: 'epic', room: 'elite trading floor', monitors: 'six monitor', desk: 'elite trading desk', items: 'multiple burner phones, confidential folder' },
  { slug: 'mythic', room: 'executive command center', monitors: 'terminal wall', desk: 'executive desk', items: 'multiple burner phones, confidential IPO documents' },
];

function visualStageFor(t, level) {
  return visualStages[Math.max(t.score, level) - 1];
}

function overlayFor(serial, level) {
  const t = makeTraits(serial);
  const c = t.company;
  const id = `${c.ticker}-${String(serial).padStart(3, '0')}`;
  const stage = visualStageFor(t, level);
  const chartOffset = 92 + (t.seed % 110);
  const chartPeak = 155 + ((t.seed >>> 8) % 90);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900">
  <defs>
    <linearGradient id="marketTint" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c.accent}" stop-opacity=".10"/>
      <stop offset=".55" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="${c.accent2}" stop-opacity=".08"/>
    </linearGradient>
    <linearGradient id="plaque" x1="0" x2="1"><stop stop-color="#070909" stop-opacity=".94"/><stop offset="1" stop-color="#111716" stop-opacity=".82"/></linearGradient>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#000" flood-opacity=".75"/></filter>
  </defs>
  <rect width="900" height="900" fill="url(#marketTint)"/>
  <path d="M64 ${chartOffset} C160 ${chartOffset - 26}, 212 ${chartPeak + 26}, 302 ${chartPeak} S462 ${chartPeak - 42}, 540 ${chartPeak - 20}" fill="none" stroke="${c.accent}" stroke-width="3" opacity=".16"/>
  <g filter="url(#shadow)">
    <rect x="34" y="810" width="205" height="54" rx="7" fill="url(#plaque)" stroke="${c.accent}" stroke-width="2" opacity=".95"/>
    <text x="54" y="845" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="20" font-weight="800" fill="#f4efe4">IPO #${String(serial).padStart(3, '0')}</text>
    <text x="850" y="845" text-anchor="end" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="18" font-weight="800" fill="${c.accent}" opacity=".9">${c.ticker}</text>
  </g>
  <desc>IPO Floor anonymous insider ${id}. ${t.rarityName}. ${stage.room}. ${stage.monitors}. ${statuses[level - 1]}.</desc>
</svg>`;
}

await mkdir(imageDir, { recursive: true });
await mkdir(metadataDir, { recursive: true });

const stageImages = new Map();
for (const stage of visualStages) {
  const source = await readFile(new URL(`../public/collection/bases/${stage.slug}.png`, import.meta.url));
  stageImages.set(stage.slug, await sharp(source).resize(900, 900, { fit: 'cover' }).toBuffer());
}

async function generateInsider(serial) {
  const t = makeTraits(serial);
  const id = `${t.company.ticker}-${String(serial).padStart(3, '0')}`;
  const baseVisual = visualStageFor(t, 1);
  let baseImage;
  for (let level = 1; level <= 5; level += 1) {
    const stage = visualStageFor(t, level);
    const image = await sharp(stageImages.get(stage.slug))
      .composite([{ input: Buffer.from(overlayFor(serial, level)), blend: 'over' }])
      .webp({ quality: 75, effort: 0 })
      .toBuffer();
    await writeFile(new URL(`${id}-L${level}.webp`, imageDir), image);
    if (level === 1) baseImage = image;
  }
  await writeFile(new URL(`${id}.webp`, imageDir), baseImage);
  await writeFile(new URL(`${id}.json`, metadataDir), `${JSON.stringify({
    name: `IPO Floor Insider ${id}`,
    symbol: 'IPO',
    description: 'An anonymous IPO Floor insider at a trading desk. Part of a planned 333-piece Metaplex Core collection for Initial Pump Offering.',
    image: `images/${id}.webp`,
    attributes: [
      { trait_type: 'Company Track', value: t.company.name },
      { trait_type: 'Rarity', value: t.rarityName },
      { trait_type: 'Hood / Clothing', value: 'black technical hoodie' },
      { trait_type: 'Face / Identity', value: 'complete shadow' },
      { trait_type: 'Eyewear', value: 'none' },
      { trait_type: 'Desk', value: baseVisual.desk },
      { trait_type: 'Monitor Configuration', value: baseVisual.monitors },
      { trait_type: 'Room', value: baseVisual.room },
      { trait_type: 'Screen Content', value: 'charts and order book' },
      { trait_type: 'Desk Items', value: baseVisual.items },
      { trait_type: 'Lighting', value: 'green terminal glow' },
      { trait_type: 'Background', value: baseVisual.room },
      { trait_type: 'Special Trait', value: t.score >= 4 ? 'confidential IPO documents' : 'none' },
      { trait_type: 'Access / Status Visual', value: 'level-driven workstation' },
      { trait_type: 'Upgrade Statuses', value: statuses.join(', ') },
      { trait_type: 'Insider Serial', value: serial },
    ],
    properties: {
      category: 'image',
      files: [
        { uri: `images/${id}.webp`, type: 'image/webp' },
        ...Array.from({ length: 5 }, (_, i) => ({ uri: `images/${id}-L${i + 1}.webp`, type: 'image/webp' })),
      ],
      upgrade_images: Array.from({ length: 5 }, (_, i) => ({ level: i + 1, status: statuses[i], uri: `images/${id}-L${i + 1}.webp` })),
      seed: `ipo-floor-insider-${serial}`,
    },
  }, null, 2)}\n`);
}

const serials = Array.from({ length: 333 }, (_, index) => index + 1);
for (let start = 0; start < serials.length; start += 12) {
  await Promise.all(serials.slice(start, start + 12).map(generateInsider));
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

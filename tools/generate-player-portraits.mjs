/**
 * PHASE 9.12 — Player Portrait Studio
 *
 * Generates one individual, deterministic, clearly-synthetic cricket portrait
 * per registry player, keyed by the stable player UUID.
 *
 * Outputs:
 *   apps/web/public/assets/players/{player_id}.svg
 *   apps/web/public/assets/players/player-images-manifest.json
 *   apps/web/lib/player-portrait-manifest.ts
 *   PHASE_9_12_PLAYER_IMAGE_INVENTORY.csv
 *   PHASE_9_12_GENERATION_AUDIT.json
 *
 * No authentic photographs are claimed. Every asset is labelled GENERATED_PORTRAIT
 * because no licensed photographic source is configured for this project.
 */

import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(import.meta.dirname, '..');
const registry = require(path.join(ROOT, 'packages/data-ingestion/dist/data/index.js')).GLOBAL_CRICKET_PLAYER_REGISTRY;

const OUT_DIR = path.join(ROOT, 'apps/web/public/assets/players');
const LIB_OUT = path.join(ROOT, 'apps/web/lib/player-portrait-manifest.ts');
const INVENTORY_OUT = path.join(ROOT, 'PHASE_9_12_PLAYER_IMAGE_INVENTORY.csv');
const AUDIT_OUT = path.join(ROOT, 'PHASE_9_12_GENERATION_AUDIT.json');
const MANIFEST_OUT = path.join(OUT_DIR, 'player-images-manifest.json');

fs.mkdirSync(OUT_DIR, { recursive: true });

/* ------------------------------------------------------------------ *
 * Deterministic randomness
 * ------------------------------------------------------------------ */

function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRng(seedStr) {
  const seed = xmur3(seedStr)();
  const r = mulberry32(seed);
  return {
    next: r,
    range: (min, max) => min + r() * (max - min),
    int: (min, max) => Math.floor(min + r() * (max - min + 1)),
    pick: (arr) => arr[Math.floor(r() * arr.length)],
    chance: (p) => r() < p,
    weighted: (pairs) => {
      const total = pairs.reduce((s, [, w]) => s + w, 0);
      let x = r() * total;
      for (const [v, w] of pairs) {
        if ((x -= w) <= 0) return v;
      }
      return pairs[pairs.length - 1][0];
    },
  };
}

/* ------------------------------------------------------------------ *
 * Palettes
 * ------------------------------------------------------------------ */

const SKIN = {
  porcelain: { base: '#F1D4C0', shadow: '#D9B49C', light: '#FBE6D6' },
  fair: { base: '#EAC6AB', shadow: '#CFA88A', light: '#F7DCC5' },
  olive: { base: '#D8B08C', shadow: '#B98F6D', light: '#E9C6A7' },
  tan: { base: '#C3976F', shadow: '#A17852', light: '#D8B08B' },
  bronze: { base: '#AE7C52', shadow: '#8C6039', light: '#C69668' },
  brown: { base: '#93653F', shadow: '#744C2C', light: '#AC7D53' },
  deep: { base: '#74492D', shadow: '#58351F', light: '#8C5C3B' },
  ebony: { base: '#5B3923', shadow: '#422817', light: '#71492E' },
  rich: { base: '#49301F', shadow: '#332014', light: '#5D3F29' },
};

const SKIN_DISTRIBUTION = {
  India: [['fair', 8], ['olive', 22], ['tan', 32], ['bronze', 20], ['brown', 12], ['deep', 6]],
  Australia: [['porcelain', 16], ['fair', 30], ['olive', 24], ['tan', 16], ['brown', 8], ['deep', 4], ['ebony', 2]],
  England: [['porcelain', 20], ['fair', 28], ['olive', 18], ['tan', 14], ['brown', 10], ['deep', 6], ['ebony', 3], ['rich', 1]],
  'West Indies': [['rich', 30], ['ebony', 28], ['deep', 20], ['brown', 12], ['tan', 7], ['olive', 3]],
  'South Africa': [['fair', 22], ['olive', 18], ['tan', 20], ['bronze', 14], ['brown', 12], ['deep', 9], ['ebony', 5]],
  Pakistan: [['olive', 22], ['tan', 32], ['bronze', 22], ['brown', 16], ['deep', 6], ['fair', 2]],
  'New Zealand': [['porcelain', 22], ['fair', 34], ['olive', 20], ['tan', 12], ['brown', 7], ['deep', 3], ['ebony', 2]],
  'Sri Lanka': [['tan', 32], ['bronze', 30], ['brown', 22], ['deep', 12], ['olive', 4]],
  Bangladesh: [['tan', 26], ['bronze', 30], ['brown', 26], ['deep', 14], ['olive', 4]],
  Afghanistan: [['olive', 16], ['tan', 30], ['bronze', 26], ['brown', 20], ['deep', 8]],
  Zimbabwe: [['rich', 30], ['ebony', 30], ['deep', 22], ['brown', 10], ['tan', 6], ['fair', 2]],
  Ireland: [['porcelain', 30], ['fair', 34], ['olive', 18], ['tan', 10], ['brown', 5], ['deep', 3]],
  Netherlands: [['porcelain', 26], ['fair', 30], ['olive', 18], ['tan', 12], ['brown', 8], ['deep', 4], ['ebony', 2]],
  Scotland: [['porcelain', 34], ['fair', 34], ['olive', 16], ['tan', 9], ['brown', 5], ['deep', 2]],
  'United States': [['porcelain', 16], ['fair', 24], ['olive', 18], ['tan', 14], ['brown', 12], ['deep', 8], ['ebony', 5], ['rich', 3]],
  USA: [['porcelain', 16], ['fair', 22], ['olive', 18], ['tan', 14], ['brown', 12], ['deep', 9], ['ebony', 6], ['rich', 3]],
  Nepal: [['olive', 22], ['tan', 34], ['bronze', 24], ['brown', 16], ['deep', 4]],
  Oman: [['olive', 12], ['tan', 28], ['bronze', 30], ['brown', 22], ['deep', 8]],
  'United Arab Emirates': [['olive', 14], ['tan', 26], ['bronze', 28], ['brown', 22], ['deep', 10]],
  Namibia: [['fair', 16], ['olive', 14], ['tan', 18], ['bronze', 12], ['brown', 14], ['deep', 12], ['ebony', 10], ['rich', 4]],
};

const HAIR = {
  black: { base: '#17120F', shadow: '#0A0806', light: '#3A2E27' },
  'dark brown': { base: '#2B1D14', shadow: '#180F09', light: '#4A3426' },
  brown: { base: '#41291A', shadow: '#2A190F', light: '#63422C' },
  'light brown': { base: '#5C3B23', shadow: '#3D2616', light: '#7E5535' },
  auburn: { base: '#5A2C18', shadow: '#3A1B0D', light: '#82452A' },
  'dark blond': { base: '#6E4E2C', shadow: '#4B331B', light: '#8F6A41' },
  blond: { base: '#8E6B3D', shadow: '#6A4C28', light: '#B08A56' },
  red: { base: '#6E3418', shadow: '#4A210E', light: '#95502B' },
  grey: { base: '#6E6A66', shadow: '#4E4A47', light: '#918C87' },
  'salt and pepper': { base: '#3B3633', shadow: '#262220', light: '#6C6662' },
  white: { base: '#B9B4AE', shadow: '#96908A', light: '#D5D0CA' },
  shaved: { base: '#2A2019', shadow: '#191310', light: '#3E3027' },
};

const HAIR_DISTRIBUTION = [
  ['black', 34], ['dark brown', 26], ['brown', 20], ['light brown', 8],
  ['auburn', 3], ['dark blond', 4], ['blond', 2], ['red', 1], ['grey', 1], ['salt and pepper', 1],
];

const IRIS = [
  ['#3A2415', 34], ['#2E1B0F', 24], ['#5A3A1F', 16], ['#6E4A28', 10],
  ['#4B5C4A', 6], ['#3E5A6B', 6], ['#5C6B78', 4],
];

const JERSEY_ACCENTS = {
  India: '#1E63C8',
  Australia: '#D4A017',
  England: '#C0392B',
  'South Africa': '#1F8A57',
  Pakistan: '#2E9E6B',
  'New Zealand': '#9AA5AE',
  'West Indies': '#8E2F3C',
  'Sri Lanka': '#2B5EA8',
  Afghanistan: '#C0392B',
  Bangladesh: '#2E7D5B',
  Zimbabwe: '#C9A227',
  Ireland: '#3FA36A',
  Netherlands: '#E07B24',
  Scotland: '#5A7FB8',
  'United States': '#2C5AA0',
  USA: '#2C5AA0',
  Nepal: '#B0343C',
  Oman: '#B0343C',
  'United Arab Emirates': '#5A7FB8',
  Namibia: '#2C6E9E',
};

/* ------------------------------------------------------------------ *
 * Age / era
 * ------------------------------------------------------------------ */

function eraFor(debutYear) {
  if (!debutYear) return 'Unknown';
  if (debutYear < 1914) return 'Golden Age (Pre-1914)';
  if (debutYear <= 1939) return 'Interwar (1919-1939)';
  if (debutYear <= 1970) return 'Post-War (1946-1970)';
  if (debutYear <= 1991) return 'Pace Revolution (1971-1991)';
  if (debutYear <= 2007) return 'Globalized (1992-2007)';
  if (debutYear <= 2020) return 'T20 Revolution (2008-2020)';
  return 'Contemporary (2021-Present)';
}

/* ------------------------------------------------------------------ *
 * Portrait construction
 * ------------------------------------------------------------------ */

const W = 480;
const H = 600;

function traitKey(meta) {
  return [meta.skin, meta.hairStyle, meta.hairColor, meta.beardStyle, meta.expression, meta.ageBand].join('|');
}

function buildPortrait(p, salt = 0) {
  const rng = makeRng(p.id + '|' + p.fullName + '|' + salt);
  const key = (p.primaryNationality || 'International').trim();
  const skinKey = rng.weighted(SKIN_DISTRIBUTION[key] || SKIN_DISTRIBUTION.England);
  const skin = SKIN[skinKey];

  const debut = p.careerDebutYear || 0;
  const currentYear = 2026;
  let ageBand;
  if (debut >= 2019) ageBand = rng.chance(0.75) ? 'young' : 'prime';
  else if (debut >= 2008) ageBand = rng.chance(0.45) ? 'prime' : (rng.chance(0.5) ? 'veteran' : 'young');
  else if (debut >= 1990) ageBand = rng.chance(0.6) ? 'veteran' : 'prime';
  else if (debut > 0) ageBand = 'veteran';
  else ageBand = 'prime';

  const isYoung = ageBand === 'young';
  const isVeteran = ageBand === 'veteran';

  // Continuous facial geometry (all varied per player)
  const faceH = rng.range(198, 222);
  const topY = 92 + rng.range(-8, 8);
  const chinY = topY + faceH;
  const cheekHalf = rng.range(76, 88);
  const foreheadHalf = cheekHalf * rng.range(0.86, 0.95);
  const jawHalf = cheekHalf * rng.range(0.66, 0.79);
  const chinHalf = cheekHalf * rng.range(0.3, 0.42);
  const chinDrop = rng.range(0, 7);
  const cx = W / 2 + rng.range(-3, 3);
  const headTilt = rng.range(-1.4, 1.4);

  const eyeY = topY + faceH * rng.range(0.44, 0.48);
  const eyeSpacing = rng.range(32, 40);
  const eyeW = rng.range(13, 16.5);
  const eyeH = rng.range(5.6, 7.2);
  const eyeTilt = rng.range(-1.2, 1.2);
  const irisR = rng.range(6.2, 7.6);
  const irisKey = rng.weighted(IRIS);

  const browY = eyeY - rng.range(15, 20);
  const browThickness = rng.range(5.4, 8.4);
  const browArch = rng.range(4, 9);
  const browAngle = rng.range(-1.5, 2.5);

  const noseTop = eyeY + rng.range(8, 13);
  const noseBottom = noseTop + rng.range(36, 46);
  const noseHalf = rng.range(9, 14);
  const noseTipDrop = rng.range(0, 4);

  const mouthY = noseBottom + rng.range(16, 24);
  const mouthHalf = rng.range(17, 23);
  const upperLip = rng.range(3.6, 6);
  const lowerLip = rng.range(5, 8.2);
  const expression = rng.weighted([['neutral', 46], ['soft-smile', 38], ['focused', 16]]);

  const earRY = rng.range(21, 27);
  const earRX = rng.range(9, 12.5);

  const hairStyle = rng.weighted([
    ['short-crop', 22], ['buzz', 12], ['side-part', 14], ['curly-short', 12],
    ['afro', 7], ['bald', 8], ['receding', 9], ['medium-wave', 9],
    ['tied-back', 4], ['long', 3],
  ].filter(([s]) => s !== 'afro' || ['West Indies', 'Zimbabwe', 'South Africa', 'Australia', 'England', 'United States', 'USA', 'Namibia'].includes(key))
    .filter(([s]) => s !== 'long' || isYoung || rng.chance(0.4)));

  let hairKey = rng.weighted(HAIR_DISTRIBUTION);
  if (isVeteran && rng.chance(0.55)) hairKey = rng.weighted([['grey', 40], ['salt and pepper', 46], ['white', 14]]);
  else if (!isYoung && rng.chance(0.22)) hairKey = rng.weighted([['salt and pepper', 70], ['grey', 30]]);
  if (hairStyle === 'bald') hairKey = 'shaved';
  const hair = HAIR[hairKey];

  const beardStyle = rng.weighted([
    ['clean', 34], ['stubble', 20], ['moustache', 12], ['goatee', 10],
    ['short-beard', 15], ['full-beard', 9],
  ].filter(([s]) => s !== 'full-beard' || !isYoung || rng.chance(0.3)));

  const accent = JERSEY_ACCENTS[key] || '#2E8B7A';
  const jerseyDark = shade(accent, -0.74);
  const jerseyMid = shade(accent, -0.52);

  const uid = 'p' + crypto.createHash('md5').update(p.id).digest('hex').slice(0, 10);

  const bokeh = buildBokeh(rng, accent);
  const facePath = buildFacePath({ cx, topY, chinY, foreheadHalf, cheekHalf, jawHalf, chinHalf, chinDrop });

  const shadowSide = rng.chance(0.5) ? 1 : -1;
  const rimSide = -shadowSide;

  const faceGradId = `${uid}-face`;
  const hairGradId = `${uid}-hair`;
  const jerseyGradId = `${uid}-jersey`;
  const bgGradId = `${uid}-bg`;
  const irisGradId = `${uid}-iris`;
  const shadeGradId = `${uid}-shade`;
  const vigId = `${uid}-vig`;
  const glowId = `${uid}-glow`;
  const clipId = `${uid}-clip`;
  const softId = `${uid}-soft`;
  const lipGradId = `${uid}-lip`;

  const neckTop = chinY - 12;
  const shoulderY = chinY + rng.range(66, 84);
  const shoulderHalf = rng.range(128, 146);

  const svg = [];
  svg.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(p.fullName)} portrait">`);
  svg.push('<defs>');
  svg.push(`<radialGradient id="${bgGradId}" cx="50%" cy="34%" r="78%">
    <stop offset="0%" stop-color="${shade(accent, -0.34)}"/>
    <stop offset="46%" stop-color="#101B24"/>
    <stop offset="100%" stop-color="#05090C"/>
  </radialGradient>`);
  svg.push(`<radialGradient id="${glowId}" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="${accent}" stop-opacity="0.30"/>
    <stop offset="60%" stop-color="${accent}" stop-opacity="0.07"/>
    <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
  </radialGradient>`);
  svg.push(`<radialGradient id="${faceGradId}" cx="${shadowSide > 0 ? 34 : 66}%" cy="26%" r="78%">
    <stop offset="0%" stop-color="${skin.light}"/>
    <stop offset="42%" stop-color="${skin.base}"/>
    <stop offset="100%" stop-color="${skin.shadow}"/>
  </radialGradient>`);
  svg.push(`<linearGradient id="${shadeGradId}" x1="${shadowSide > 0 ? '0%' : '100%'}" y1="0%" x2="${shadowSide > 0 ? '100%' : '0%'}" y2="0%">
    <stop offset="0%" stop-color="${skin.shadow}" stop-opacity="0"/>
    <stop offset="62%" stop-color="${skin.shadow}" stop-opacity="0.12"/>
    <stop offset="100%" stop-color="${skin.shadow}" stop-opacity="0.42"/>
  </linearGradient>`);
  svg.push(`<linearGradient id="${hairGradId}" x1="20%" y1="0%" x2="80%" y2="100%">
    <stop offset="0%" stop-color="${hair.light}"/>
    <stop offset="46%" stop-color="${hair.base}"/>
    <stop offset="100%" stop-color="${hair.shadow}"/>
  </linearGradient>`);
  svg.push(`<linearGradient id="${jerseyGradId}" x1="10%" y1="0%" x2="90%" y2="100%">
    <stop offset="0%" stop-color="${jerseyMid}"/>
    <stop offset="52%" stop-color="${jerseyDark}"/>
    <stop offset="100%" stop-color="#070D12"/>
  </linearGradient>`);
  svg.push(`<radialGradient id="${irisGradId}" cx="40%" cy="38%" r="62%">
    <stop offset="0%" stop-color="${lighten(irisKey, 0.35)}"/>
    <stop offset="55%" stop-color="${irisKey}"/>
    <stop offset="100%" stop-color="${darken(irisKey, 0.55)}"/>
  </radialGradient>`);
  svg.push(`<linearGradient id="${lipGradId}" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%" stop-color="${shade(skin.shadow, -0.16)}"/>
    <stop offset="55%" stop-color="${shade(skin.shadow, -0.28)}"/>
    <stop offset="100%" stop-color="${shade(skin.base, -0.1)}"/>
  </linearGradient>`);
  svg.push(`<radialGradient id="${vigId}" cx="50%" cy="42%" r="72%">
    <stop offset="55%" stop-color="#000" stop-opacity="0"/>
    <stop offset="100%" stop-color="#000" stop-opacity="0.62"/>
  </radialGradient>`);
  svg.push(`<filter id="${softId}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="7"/></filter>`);
  svg.push(`<filter id="${uid}-bokeh" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>`);
  svg.push(`<clipPath id="${clipId}"><path d="${facePath}"/></clipPath>`);
  svg.push('</defs>');

  // Background
  svg.push(`<rect width="${W}" height="${H}" fill="url(#bgGradId)"/>`);
  svg.push(bokeh.replace(/url\(#bokeh\)/g, `url(#${uid}-bokeh)`));
  svg.push(`<ellipse cx="${cx}" cy="${topY + faceH * 0.45}" rx="${cheekHalf * 2.4}" ry="${faceH * 1.15}" fill="url(#glowId)"/>`);

  // Shoulders / jersey
  svg.push(`<g transform="rotate(${headTilt * 0.25} ${cx} ${shoulderY})">`);
  svg.push(`<path d="M ${cx - shoulderHalf - 34} ${H} C ${cx - shoulderHalf} ${shoulderY + 30}, ${cx - 96} ${shoulderY - 12}, ${cx - 52} ${shoulderY - 22}
    L ${cx + 52} ${shoulderY - 22} C ${cx + 96} ${shoulderY - 12}, ${cx + shoulderHalf} ${shoulderY + 30}, ${cx + shoulderHalf + 34} ${H} Z" fill="url(#jerseyGradId)"/>`);
  // Sleeve seams
  svg.push(`<path d="M ${cx - shoulderHalf + 6} ${shoulderY + 44} C ${cx - shoulderHalf + 18} ${shoulderY + 96}, ${cx - shoulderHalf + 12} ${H - 40}, ${cx - shoulderHalf + 4} ${H}" fill="none" stroke="#000" stroke-opacity="0.30" stroke-width="2"/>`);
  svg.push(`<path d="M ${cx + shoulderHalf - 6} ${shoulderY + 44} C ${cx + shoulderHalf - 18} ${shoulderY + 96}, ${cx + shoulderHalf - 12} ${H - 40}, ${cx + shoulderHalf - 4} ${H}" fill="none" stroke="#000" stroke-opacity="0.30" stroke-width="2"/>`);
  // Fabric folds
  svg.push(`<path d="M ${cx - 86} ${shoulderY + 34} C ${cx - 70} ${shoulderY + 84}, ${cx - 82} ${H - 70}, ${cx - 64} ${H}" fill="none" stroke="#fff" stroke-opacity="0.045" stroke-width="10"/>`);
  svg.push(`<path d="M ${cx + 74} ${shoulderY + 22} C ${cx + 62} ${shoulderY + 90}, ${cx + 78} ${H - 62}, ${cx + 60} ${H}" fill="none" stroke="#000" stroke-opacity="0.22" stroke-width="9"/>`);
  // Collar
  svg.push(`<path d="M ${cx - 52} ${shoulderY - 22} C ${cx - 34} ${shoulderY + 2}, ${cx + 34} ${shoulderY + 2}, ${cx + 52} ${shoulderY - 22}
    C ${cx + 40} ${shoulderY - 34}, ${cx + 18} ${shoulderY - 38}, ${cx} ${shoulderY - 38}
    C ${cx - 18} ${shoulderY - 38}, ${cx - 40} ${shoulderY - 34}, ${cx - 52} ${shoulderY - 22} Z" fill="${jerseyMid}"/>`);
  svg.push(`<path d="M ${cx - 52} ${shoulderY - 22} C ${cx - 34} ${shoulderY + 2}, ${cx + 34} ${shoulderY + 2}, ${cx + 52} ${shoulderY - 22}" fill="none" stroke="${accent}" stroke-opacity="0.75" stroke-width="2.4"/>`);
  // Collar trim accent
  svg.push(`<path d="M ${cx - 47} ${shoulderY - 28} C ${cx - 33} ${shoulderY - 8}, ${cx + 33} ${shoulderY - 8}, ${cx + 47} ${shoulderY - 28}" fill="none" stroke="${accent}" stroke-opacity="0.32" stroke-width="1.4"/>`);
  // Generic crest (bat + ball), no real team branding
  svg.push(`<g transform="translate(${cx + shadowSide * 62} ${shoulderY + 74})" opacity="0.5">
    <path d="M 0 0 L 16 0 L 16 5 L 10 5 L 10 18 L 6 18 L 6 5 L 0 5 Z" fill="${accent}" opacity="0.7"/>
    <circle cx="8" cy="26" r="4.4" fill="none" stroke="${accent}" stroke-width="1.6"/>
  </g>`);
  svg.push('</g>');

  // Neck
  svg.push(`<path d="M ${cx - 30} ${neckTop} L ${cx + 30} ${neckTop} C ${cx + 34} ${shoulderY - 34}, ${cx + 46} ${shoulderY - 20}, ${cx + 56} ${shoulderY - 12}
    L ${cx - 56} ${shoulderY - 12} C ${cx - 46} ${shoulderY - 20}, ${cx - 34} ${shoulderY - 34}, ${cx - 30} ${neckTop} Z" fill="${skin.base}"/>`);
  svg.push(`<path d="M ${cx - 30} ${neckTop} L ${cx + 30} ${neckTop} C ${cx + 28} ${neckTop + 24}, ${cx + 30} ${shoulderY - 40}, ${cx + 40} ${shoulderY - 20}
    L ${cx - 40} ${shoulderY - 20} C ${cx - 30} ${shoulderY - 40}, ${cx - 28} ${neckTop + 24}, ${cx - 30} ${neckTop} Z" fill="url(#shadeGradId)" opacity="0.85"/>`);
  // Jaw cast shadow on neck
  svg.push(`<path d="M ${cx - 42} ${neckTop + 4} C ${cx - 16} ${neckTop + 26}, ${cx + 16} ${neckTop + 26}, ${cx + 42} ${neckTop + 4}
    C ${cx + 30} ${neckTop + 38}, ${cx - 30} ${neckTop + 38}, ${cx - 42} ${neckTop + 4} Z" fill="${skin.shadow}" opacity="0.55" filter="url(#${softId})"/>`);

  svg.push(`<g transform="rotate(${headTilt} ${cx} ${topY + faceH / 2})">`);

  // Ears
  for (const s of [-1, 1]) {
    const ex = cx + s * (cheekHalf - 3);
    svg.push(`<path d="M ${ex} ${eyeY + 4} C ${ex + s * (earRX + 3)} ${eyeY - 12}, ${ex + s * (earRX + 4)} ${eyeY + earRY * 0.8}, ${ex + s * 2} ${eyeY + earRY * 0.95}"
      fill="${skin.base}" stroke="${skin.shadow}" stroke-opacity="0.55" stroke-width="1.2"/>`);
    svg.push(`<path d="M ${ex + s * 3} ${eyeY + 6} C ${ex + s * (earRX - 1)} ${eyeY - 2}, ${ex + s * (earRX - 1)} ${eyeY + 12}, ${ex + s * 3} ${eyeY + 16}"
      fill="none" stroke="${skin.shadow}" stroke-opacity="0.7" stroke-width="1.6" stroke-linecap="round"/>`);
  }

  // Hair back layer
  if (['long', 'tied-back', 'afro', 'curly-short', 'medium-wave'].includes(hairStyle)) {
    svg.push(hairBack(hairStyle, { cx, topY, cheekHalf, faceH, hairGradId, hair, rng }));
  }

  // Face
  svg.push(`<path d="${facePath}" fill="url(#faceGradId)"/>`);
  svg.push(`<g clip-path="url(#${clipId})">`);
  // Broad tonal shading
  svg.push(`<rect x="${cx - cheekHalf - 10}" y="${topY - 10}" width="${cheekHalf * 2 + 20}" height="${faceH + 24}" fill="url(#shadeGradId)"/>`);
  svg.push(`<ellipse cx="${cx - shadowSide * cheekHalf * 0.42}" cy="${eyeY + 44}" rx="${cheekHalf * 0.62}" ry="${faceH * 0.2}" fill="${skin.light}" opacity="0.16" filter="url(#${softId})"/>`);
  svg.push(`<ellipse cx="${cx + shadowSide * cheekHalf * 0.5}" cy="${eyeY + 52}" rx="${cheekHalf * 0.42}" ry="${faceH * 0.16}" fill="${skin.shadow}" opacity="0.24" filter="url(#${softId})"/>`);
  svg.push(`<ellipse cx="${cx}" cy="${topY + faceH * 0.18}" rx="${cheekHalf * 0.6}" ry="${faceH * 0.12}" fill="${skin.light}" opacity="0.18" filter="url(#${softId})"/>`);
  // Temple shadows
  svg.push(`<ellipse cx="${cx - cheekHalf * 0.92}" cy="${eyeY - 16}" rx="${cheekHalf * 0.2}" ry="${faceH * 0.16}" fill="${skin.shadow}" opacity="0.25" filter="url(#${softId})"/>`);
  // Eye sockets
  for (const s of [-1, 1]) {
    const ex = cx + s * eyeSpacing;
    svg.push(`<ellipse cx="${ex}" cy="${eyeY - 2}" rx="${eyeW + 7}" ry="${eyeH + 8}" fill="${skin.shadow}" opacity="0.16" filter="url(#${softId})"/>`);
  }
  // Cheek colour
  svg.push(`<ellipse cx="${cx - shadowSide * cheekHalf * 0.52}" cy="${noseBottom + 6}" rx="${cheekHalf * 0.3}" ry="${faceH * 0.1}" fill="${shade(skin.shadow, -0.05)}" opacity="0.13" filter="url(#${softId})"/>`);

  // Brows
  for (const s of [-1, 1]) {
    const ex = cx + s * eyeSpacing;
    const innerX = cx + s * (eyeSpacing - eyeW - 4);
    const outerX = cx + s * (eyeSpacing + eyeW + 1);
    const lift = s * browAngle;
    svg.push(`<path d="M ${innerX} ${browY + 3 + lift * 0.4} Q ${ex} ${browY - browArch + lift} ${outerX} ${browY + 2 - lift * 0.2}"
      fill="none" stroke="${hair.shadow}" stroke-width="${browThickness}" stroke-linecap="round" opacity="0.92"/>`);
    svg.push(`<path d="M ${innerX} ${browY + 1 + lift * 0.4} Q ${ex} ${browY - browArch - 1 + lift} ${outerX} ${browY - 1 - lift * 0.2}"
      fill="none" stroke="${hair.base}" stroke-width="${browThickness * 0.42}" stroke-linecap="round" opacity="0.75"/>`);
  }

  // Eyes
  for (const s of [-1, 1]) {
    const ex = cx + s * eyeSpacing;
    const tilt = s * eyeTilt;
    const upper = eyeY - eyeH + tilt;
    const lower = eyeY + eyeH * 0.85 + tilt * 0.4;
    const inner = ex - s * eyeW;
    const outer = ex + s * eyeW;
    svg.push(`<path d="M ${inner} ${eyeY + tilt * 0.5} C ${ex - s * eyeW * 0.45} ${upper}, ${ex + s * eyeW * 0.45} ${upper}, ${outer} ${eyeY - tilt * 0.3}
      C ${ex + s * eyeW * 0.4} ${lower}, ${ex - s * eyeW * 0.42} ${lower}, ${inner} ${eyeY + tilt * 0.5} Z" fill="#EFE7DE"/>`);
    svg.push(`<circle cx="${ex + s * 0.6}" cy="${eyeY + 0.4}" r="${irisR}" fill="url(#${irisGradId})"/>`);
    svg.push(`<circle cx="${ex + s * 0.6}" cy="${eyeY + 0.4}" r="${irisR * 0.46}" fill="#120D0A"/>`);
    svg.push(`<circle cx="${ex - irisR * 0.34}" cy="${eyeY - irisR * 0.42}" r="${irisR * 0.22}" fill="#fff" opacity="0.9"/>`);
    svg.push(`<path d="M ${inner} ${eyeY + tilt * 0.5} C ${ex - s * eyeW * 0.45} ${upper}, ${ex + s * eyeW * 0.45} ${upper}, ${outer} ${eyeY - tilt * 0.3}"
      fill="none" stroke="${shade(skin.shadow, -0.55)}" stroke-width="2.6" stroke-linecap="round"/>`);
    svg.push(`<path d="M ${ex - s * eyeW * 0.7} ${upper - 4.5} C ${ex} ${upper - 9}, ${ex + s * eyeW * 0.72} ${upper - 3.5}, ${outer + s * 1.5} ${upper + 1.5}"
      fill="none" stroke="${skin.shadow}" stroke-width="1.6" opacity="0.4" stroke-linecap="round"/>`);
    svg.push(`<path d="M ${inner + s * 2} ${lower - 1} C ${ex - s * eyeW * 0.3} ${lower + 5.4}, ${ex + s * eyeW * 0.45} ${lower + 3.6}, ${outer - s * 1.5} ${lower - 1.6}"
      fill="none" stroke="${skin.shadow}" stroke-width="1.5" opacity="0.42" stroke-linecap="round"/>`);
    if (isVeteran) {
      svg.push(`<path d="M ${outer + s * 2} ${eyeY + 5} L ${outer + s * 9} ${eyeY + 2} M ${outer + s * 2} ${eyeY + 8} L ${outer + s * 9} ${eyeY + 9}"
        stroke="${skin.shadow}" stroke-width="1" opacity="0.4" stroke-linecap="round"/>`);
    }
  }

  // Nose
  svg.push(`<path d="M ${cx - noseHalf * 0.28} ${noseTop} C ${cx - noseHalf * 0.5} ${noseTop + 18}, ${cx - noseHalf * 0.8} ${noseBottom - 12}, ${cx - noseHalf} ${noseBottom - 2}"
    fill="none" stroke="${skin.light}" stroke-width="${noseHalf * 0.72}" stroke-linecap="round" opacity="0.34"/>`);
  svg.push(`<path d="M ${cx + noseHalf * 0.3} ${noseTop + 2} C ${cx + noseHalf * 0.62} ${noseTop + 20}, ${cx + noseHalf * 0.9} ${noseBottom - 12}, ${cx + noseHalf * 0.95} ${noseBottom - 3}"
    fill="none" stroke="${skin.shadow}" stroke-width="${noseHalf * 0.6}" stroke-linecap="round" opacity="0.4"/>`);
  svg.push(`<ellipse cx="${cx}" cy="${noseBottom - 1}" rx="${noseHalf}" ry="${noseHalf * 0.55}" fill="${skin.light}" opacity="0.35"/>`);
  svg.push(`<ellipse cx="${cx - noseHalf * 0.55}" cy="${noseBottom + noseTipDrop}" rx="${noseHalf * 0.34}" ry="${noseHalf * 0.22}" fill="${skin.shadow}" opacity="0.75"/>`);
  svg.push(`<ellipse cx="${cx + noseHalf * 0.55}" cy="${noseBottom + noseTipDrop}" rx="${noseHalf * 0.34}" ry="${noseHalf * 0.22}" fill="${skin.shadow}" opacity="0.75"/>`);
  svg.push(`<path d="M ${cx - noseHalf * 0.9} ${noseBottom - 2} C ${cx - noseHalf * 1.15} ${noseBottom + 5}, ${cx - noseHalf * 0.7} ${noseBottom + 6}, ${cx - noseHalf * 0.4} ${noseBottom + 3}"
    fill="none" stroke="${skin.shadow}" stroke-width="1.5" opacity="0.55" stroke-linecap="round"/>`);
  svg.push(`<path d="M ${cx + noseHalf * 0.9} ${noseBottom - 2} C ${cx + noseHalf * 1.15} ${noseBottom + 5}, ${cx + noseHalf * 0.7} ${noseBottom + 6}, ${cx + noseHalf * 0.4} ${noseBottom + 3}"
    fill="none" stroke="${skin.shadow}" stroke-width="1.5" opacity="0.55" stroke-linecap="round"/>`);

  // Mouth
  const smile = expression === 'soft-smile' ? 3.2 : expression === 'focused' ? -1.4 : 0.6;
  const mouthPath = `M ${cx - mouthHalf} ${mouthY} Q ${cx} ${mouthY + smile * 1.4} ${cx + mouthHalf} ${mouthY}`;
  svg.push(`<path d="M ${cx - mouthHalf} ${mouthY} Q ${cx} ${mouthY - upperLip * 1.5} ${cx + mouthHalf} ${mouthY} Q ${cx} ${mouthY + lowerLip * 1.9} ${cx - mouthHalf} ${mouthY} Z" fill="url(#${lipGradId})" opacity="0.9"/>`);
  svg.push(`<path d="M ${cx - mouthHalf * 0.28} ${mouthY - upperLip * 0.35} Q ${cx} ${mouthY - upperLip * 0.9} ${cx + mouthHalf * 0.28} ${mouthY - upperLip * 0.35}"
    fill="none" stroke="${skin.light}" stroke-width="1.6" opacity="0.3" stroke-linecap="round"/>`);
  svg.push(`<path d="${mouthPath}" fill="none" stroke="${darken(skin.shadow, 0.4)}" stroke-width="1.9" stroke-linecap="round" opacity="0.85"/>`);
  svg.push(`<path d="M ${cx - mouthHalf * 0.42} ${mouthY + lowerLip * 0.9} Q ${cx} ${mouthY + lowerLip * 1.35} ${cx + mouthHalf * 0.4} ${mouthY + lowerLip * 0.9}"
    fill="none" stroke="${skin.light}" stroke-width="1.7" opacity="0.28" stroke-linecap="round"/>`);
  // Smile creases
  if (expression !== 'focused') {
    for (const s of [-1, 1]) {
      svg.push(`<path d="M ${cx + s * (mouthHalf + 1)} ${mouthY - 1} C ${cx + s * (mouthHalf + 7)} ${mouthY + 5}, ${cx + s * (mouthHalf + 4)} ${mouthY + 13}, ${cx + s * (mouthHalf + 1)} ${mouthY + 15}"
        fill="none" stroke="${skin.shadow}" stroke-width="1.5" opacity="0.3" stroke-linecap="round"/>`);
    }
  }

  // Age lines
  if (isVeteran || (ageBand === 'prime' && rng.chance(0.25))) {
    const lineOpacity = isVeteran ? 0.4 : 0.2;
    for (const s of [-1, 1]) {
      svg.push(`<path d="M ${cx + s * (noseHalf + 2)} ${noseBottom} C ${cx + s * (noseHalf + 6)} ${mouthY - 6}, ${cx + s * (mouthHalf * 0.7)} ${mouthY - 4}, ${cx + s * (mouthHalf * 0.9)} ${mouthY - 1}"
        fill="none" stroke="${skin.shadow}" stroke-width="1.7" opacity="${lineOpacity}" stroke-linecap="round"/>`);
    }
    if (isVeteran) {
      for (let i = 0; i < 2; i++) {
        svg.push(`<path d="M ${cx - cheekHalf * 0.45} ${topY + faceH * 0.16 + i * 9} Q ${cx} ${topY + faceH * 0.13 + i * 9} ${cx + cheekHalf * 0.45} ${topY + faceH * 0.16 + i * 9}"
          fill="none" stroke="${skin.shadow}" stroke-width="1.1" opacity="0.18" stroke-linecap="round"/>`);
      }
    }
  }

  svg.push('</g>'); // clip face

  // Facial hair (clipped to face)
  svg.push(`<g clip-path="url(#${clipId})" opacity="0.96">`);
  svg.push(buildBeard(beardStyle, { cx, topY, chinY, faceH, jawHalf, cheekHalf, mouthY, mouthHalf, noseBottom, hairGradId, hair, isVeteran, rng }));
  svg.push('</g>');

  // Hair front
  svg.push(hairFront(hairStyle, { cx, topY, cheekHalf, foreheadHalf, faceH, hair, hairGradId, rng, isYoung }));

  // Rim light along face edge
  svg.push(`<path d="M ${cx + rimSide * foreheadHalf} ${topY + faceH * 0.16} C ${cx + rimSide * cheekHalf} ${topY + faceH * 0.42}, ${cx + rimSide * jawHalf} ${topY + faceH * 0.82}, ${cx + rimSide * chinHalf * 0.8} ${chinY - 8}"
    fill="none" stroke="${accent}" stroke-width="3.2" opacity="0.45" stroke-linecap="round" filter="url(#${softId})"/>`);

  svg.push('</g>'); // head rotate

  // Foreground grade
  svg.push(`<rect width="${W}" height="${H}" fill="url(#${vigId})"/>`);
  svg.push(`<rect y="${H - 120}" width="${W}" height="120" fill="#04080B" opacity="0.35"/>`);
  svg.push('</svg>');

  // Round coordinates to 0.1px to keep the vector payload compact.
  const compactSvg = svg.join('\n').replace(/-?\d+\.\d+/g, (m) => {
    const rounded = Math.round(parseFloat(m) * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  });

  return {
    svg: compactSvg,
    meta: {
      seed: p.id,
      skin: skinKey,
      hairStyle,
      hairColor: hairKey,
      beardStyle,
      expression,
      ageBand,
      signature: [
        skinKey, hairStyle, hairKey, beardStyle, expression, ageBand,
        Math.round(faceH), Math.round(cheekHalf * 10), Math.round(jawHalf * 10),
        Math.round(chinHalf * 10), Math.round(eyeY - topY), Math.round(eyeSpacing * 10),
        Math.round(eyeW * 10), Math.round(irisR * 10), Math.round(noseHalf * 10), Math.round(mouthHalf * 10),
      ].join('|'),
    },
  };
}

function buildBokeh(rng, accent) {
  const out = [];
  const count = rng.int(9, 14);
  for (let i = 0; i < count; i++) {
    const x = rng.range(-20, W + 20);
    const y = rng.range(20, H * 0.72);
    const r = rng.range(7, 34);
    const op = rng.range(0.03, 0.11);
    const color = rng.chance(0.45) ? accent : rng.pick(['#FFFFFF', '#BFD8E6', '#E8C98A']);
    out.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${color}" opacity="${op.toFixed(3)}" filter="url(#bokeh)"/>`);
  }
  // Two soft light bars for stadium depth
  out.push(`<rect x="0" y="${(H * 0.3).toFixed(0)}" width="${W}" height="${(H * 0.06).toFixed(0)}" fill="#DDEAF2" opacity="0.018"/>`);
  return `<g>${out.join('')}</g>`;
}

function buildFacePath({ cx, topY, chinY, foreheadHalf, cheekHalf, jawHalf, chinHalf, chinDrop }) {
  const p1y = topY + (chinY - topY) * 0.2;
  const p2y = topY + (chinY - topY) * 0.46;
  const p3y = topY + (chinY - topY) * 0.78;
  return [
    `M ${cx - foreheadHalf} ${p1y}`,
    `C ${cx - foreheadHalf} ${topY + 4}, ${cx - foreheadHalf * 0.55} ${topY}, ${cx} ${topY}`,
    `C ${cx + foreheadHalf * 0.55} ${topY}, ${cx + foreheadHalf} ${topY + 4}, ${cx + foreheadHalf} ${p1y}`,
    `C ${cx + foreheadHalf * 1.06} ${p2y - 18}, ${cx + cheekHalf} ${p2y}, ${cx + cheekHalf} ${p2y}`,
    `C ${cx + cheekHalf * 0.96} ${p3y - 6}, ${cx + jawHalf} ${p3y}, ${cx + jawHalf} ${p3y}`,
    `C ${cx + jawHalf * 0.9} ${chinY - 22}, ${cx + chinHalf} ${chinY - 8 + chinDrop}, ${cx + chinHalf * 0.5} ${chinY - 1 + chinDrop}`,
    `C ${cx + chinHalf * 0.2} ${chinY + 2 + chinDrop}, ${cx - chinHalf * 0.2} ${chinY + 2 + chinDrop}, ${cx - chinHalf * 0.5} ${chinY - 1 + chinDrop}`,
    `C ${cx - chinHalf} ${chinY - 8 + chinDrop}, ${cx - jawHalf * 0.9} ${chinY - 22}, ${cx - jawHalf} ${p3y}`,
    `C ${cx - jawHalf} ${p3y}, ${cx - cheekHalf * 0.96} ${p3y - 6}, ${cx - cheekHalf} ${p2y}`,
    `C ${cx - cheekHalf} ${p2y}, ${cx - foreheadHalf * 1.06} ${p2y - 18}, ${cx - foreheadHalf} ${p1y}`,
    'Z',
  ].join(' ');
}

function hairFront(style, { cx, topY, cheekHalf, foreheadHalf, faceH, hair, hairGradId, rng, isYoung }) {
  const parts = [];
  const hairlineY = topY + faceH * 0.115;
  const cap = `M ${cx - foreheadHalf - 6} ${topY + 34}
    C ${cx - foreheadHalf - 8} ${topY - 16}, ${cx + foreheadHalf + 8} ${topY - 16}, ${cx + foreheadHalf + 6} ${topY + 34}
    C ${cx + foreheadHalf * 0.8} ${hairlineY + 6}, ${cx + foreheadHalf * 0.3} ${hairlineY}, ${cx + foreheadHalf * 0.1} ${hairlineY + 2}
    C ${cx - foreheadHalf * 0.3} ${hairlineY + 5}, ${cx - foreheadHalf * 0.75} ${hairlineY + 4}, ${cx - foreheadHalf - 6} ${topY + 34} Z`;

  switch (style) {
    case 'bald':
      parts.push(`<ellipse cx="${cx}" cy="${topY + 12}" rx="${foreheadHalf * 0.72}" ry="${faceH * 0.1}" fill="${hair.light}" opacity="0.2"/>`);
      parts.push(`<path d="M ${cx - cheekHalf * 0.98} ${topY + 52} C ${cx - cheekHalf * 1.02} ${topY + 34}, ${cx - foreheadHalf} ${topY + 26}, ${cx - foreheadHalf * 0.9} ${topY + 22}" fill="none" stroke="${hair.base}" stroke-width="7" opacity="0.35" stroke-linecap="round"/>`);
      parts.push(`<path d="M ${cx + cheekHalf * 0.98} ${topY + 52} C ${cx + cheekHalf * 1.02} ${topY + 34}, ${cx + foreheadHalf} ${topY + 26}, ${cx + foreheadHalf * 0.9} ${topY + 22}" fill="none" stroke="${hair.base}" stroke-width="7" opacity="0.35" stroke-linecap="round"/>`);
      break;
    case 'buzz':
      parts.push(`<path d="${cap}" fill="url(#${hairGradId})" opacity="0.9"/>`);
      parts.push(`<path d="${cap}" fill="none" stroke="${hair.light}" stroke-width="1" opacity="0.18"/>`);
      break;
    case 'receding': {
      const p = `M ${cx - foreheadHalf - 4} ${topY + 40}
        C ${cx - foreheadHalf} ${topY + 2}, ${cx - foreheadHalf * 0.45} ${topY - 4}, ${cx - foreheadHalf * 0.2} ${topY + 10}
        C ${cx - foreheadHalf * 0.05} ${topY + 18}, ${cx + foreheadHalf * 0.05} ${topY + 18}, ${cx + foreheadHalf * 0.2} ${topY + 10}
        C ${cx + foreheadHalf * 0.45} ${topY - 4}, ${cx + foreheadHalf} ${topY + 2}, ${cx + foreheadHalf + 4} ${topY + 40}
        C ${cx + foreheadHalf * 0.5} ${topY + 22}, ${cx - foreheadHalf * 0.5} ${topY + 22}, ${cx - foreheadHalf - 4} ${topY + 40} Z`;
      parts.push(`<path d="${p}" fill="url(#${hairGradId})"/>`);
      break;
    }
    case 'side-part':
      parts.push(`<path d="M ${cx - foreheadHalf - 8} ${topY + 56}
        C ${cx - foreheadHalf - 12} ${topY - 20}, ${cx + foreheadHalf * 0.5} ${topY - 22}, ${cx + foreheadHalf + 6} ${topY + 30}
        C ${cx + foreheadHalf * 0.6} ${topY + 20}, ${cx + foreheadHalf * 0.3} ${topY + 18}, ${cx - foreheadHalf * 0.05} ${topY + 22}
        C ${cx - foreheadHalf * 0.4} ${topY + 30}, ${cx - foreheadHalf * 0.7} ${topY + 46}, ${cx - foreheadHalf - 8} ${topY + 56} Z" fill="url(#${hairGradId})"/>`);
      parts.push(`<path d="M ${cx - foreheadHalf * 0.1} ${topY + 20} C ${cx + foreheadHalf * 0.25} ${topY + 12}, ${cx + foreheadHalf * 0.6} ${topY + 16}, ${cx + foreheadHalf * 0.9} ${topY + 32}" fill="none" stroke="${hair.light}" stroke-width="2" opacity="0.3" stroke-linecap="round"/>`);
      break;
    case 'curly-short': {
      let d = `M ${cx - foreheadHalf - 10} ${topY + 46}`;
      d += ` C ${cx - foreheadHalf - 16} ${topY - 18}, ${cx + foreheadHalf + 16} ${topY - 18}, ${cx + foreheadHalf + 10} ${topY + 46}`;
      const steps = 7;
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const x = cx + foreheadHalf + 10 - t * (foreheadHalf * 2 + 20);
        const y = hairlineY + 2 + Math.sin(t * Math.PI * 3) * 4;
        d += ` Q ${x + 13} ${y - 12}, ${x} ${y}`;
      }
      d += ' Z';
      parts.push(`<path d="${d}" fill="url(#${hairGradId})"/>`);
      break;
    }
    case 'medium-wave':
    case 'long':
    case 'tied-back': {
      parts.push(`<path d="M ${cx - foreheadHalf - 10} ${topY + 60}
        C ${cx - foreheadHalf - 14} ${topY - 16}, ${cx + foreheadHalf + 14} ${topY - 16}, ${cx + foreheadHalf + 10} ${topY + 60}
        C ${cx + foreheadHalf * 0.9} ${hairlineY + 10}, ${cx + foreheadHalf * 0.4} ${hairlineY - 2}, ${cx + foreheadHalf * 0.05} ${hairlineY + 4}
        C ${cx - foreheadHalf * 0.4} ${hairlineY + 12}, ${cx - foreheadHalf * 0.8} ${hairlineY + 16}, ${cx - foreheadHalf - 10} ${topY + 60} Z" fill="url(#${hairGradId})"/>`);
      parts.push(`<path d="M ${cx + foreheadHalf * 0.15} ${topY + 18} C ${cx + foreheadHalf * 0.55} ${topY + 26}, ${cx + foreheadHalf * 0.8} ${topY + 52}, ${cx + foreheadHalf * 0.9} ${topY + 96}" fill="none" stroke="${hair.light}" stroke-width="2.4" opacity="0.24" stroke-linecap="round"/>`);
      break;
    }
    case 'afro': {
      parts.push(`<ellipse cx="${cx}" cy="${topY + 26}" rx="${foreheadHalf + 26}" ry="${faceH * 0.24}" fill="url(#${hairGradId})"/>`);
      parts.push(`<ellipse cx="${cx - foreheadHalf * 0.35}" cy="${topY + 4}" rx="${foreheadHalf * 0.5}" ry="${faceH * 0.12}" fill="${hair.light}" opacity="0.18"/>`);
      break;
    }
    default: {
      parts.push(`<path d="${cap}" fill="url(#${hairGradId})"/>`);
      const strands = 5;
      for (let i = 0; i < strands; i++) {
        const t = (i + 1) / (strands + 1);
        const x = cx - foreheadHalf * 0.8 + t * foreheadHalf * 1.6;
        parts.push(`<path d="M ${x} ${topY + 4} C ${x + 6} ${topY + 22}, ${x + 3} ${hairlineY - 6}, ${x + 10} ${hairlineY + 2}" fill="none" stroke="${hair.light}" stroke-width="1.6" opacity="0.22" stroke-linecap="round"/>`);
      }
    }
  }
  return `<g>${parts.join('')}</g>`;
}

function hairBack(style, { cx, topY, cheekHalf, faceH, hairGradId, hair, rng }) {
  if (style === 'afro') {
    return `<ellipse cx="${cx}" cy="${topY + 34}" rx="${cheekHalf + 40}" ry="${faceH * 0.36}" fill="url(#${hairGradId})" opacity="0.98"/>`;
  }
  if (style === 'long') {
    return `<path d="M ${cx - cheekHalf - 14} ${topY + 40} C ${cx - cheekHalf - 40} ${topY + 150}, ${cx - cheekHalf - 26} ${topY + 280}, ${cx - cheekHalf - 6} ${topY + 330}
      L ${cx + cheekHalf + 6} ${topY + 330} C ${cx + cheekHalf + 26} ${topY + 280}, ${cx + cheekHalf + 40} ${topY + 150}, ${cx + cheekHalf + 14} ${topY + 40} Z" fill="url(#${hairGradId})" opacity="0.96"/>`;
  }
  if (style === 'tied-back') {
    return `<path d="M ${cx} ${topY + 150} C ${cx - 26} ${topY + 220}, ${cx - 34} ${topY + 300}, ${cx - 18} ${topY + 352}
      C ${cx} ${topY + 372}, ${cx + 22} ${topY + 340}, ${cx + 18} ${topY + 288} C ${cx + 16} ${topY + 232}, ${cx + 12} ${topY + 180}, ${cx} ${topY + 150} Z" fill="url(#${hairGradId})" opacity="0.9"/>`;
  }
  if (style === 'curly-short') {
    return `<ellipse cx="${cx}" cy="${topY + 30}" rx="${cheekHalf + 16}" ry="${faceH * 0.26}" fill="url(#${hairGradId})" opacity="0.95"/>`;
  }
  return `<path d="M ${cx - cheekHalf - 8} ${topY + 40} C ${cx - cheekHalf - 22} ${topY + 150}, ${cx - cheekHalf - 6} ${topY + 210}, ${cx - cheekHalf + 4} ${topY + 220}
    L ${cx + cheekHalf - 4} ${topY + 220} C ${cx + cheekHalf + 6} ${topY + 210}, ${cx + cheekHalf + 22} ${topY + 150}, ${cx + cheekHalf + 8} ${topY + 40} Z" fill="url(#${hairGradId})" opacity="0.85"/>`;
}

function buildBeard(style, { cx, topY, chinY, faceH, jawHalf, cheekHalf, mouthY, mouthHalf, noseBottom, hairGradId, hair, isVeteran, rng }) {
  const parts = [];
  const jawY = topY + faceH * 0.76;
  const outline = `M ${cx - cheekHalf * 0.94} ${jawY - 6}
    C ${cx - cheekHalf * 0.9} ${chinY - 6}, ${cx - jawHalf * 0.7} ${chinY + 8}, ${cx} ${chinY + 10}
    C ${cx + jawHalf * 0.7} ${chinY + 8}, ${cx + cheekHalf * 0.9} ${chinY - 6}, ${cx + cheekHalf * 0.94} ${jawY - 6}
    L ${cx + cheekHalf * 0.8} ${jawY - 22}
    C ${cx + cheekHalf * 0.5} ${jawY + 2}, ${cx - cheekHalf * 0.5} ${jawY + 2}, ${cx - cheekHalf * 0.8} ${jawY - 22} Z`;

  if (style === 'stubble') {
    parts.push(`<path d="${outline}" fill="${hair.base}" opacity="0.22"/>`);
    for (let i = 0; i < 26; i++) {
      const x = cx + rng.range(-cheekHalf * 0.85, cheekHalf * 0.85);
      const y = rng.range(jawY - 6, chinY + 6);
      parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rng.range(0.6, 1.2).toFixed(2)}" fill="${hair.shadow}" opacity="0.35"/>`);
    }
  } else if (style === 'moustache') {
    parts.push(`<path d="M ${cx - mouthHalf * 1.12} ${mouthY - 9}
      C ${cx - mouthHalf * 0.6} ${mouthY - 19}, ${cx - mouthHalf * 0.1} ${mouthY - 12}, ${cx} ${mouthY - 8}
      C ${cx + mouthHalf * 0.1} ${mouthY - 12}, ${cx + mouthHalf * 0.6} ${mouthY - 19}, ${cx + mouthHalf * 1.12} ${mouthY - 9}
      C ${cx + mouthHalf * 0.6} ${mouthY - 6}, ${cx - mouthHalf * 0.6} ${mouthY - 6}, ${cx - mouthHalf * 1.12} ${mouthY - 9} Z" fill="url(#${hairGradId})"/>`);
  } else if (style === 'goatee') {
    parts.push(`<path d="M ${cx - mouthHalf * 1.05} ${mouthY - 10}
      C ${cx - mouthHalf * 0.55} ${mouthY - 18}, ${cx + mouthHalf * 0.55} ${mouthY - 18}, ${cx + mouthHalf * 1.05} ${mouthY - 10}
      C ${cx + mouthHalf * 0.5} ${mouthY - 6}, ${cx - mouthHalf * 0.5} ${mouthY - 6}, ${cx - mouthHalf * 1.05} ${mouthY - 10} Z" fill="url(#${hairGradId})"/>`);
    parts.push(`<path d="M ${cx - mouthHalf * 0.8} ${mouthY + 12} C ${cx - mouthHalf * 0.7} ${chinY - 2}, ${cx + mouthHalf * 0.7} ${chinY - 2}, ${cx + mouthHalf * 0.8} ${mouthY + 12}
      C ${cx + mouthHalf * 0.4} ${mouthY + 20}, ${cx - mouthHalf * 0.4} ${mouthY + 20}, ${cx - mouthHalf * 0.8} ${mouthY + 12} Z" fill="url(#${hairGradId})"/>`);
  } else if (style === 'short-beard' || style === 'full-beard') {
    const grow = style === 'full-beard' ? 14 : 4;
    const d = `M ${cx - cheekHalf * 0.96} ${jawY - 14}
      C ${cx - cheekHalf * 0.94} ${chinY - 4}, ${cx - jawHalf * 0.8} ${chinY + 10 + grow}, ${cx} ${chinY + 12 + grow}
      C ${cx + jawHalf * 0.8} ${chinY + 10 + grow}, ${cx + cheekHalf * 0.94} ${chinY - 4}, ${cx + cheekHalf * 0.96} ${jawY - 14}
      C ${cx + cheekHalf * 0.7} ${jawY - 2}, ${cx + mouthHalf * 1.1} ${mouthY - 6}, ${cx + mouthHalf * 0.9} ${mouthY - 10}
      L ${cx - mouthHalf * 0.9} ${mouthY - 10} C ${cx - mouthHalf * 1.1} ${mouthY - 6}, ${cx - cheekHalf * 0.7} ${jawY - 2}, ${cx - cheekHalf * 0.96} ${jawY - 14} Z`;
    parts.push(`<path d="${d}" fill="url(#${hairGradId})"/>`);
    for (let i = 0; i < 9; i++) {
      const x = cx + rng.range(-cheekHalf * 0.7, cheekHalf * 0.7);
      const y = rng.range(mouthY + 8, chinY + grow);
      parts.push(`<path d="M ${x.toFixed(1)} ${y.toFixed(1)} q ${rng.range(-1.5, 1.5).toFixed(1)} ${rng.range(4, 8).toFixed(1)} ${rng.range(-2, 2).toFixed(1)} ${rng.range(6, 12).toFixed(1)}" fill="none" stroke="${hair.shadow}" stroke-width="1" opacity="0.35" stroke-linecap="round"/>`);
    }
  }
  return `<g>${parts.join('')}</g>`;
}

/* ------------------------------------------------------------------ *
 * Colour helpers
 * ------------------------------------------------------------------ */

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }) {
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

function shade(hex, amount) {
  const c = hexToRgb(hex);
  if (amount >= 0) return rgbToHex({ r: c.r + (255 - c.r) * amount, g: c.g + (255 - c.g) * amount, b: c.b + (255 - c.b) * amount });
  return rgbToHex({ r: c.r * (1 + amount), g: c.g * (1 + amount), b: c.b * (1 + amount) });
}

const lighten = (hex, a) => shade(hex, a);
const darken = (hex, a) => shade(hex, -a);

function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function csvCell(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/* ------------------------------------------------------------------ *
 * Generate
 * ------------------------------------------------------------------ */

console.log(`Registry players: ${registry.length}`);

const seenIds = new Set();
const seenNames = new Map();
const manifest = [];
const inventoryRows = [];
const signatureCounts = new Map();
const svgHashes = new Map();

for (const p of registry) {
  if (!p.id || !p.fullName) throw new Error('Player missing id or fullName: ' + JSON.stringify(p));
  if (seenIds.has(p.id)) throw new Error('Duplicate player id: ' + p.id);
  seenIds.add(p.id);

  let built = buildPortrait(p, 0);
  let attempts = 0;
  while (signatureCounts.has(traitKey(built.meta)) && attempts < 60) {
    attempts++;
    built = buildPortrait(p, attempts);
  }
  if (signatureCounts.has(traitKey(built.meta))) {
    console.warn(`Unable to resolve trait collision for ${p.id} after ${attempts} attempts`);
  }
  const { svg, meta } = built;
  const fileName = `${p.id}.svg`;
  const abs = path.join(OUT_DIR, fileName);
  fs.writeFileSync(abs, svg, 'utf8');

  const bytes = Buffer.byteLength(svg);
  const sha = crypto.createHash('sha256').update(svg).digest('hex');
  if (svgHashes.has(sha)) throw new Error(`Identical asset hash for ${p.id} and ${svgHashes.get(sha)}`);
  svgHashes.set(sha, p.id);

  signatureCounts.set(traitKey(meta), p.id);

  manifest.push({
    playerId: p.id,
    playerName: p.fullName,
    imagePath: `/assets/players/${fileName}`,
    imageType: 'generated',
    verificationStatus: 'NOT_APPLICABLE_SYNTHETIC',
    source: 'PROCEDURAL_PORTRAIT_STUDIO_v1',
    generationStatus: 'COMPLETE',
    generatedFromSeed: p.id,
    portraitTraits: {
      skinTone: meta.skin,
      hairStyle: meta.hairStyle,
      hairColor: meta.hairColor,
      facialHair: meta.beardStyle,
      expression: meta.expression,
      ageBand: meta.ageBand,
    },
    bytes,
    sha256: sha,
    lastUpdated: new Date().toISOString(),
  });

  inventoryRows.push([
    p.id,
    p.fullName,
    p.primaryNationality || '',
    p.primaryRole || '',
    eraFor(p.careerDebutYear),
    '',
    'Missing',
    'No',
    'Generate',
    `/assets/players/${fileName}`,
  ]);
}

// Write manifest JSON
fs.writeFileSync(
  MANIFEST_OUT,
  JSON.stringify(
    {
      version: '9.12.0',
      generatedAt: new Date().toISOString(),
      generator: 'tools/generate-player-portraits.mjs',
      policy: {
        authenticPhotographs: 0,
        note: 'No licensed photographic source or image-generation API is configured for this project. Every asset is an individually generated, clearly synthetic portrait. No real cricketer likeness is reproduced or claimed.',
      },
      totalPlayers: registry.length,
      entries: manifest,
    },
    null,
    2,
  ),
  'utf8',
);

// Write compact TS id set for runtime resolution
const idsChunked = [];
for (let i = 0; i < registry.length; i += 6) {
  idsChunked.push('  ' + registry.slice(i, i + 6).map((p) => `'${p.id}'`).join(', ') + ',');
}
const ts = `/**
 * AUTO-GENERATED by tools/generate-player-portraits.mjs — do not edit by hand.
 * Stable player IDs that have an individual generated portrait at
 * /assets/players/{player_id}.svg (see player-images-manifest.json).
 */
export const PLAYER_PORTRAIT_IDS: ReadonlySet<string> = new Set([
${idsChunked.join('\n')}
]);

export function hasGeneratedPortrait(playerId?: string | null): boolean {
  return !!playerId && PLAYER_PORTRAIT_IDS.has(playerId);
}
`;
fs.writeFileSync(LIB_OUT, ts, 'utf8');

// Write inventory CSV
const header = 'player_id,player_name,country,role,era,existing_image,image_status,identity_verified,action_required,final_image';
fs.writeFileSync(
  INVENTORY_OUT,
  header + '\n' + inventoryRows.map((r) => r.map(csvCell).join(',')).join('\n') + '\n',
  'utf8',
);

// Audit
const totalBytes = manifest.reduce((s, e) => s + e.bytes, 0);
const traitCollisions = [];
const bySig = new Map();
for (const e of manifest) {
  const sig = JSON.stringify(e.portraitTraits);
  if (!bySig.has(sig)) bySig.set(sig, []);
  bySig.get(sig).push(e.playerId);
}
for (const [sig, ids] of bySig) if (ids.length > 1) traitCollisions.push({ sig: JSON.parse(sig), ids });

fs.writeFileSync(
  AUDIT_OUT,
  JSON.stringify(
    {
      totalPlayers: registry.length,
      assetsWritten: manifest.length,
      uniqueFileHashes: new Set(manifest.map((m) => m.sha256)).size,
      totalBytes,
      averageBytes: Math.round(totalBytes / manifest.length),
      traitCombinationCollisions: traitCollisions.length,
      collisionExamples: traitCollisions.slice(0, 5),
      imagesByType: { generated: manifest.length, authentic: 0 },
      generatedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
  'utf8',
);

console.log(`Assets written: ${manifest.length}`);
console.log(`Unique hashes: ${svgHashes.size}`);
console.log(`Trait-combination collisions: ${traitCollisions.length}`);
console.log(`Total size: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`Manifest: ${MANIFEST_OUT}`);
console.log(`CSV: ${INVENTORY_OUT}`);

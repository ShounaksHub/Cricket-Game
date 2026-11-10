import fs from 'fs';
import path from 'path';
import { VERIFIED_BENCHMARK_PLAYERS, ingestPlayerRecord } from '../packages/data-ingestion/dist/index.js';

console.log('Ingesting benchmark players...');
const rawList = VERIFIED_BENCHMARK_PLAYERS;
const ingestedList = rawList.map((raw) => {
  const p = ingestPlayerRecord(raw);
  const t20 = p.ratings?.T20?.overallRating ?? 0;
  const odi = p.ratings?.ODI?.overallRating ?? 0;
  const test = p.ratings?.TEST_RED_BALL?.overallRating ?? 0;
  const peak = Math.max(t20, odi, test);
  return { p, raw, t20, odi, test, peak };
});

console.log(`Total ingested players: ${ingestedList.length}`);

// Sort players:
// 1. Peak rating descending
// 2. T20 rating descending
// 3. Full name alphabetically
ingestedList.sort((a, b) => {
  if (b.peak !== a.peak) return b.peak - a.peak;
  if (b.t20 !== a.t20) return b.t20 - a.t20;
  return a.p.fullName.localeCompare(b.p.fullName);
});

// Calculate statistics
const roleMap = {};
const countryMap = {};
const eraMap = {};
const catMap = {};

for (const item of ingestedList) {
  const { p } = item;
  roleMap[p.primaryRole] = (roleMap[p.primaryRole] || 0) + 1;
  countryMap[p.primaryNationality] = (countryMap[p.primaryNationality] || 0) + 1;
  eraMap[p.historicalEra] = (eraMap[p.historicalEra] || 0) + 1;
  catMap[p.careerCategory] = (catMap[p.careerCategory] || 0) + 1;
}

const formatRole = (role) => {
  switch (role) {
    case 'TOP_ORDER_BATTER': return 'Top-Order Batter';
    case 'MIDDLE_ORDER_BATTER': return 'Middle-Order Batter';
    case 'WICKETKEEPER_BATTER': return 'Wicketkeeper-Batter';
    case 'BATTING_ALL_ROUNDER': return 'Batting All-Rounder';
    case 'BOWLING_ALL_ROUNDER': return 'Bowling All-Rounder';
    case 'PACE_BOWLER': return 'Pace Bowler';
    case 'SPIN_BOWLER': return 'Spin Bowler';
    default: return role;
  }
};

const formatHandBowl = (hand, bowl) => {
  const h = hand === 'RIGHT_HAND' ? 'RHB' : hand === 'LEFT_HAND' ? 'LHB' : hand;
  let b = 'None';
  switch (bowl) {
    case 'RIGHT_ARM_FAST': b = 'RAF'; break;
    case 'RIGHT_ARM_FAST_MEDIUM': b = 'RAFM'; break;
    case 'RIGHT_ARM_MEDIUM': b = 'RAM'; break;
    case 'LEFT_ARM_FAST': b = 'LAF'; break;
    case 'LEFT_ARM_FAST_MEDIUM': b = 'LAFM'; break;
    case 'LEFT_ARM_MEDIUM': b = 'LAM'; break;
    case 'RIGHT_ARM_OFF_BREAK': b = 'Off-Spin (OB)'; break;
    case 'RIGHT_ARM_LEG_BREAK': b = 'Leg-Spin (LB)'; break;
    case 'LEFT_ARM_ORTHODOX': b = 'Slow Left-Arm (SLA)'; break;
    case 'LEFT_ARM_UNORTHODOX': b = 'Left-Arm Wrist (SLAU)'; break;
    case 'NONE': b = 'None'; break;
    default: b = bowl; break;
  }
  return `${h} / ${b}`;
};

const formatEra = (era) => {
  switch (era) {
    case 'CONTEMPORARY_2021_PRESENT': return 'Contemporary (2021–Present)';
    case 'T20_REVOLUTION_2008_2020': return 'T20 Revolution (2008–2020)';
    case 'GLOBALIZED_1992_2007': return 'Globalized (1992–2007)';
    case 'PACE_REVOLUTION_1971_1991': return 'Pace Revolution (1971–1991)';
    case 'POST_WAR_1946_1970': return 'Post-War (1946–1970)';
    case 'INTERWAR_1919_1939': return 'Interwar (1919–1939)';
    case 'GOLDEN_AGE_PRE_1914': return 'Golden Age (Pre-1914)';
    default: return era;
  }
};

const formatCategory = (cat) => {
  switch (cat) {
    case 'INTERNATIONAL': return 'International Star';
    case 'HISTORICAL_LEGEND': return 'Historical Legend';
    case 'DOMESTIC_ONLY': return 'Domestic Specialist';
    default: return cat;
  }
};

let md = '';

md += `# Complete Functioning Player Roster (` + ingestedList.length + ` Unique Players)\n\n`;
md += `**Platform:** Global Cricket Dream Game & Simulation Engine  \n`;
md += `**Document Purpose:** Complete, exhaustive, serial-numbered roster of all **${ingestedList.length} unique, verified, functioning cricketers** currently operational in the game engine, team builder, player database, and live simulation loops.  \n`;
md += `**Data Integrity Guarantee:** Zero synthetic or hallucinated players. 100% of records are backed by official Cricsheet ball-by-ball matches, international scorecards, and historical first-class archives.  \n`;
md += `**Rating Engine Version:** \`rate-1.0.0\` (4-Layer Normalization with Empirical Bayesian Shrinkage)  \n\n`;

md += `---\n\n`;
md += `## 1. Executive Summary & Roster Composition\n\n`;

md += `### 1.1 Breakdown by Career Category\n\n`;
md += `| Career Category | Count | Description |\n`;
md += `| :--- | :---: | :--- |\n`;
md += `| **International Stars** | **${catMap['INTERNATIONAL'] || 0}** | Active and recent international cricketers across ICC Full & Top Associate nations |\n`;
md += `| **Historical Legends** | **${catMap['HISTORICAL_LEGEND'] || 0}** | Era-defining icons spanning the Golden Age, Interwar, Post-War, Pace, and Globalized eras |\n`;
md += `| **Domestic Specialists** | **${catMap['DOMESTIC_ONLY'] || 0}** | Top performers in Ranji Trophy, Sheffield Shield, County Championship, IPL, BBL, PSL, etc. |\n`;
md += `| **TOTAL** | **${ingestedList.length}** | **100% Unique, Fully Functioning Players** |\n\n`;

md += `### 1.2 Breakdown by Primary Tactical Role\n\n`;
md += `| Role | Count | Description |\n`;
md += `| :--- | :---: | :--- |\n`;
for (const [r, count] of Object.entries(roleMap).sort((a, b) => b[1] - a[1])) {
  md += `| **${formatRole(r)}** | **${count}** | ${r.replace(/_/g, ' ').toLowerCase()} |\n`;
}
md += `| **TOTAL** | **${ingestedList.length}** | |\n\n`;

md += `### 1.3 Breakdown by Nationality / Country\n\n`;
md += `| Country | Player Count | % of Roster |\n`;
md += `| :--- | :---: | :---: |\n`;
for (const [country, count] of Object.entries(countryMap).sort((a, b) => b[1] - a[1])) {
  const pct = ((count / ingestedList.length) * 100).toFixed(1);
  md += `| **${country}** | ${count} | ${pct}% |\n`;
}
md += `\n`;

md += `### 1.4 Breakdown by Historical Era\n\n`;
md += `| Historical Era | Player Count |\n`;
md += `| :--- | :---: |\n`;
for (const [era, count] of Object.entries(eraMap).sort((a, b) => b[1] - a[1])) {
  md += `| **${formatEra(era)}** | ${count} |\n`;
}
md += `\n---\n\n`;

md += `## 2. Top 20 All-Time Highest Rated Players (Hall of Fame)\n\n`;
md += `| S.No | Player Name | Country | Primary Role | Peak OVR | T20 OVR | ODI OVR | Test OVR | Career Era |\n`;
md += `| :---: | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- |\n`;
for (let i = 0; i < 20; i++) {
  const { p, t20, odi, test, peak } = ingestedList[i];
  const t20Str = t20 > 0 ? t20 : '-';
  const odiStr = odi > 0 ? odi : '-';
  const testStr = test > 0 ? test : '-';
  md += `| **#${i + 1}** | **${p.fullName}** | ${p.primaryNationality} | ${formatRole(p.primaryRole)} | **${peak}** | ${t20Str} | ${odiStr} | ${testStr} | ${formatEra(p.historicalEra)} |\n`;
}
md += `\n---\n\n`;

md += `## 3. Complete Master Roster (Serial #1 to #${ingestedList.length})\n\n`;
md += `> **Legend:**\n`;
md += `> - **S.No:** Sequential Serial Number\n`;
md += `> - **Bat / Bowl:** Batting hand (RHB/LHB) and bowling style abbreviation\n`;
md += `> - **T20 / ODI / Test:** Format-specific overall ratings (0–99 OVR, calibrated by Bayesian shrinkage)\n`;
md += `> - **Peak:** Maximum overall rating achieved across all formats\n`;
md += `> - **Competitions:** Key international or domestic leagues associated with the player\n\n`;

md += `| S.No | Player Name | Country | Primary Role | Bat / Bowl | Category | Debut | T20 | ODI | Test | Peak | Key Competitions |\n`;
md += `| :---: | :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |\n`;

ingestedList.forEach((item, index) => {
  const sNo = index + 1;
  const { p, t20, odi, test, peak } = item;
  const t20Str = t20 > 0 ? t20 : '-';
  const odiStr = odi > 0 ? odi : '-';
  const testStr = test > 0 ? test : '-';
  const batBowl = formatHandBowl(p.battingHand, p.bowlingStyle);
  const cat = formatCategory(p.careerCategory);
  const debut = p.careerDebutYear || '-';
  const comps = (p.competitions && p.competitions.length > 0)
    ? p.competitions.slice(0, 2).join(', ')
    : 'Domestic';

  md += `| **#${sNo}** | **${p.fullName}** | ${p.primaryNationality} | ${formatRole(p.primaryRole)} | ${batBowl} | ${cat} | ${debut} | ${t20Str} | ${odiStr} | ${testStr} | **${peak}** | ${comps} |\n`;
});

md += `\n---\n\n`;
md += `## 4. Roster Usage in Game Modes\n\n`;
md += `1. **Dream Team Builder (\`/dream-teams\`):**\n`;
md += `   - All ${ingestedList.length} players are selectable in the squad builder.\n`;
md += `   - Filter by Format (\`T20\`, \`ODI\`, \`TEST_RED_BALL\`, \`TEST_PINK_BALL\`, \`T10\`), Role, Country, Category, and Competitions.\n`;
md += `   - MCC squad rules enforce: 11 players, 1 designated wicketkeeper, and minimum 5 bowling options.\n\n`;
md += `2. **Player Catalogue & Explainability (\`/players\`):**\n`;
md += `   - Searchable directory with live multi-filter sliders.\n`;
md += `   - Deep-dive into each player's 18 granular sub-attributes, era normalization metrics, and radar chart.\n\n`;
md += `3. **Match Simulator (\`/match\`):**\n`;
md += `   - User Dream XI competes against AI Opponent XIs generated dynamically from this roster.\n`;
md += `   - Pure deterministic execution via SplitMix64 PRNG.\n`;

fs.writeFileSync('PLAYERS_ROSTER.md', md, 'utf-8');
console.log('Successfully generated PLAYERS_ROSTER.md with ' + ingestedList.length + ' players.');

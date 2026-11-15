import fs from 'node:fs';
import path from 'node:path';

// 1. Read realistic-portrait-manifest.ts to find all registered player IDs
const manifestContent = fs.readFileSync('apps/web/lib/realistic-portrait-manifest.ts', 'utf8');
const match = manifestContent.match(/export const REALISTIC_INDIVIDUAL_PORTRAITS: Record<string, string> = \{([\s\S]*?)\};/);
const registeredKeys = new Set();
if (match) {
  const matches = match[1].match(/"([a-f0-9-]+)":/g) || [];
  for (const m of matches) {
    registeredKeys.add(m.replace(/"|:/g, ''));
  }
}
console.log(`Currently registered individual players: ${registeredKeys.size}`);

// 2. Read cohorts in packages/data-ingestion/src/data/
const cohortFiles = [
  'packages/data-ingestion/src/data/cohort-international-contemporary.ts',
  'packages/data-ingestion/src/data/cohort-international-legends.ts',
  'packages/data-ingestion/src/data/cohort-domestic-india.ts',
  'packages/data-ingestion/src/data/cohort-domestic-australia.ts',
  'packages/data-ingestion/src/data/cohort-domestic-england.ts',
  'packages/data-ingestion/src/data/cohort-domestic-world.ts',
];

const allPlayers = [];

for (const file of cohortFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  let cur = null;
  for (const line of lines) {
    const idMatch = line.match(/id:\s*['"]([a-f0-9-]+)['"]/);
    if (idMatch) {
      if (cur && cur.id && cur.fullName) allPlayers.push(cur);
      cur = { id: idMatch[1] };
    }
    const nameMatch = line.match(/fullName:\s*['"]([^'"]+)['"]/);
    if (nameMatch && cur) cur.fullName = nameMatch[1];
    const roleMatch = line.match(/primaryRole:\s*['"]([^'"]+)['"]/);
    if (roleMatch && cur) cur.role = roleMatch[1];
    const natMatch = line.match(/primaryNationality:\s*['"]([^'"]+)['"]/);
    if (natMatch && cur) cur.nationality = natMatch[1];
  }
  if (cur && cur.id && cur.fullName) allPlayers.push(cur);
}

console.log(`Total players loaded across cohorts: ${allPlayers.length}`);

// Filter unregistered
const unregistered = allPlayers.filter(p => !registeredKeys.has(p.id));
console.log(`Unregistered players remaining: ${unregistered.length}`);

// Select next 100
const batch4 = unregistered.slice(0, 100);
console.log(`Selected Batch 4 size: ${batch4.length}`);
console.log(`Sample players in Batch 4:`);
for (const p of batch4.slice(0, 10)) {
  console.log(` - ${p.fullName} (${p.nationality}, ${p.role})`);
}

fs.writeFileSync('scratch/batch4_players.json', JSON.stringify(batch4, null, 2));
console.log('Saved scratch/batch4_players.json');

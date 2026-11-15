import fs from 'node:fs';
import path from 'node:path';
import { VERIFIED_BENCHMARK_PLAYERS } from '../packages/data-ingestion/dist/curated-seed-data.js';

fs.mkdirSync('scratch', { recursive: true });

// Read existing manifest to exclude already covered players
const manifestPath = path.resolve('apps/web/lib/realistic-portrait-manifest.ts');
const manifestContent = fs.readFileSync(manifestPath, 'utf8');

// Match keys in REALISTIC_INDIVIDUAL_PORTRAITS
const alreadyCoveredIds = new Set();
const matches = manifestContent.match(/"[0-9a-f\-]{36}"/g);
if (matches) {
  for (const m of matches) {
    alreadyCoveredIds.add(m.replace(/"/g, ''));
  }
}

console.log(`Already covered player IDs count: ${alreadyCoveredIds.size}`);

// Select next 100 players from VERIFIED_BENCHMARK_PLAYERS who don't have individual portraits yet
const batch3Candidates = [];
for (const p of VERIFIED_BENCHMARK_PLAYERS) {
  if (!alreadyCoveredIds.has(p.id)) {
    batch3Candidates.push({
      id: p.id,
      fullName: p.fullName,
      displayName: p.displayName,
      primaryNationality: p.primaryNationality,
      primaryRole: p.primaryRole,
      wikidataId: p.wikidataId,
      cricsheetId: p.cricsheetId
    });
    if (batch3Candidates.length >= 100) break;
  }
}

console.log(`Selected ${batch3Candidates.length} players for Batch 3.`);
fs.writeFileSync('scratch/batch3_players.json', JSON.stringify(batch3Candidates, null, 2), 'utf8');
console.log('Sample of Batch 3 players:');
console.log(batch3Candidates.slice(0, 10).map(p => `${p.fullName} (${p.primaryNationality} - ${p.primaryRole})`));

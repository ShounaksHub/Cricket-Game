import fs from 'node:fs';
import path from 'node:path';

fs.mkdirSync('scratch/raw_photos', { recursive: true });

const players = JSON.parse(fs.readFileSync('scratch/batch3_players.json', 'utf8'));

// Helper to query Wikipedia API for lead image thumbnail
async function getWikiThumbnailUrl(name) {
  const queryVariants = [
    name,
    `${name} (cricketer)`,
    `${name} (cricketer, born`,
  ];

  for (const q of queryVariants) {
    try {
      const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(q)}&prop=pageimages&format=json&pithumbsize=600`;
      const res = await fetch(url, { headers: { 'User-Agent': 'CricketDreamXI/1.0 (academic)' } });
      const data = await res.json();
      const pages = data.query?.pages || {};
      for (const page of Object.values(pages)) {
        if (page.thumbnail?.source) {
          return page.thumbnail.source;
        }
      }
    } catch (e) {
      // Continue to next variant
    }
  }
  return null;
}

async function downloadAll() {
  console.log(`Starting download for ${players.length} players in Batch 3...`);
  const downloadResults = [];

  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    const outRaw = path.join('scratch/raw_photos', `${p.id}.jpg`);

    const imgUrl = await getWikiThumbnailUrl(p.fullName);
    if (imgUrl) {
      try {
        const res = await fetch(imgUrl, { headers: { 'User-Agent': 'CricketDreamXI/1.0 (academic)' } });
        if (res.ok) {
          const buf = Buffer.from(await res.arrayBuffer());
          fs.writeFileSync(outRaw, buf);
          downloadResults.push({ id: p.id, name: p.fullName, success: true, path: outRaw });
          process.stdout.write(`\r[${i + 1}/${players.length}] Downloaded real photo: ${p.fullName}`);
          continue;
        }
      } catch (err) {
        // Fallback
      }
    }

    downloadResults.push({ id: p.id, name: p.fullName, success: false, path: null });
    process.stdout.write(`\r[${i + 1}/${players.length}] Real photo not found: ${p.fullName} (will use archetype)`);
  }

  console.log('\nDownload pass complete.');
  const successCount = downloadResults.filter(r => r.success).length;
  console.log(`Successfully fetched authentic photos: ${successCount}/${players.length}`);
  fs.writeFileSync('scratch/download_results.json', JSON.stringify(downloadResults, null, 2), 'utf8');
}

downloadAll();

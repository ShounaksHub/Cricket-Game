const fs = require('fs');
const content = fs.readFileSync('apps/web/lib/realistic-portrait-manifest.ts', 'utf8');
const match = content.match(/export const REALISTIC_INDIVIDUAL_PORTRAITS: Record<string, string> = \{([\s\S]*?)\};/);
if (match) {
  const keys = match[1].match(/"([a-f0-9-]+)":/g);
  console.log('Total individual player portraits in manifest:', keys ? keys.length : 0);
}

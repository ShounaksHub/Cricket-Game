/**
 * String Normalization & Similarity Algorithms for Player Deduplication
 */

/**
 * Normalizes a player name:
 * - Trims and lowercases
 * - Removes accents / diacritics
 * - Removes punctuation (dots, hyphens, commas)
 * - Standardizes internal whitespace
 */
export function normalizePlayerName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[.\-',_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Standard Levenshtein Distance
 */
export function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
}

/**
 * Normalized Levenshtein Similarity: 1.0 = identical, 0.0 = completely different
 */
export function levenshteinSimilarity(s1: string, s2: string): number {
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshteinDistance(s1, s2);
  return Number((1 - dist / maxLen).toFixed(4));
}

/**
 * Jaro Distance
 */
function jaroDistance(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  const len1 = s1.length;
  const len2 = s2.length;
  if (len1 === 0 || len2 === 0) return 0.0;

  const matchDistance = Math.floor(Math.max(len1, len2) / 2) - 1;
  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);

  let matches = 0;
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, len2);
    for (let j = start; j < end; j++) {
      if (s2Matches[j]) continue;
      if (s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0.0;

  let k = 0;
  let transpositions = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro =
    (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
  return jaro;
}

/**
 * Jaro-Winkler Similarity with standard prefix scaling (p = 0.1, max prefix = 4)
 * Industry standard for person name matching.
 */
export function jaroWinklerSimilarity(s1: string, s2: string, prefixScale = 0.1): number {
  const norm1 = normalizePlayerName(s1);
  const norm2 = normalizePlayerName(s2);

  const jaro = jaroDistance(norm1, norm2);
  if (jaro < 0.7) return Number(jaro.toFixed(4));

  // Determine common prefix length up to 4 characters
  let prefix = 0;
  const maxPrefix = 4;
  for (let i = 0; i < Math.min(norm1.length, norm2.length, maxPrefix); i++) {
    if (norm1[i] === norm2[i]) prefix++;
    else break;
  }

  const jw = jaro + prefix * prefixScale * (1 - jaro);
  return Number(Math.min(1.0, jw).toFixed(4));
}

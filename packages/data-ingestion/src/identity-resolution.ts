import { jaroWinklerSimilarity, normalizePlayerName } from './similarity.js';

export interface KnownPlayerReference {
  readonly id: string;
  readonly fullName: string;
  readonly displayName: string;
  readonly cricsheetId?: string;
  readonly wikidataId?: string;
  readonly aliases: string[];
  readonly nationality: string;
  readonly debutYear: number;
}

export interface DisambiguationCandidate {
  readonly player: KnownPlayerReference;
  readonly similarity: number;
  readonly matchType: 'CRICSHEET_ID' | 'WIKIDATA_ID' | 'EXACT_NAME' | 'ALIAS_EXACT' | 'FUZZY_NAME';
}

export interface DisambiguationResult {
  readonly matched: boolean;
  readonly bestMatch?: DisambiguationCandidate;
  readonly candidates: DisambiguationCandidate[];
}

/**
 * Disambiguates an incoming candidate player against a registry of known players.
 */
export function resolvePlayerIdentity(
  input: {
    fullName: string;
    cricsheetId?: string;
    wikidataId?: string;
    nationality?: string;
    debutYear?: number;
  },
  registry: KnownPlayerReference[],
  fuzzyThreshold = 0.88
): DisambiguationResult {
  const normInputName = normalizePlayerName(input.fullName);
  const candidates: DisambiguationCandidate[] = [];

  for (const player of registry) {
    // 1. Exact Cricsheet ID Match
    if (input.cricsheetId && player.cricsheetId && input.cricsheetId === player.cricsheetId) {
      candidates.push({
        player,
        similarity: 1.0,
        matchType: 'CRICSHEET_ID',
      });
      continue;
    }

    // 2. Exact Wikidata ID Match
    if (input.wikidataId && player.wikidataId && input.wikidataId === player.wikidataId) {
      candidates.push({
        player,
        similarity: 1.0,
        matchType: 'WIKIDATA_ID',
      });
      continue;
    }

    // 3. Exact Canonical Name Match
    const normPlayerFull = normalizePlayerName(player.fullName);
    const normPlayerDisplay = normalizePlayerName(player.displayName);
    if (normInputName === normPlayerFull || normInputName === normPlayerDisplay) {
      candidates.push({
        player,
        similarity: 1.0,
        matchType: 'EXACT_NAME',
      });
      continue;
    }

    // 4. Exact Alias Match
    const matchedAlias = player.aliases.some(
      (alias) => normalizePlayerName(alias) === normInputName
    );
    if (matchedAlias) {
      candidates.push({
        player,
        similarity: 0.98,
        matchType: 'ALIAS_EXACT',
      });
      continue;
    }

    // 5. Fuzzy Jaro-Winkler Match
    const jwFull = jaroWinklerSimilarity(input.fullName, player.fullName);
    const jwDisplay = jaroWinklerSimilarity(input.fullName, player.displayName);
    const maxSimilarity = Math.max(jwFull, jwDisplay);

    if (maxSimilarity >= fuzzyThreshold) {
      // Optional penalty if nationality or debut year differs significantly
      let finalSim = maxSimilarity;
      if (input.nationality && player.nationality && input.nationality !== player.nationality) {
        finalSim -= 0.10;
      }
      if (input.debutYear && Math.abs(input.debutYear - player.debutYear) > 15) {
        finalSim -= 0.15;
      }

      if (finalSim >= fuzzyThreshold - 0.05) {
        candidates.push({
          player,
          similarity: Number(finalSim.toFixed(4)),
          matchType: 'FUZZY_NAME',
        });
      }
    }
  }

  // Sort candidates by similarity descending
  candidates.sort((a, b) => b.similarity - a.similarity);

  const bestMatch = candidates.length > 0 ? candidates[0] : undefined;
  return {
    matched: !!bestMatch,
    bestMatch,
    candidates,
  };
}

/**
 * Generates standard alias variants for a player name (e.g. "Virat Kohli" -> ["V Kohli", "V. Kohli"])
 */
export function generateStandardAliases(fullName: string): string[] {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return [];

  const aliases = new Set<string>();
  const firstInitial = parts[0][0];
  const lastName = parts[parts.length - 1];

  aliases.add(`${firstInitial} ${lastName}`);
  aliases.add(`${firstInitial}. ${lastName}`);
  aliases.add(`${firstInitial}.${lastName}`);

  if (parts.length > 2) {
    const secondInitial = parts[1][0];
    aliases.add(`${firstInitial}${secondInitial} ${lastName}`);
    aliases.add(`${firstInitial}.${secondInitial}. ${lastName}`);
    aliases.add(`${firstInitial} ${secondInitial} ${lastName}`);
  }

  return Array.from(aliases);
}

export interface DuplicateAuditReport {
  readonly hasDuplicates: boolean;
  readonly totalPlayersChecked: number;
  readonly duplicateCount: number;
  readonly duplicateIdCount: number;
  readonly duplicateCricsheetCount: number;
  readonly duplicateWikidataCount: number;
  readonly duplicateCanonicalNameCount: number;
  readonly issues: string[];
}

/**
 * Scans a roster of player records for duplicate IDs, external IDs, and conflicting identities.
 */
export function detectDuplicatePlayers(
  players: Array<{
    id: string;
    fullName: string;
    displayName: string;
    cricsheetId?: string;
    wikidataId?: string;
    primaryNationality: string;
    careerDebutYear: number;
  }>
): DuplicateAuditReport {
  const seenIds = new Set<string>();
  const seenCricsheet = new Set<string>();
  const seenWikidata = new Set<string>();
  const seenCanonical = new Map<string, string>();
  const issues: string[] = [];

  let duplicateIdCount = 0;
  let duplicateCricsheetCount = 0;
  let duplicateWikidataCount = 0;
  let duplicateCanonicalNameCount = 0;

  for (const p of players) {
    // 1. UUID uniqueness
    if (seenIds.has(p.id)) {
      issues.push(`Duplicate player ID found: "${p.id}" (${p.fullName})`);
      duplicateIdCount++;
    } else {
      seenIds.add(p.id);
    }

    // 2. Cricsheet ID uniqueness
    if (p.cricsheetId) {
      if (seenCricsheet.has(p.cricsheetId)) {
        issues.push(`Duplicate Cricsheet ID "${p.cricsheetId}" on player ${p.fullName} [${p.id}]`);
        duplicateCricsheetCount++;
      } else {
        seenCricsheet.add(p.cricsheetId);
      }
    }

    // 3. Wikidata ID uniqueness
    if (p.wikidataId) {
      if (seenWikidata.has(p.wikidataId)) {
        issues.push(`Duplicate Wikidata ID "${p.wikidataId}" on player ${p.fullName} [${p.id}]`);
        duplicateWikidataCount++;
      } else {
        seenWikidata.add(p.wikidataId);
      }
    }

    // 4. Canonical name uniqueness within country & era window (same decade)
    const norm = normalizePlayerName(p.fullName);
    const key = `${norm}__${p.primaryNationality.toLowerCase()}__${Math.floor(p.careerDebutYear / 10)}`;
    if (seenCanonical.has(key)) {
      const existingId = seenCanonical.get(key);
      issues.push(
        `Likely duplicate canonical player: "${p.fullName}" [${p.id}] duplicates [${existingId}] (${p.primaryNationality}, decade ${Math.floor(p.careerDebutYear / 10)}0s)`
      );
      duplicateCanonicalNameCount++;
    } else {
      seenCanonical.set(key, p.id);
    }
  }

  const duplicateCount =
    duplicateIdCount +
    duplicateCricsheetCount +
    duplicateWikidataCount +
    duplicateCanonicalNameCount;

  return {
    hasDuplicates: duplicateCount > 0,
    totalPlayersChecked: players.length,
    duplicateCount,
    duplicateIdCount,
    duplicateCricsheetCount,
    duplicateWikidataCount,
    duplicateCanonicalNameCount,
    issues,
  };
}


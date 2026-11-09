import { describe, expect, it } from 'vitest';
import {
  createProvenanceRecord,
  generateStandardAliases,
  ingestPlayerRecord,
  jaroWinklerSimilarity,
  levenshteinSimilarity,
  normalizePlayerName,
  parseCricsheetMatch,
  resolvePlayerIdentity,
  VERIFIED_BENCHMARK_PLAYERS,
} from '../src/index.js';
import type { CricsheetMatchJson } from '../src/index.js';

describe('Data Ingestion Engine (@cricket/data-ingestion)', () => {
  describe('String Normalization & Similarity Algorithms', () => {
    it('normalizes names by removing diacritics and punctuation', () => {
      expect(normalizePlayerName('François du Plessis')).toBe('francois du plessis');
      expect(normalizePlayerName('V. Kohli')).toBe('v kohli');
      expect(normalizePlayerName('  M.S. Dhoni  ')).toBe('m s dhoni');
    });

    it('calculates high Jaro-Winkler similarity for name variants with common prefix', () => {
      const sim = jaroWinklerSimilarity('Virat Kohli', 'V. Kohli');
      expect(sim).toBeGreaterThan(0.70);

      const simExact = jaroWinklerSimilarity('Sachin Tendulkar', 'Sachin Tendulkar');
      expect(simExact).toBe(1.0);

      const simDiff = jaroWinklerSimilarity('Sachin Tendulkar', 'James Anderson');
      expect(simDiff).toBeLessThan(0.60);
    });

    it('computes Levenshtein similarity', () => {
      expect(levenshteinSimilarity('Smith', 'Smith')).toBe(1.0);
      expect(levenshteinSimilarity('Kohli', 'Kohly')).toBe(0.80);
    });
  });

  describe('Identity Resolution & Disambiguation', () => {
    const knownRegistry = [
      {
        id: '1',
        fullName: 'Virat Kohli',
        displayName: 'V. Kohli',
        cricsheetId: 'a9332204',
        wikidataId: 'Q213854',
        aliases: ['V Kohli', 'V. Kohli', 'King Kohli'],
        nationality: 'India',
        debutYear: 2008,
      },
      {
        id: '2',
        fullName: 'Steven Peter Devereux Smith',
        displayName: 'S. Smith',
        cricsheetId: 'b76a0840',
        wikidataId: 'Q7613972',
        aliases: ['Steve Smith', 'S Smith', 'SPD Smith'],
        nationality: 'Australia',
        debutYear: 2010,
      },
    ];

    it('resolves exact match by Cricsheet ID', () => {
      const res = resolvePlayerIdentity(
        { fullName: 'V Kohli', cricsheetId: 'a9332204' },
        knownRegistry
      );
      expect(res.matched).toBe(true);
      expect(res.bestMatch?.matchType).toBe('CRICSHEET_ID');
      expect(res.bestMatch?.player.fullName).toBe('Virat Kohli');
    });

    it('resolves exact match by Wikidata ID', () => {
      const res = resolvePlayerIdentity(
        { fullName: 'Steve Smith', wikidataId: 'Q7613972' },
        knownRegistry
      );
      expect(res.matched).toBe(true);
      expect(res.bestMatch?.matchType).toBe('WIKIDATA_ID');
      expect(res.bestMatch?.player.id).toBe('2');
    });

    it('resolves match by known alias', () => {
      const res = resolvePlayerIdentity(
        { fullName: 'SPD Smith' },
        knownRegistry
      );
      expect(res.matched).toBe(true);
      expect(res.bestMatch?.matchType).toBe('ALIAS_EXACT');
    });

    it('generates standard alias variants for name with initials', () => {
      const aliases = generateStandardAliases('Rohit Gurunath Sharma');
      expect(aliases).toContain('R. Sharma');
      expect(aliases).toContain('R Sharma');
      expect(aliases).toContain('RG Sharma');
    });
  });

  describe('Data Provenance Audit Tracking', () => {
    it('creates immutable provenance record with CC_BY_4_0 for Cricsheet', () => {
      const prov = createProvenanceRecord({
        sourceName: 'CRICSHEET',
        sourceUri: 'https://cricsheet.org/matches/12345.json',
        datasetVersion: 'cricsheet-2024-v1',
      });

      expect(prov.licenseType).toBe('CC_BY_4_0');
      expect(prov.attributionNotice).toContain('Cricsheet.org');
      expect(prov.verificationStatus).toBe('AUTOMATED_IMPORT');
    });

    it('creates immutable provenance record with PUBLIC_DOMAIN for Wikidata', () => {
      const prov = createProvenanceRecord({
        sourceName: 'WIKIDATA',
        sourceUri: 'https://www.wikidata.org/wiki/Q213854',
        datasetVersion: 'wikidata-dump-2024',
      });

      expect(prov.licenseType).toBe('PUBLIC_DOMAIN');
      expect(prov.attributionNotice).toContain('Wikidata');
    });
  });

  describe('Cricsheet Match Parser', () => {
    it('parses deliveries, aggregates batter runs, boundaries, bowler balls and wickets', () => {
      const sampleMatch: CricsheetMatchJson = {
        info: {
          match_type: 'T20',
          dates: ['2024-04-10'],
          teams: ['Team Alpha', 'Team Beta'],
        },
        innings: [
          {
            team: 'Team Alpha',
            overs: [
              {
                over: 0,
                deliveries: [
                  {
                    batter: 'Batter One',
                    bowler: 'Bowler Fast',
                    non_striker: 'Batter Two',
                    runs: { batter: 4, extras: 0, total: 4 },
                  },
                  {
                    batter: 'Batter One',
                    bowler: 'Bowler Fast',
                    non_striker: 'Batter Two',
                    runs: { batter: 0, extras: 1, total: 1 },
                    extras: { wides: 1 },
                  },
                  {
                    batter: 'Batter One',
                    bowler: 'Bowler Fast',
                    non_striker: 'Batter Two',
                    runs: { batter: 0, extras: 0, total: 0 },
                    wickets: [
                      {
                        kind: 'caught',
                        player_out: 'Batter One',
                        fielders: [{ name: 'Fielder Slip' }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = parseCricsheetMatch(sampleMatch);
      expect(result).not.toBeNull();
      expect(result?.format).toBe('T20');

      const b1 = result?.playerStats.get('Batter One');
      expect(b1?.runsScored).toBe(4);
      expect(b1?.fours).toBe(1);
      expect(b1?.isDismissed).toBe(true);
      expect(b1?.ballsFaced).toBe(2); // 1 four + 1 dismissal ball (wide doesn't count as ball faced)

      const bowler = result?.playerStats.get('Bowler Fast');
      expect(bowler?.ballsBowled).toBe(2); // 2 legal deliveries (1 wide not counted in ballsBowled)
      expect(bowler?.runsConceded).toBe(5); // 4 + 1 wide
      expect(bowler?.wicketsTaken).toBe(1);

      const slip = result?.playerStats.get('Fielder Slip');
      expect(slip?.catchesTaken).toBe(1);
    });
  });

  describe('Curated Benchmark Cohort Verification', () => {
    it('successfully processes all verified benchmark players through the 4-layer pipeline', () => {
      expect(VERIFIED_BENCHMARK_PLAYERS.length).toBeGreaterThanOrEqual(15);

      for (const rawPlayer of VERIFIED_BENCHMARK_PLAYERS) {
        const profile = ingestPlayerRecord(rawPlayer);

        expect(profile.id).toBe(rawPlayer.id);
        expect(profile.fullName).toBe(rawPlayer.fullName);
        expect(profile.historicalEra).toBeDefined();
        expect(profile.attributes.ratingVersion).toBe('rate-1.0.0');

        // Verify format ratings exist for all 5 formats
        expect(profile.ratings.T10).toBeDefined();
        expect(profile.ratings.T20).toBeDefined();
        expect(profile.ratings.ODI).toBeDefined();
        expect(profile.ratings.TEST_RED_BALL).toBeDefined();
        expect(profile.ratings.TEST_PINK_BALL).toBeDefined();

        // Check bounds on all attributes
        expect(profile.attributes.technique).toBeGreaterThanOrEqual(1);
        expect(profile.attributes.technique).toBeLessThanOrEqual(99);
        expect(profile.attributes.lineAndLength).toBeGreaterThanOrEqual(1);
        expect(profile.attributes.lineAndLength).toBeLessThanOrEqual(99);
      }
    });

    it('preserves era-specific ratings for Sir Donald Bradman and Shane Warne', () => {
      const bradmanRaw = VERIFIED_BENCHMARK_PLAYERS.find(p => p.fullName.includes('Bradman'))!;
      const bradman = ingestPlayerRecord(bradmanRaw);

      expect(bradman.ratings.TEST_RED_BALL?.overallRating).toBeGreaterThanOrEqual(95);
      expect(bradman.ratings.TEST_RED_BALL?.confidenceTier).toBe('MEASURED');
      expect(bradman.ratings.T20?.overallRating).toBeLessThan(bradman.ratings.TEST_RED_BALL!.overallRating);

      const warneRaw = VERIFIED_BENCHMARK_PLAYERS.find(p => p.fullName.includes('Warne'))!;
      const warne = ingestPlayerRecord(warneRaw);
      expect(warne.ratings.TEST_RED_BALL?.bowlingRating).toBeGreaterThanOrEqual(90);
    });
  });
});

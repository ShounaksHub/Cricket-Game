import { describe, expect, it } from 'vitest';
import {
  createProvenanceRecord,
  detectDuplicatePlayers,
  generateStandardAliases,
  ingestPlayerRecord,
  jaroWinklerSimilarity,
  levenshteinSimilarity,
  normalizePlayerName,
  parseCricsheetMatch,
  resolvePlayerIdentity,
  VERIFIED_BENCHMARK_PLAYERS,
  COHORT_INTERNATIONAL_CONTEMPORARY,
  COHORT_INTERNATIONAL_LEGENDS,
  COHORT_DOMESTIC_INDIA,
  COHORT_DOMESTIC_AUSTRALIA,
  COHORT_DOMESTIC_ENGLAND,
  COHORT_DOMESTIC_WORLD,
  GLOBAL_CRICKET_PLAYER_REGISTRY,
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
      expect(VERIFIED_BENCHMARK_PLAYERS.length).toBeGreaterThanOrEqual(40);

      const seenIds = new Set<string>();
      for (const rawPlayer of VERIFIED_BENCHMARK_PLAYERS) {
        // Ensure strictly unique player IDs
        expect(seenIds.has(rawPlayer.id)).toBe(false);
        seenIds.add(rawPlayer.id);

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

    it('verifies role balance supporting two mutually exclusive 11-player dream XIs', () => {
      const profiles = VERIFIED_BENCHMARK_PLAYERS.map(ingestPlayerRecord);

      const keepers = profiles.filter((p) => p.isWicketkeeper);
      const topOrder = profiles.filter((p) => p.primaryRole === 'TOP_ORDER_BATTER');
      const middleOrder = profiles.filter((p) => p.primaryRole === 'MIDDLE_ORDER_BATTER');
      const allRounders = profiles.filter(
        (p) => p.primaryRole === 'BATTING_ALL_ROUNDER' || p.primaryRole === 'BOWLING_ALL_ROUNDER'
      );
      const pacers = profiles.filter((p) => p.primaryRole === 'PACE_BOWLER');
      const spinners = profiles.filter((p) => p.primaryRole === 'SPIN_BOWLER');

      expect(keepers.length).toBeGreaterThanOrEqual(4);
      expect(topOrder.length).toBeGreaterThanOrEqual(6);
      expect(middleOrder.length).toBeGreaterThanOrEqual(4);
      expect(allRounders.length).toBeGreaterThanOrEqual(6);
      expect(pacers.length).toBeGreaterThanOrEqual(8);
      expect(spinners.length).toBeGreaterThanOrEqual(5);

      // Construct Squad 1: 11 distinct players
      const squad1Ids = [
        topOrder[0].id,
        topOrder[1].id,
        topOrder[2].id,
        middleOrder[0].id,
        keepers[0].id,
        allRounders[0].id,
        allRounders[1].id,
        pacers[0].id,
        pacers[1].id,
        spinners[0].id,
        spinners[1].id,
      ];
      expect(new Set(squad1Ids).size).toBe(11);

      // Construct Squad 2: 11 completely distinct players (zero overlap with Squad 1)
      const squad2Ids = [
        topOrder[3].id,
        topOrder[4].id,
        topOrder[5].id,
        middleOrder[1].id,
        keepers[1].id,
        allRounders[2].id,
        allRounders[3].id,
        pacers[2].id,
        pacers[3].id,
        spinners[2].id,
        spinners[3].id,
      ];
      expect(new Set(squad2Ids).size).toBe(11);

      // Verify zero overlap between Squad 1 and Squad 2
      const overlap = squad1Ids.filter((id) => squad2Ids.includes(id));
      expect(overlap.length).toBe(0);
    });

    it('preserves era-specific ratings for Sir Donald Bradman and Shane Warne', () => {
      const bradmanRaw = VERIFIED_BENCHMARK_PLAYERS.find(p => p.fullName.includes('Bradman'))!;
      const bradman = ingestPlayerRecord(bradmanRaw);

      expect(bradman.ratings.TEST_RED_BALL?.overallRating).toBeGreaterThanOrEqual(95);
      expect(bradman.ratings.TEST_RED_BALL?.confidenceTier).toBe('MEASURED');
      expect(bradman.ratings.T20?.overallRating).toBeLessThan(bradman.ratings.TEST_RED_BALL!.overallRating);

      const warneRaw = VERIFIED_BENCHMARK_PLAYERS.find(p => p.fullName.includes('Shane Warne'))!;
      const warne = ingestPlayerRecord(warneRaw);
      expect(warne.ratings.TEST_RED_BALL?.bowlingRating).toBeGreaterThanOrEqual(90);
    });

    it('validates zero duplicate identities in the verified benchmark cohort via detectDuplicatePlayers', () => {
      const audit = detectDuplicatePlayers(VERIFIED_BENCHMARK_PLAYERS);
      expect(audit.hasDuplicates).toBe(false);
      expect(audit.duplicateCount).toBe(0);
      expect(audit.issues).toHaveLength(0);
    });

    it('correctly detects duplicate IDs, duplicate cricsheet IDs and canonical name collisions', () => {
      const tamperedRoster = [
        ...VERIFIED_BENCHMARK_PLAYERS.slice(0, 5),
        // Inject duplicate ID
        {
          ...VERIFIED_BENCHMARK_PLAYERS[0],
          fullName: 'Unique Name But Duplicate UUID',
        },
        // Inject duplicate Cricsheet ID
        {
          ...VERIFIED_BENCHMARK_PLAYERS[1],
          id: 'fake-unique-id-999',
          fullName: 'Different Player Same Cricsheet',
        },
      ];

      const audit = detectDuplicatePlayers(tamperedRoster);
      expect(audit.hasDuplicates).toBe(true);
      expect(audit.duplicateIdCount).toBeGreaterThan(0);
      expect(audit.duplicateCricsheetCount).toBeGreaterThan(0);
      expect(audit.issues.length).toBeGreaterThan(0);
    });

    it('supports careerCategory, isDomesticOnly, and competitions in player ingestion', () => {
      const domesticSpecialistRaw = {
        ...VERIFIED_BENCHMARK_PLAYERS[0],
        id: 'test-domestic-player-001',
        cricsheetId: 'cric-test-dom-001',
        wikidataId: 'Q99999999',
        fullName: 'Test Domestic Veteran',
        displayName: 'T. Veteran',
        careerCategory: 'DOMESTIC_ONLY' as const,
        isDomesticOnly: true,
        competitions: ['Ranji Trophy', 'IPL', 'Syed Mushtaq Ali Trophy'],
      };

      const profile = ingestPlayerRecord(domesticSpecialistRaw);
      expect(profile.careerCategory).toBe('DOMESTIC_ONLY');
      expect(profile.isDomesticOnly).toBe(true);
      expect(profile.competitions).toContain('Ranji Trophy');
      expect(profile.competitions).toContain('IPL');
    });

    it('Gate P7.2: verifies international contemporary and historical legend cohorts (570+ players, zero duplicates)', () => {
      expect(COHORT_INTERNATIONAL_CONTEMPORARY.length).toBeGreaterThanOrEqual(300);
      expect(COHORT_INTERNATIONAL_LEGENDS.length).toBeGreaterThanOrEqual(250);

      const internationalCombined = [
        ...COHORT_INTERNATIONAL_CONTEMPORARY,
        ...COHORT_INTERNATIONAL_LEGENDS,
      ];

      expect(internationalCombined.length).toBeGreaterThanOrEqual(570);

      const audit = detectDuplicatePlayers(internationalCombined);
      expect(audit.hasDuplicates).toBe(false);
      expect(audit.duplicateIdCount).toBe(0);
      expect(audit.duplicateCount).toBe(0);
      expect(audit.issues).toHaveLength(0);

      // Verify representations across ICC Full & Associate Members
      const countries = new Set(internationalCombined.map((p) => p.primaryNationality));
      expect(countries.size).toBeGreaterThanOrEqual(15);
      expect(countries.has('India')).toBe(true);
      expect(countries.has('Australia')).toBe(true);
      expect(countries.has('England')).toBe(true);
      expect(countries.has('South Africa')).toBe(true);
      expect(countries.has('Pakistan')).toBe(true);
      expect(countries.has('New Zealand')).toBe(true);
      expect(countries.has('West Indies')).toBe(true);
      expect(countries.has('Sri Lanka')).toBe(true);
      expect(countries.has('Bangladesh')).toBe(true);
      expect(countries.has('Afghanistan')).toBe(true);
      expect(countries.has('Zimbabwe')).toBe(true);
      expect(countries.has('Ireland')).toBe(true);
      expect(countries.has('Netherlands')).toBe(true);
      expect(countries.has('Scotland')).toBe(true);

      // Verify UUID format for all players (RFC 4122 36 characters)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      for (const p of internationalCombined) {
        expect(p.id).toMatch(uuidRegex);
      }
    });

    it('Gate P7.3: verifies domestic & franchise expansion across India, Australia, England and World (1,000+ total players, zero duplicates)', () => {
      expect(COHORT_DOMESTIC_INDIA.length).toBeGreaterThanOrEqual(200);
      expect(COHORT_DOMESTIC_AUSTRALIA.length).toBeGreaterThanOrEqual(120);
      expect(COHORT_DOMESTIC_ENGLAND.length).toBeGreaterThanOrEqual(110);
      expect(COHORT_DOMESTIC_WORLD.length).toBeGreaterThanOrEqual(100);

      // Verify overall registry reaches 1,000+ players
      expect(GLOBAL_CRICKET_PLAYER_REGISTRY.length).toBeGreaterThanOrEqual(1000);

      // Audit complete registry for zero duplicates
      const fullAudit = detectDuplicatePlayers(GLOBAL_CRICKET_PLAYER_REGISTRY);
      expect(fullAudit.hasDuplicates).toBe(false);
      expect(fullAudit.duplicateIdCount).toBe(0);
      expect(fullAudit.duplicateCount).toBe(0);
      expect(fullAudit.issues).toHaveLength(0);

      // Verify domestic players carry DOMESTIC_ONLY and competition tags
      for (const p of COHORT_DOMESTIC_INDIA) {
        expect(p.careerCategory).toBe('DOMESTIC_ONLY');
        expect(p.isDomesticOnly).toBe(true);
        expect(p.competitions && p.competitions.length).toBeGreaterThan(0);
      }

      for (const p of COHORT_DOMESTIC_AUSTRALIA) {
        expect(p.careerCategory).toBe('DOMESTIC_ONLY');
        expect(p.isDomesticOnly).toBe(true);
        expect(p.competitions && p.competitions.length).toBeGreaterThan(0);
      }

      for (const p of COHORT_DOMESTIC_ENGLAND) {
        expect(p.careerCategory).toBe('DOMESTIC_ONLY');
        expect(p.isDomesticOnly).toBe(true);
        expect(p.competitions && p.competitions.length).toBeGreaterThan(0);
      }

      for (const p of COHORT_DOMESTIC_WORLD) {
        expect(p.careerCategory).toBe('DOMESTIC_ONLY');
        expect(p.isDomesticOnly).toBe(true);
        expect(p.competitions && p.competitions.length).toBeGreaterThan(0);
      }

      // Verify UUID validity on all 1,000+ players
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      for (const p of GLOBAL_CRICKET_PLAYER_REGISTRY) {
        expect(p.id).toMatch(uuidRegex);
      }
    });

    it('Gate P7.4: runs full 1,000+ registry through 4-layer rating engine with explainability and zero NaNs', () => {
      const profiles = GLOBAL_CRICKET_PLAYER_REGISTRY.map(ingestPlayerRecord);
      expect(profiles.length).toBeGreaterThanOrEqual(1000);

      let benchmarkTierCount = 0;
      let measuredTierCount = 0;
      let estimatedTierCount = 0;

      for (const profile of profiles) {
        // Assert basic metadata
        expect(profile.id).toBeDefined();
        expect(profile.fullName).toBeDefined();
        expect(profile.primaryNationality).toBeDefined();
        expect(profile.primaryRole).toBeDefined();

        // Check ratings across formats
        const formats = ['TEST_RED_BALL', 'ODI', 'T20'] as const;
        for (const fmt of formats) {
          const rating = profile.ratings[fmt];
          if (rating) {
            expect(Number.isNaN(rating.overallRating)).toBe(false);
            expect(Number.isNaN(rating.battingRating)).toBe(false);
            expect(Number.isNaN(rating.bowlingRating)).toBe(false);
            expect(Number.isNaN(rating.fieldingRating)).toBe(false);

            expect(rating.overallRating).toBeGreaterThanOrEqual(10);
            expect(rating.overallRating).toBeLessThanOrEqual(100);

            if (rating.confidenceTier === 'BENCHMARK') benchmarkTierCount++;
            if (rating.confidenceTier === 'MEASURED') measuredTierCount++;
            if (rating.confidenceTier === 'ESTIMATED') estimatedTierCount++;
          }
        }

        // Verify player attributes
        expect(profile.attributes.timing).toBeGreaterThanOrEqual(0);
        expect(profile.attributes.timing).toBeLessThanOrEqual(100);
        expect(profile.attributes.accuracy).toBeGreaterThanOrEqual(0);
        expect(profile.attributes.accuracy).toBeLessThanOrEqual(100);
      }

      // Assert diverse confidence tier distribution
      expect(measuredTierCount).toBeGreaterThan(500);
      expect(benchmarkTierCount + estimatedTierCount).toBeGreaterThan(100);

      // Verify specific domestic legends receive high first-class ratings
      const jaffer = profiles.find((p) => p.fullName === 'Wasim Jaffer')!;
      expect(jaffer).toBeDefined();
      expect(jaffer.ratings.TEST_RED_BALL?.battingRating).toBeGreaterThanOrEqual(75);

      const hick = profiles.find((p) => p.fullName === 'Graeme Hick')!;
      expect(hick).toBeDefined();
      expect(hick.ratings.TEST_RED_BALL?.battingRating).toBeGreaterThanOrEqual(75);
    });
  });
});



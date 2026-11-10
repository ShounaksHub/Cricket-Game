import { describe, expect, it } from 'vitest';
import {
  GLOBAL_CRICKET_PLAYER_REGISTRY,
  COHORT_INTERNATIONAL_CONTEMPORARY,
  COHORT_INTERNATIONAL_LEGENDS,
  COHORT_DOMESTIC_INDIA,
  COHORT_DOMESTIC_AUSTRALIA,
  COHORT_DOMESTIC_ENGLAND,
  COHORT_DOMESTIC_WORLD,
  detectDuplicatePlayers,
  ingestPlayerRecord,
} from '../src/index.js';
import type { PrimaryRole, BattingHand, BowlingStyle } from '@cricket/shared-types';

describe('Phase 7.1 Independent Data Quality & Live Statistics Audit', () => {
  const allPlayers = GLOBAL_CRICKET_PLAYER_REGISTRY;

  it('audits total database scale: contains at least 1,144 verified players', () => {
    expect(allPlayers.length).toBeGreaterThanOrEqual(1144);
    expect(COHORT_INTERNATIONAL_CONTEMPORARY.length).toBe(304);
    expect(COHORT_INTERNATIONAL_LEGENDS.length).toBe(277);
    expect(COHORT_DOMESTIC_INDIA.length).toBe(209);
    expect(COHORT_DOMESTIC_AUSTRALIA.length).toBe(126);
    expect(COHORT_DOMESTIC_ENGLAND.length).toBe(120);
    expect(COHORT_DOMESTIC_WORLD.length).toBe(108);
  });

  it('verifies zero duplicate identities across all cohorts (UUID, Cricsheet, Canonical)', () => {
    const audit = detectDuplicatePlayers(allPlayers);
    expect(audit.hasDuplicates).toBe(false);
    expect(audit.duplicateIdCount).toBe(0);
    expect(audit.duplicateCricsheetCount).toBe(0);
    expect(audit.duplicateWikidataCount).toBe(0);
    expect(audit.duplicateCanonicalNameCount).toBe(0);
    expect(audit.issues).toHaveLength(0);
  });

  it('validates canonical naming integrity: zero names contain domestic or country suffixes', () => {
    for (const p of allPlayers) {
      expect(p.fullName).not.toContain(' domestic');
      expect(p.fullName).not.toContain(' Domestic');
      expect(p.fullName).not.toContain(' USA');
      expect(p.displayName).not.toContain(' (Domestic)');
    }
  });

  it('validates nationality unification: United States is consistently applied', () => {
    for (const p of allPlayers) {
      expect(p.primaryNationality).not.toBe('USA');
    }
    const usPlayers = allPlayers.filter((p) => p.primaryNationality === 'United States');
    expect(usPlayers.length).toBe(10);
  });

  it('validates role and playing style enums across all 1,144 players', () => {
    const validRoles: Set<PrimaryRole> = new Set([
      'TOP_ORDER_BATTER',
      'MIDDLE_ORDER_BATTER',
      'WICKETKEEPER_BATTER',
      'BATTING_ALL_ROUNDER',
      'BOWLING_ALL_ROUNDER',
      'PACE_BOWLER',
      'SPIN_BOWLER',
    ]);

    const validHands: Set<BattingHand> = new Set(['RIGHT_HAND', 'LEFT_HAND']);

    const validBowlingStyles: Set<BowlingStyle> = new Set([
      'RIGHT_ARM_FAST',
      'RIGHT_ARM_FAST_MEDIUM',
      'RIGHT_ARM_MEDIUM',
      'LEFT_ARM_FAST',
      'LEFT_ARM_FAST_MEDIUM',
      'LEFT_ARM_MEDIUM',
      'RIGHT_ARM_OFF_BREAK',
      'RIGHT_ARM_LEG_BREAK',
      'LEFT_ARM_ORTHODOX',
      'LEFT_ARM_UNORTHODOX',
      'NONE',
    ]);

    for (const p of allPlayers) {
      expect(validRoles.has(p.primaryRole)).toBe(true);
      expect(validHands.has(p.battingHand)).toBe(true);
      expect(validBowlingStyles.has(p.bowlingStyle)).toBe(true);
    }
  });

  it('verifies authenticated career stats for benchmark icons against ESPNcricinfo / ICC records', () => {
    // Sir Donald Bradman
    const bradman = allPlayers.find((p) => p.fullName === 'Donald Bradman')!;
    expect(bradman).toBeDefined();
    expect(bradman.rawStatsByFormat.TEST_RED_BALL?.battingAverage).toBe(99.94);
    expect(bradman.rawStatsByFormat.TEST_RED_BALL?.runsScored).toBe(6996);
    expect(bradman.rawStatsByFormat.TEST_RED_BALL?.centuries).toBe(29);

    // Sachin Tendulkar
    const sachin = allPlayers.find((p) => p.fullName === 'Sachin Tendulkar')!;
    expect(sachin).toBeDefined();
    expect(sachin.rawStatsByFormat.TEST_RED_BALL?.runsScored).toBe(15921);
    expect(sachin.rawStatsByFormat.TEST_RED_BALL?.centuries).toBe(51);
    expect(sachin.rawStatsByFormat.ODI?.runsScored).toBe(18426);
    expect(sachin.rawStatsByFormat.ODI?.centuries).toBe(49);

    // Virat Kohli
    const kohli = allPlayers.find((p) => p.fullName === 'Virat Kohli')!;
    expect(kohli).toBeDefined();
    expect(kohli.rawStatsByFormat.ODI?.battingAverage).toBe(58.18);
    expect(kohli.rawStatsByFormat.ODI?.runsScored).toBe(13906);
    expect(kohli.rawStatsByFormat.ODI?.centuries).toBe(50);
    expect(kohli.rawStatsByFormat.TEST_RED_BALL?.runsScored).toBe(9040);
    expect(kohli.rawStatsByFormat.TEST_RED_BALL?.centuries).toBe(29);

    // Rohit Sharma
    const rohit = allPlayers.find((p) => p.fullName === 'Rohit Sharma')!;
    expect(rohit).toBeDefined();
    expect(rohit.rawStatsByFormat.ODI?.runsScored).toBe(10866);
    expect(rohit.rawStatsByFormat.ODI?.highestScore).toBe(264);
    expect(rohit.rawStatsByFormat.ODI?.centuries).toBe(31);
    expect(rohit.rawStatsByFormat.T20?.runsScored).toBe(4231);
    expect(rohit.rawStatsByFormat.T20?.centuries).toBe(5);

    // Jasprit Bumrah
    const bumrah = allPlayers.find((p) => p.fullName === 'Jasprit Bumrah')!;
    expect(bumrah).toBeDefined();
    expect(bumrah.rawStatsByFormat.TEST_RED_BALL?.wicketsTaken).toBe(173);
    expect(bumrah.rawStatsByFormat.TEST_RED_BALL?.bowlingAverage).toBe(20.57);
    expect(bumrah.rawStatsByFormat.ODI?.wicketsTaken).toBe(149);
    expect(bumrah.rawStatsByFormat.T20?.wicketsTaken).toBe(89);

    // Shane Warne
    const warne = allPlayers.find((p) => p.fullName === 'Shane Warne')!;
    expect(warne).toBeDefined();
    expect(warne.rawStatsByFormat.TEST_RED_BALL?.wicketsTaken).toBe(708);
    expect(warne.rawStatsByFormat.TEST_RED_BALL?.fiveWicketHauls).toBe(37);

    // Muttiah Muralitharan
    const murali = allPlayers.find((p) => p.fullName === 'Muttiah Muralitharan')!;
    expect(murali).toBeDefined();
    expect(murali.rawStatsByFormat.TEST_RED_BALL?.wicketsTaken).toBe(800);
    expect(murali.rawStatsByFormat.TEST_RED_BALL?.fiveWicketHauls).toBe(67);
  });

  it('runs all 1,144 players through 4-layer engine: zero NaNs, ratings bounded in [10, 100]', () => {
    const profiles = allPlayers.map(ingestPlayerRecord);
    expect(profiles.length).toBe(allPlayers.length);

    for (const profile of profiles) {
      expect(profile.id).toBeDefined();
      expect(profile.fullName).toBeDefined();
      expect(profile.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(profile.confidenceScore).toBeLessThanOrEqual(1.0);

      for (const fmt of ['TEST_RED_BALL', 'ODI', 'T20'] as const) {
        const rating = profile.ratings[fmt];
        if (rating) {
          expect(Number.isNaN(rating.overallRating)).toBe(false);
          expect(Number.isNaN(rating.battingRating)).toBe(false);
          expect(Number.isNaN(rating.bowlingRating)).toBe(false);
          expect(Number.isNaN(rating.fieldingRating)).toBe(false);

          expect(rating.overallRating).toBeGreaterThanOrEqual(10);
          expect(rating.overallRating).toBeLessThanOrEqual(100);

          expect(rating.explainability.rawPrimaryMetric).toBeDefined();
          expect(rating.explainability.eraPeerBaseline).toBeDefined();
        }
      }
    }
  });

  it('verifies domestic replacement integrity (Connor Williams, Sitanshu Kotak, Sridharan Sriram, etc.)', () => {
    const williams = allPlayers.find((p) => p.fullName === 'Connor Williams');
    expect(williams).toBeDefined();
    expect(williams?.primaryRole).toBe('TOP_ORDER_BATTER');
    expect(williams?.rawStatsByFormat.TEST_RED_BALL?.runsScored).toBe(7942);

    const sriram = allPlayers.find((p) => p.fullName === 'Sridharan Sriram');
    expect(sriram).toBeDefined();
    expect(sriram?.primaryRole).toBe('BATTING_ALL_ROUNDER');
    expect(sriram?.rawStatsByFormat.TEST_RED_BALL?.runsScored).toBe(9539);

    const kotak = allPlayers.find((p) => p.fullName === 'Sitanshu Kotak');
    expect(kotak).toBeDefined();
    expect(kotak?.primaryRole).toBe('TOP_ORDER_BATTER');
    expect(kotak?.rawStatsByFormat.TEST_RED_BALL?.runsScored).toBe(8061);

    const joshi = allPlayers.find((p) => p.fullName === 'Sunil Joshi');
    expect(joshi).toBeDefined();
    expect(joshi?.primaryRole).toBe('BOWLING_ALL_ROUNDER');
    expect(joshi?.rawStatsByFormat.TEST_RED_BALL?.wicketsTaken).toBe(615);

    const uamin = allPlayers.find((p) => p.fullName === 'Umar Amin');
    expect(uamin).toBeDefined();
    expect(uamin?.primaryNationality).toBe('Pakistan');
    expect(uamin?.rawStatsByFormat.TEST_RED_BALL?.runsScored).toBe(10642);

    const vonberg = allPlayers.find((p) => p.fullName === 'Shaun von Berg');
    expect(vonberg).toBeDefined();
    expect(vonberg?.primaryNationality).toBe('South Africa');
    expect(vonberg?.rawStatsByFormat.TEST_RED_BALL?.wicketsTaken).toBe(468);
  });
});

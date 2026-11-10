import { describe, expect, it } from 'vitest';
import {
  getRequiredBowlersForFormat,
  isRealisticBowlingOption,
  validateDreamTeamSquad,
} from '../src/index.js';
import type {
  DreamTeamPlayerSlotInput,
  PlayerSquadContext,
} from '@cricket/shared-types';

describe('Squad Validation Engine (P3.2)', () => {
  // Mock player contexts
  const mockBatter = (id: string, name: string): PlayerSquadContext => ({
    id,
    fullName: name,
    displayName: name,
    primaryRole: 'TOP_ORDER_BATTER',
    bowlingStyle: 'NONE',
    isWicketkeeper: false,
    formatRating: {
      format: 'T20',
      overallRating: 88,
      battingRating: 92,
      bowlingRating: 15,
      fieldingRating: 80,
      confidenceTier: 'MEASURED',
      confidenceScore: 0.95,
      ratingVersion: 'rate-1.0.0',
      explainability: {
        rawPrimaryMetric: 'Avg: 48',
        eraPeerBaseline: 'Peer: 25',
        sampleSizeInnings: 100,
        shrinkageApplied: 0.05,
      },
    },
  });

  const mockKeeper = (id: string, name: string): PlayerSquadContext => ({
    id,
    fullName: name,
    displayName: name,
    primaryRole: 'WICKETKEEPER_BATTER',
    bowlingStyle: 'NONE',
    isWicketkeeper: true,
    formatRating: {
      format: 'T20',
      overallRating: 86,
      battingRating: 88,
      bowlingRating: 10,
      fieldingRating: 92,
      confidenceTier: 'MEASURED',
      confidenceScore: 0.92,
      ratingVersion: 'rate-1.0.0',
      explainability: {
        rawPrimaryMetric: 'Avg: 38',
        eraPeerBaseline: 'Peer: 25',
        sampleSizeInnings: 80,
        shrinkageApplied: 0.08,
      },
    },
  });

  const mockAllRounder = (id: string, name: string): PlayerSquadContext => ({
    id,
    fullName: name,
    displayName: name,
    primaryRole: 'BATTING_ALL_ROUNDER',
    bowlingStyle: 'RIGHT_ARM_FAST_MEDIUM',
    isWicketkeeper: false,
    formatRating: {
      format: 'T20',
      overallRating: 89,
      battingRating: 85,
      bowlingRating: 78,
      fieldingRating: 85,
      confidenceTier: 'MEASURED',
      confidenceScore: 0.90,
      ratingVersion: 'rate-1.0.0',
      explainability: {
        rawPrimaryMetric: 'Bat 35, Bowl 22',
        eraPeerBaseline: 'Peer: 25',
        sampleSizeInnings: 90,
        shrinkageApplied: 0.10,
      },
    },
  });

  const mockPacer = (id: string, name: string): PlayerSquadContext => ({
    id,
    fullName: name,
    displayName: name,
    primaryRole: 'PACE_BOWLER',
    bowlingStyle: 'RIGHT_ARM_FAST',
    isWicketkeeper: false,
    formatRating: {
      format: 'T20',
      overallRating: 91,
      battingRating: 15,
      bowlingRating: 94,
      fieldingRating: 75,
      confidenceTier: 'MEASURED',
      confidenceScore: 0.96,
      ratingVersion: 'rate-1.0.0',
      explainability: {
        rawPrimaryMetric: 'Bowl 18',
        eraPeerBaseline: 'Peer: 25',
        sampleSizeInnings: 85,
        shrinkageApplied: 0.04,
      },
    },
  });

  const mockSpinner = (id: string, name: string): PlayerSquadContext => ({
    id,
    fullName: name,
    displayName: name,
    primaryRole: 'SPIN_BOWLER',
    bowlingStyle: 'RIGHT_ARM_LEG_BREAK',
    isWicketkeeper: false,
    formatRating: {
      format: 'T20',
      overallRating: 92,
      battingRating: 25,
      bowlingRating: 95,
      fieldingRating: 80,
      confidenceTier: 'MEASURED',
      confidenceScore: 0.95,
      ratingVersion: 'rate-1.0.0',
      explainability: {
        rawPrimaryMetric: 'Bowl 15',
        eraPeerBaseline: 'Peer: 25',
        sampleSizeInnings: 95,
        shrinkageApplied: 0.05,
      },
    },
  });

  // Builder for valid balanced playing XI (5 batters, 1 keeper, 2 all-rounders, 2 pacers, 1 spinner)
  const createValidLineup = (): {
    lineup: DreamTeamPlayerSlotInput[];
    contexts: Map<string, PlayerSquadContext>;
  } => {
    const contexts = new Map<string, PlayerSquadContext>();
    const lineup: DreamTeamPlayerSlotInput[] = [];

    // Positions 1-4: Specialist Batters
    for (let i = 1; i <= 4; i++) {
      const id = `00000000-0000-0000-0000-00000000000${i}`;
      contexts.set(id, mockBatter(id, `Batter ${i}`));
      lineup.push({
        playerId: id,
        battingOrder: i,
        isCaptain: i === 1,
        isViceCaptain: i === 2,
        isDesignatedWicketkeeper: false,
      });
    }

    // Position 5: Wicketkeeper
    const keeperId = '00000000-0000-0000-0000-000000000005';
    contexts.set(keeperId, mockKeeper(keeperId, 'Keeper'));
    lineup.push({
      playerId: keeperId,
      battingOrder: 5,
      isCaptain: false,
      isViceCaptain: false,
      isDesignatedWicketkeeper: true,
    });

    // Positions 6-7: All-Rounders
    for (let i = 6; i <= 7; i++) {
      const id = `00000000-0000-0000-0000-00000000000${i}`;
      contexts.set(id, mockAllRounder(id, `AllRounder ${i}`));
      lineup.push({
        playerId: id,
        battingOrder: i,
        isCaptain: false,
        isViceCaptain: false,
        isDesignatedWicketkeeper: false,
        bowlingPriority: i - 5,
      });
    }

    // Positions 8-9: Pacers
    for (let i = 8; i <= 9; i++) {
      const id = `00000000-0000-0000-0000-00000000000${i}`;
      contexts.set(id, mockPacer(id, `Pacer ${i}`));
      lineup.push({
        playerId: id,
        battingOrder: i,
        isCaptain: false,
        isViceCaptain: false,
        isDesignatedWicketkeeper: false,
        bowlingPriority: i - 5,
      });
    }

    // Positions 10-11: Spinner and Pacer
    const spinId = '00000000-0000-0000-0000-000000000010';
    contexts.set(spinId, mockSpinner(spinId, 'Spinner'));
    lineup.push({
      playerId: spinId,
      battingOrder: 10,
      isCaptain: false,
      isViceCaptain: false,
      isDesignatedWicketkeeper: false,
      bowlingPriority: 5,
    });

    const pacerId = '00000000-0000-0000-0000-000000000011';
    contexts.set(pacerId, mockPacer(pacerId, 'Pacer 11'));
    lineup.push({
      playerId: pacerId,
      battingOrder: 11,
      isCaptain: false,
      isViceCaptain: false,
      isDesignatedWicketkeeper: false,
      bowlingPriority: 6,
    });

    return { lineup, contexts };
  };

  it('validates a complete, balanced 11-player playing XI as match-ready', () => {
    const { lineup, contexts } = createValidLineup();
    const result = validateDreamTeamSquad('T20', lineup, contexts);

    expect(result.isValid).toBe(true);
    expect(result.isMatchReady).toBe(true);
    expect(result.errors.length).toBe(0);
    expect(result.summary.playerCount).toBe(11);
    expect(result.summary.keeperCount).toBe(1);
    expect(result.summary.bowlerCount).toBeGreaterThanOrEqual(5);
  });

  it('allows incomplete drafts when requireMatchReady is false', () => {
    const { lineup, contexts } = createValidLineup();
    const draftLineup = lineup.slice(0, 7); // 7 players draft

    const result = validateDreamTeamSquad('T20', draftLineup, contexts, { requireMatchReady: false });
    expect(result.isValid).toBe(true);
    expect(result.isMatchReady).toBe(false);
    expect(result.errors.length).toBe(0);
    expect(result.summary.playerCount).toBe(7);
  });

  it('fails match-readiness when squad has only 10 players', () => {
    const { lineup, contexts } = createValidLineup();
    const incompleteLineup = lineup.slice(0, 10);

    const result = validateDreamTeamSquad('T20', incompleteLineup, contexts, { requireMatchReady: true });
    expect(result.isValid).toBe(false);
    expect(result.isMatchReady).toBe(false);
    expect(result.errors.some((e) => e.code === 'SQUAD_SIZE_INVALID')).toBe(true);
  });

  it('rejects squad exceeding 11 players', () => {
    const { lineup, contexts } = createValidLineup();
    const extraPlayer: DreamTeamPlayerSlotInput = {
      playerId: '00000000-0000-0000-0000-000000000012',
      battingOrder: 12,
    };
    lineup.push(extraPlayer);

    const result = validateDreamTeamSquad('T20', lineup, contexts);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.code === 'SQUAD_SIZE_INVALID')).toBe(true);
    expect(result.errors.some((e) => e.code === 'INVALID_BATTING_ORDER_RANGE')).toBe(true);
  });

  it('detects duplicate players selected in the lineup', () => {
    const { lineup, contexts } = createValidLineup();
    // Duplicate player 1 into slot 2
    lineup[1] = {
      ...lineup[1],
      playerId: lineup[0].playerId,
    };

    const result = validateDreamTeamSquad('T20', lineup, contexts);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.code === 'DUPLICATE_PLAYER')).toBe(true);
  });

  it('detects duplicate batting positions', () => {
    const { lineup, contexts } = createValidLineup();
    lineup[1] = {
      ...lineup[1],
      battingOrder: 1, // duplicate position 1
    };

    const result = validateDreamTeamSquad('T20', lineup, contexts);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.code === 'DUPLICATE_BATTING_ORDER')).toBe(true);
  });

  it('detects batting order gaps in an 11-player lineup', () => {
    const { lineup, contexts } = createValidLineup();
    // Swap position 4 to 11, leaving position 4 missing and duplicate 11
    lineup[3] = {
      ...lineup[3],
      battingOrder: 11,
    };

    const result = validateDreamTeamSquad('T20', lineup, contexts);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.code === 'BATTING_ORDER_GAPS')).toBe(true);
  });

  it('rejects a lineup with no designated wicketkeeper', () => {
    const { lineup, contexts } = createValidLineup();
    for (const slot of lineup) {
      (slot as { isDesignatedWicketkeeper: boolean }).isDesignatedWicketkeeper = false;
    }

    const result = validateDreamTeamSquad('T20', lineup, contexts);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.code === 'MISSING_WICKETKEEPER')).toBe(true);
  });

  it('flags warning when multiple wicketkeepers are designated', () => {
    const { lineup, contexts } = createValidLineup();
    (lineup[0] as { isDesignatedWicketkeeper: boolean }).isDesignatedWicketkeeper = true;
    (lineup[4] as { isDesignatedWicketkeeper: boolean }).isDesignatedWicketkeeper = true;

    const result = validateDreamTeamSquad('T20', lineup, contexts);
    expect(result.warnings.some((w) => w.code === 'MULTIPLE_WICKETKEEPERS')).toBe(true);
  });

  it('rejects a T20 lineup with insufficient bowling options (< 5)', () => {
    const { lineup, contexts } = createValidLineup();
    // Replace all-rounders and pacers with specialist non-bowling batters
    for (let i = 5; i < 9; i++) {
      const id = lineup[i].playerId;
      contexts.set(id, mockBatter(id, `Batter ${i}`));
      (lineup[i] as { bowlingPriority?: number | null }).bowlingPriority = null;
    }

    const result = validateDreamTeamSquad('T20', lineup, contexts);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.code === 'INSUFFICIENT_BOWLING_RESOURCES')).toBe(true);
  });

  it('recognizes all-rounders as bowling options even without explicit role label', () => {
    const slot: DreamTeamPlayerSlotInput = {
      playerId: 'test-all-rounder',
      battingOrder: 6,
      isDesignatedWicketkeeper: false,
    };
    const ctx: PlayerSquadContext = {
      id: 'test-all-rounder',
      fullName: 'Skilled Batter Who Bowls',
      displayName: 'All Rounder',
      primaryRole: 'MIDDLE_ORDER_BATTER', // role label is batter
      bowlingStyle: 'RIGHT_ARM_MEDIUM', // but bowls medium pace
      isWicketkeeper: false,
      formatRating: {
        format: 'T20',
        overallRating: 80,
        battingRating: 82,
        bowlingRating: 68, // recognized bowling ability >= 40
        fieldingRating: 75,
        confidenceTier: 'MEASURED',
        confidenceScore: 0.9,
        ratingVersion: 'rate-1.0.0',
        explainability: {
          rawPrimaryMetric: 'Avg: 30',
          eraPeerBaseline: 'Peer: 25',
          sampleSizeInnings: 50,
          shrinkageApplied: 0.1,
        },
      },
    };

    expect(isRealisticBowlingOption(slot, ctx)).toBe(true);
  });

  it('correctly maps required bowlers by format', () => {
    expect(getRequiredBowlersForFormat('T10')).toBe(5);
    expect(getRequiredBowlersForFormat('T20')).toBe(5);
    expect(getRequiredBowlersForFormat('ODI')).toBe(5);
    expect(getRequiredBowlersForFormat('TEST_RED_BALL')).toBe(4);
    expect(getRequiredBowlersForFormat('TEST_PINK_BALL')).toBe(4);
  });

  it('flags advisory warning when squad lacks a designated captain', () => {
    const { lineup, contexts } = createValidLineup();
    for (const slot of lineup) {
      (slot as { isCaptain: boolean }).isCaptain = false;
    }

    const result = validateDreamTeamSquad('T20', lineup, contexts);
    expect(result.warnings.some((w) => w.code === 'NO_CAPTAIN_DESIGNATED')).toBe(true);
  });

  it('rejects squad with multiple captains designated', () => {
    const { lineup, contexts } = createValidLineup();
    (lineup[0] as { isCaptain: boolean }).isCaptain = true;
    (lineup[1] as { isCaptain: boolean }).isCaptain = true;

    const result = validateDreamTeamSquad('T20', lineup, contexts);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.code === 'MULTIPLE_CAPTAINS_DESIGNATED')).toBe(true);
  });

  it('enforces One-Player-Per-Nation constraint when uniqueNationRule is enabled', () => {
    const { lineup, contexts } = createValidLineup();
    // Assign nationalities: make first two players both from India
    const p1 = contexts.get(lineup[0].playerId);
    const p2 = contexts.get(lineup[1].playerId);
    if (p1) (p1 as any).primaryNationality = 'India';
    if (p2) (p2 as any).primaryNationality = 'India';

    // Without uniqueNationRule: should be valid
    const normalResult = validateDreamTeamSquad('T20', lineup, contexts, { uniqueNationRule: false });
    expect(normalResult.isValid).toBe(true);

    // With uniqueNationRule: should fail with MULTIPLE_PLAYERS_FROM_NATION
    const strictResult = validateDreamTeamSquad('T20', lineup, contexts, { uniqueNationRule: true });
    expect(strictResult.isValid).toBe(false);
    expect(strictResult.errors.some((e) => e.code === 'MULTIPLE_PLAYERS_FROM_NATION')).toBe(true);
  });
});

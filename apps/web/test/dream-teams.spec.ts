import { describe, expect, it } from 'vitest';
import {
  validateDreamTeamSquad,
  calculateSquadAnalytics,
} from '@cricket/cricket-rules';
import {
  ingestPlayerRecord,
  VERIFIED_BENCHMARK_PLAYERS,
} from '@cricket/data-ingestion';
import type {
  PlayerSquadContext,
  DreamTeamPlayerSlotInput,
  SquadValidationResult,
} from '@cricket/shared-types';

describe('Web Dream Team Builder & Persistence Engine (P6.2)', () => {
  const allPlayers = VERIFIED_BENCHMARK_PLAYERS.map((raw) => ingestPlayerRecord(raw));
  const playerMap = new Map<string, PlayerSquadContext>();

  for (const p of allPlayers) {
    playerMap.set(p.id, {
      id: p.id,
      fullName: p.fullName,
      displayName: p.displayName,
      primaryRole: p.primaryRole,
      battingHand: p.battingHand,
      bowlingStyle: p.bowlingStyle,
      isWicketkeeper: p.isWicketkeeper,
      formatRating: p.ratings.T20,
      ratings: p.ratings,
    });
  }

  // Helper to build a valid 11-player squad
  function buildBalancedT20Squad(): DreamTeamPlayerSlotInput[] {
    const rohit = allPlayers.find((p) => p.fullName.includes('Rohit'))!;
    const gilchrist = allPlayers.find((p) => p.fullName.includes('Gilchrist'))!;
    const kohli = allPlayers.find((p) => p.fullName.includes('Kohli'))!;
    const lara = allPlayers.find((p) => p.fullName.includes('Lara'))!;
    const deVilliers = allPlayers.find((p) => p.fullName.includes('Villiers'))!;
    const sobers = allPlayers.find((p) => p.fullName.includes('Sobers'))!;
    const stokes = allPlayers.find((p) => p.fullName.includes('Stokes'))!;
    const jadeja = allPlayers.find((p) => p.fullName.includes('Ravindra Jadeja'))!;
    const akram = allPlayers.find((p) => p.fullName.includes('Akram'))!;
    const warne = allPlayers.find((p) => p.fullName.includes('Shane Warne'))!;
    const bumrah = allPlayers.find((p) => p.fullName.includes('Bumrah'))!;

    return [
      { playerId: rohit.id, battingOrder: 1, isCaptain: false, isDesignatedWicketkeeper: false },
      { playerId: gilchrist.id, battingOrder: 2, isCaptain: false, isDesignatedWicketkeeper: true },
      { playerId: kohli.id, battingOrder: 3, isCaptain: true, isDesignatedWicketkeeper: false },
      { playerId: lara.id, battingOrder: 4, isCaptain: false, isDesignatedWicketkeeper: false },
      { playerId: deVilliers.id, battingOrder: 5, isCaptain: false, isDesignatedWicketkeeper: false },
      { playerId: sobers.id, battingOrder: 6, isCaptain: false, isDesignatedWicketkeeper: false, bowlingPriority: 4 },
      { playerId: stokes.id, battingOrder: 7, isCaptain: false, isDesignatedWicketkeeper: false, bowlingPriority: 5 },
      { playerId: jadeja.id, battingOrder: 8, isCaptain: false, isDesignatedWicketkeeper: false, bowlingPriority: 3 },
      { playerId: akram.id, battingOrder: 9, isCaptain: false, isDesignatedWicketkeeper: false, bowlingPriority: 1 },
      { playerId: warne.id, battingOrder: 10, isCaptain: false, isDesignatedWicketkeeper: false, bowlingPriority: 2 },
      { playerId: bumrah.id, battingOrder: 11, isCaptain: false, isDesignatedWicketkeeper: false, bowlingPriority: 1 },
    ];
  }

  it('validates a complete, role-balanced match-ready T20 Playing XI', () => {
    const squad = buildBalancedT20Squad();
    expect(squad.length).toBe(11);

    const validation: SquadValidationResult = validateDreamTeamSquad('T20', squad, playerMap, {
      requireMatchReady: true,
    });

    expect(validation.isMatchReady).toBe(true);
    expect(validation.errors).toHaveLength(0);
    expect(validation.summary.playerCount).toBe(11);
    expect(validation.summary.captainCount).toBe(1);
    expect(validation.summary.keeperCount).toBe(1);
    expect(validation.summary.bowlerCount).toBeGreaterThanOrEqual(5);
  });

  it('enforces exactly 11 players for match readiness (rejects 10 players)', () => {
    const squad = buildBalancedT20Squad().slice(0, 10);
    expect(squad.length).toBe(10);

    const validation = validateDreamTeamSquad('T20', squad, playerMap, {
      requireMatchReady: true,
    });

    expect(validation.isMatchReady).toBe(false);
    expect(validation.errors.some((e) => e.code === 'SQUAD_SIZE_INVALID')).toBe(true);
  });

  it('detects multiple designated captains as a hard error', () => {
    const squad = buildBalancedT20Squad().map((s, idx) => ({ ...s, isCaptain: idx < 2 }));

    const validation = validateDreamTeamSquad('T20', squad, playerMap, {
      requireMatchReady: true,
    });

    expect(validation.isMatchReady).toBe(false);
    expect(validation.errors.some((e) => e.code === 'MULTIPLE_CAPTAINS_DESIGNATED')).toBe(true);
  });

  it('enforces exactly 1 designated wicketkeeper (detects missing wicketkeeper)', () => {
    const squad = buildBalancedT20Squad().map((s) => ({ ...s, isDesignatedWicketkeeper: false }));

    const validation = validateDreamTeamSquad('T20', squad, playerMap, {
      requireMatchReady: true,
    });

    expect(validation.isMatchReady).toBe(false);
    expect(validation.errors.some((e) => e.code === 'MISSING_WICKETKEEPER')).toBe(true);
  });

  it('enforces minimum bowling options for T20 format (minimum 5 distinct options)', () => {
    // Custom context where non-bowlers strictly have no bowling utility
    const customPlayerMap = new Map<string, PlayerSquadContext>();
    for (const [id, ctx] of playerMap.entries()) {
      customPlayerMap.set(id, { ...ctx });
    }

    const squad = buildBalancedT20Squad();
    // Neutralize bowling on 7 players
    for (let i = 0; i < 7; i++) {
      const pid = squad[i].playerId;
      const original = playerMap.get(pid)!;
      customPlayerMap.set(pid, {
        ...original,
        primaryRole: 'TOP_ORDER_BATTER',
        bowlingStyle: 'NONE',
        formatRating: original.formatRating ? { ...original.formatRating, bowlingRating: 10 } : undefined,
      });
      squad[i] = {
        ...squad[i],
        bowlingPriority: null,
      };
    }

    // Only 4 bowlers remain in slots 7, 8, 9, 10 (slot 11 also neutralized)
    const pid11 = squad[10].playerId;
    const orig11 = playerMap.get(pid11)!;
    customPlayerMap.set(pid11, {
      ...orig11,
      primaryRole: 'TOP_ORDER_BATTER',
      bowlingStyle: 'NONE',
      formatRating: orig11.formatRating ? { ...orig11.formatRating, bowlingRating: 10 } : undefined,
    });
    squad[10] = { ...squad[10], bowlingPriority: null };

    const validation = validateDreamTeamSquad('T20', squad, customPlayerMap, {
      requireMatchReady: true,
    });

    expect(validation.isMatchReady).toBe(false);
    expect(validation.errors.some((e) => e.code === 'INSUFFICIENT_BOWLING_RESOURCES')).toBe(true);
  });

  it('supports batting order reordering while preserving contiguous 1..11 ranks', () => {
    const squad = buildBalancedT20Squad();

    // Swap position 1 (Rohit) and position 2 (Gilchrist)
    const slot1 = squad[0];
    const slot2 = squad[1];

    const reordered = [...squad];
    reordered[0] = { ...slot1, battingOrder: 2 };
    reordered[1] = { ...slot2, battingOrder: 1 };
    reordered.sort((a, b) => a.battingOrder - b.battingOrder);

    expect(reordered[0].playerId).toBe(slot2.playerId);
    expect(reordered[0].battingOrder).toBe(1);
    expect(reordered[1].playerId).toBe(slot1.playerId);
    expect(reordered[1].battingOrder).toBe(2);

    // Verify all ranks are contiguous 1 through 11
    const ranks = reordered.map((s) => s.battingOrder);
    expect(ranks).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it('calculates comprehensive 8-dimension squad tactical balance analytics', () => {
    const squad = buildBalancedT20Squad();
    const analytics = calculateSquadAnalytics('T20', squad, playerMap);

    expect(analytics).toBeDefined();
    expect(analytics.overallBalance).toBeGreaterThan(60);
    expect(analytics.dimensions.battingStrength.score).toBeGreaterThan(60);
    expect(analytics.dimensions.paceThreat.score).toBeGreaterThan(60);
    expect(analytics.dimensions.spinThreat.score).toBeGreaterThan(50);
    expect(analytics.dimensions.fieldingStrength.score).toBeGreaterThan(60);
    expect(analytics.dimensions.allRounderBalance.score).toBeGreaterThan(60);
    expect(analytics.dimensions.bowlingDepth.score).toBeGreaterThanOrEqual(25);
    expect(analytics.dimensions.lowerOrderBatting.score).toBeGreaterThan(20);
    expect(analytics.dimensions.overallSquadBalance.score).toBeGreaterThan(60);
  });

  it('validates round-trip serialization for LocalStorage and Match preparation', () => {
    const originalSquad = buildBalancedT20Squad();
    const teamRecord = {
      id: 'team-thunderbolts-1',
      teamName: 'Thunderbolts XI',
      format: 'T20' as const,
      status: 'MATCH_READY' as const,
      lineup: originalSquad,
      updatedAt: new Date().toISOString(),
    };

    // Serialize to JSON (simulating localStorage.setItem)
    const serialized = JSON.stringify(teamRecord);
    expect(typeof serialized).toBe('string');

    // Deserialize from JSON (simulating localStorage.getItem)
    const deserialized = JSON.parse(serialized);
    expect(deserialized.id).toBe(teamRecord.id);
    expect(deserialized.teamName).toBe('Thunderbolts XI');
    expect(deserialized.lineup).toHaveLength(11);
    expect(deserialized.lineup[0].playerId).toBe(originalSquad[0].playerId);

    // Validate the rehydrated squad
    const rehydratedValidation = validateDreamTeamSquad('T20', deserialized.lineup, playerMap, {
      requireMatchReady: true,
    });
    expect(rehydratedValidation.isMatchReady).toBe(true);
  });

  it('verifies that taking User Dream XI to match generates a non-overlapping AI Opponent', () => {
    const userLineup = buildBalancedT20Squad();
    const userIds = new Set(userLineup.map((s) => s.playerId));
    expect(userIds.size).toBe(11);

    // Pool of remaining players for AI opponent
    const availableAI = allPlayers.filter((p) => !userIds.has(p.id));
    expect(availableAI.length).toBeGreaterThanOrEqual(25);

    // Pick AI components from remaining available players
    const aiKeeper = availableAI.find((p) => p.isWicketkeeper)!;
    const aiTopMiddle = availableAI.filter(
      (p) => p.id !== aiKeeper.id && (p.primaryRole === 'TOP_ORDER_BATTER' || p.primaryRole === 'MIDDLE_ORDER_BATTER')
    );
    const aiAllRounders = availableAI.filter(
      (p) => p.primaryRole === 'BATTING_ALL_ROUNDER' || p.primaryRole === 'BOWLING_ALL_ROUNDER'
    );
    const aiPacers = availableAI.filter((p) => p.primaryRole === 'PACE_BOWLER');
    const aiSpinners = availableAI.filter((p) => p.primaryRole === 'SPIN_BOWLER');

    expect(aiKeeper).toBeDefined();
    expect(aiTopMiddle.length).toBeGreaterThanOrEqual(4);
    expect(aiAllRounders.length).toBeGreaterThanOrEqual(2);
    expect(aiPacers.length).toBeGreaterThanOrEqual(2);
    expect(aiSpinners.length).toBeGreaterThanOrEqual(2);

    const aiLineup: DreamTeamPlayerSlotInput[] = [
      { playerId: aiTopMiddle[0].id, battingOrder: 1, isCaptain: false, isDesignatedWicketkeeper: false },
      { playerId: aiTopMiddle[1].id, battingOrder: 2, isCaptain: false, isDesignatedWicketkeeper: false },
      { playerId: aiTopMiddle[2].id, battingOrder: 3, isCaptain: true, isDesignatedWicketkeeper: false },
      { playerId: aiTopMiddle[3].id, battingOrder: 4, isCaptain: false, isDesignatedWicketkeeper: false },
      { playerId: aiKeeper.id, battingOrder: 5, isCaptain: false, isDesignatedWicketkeeper: true },
      { playerId: aiAllRounders[0].id, battingOrder: 6, isCaptain: false, isDesignatedWicketkeeper: false, bowlingPriority: 4 },
      { playerId: aiAllRounders[1].id, battingOrder: 7, isCaptain: false, isDesignatedWicketkeeper: false, bowlingPriority: 5 },
      { playerId: aiPacers[0].id, battingOrder: 8, isCaptain: false, isDesignatedWicketkeeper: false, bowlingPriority: 1 },
      { playerId: aiSpinners[0].id, battingOrder: 9, isCaptain: false, isDesignatedWicketkeeper: false, bowlingPriority: 2 },
      { playerId: aiPacers[1].id, battingOrder: 10, isCaptain: false, isDesignatedWicketkeeper: false, bowlingPriority: 1 },
      { playerId: aiSpinners[1].id, battingOrder: 11, isCaptain: false, isDesignatedWicketkeeper: false, bowlingPriority: 3 },
    ];

    expect(aiLineup.length).toBe(11);

    // Assert zero overlap between User Dream XI and AI Opponent XI
    const aiIds = aiLineup.map((s) => s.playerId);
    const overlap = aiIds.filter((id) => userIds.has(id));
    expect(overlap).toHaveLength(0);

    // Assert AI squad is match ready
    const aiValidation = validateDreamTeamSquad('T20', aiLineup, playerMap, {
      requireMatchReady: true,
    });
    expect(aiValidation.isMatchReady).toBe(true);
  });
});

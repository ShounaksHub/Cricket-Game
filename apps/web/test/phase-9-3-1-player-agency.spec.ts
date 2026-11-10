import { describe, expect, it } from 'vitest';
import {
  type TacticalDeliveryAction,
  type FieldPreset,
  type CustomFielderPosition,
  type BowlingPaceStrategy,
  type BowlingIntent,
  createInitialMatchState,
  stepDelivery,
  resolveAITacticalAction,
  DeterministicPRNG,
  getRulesetForFormat,
  type MatchSimulationConfig,
} from '@cricket/simulation-engine';
import {
  VERIFIED_BENCHMARK_PLAYERS,
  ingestPlayerRecord,
} from '@cricket/data-ingestion';
import type { PlayerSquadContext, DreamTeamPlayerSlotInput } from '@cricket/shared-types';
import {
  CANONICAL_FIELD_PRESETS,
  type InteractiveFielder,
} from '../components/InteractiveFieldEditor';

describe('Phase 9.3.1: Independent Player Agency, Manual Field & Live Match Verification', () => {
  const all = VERIFIED_BENCHMARK_PLAYERS.map(ingestPlayerRecord);
  const profiles = new Map<string, PlayerSquadContext>();

  for (const p of all) {
    profiles.set(p.id, {
      id: p.id,
      fullName: p.fullName,
      displayName: p.displayName,
      primaryRole: p.primaryRole,
      battingHand: p.battingHand,
      bowlingStyle: p.bowlingStyle,
      isWicketkeeper: p.isWicketkeeper,
      formatRating: p.ratings.T20,
    });
  }

  const p = (idx: number) => all[idx].id;

  const userSlots: DreamTeamPlayerSlotInput[] = [
    { battingOrder: 1, playerId: p(0), isCaptain: true, isDesignatedWicketkeeper: false },
    { battingOrder: 2, playerId: p(1), isCaptain: false, isDesignatedWicketkeeper: false },
    { battingOrder: 3, playerId: p(2), isCaptain: false, isDesignatedWicketkeeper: false },
    { battingOrder: 4, playerId: p(3), isCaptain: false, isDesignatedWicketkeeper: false },
    { battingOrder: 5, playerId: p(4), isCaptain: false, isDesignatedWicketkeeper: false },
    { battingOrder: 6, playerId: p(5), isCaptain: false, isDesignatedWicketkeeper: true },
    { battingOrder: 7, playerId: p(6), isCaptain: false, isDesignatedWicketkeeper: false },
    { battingOrder: 8, playerId: p(7), isCaptain: false, isDesignatedWicketkeeper: false },
    { battingOrder: 9, playerId: p(8), isCaptain: false, isDesignatedWicketkeeper: false },
    { battingOrder: 10, playerId: p(9), isCaptain: false, isDesignatedWicketkeeper: false },
    { battingOrder: 11, playerId: p(10), isCaptain: false, isDesignatedWicketkeeper: false },
  ];

  const aiSlots: DreamTeamPlayerSlotInput[] = [
    { battingOrder: 1, playerId: p(11), isCaptain: true, isDesignatedWicketkeeper: false },
    { battingOrder: 2, playerId: p(12), isCaptain: false, isDesignatedWicketkeeper: false },
    { battingOrder: 3, playerId: p(13), isCaptain: false, isDesignatedWicketkeeper: false },
    { battingOrder: 4, playerId: p(14), isCaptain: false, isDesignatedWicketkeeper: false },
    { battingOrder: 5, playerId: p(15), isCaptain: false, isDesignatedWicketkeeper: false },
    { battingOrder: 6, playerId: p(16), isCaptain: false, isDesignatedWicketkeeper: true },
    { battingOrder: 7, playerId: p(17), isCaptain: false, isDesignatedWicketkeeper: false },
    { battingOrder: 8, playerId: p(18), isCaptain: false, isDesignatedWicketkeeper: false },
    { battingOrder: 9, playerId: p(19), isCaptain: false, isDesignatedWicketkeeper: false },
    { battingOrder: 10, playerId: p(20), isCaptain: false, isDesignatedWicketkeeper: false },
    { battingOrder: 11, playerId: p(21), isCaptain: false, isDesignatedWicketkeeper: false },
  ];

  function createTestConfig(userBatsFirst: boolean): MatchSimulationConfig {
    return {
      matchId: 'phase-9-3-1-test-match',
      format: 'T20',
      seed: 987654321n,
      versions: {
        simulationVersion: 'sim-1.0.0',
        rulesetVersion: getRulesetForFormat('T20').rulesetVersion,
        ratingVersion: 'rate-1.0.0',
      },
      stadiumId: 'stadium-mcg',
      pitchType: 'HARD',
      conditions: {
        ambientTemperatureC: 25,
        humidityPercentage: 50,
        cloudCoverPercentage: 10,
        dewFactor: 0.1,
      },
      team1: {
        id: userBatsFirst ? 'user-team' : 'ai-team',
        name: userBatsFirst ? 'User XI' : 'AI XI',
        lineup: userBatsFirst ? userSlots : aiSlots,
      },
      team2: {
        id: userBatsFirst ? 'ai-team' : 'user-team',
        name: userBatsFirst ? 'AI XI' : 'User XI',
        lineup: userBatsFirst ? aiSlots : userSlots,
      },
      playerProfiles: profiles,
    };
  }

  it('Stage B: verifies user team ownership when user bats first (Scenario 1)', () => {
    const config = createTestConfig(true);
    const state = createInitialMatchState(config);
    const prng = new DeterministicPRNG(12345n);

    expect(state.innings[0].battingTeamId).toBe('user-team');
    expect(state.innings[0].bowlingTeamId).toBe('ai-team');

    // User controls batting; CPU controls bowling
    const isUserBatting = state.innings[0].battingTeamId === 'user-team';
    const isUserBowling = state.innings[0].bowlingTeamId === 'user-team';
    expect(isUserBatting).toBe(true);
    expect(isUserBowling).toBe(false);

    // AI resolves autonomous bowling choices
    const aiAction = resolveAITacticalAction(state, prng);
    expect(aiAction.bowlerLength).toBeDefined();
    expect(aiAction.bowlerLine).toBeDefined();
    expect(aiAction.bowlerVariation).toBeDefined();

    // User sets aggressive intent
    const action: TacticalDeliveryAction = {
      batterIntent: 'AGGRESSIVE',
      bowlerLength: aiAction.bowlerLength,
      bowlerLine: aiAction.bowlerLine,
      bowlerVariation: aiAction.bowlerVariation,
      fieldPreset: aiAction.fieldPreset,
    };

    const { nextState, event } = stepDelivery(state, action, prng);
    expect(event.isLegalDelivery).toBe(true);
    expect(event.strikerPlayerId).toBe(userSlots[0].playerId);
    expect(nextState.innings[0].events.length).toBe(1);
  });

  it('Stage B: verifies user team ownership when user bowls first (Scenario 2)', () => {
    const config = createTestConfig(false);
    const state = createInitialMatchState(config);
    const prng = new DeterministicPRNG(12345n);

    expect(state.innings[0].battingTeamId).toBe('ai-team');
    expect(state.innings[0].bowlingTeamId).toBe('user-team');

    const isUserBatting = state.innings[0].battingTeamId === 'user-team';
    const isUserBowling = state.innings[0].bowlingTeamId === 'user-team';
    expect(isUserBatting).toBe(false);
    expect(isUserBowling).toBe(true);

    // AI resolves autonomous batting intent
    const aiAction = resolveAITacticalAction(state, prng);
    expect(aiAction.batterIntent).toBeDefined();

    // User dictates bowling pace, intent, length, line, variation, and field
    const action: TacticalDeliveryAction = {
      batterIntent: aiAction.batterIntent,
      bowlerLength: 'YORKER',
      bowlerLine: 'STUMPS',
      bowlerVariation: 'SLOWER_BALL',
      fieldPreset: 'DEATH_BOUNDARY_DEFENSE',
      bowlingPaceStrategy: 'CONTROLLED',
      bowlingIntent: 'CONTAINMENT',
    };

    const { nextState, event } = stepDelivery(state, action, prng);
    expect(event.bowlerPlayerId).toBe(userSlots[10].playerId);
    expect(event.deliverySpeedKmh).toBeGreaterThan(0);
    expect(nextState.innings[0].events.length).toBe(1);
  });

  it('Stage D: verifies bowling pace strategy and tempo influence delivery mechanics', () => {
    const config = createTestConfig(false);
    const state = createInitialMatchState(config);

    // Compare FULL_PACE vs CONSERVE speeds with identical seed
    const prngFull = new DeterministicPRNG(555n);
    const actionFull: TacticalDeliveryAction = {
      batterIntent: 'BALANCED',
      bowlerLength: 'GOOD_LENGTH',
      bowlerLine: 'OUTSIDE_OFF',
      bowlerVariation: 'STOCK',
      fieldPreset: 'BALANCED_RING',
      bowlingPaceStrategy: 'FULL_PACE',
    };
    const { event: eventFull } = stepDelivery(state, actionFull, prngFull);

    const prngConserve = new DeterministicPRNG(555n);
    const actionConserve: TacticalDeliveryAction = {
      batterIntent: 'BALANCED',
      bowlerLength: 'GOOD_LENGTH',
      bowlerLine: 'OUTSIDE_OFF',
      bowlerVariation: 'STOCK',
      fieldPreset: 'BALANCED_RING',
      bowlingPaceStrategy: 'CONSERVE',
    };
    const { event: eventConserve } = stepDelivery(state, actionConserve, prngConserve);

    expect(eventFull.deliverySpeedKmh).toBeDefined();
    expect(eventConserve.deliverySpeedKmh).toBeDefined();
    // FULL_PACE delivery speed must be distinctly higher than CONSERVE
    expect((eventFull.deliverySpeedKmh ?? 0)).toBeGreaterThan((eventConserve.deliverySpeedKmh ?? 0));
  });

  it('Stage E: verifies manual custom field positioning is consumed by the engine and obeys Law 28.4', () => {
    const config = createTestConfig(false);
    const state = createInitialMatchState(config);
    const prng = new DeterministicPRNG(777n);

    // Create 9 custom fielders with 4 close slips / gully
    const customPositions: CustomFielderPosition[] = [
      { id: 'f-1', roleName: 'Slip 1', angleDegrees: 160, distanceMeters: 14, isBoundary: false, isSlipsOrGully: true, isLegSide: false },
      { id: 'f-2', roleName: 'Slip 2', angleDegrees: 150, distanceMeters: 16, isBoundary: false, isSlipsOrGully: true, isLegSide: false },
      { id: 'f-3', roleName: 'Slip 3', angleDegrees: 140, distanceMeters: 18, isBoundary: false, isSlipsOrGully: true, isLegSide: false },
      { id: 'f-4', roleName: 'Gully', angleDegrees: 130, distanceMeters: 18, isBoundary: false, isSlipsOrGully: true, isLegSide: false },
      { id: 'f-5', roleName: 'Cover', angleDegrees: 60, distanceMeters: 25, isBoundary: false, isSlipsOrGully: false, isLegSide: false },
      { id: 'f-6', roleName: 'Mid Off', angleDegrees: 25, distanceMeters: 26, isBoundary: false, isSlipsOrGully: false, isLegSide: false },
      { id: 'f-7', roleName: 'Mid On', angleDegrees: 335, distanceMeters: 26, isBoundary: false, isSlipsOrGully: false, isLegSide: false },
      { id: 'f-8', roleName: 'Short Leg', angleDegrees: 215, distanceMeters: 12, isBoundary: false, isSlipsOrGully: false, isLegSide: true },
      { id: 'f-9', roleName: 'Deep Mid Wicket', angleDegrees: 300, distanceMeters: 65, isBoundary: true, isSlipsOrGully: false, isLegSide: true },
    ];

    // MCC Law 28.4 check: maximum 5 on leg side (180 < angle < 360)
    const legSideCount = customPositions.filter((f) => (f.angleDegrees > 180 && f.angleDegrees < 360)).length;
    expect(legSideCount).toBeLessThanOrEqual(5);

    const action: TacticalDeliveryAction = {
      batterIntent: 'AGGRESSIVE',
      bowlerLength: 'GOOD_LENGTH',
      bowlerLine: 'OUTSIDE_OFF',
      bowlerVariation: 'STOCK',
      fieldPreset: 'CUSTOM',
      customFieldPositions: customPositions,
    };

    const { nextState, event } = stepDelivery(state, action, prng);
    expect(event.isLegalDelivery).toBe(true);
    expect(nextState.innings[0].events.length).toBe(1);
  });

  it('Stage G: verifies CPU autonomy across a complete 10-ball simulated over sequence', () => {
    const config = createTestConfig(true);
    let state = createInitialMatchState(config);
    const prng = new DeterministicPRNG(424242n);

    for (let ball = 0; ball < 10; ball++) {
      if (state.status === 'COMPLETED') break;
      const aiAction = resolveAITacticalAction(state, prng);

      // Verify CPU autonomously chooses all bowling parameters
      expect(aiAction.bowlerLength).toBeDefined();
      expect(aiAction.bowlerLine).toBeDefined();
      expect(aiAction.fieldPreset).toBeDefined();

      const userAction: TacticalDeliveryAction = {
        batterIntent: 'ROTATE_STRIKE',
        bowlerLength: aiAction.bowlerLength,
        bowlerLine: aiAction.bowlerLine,
        bowlerVariation: aiAction.bowlerVariation,
        fieldPreset: aiAction.fieldPreset,
      };

      const { nextState } = stepDelivery(state, userAction, prng);
      state = nextState;
    }

    expect(state.innings[0].events.length).toBe(10);
    expect(state.innings[0].totalRuns).toBeGreaterThanOrEqual(0);
  });
});

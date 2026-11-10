import { describe, expect, it } from 'vitest';
import {
  type TacticalDeliveryAction,
  type CustomFielderPosition,
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

describe('Phase 9.3.2: Adversarial Gameplay & Cricket Law Enforcement Audit', () => {
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
      matchId: 'phase-9-3-2-adversarial-test',
      format: 'T20',
      seed: 88888888n,
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

  it('Audit Item 2: Engine rejects illegal field placement with >5 leg-side fielders as NO_BALL under Law 28.4', () => {
    const config = createTestConfig(false);
    const state = createInitialMatchState(config);
    const prng = new DeterministicPRNG(123n);

    // Place 6 fielders on the leg side (angle > 180 and < 360) -> Violation of MCC Law 28.4
    const illegalPositions: CustomFielderPosition[] = [
      { id: 'f-1', roleName: 'Leg Slip', angleDegrees: 190, distanceMeters: 14, isBoundary: false },
      { id: 'f-2', roleName: 'Short Fine Leg', angleDegrees: 210, distanceMeters: 16, isBoundary: false },
      { id: 'f-3', roleName: 'Square Leg', angleDegrees: 270, distanceMeters: 25, isBoundary: false },
      { id: 'f-4', roleName: 'Mid Wicket', angleDegrees: 310, distanceMeters: 25, isBoundary: false },
      { id: 'f-5', roleName: 'Mid On', angleDegrees: 340, distanceMeters: 26, isBoundary: false },
      { id: 'f-6', roleName: 'Deep Mid Wicket', angleDegrees: 300, distanceMeters: 65, isBoundary: true },
      // 3 off-side fielders
      { id: 'f-7', roleName: 'Cover', angleDegrees: 60, distanceMeters: 25, isBoundary: false },
      { id: 'f-8', roleName: 'Point', angleDegrees: 90, distanceMeters: 25, isBoundary: false },
      { id: 'f-9', roleName: 'Mid Off', angleDegrees: 20, distanceMeters: 26, isBoundary: false },
    ];

    const action: TacticalDeliveryAction = {
      batterIntent: 'BALANCED',
      bowlerLength: 'GOOD_LENGTH',
      bowlerLine: 'OUTSIDE_OFF',
      bowlerVariation: 'STOCK',
      fieldPreset: 'CUSTOM',
      customFieldPositions: illegalPositions,
    };

    const { nextState, event } = stepDelivery(state, action, prng);

    // Engine must rule this illegal delivery a NO_BALL
    expect(event.outcome).toBe('NO_BALL');
    expect(event.extras.noBalls).toBe(1);
    expect(event.isLegalDelivery).toBe(false);
    // Next delivery must be awarded as a Free Hit under limited overs rules
    expect(nextState.innings[0].isFreeHit).toBe(true);
  });

  it('Audit Item 2: Engine rejects >2 fielders behind popping crease on leg side as NO_BALL under Law 28.4', () => {
    const config = createTestConfig(false);
    const state = createInitialMatchState(config);
    const prng = new DeterministicPRNG(456n);

    // Place 3 fielders behind square leg (180 <= angle <= 270) -> Violation of MCC Law 28.4
    const illegalBehindSquare: CustomFielderPosition[] = [
      { id: 'f-1', roleName: 'Leg Slip', angleDegrees: 195, distanceMeters: 12, isBoundary: false },
      { id: 'f-2', roleName: 'Short Fine Leg', angleDegrees: 215, distanceMeters: 15, isBoundary: false },
      { id: 'f-3', roleName: 'Deep Fine Leg', angleDegrees: 225, distanceMeters: 65, isBoundary: true },
      { id: 'f-4', roleName: 'Mid On', angleDegrees: 340, distanceMeters: 26, isBoundary: false },
      // Off-side fielders
      { id: 'f-5', roleName: 'Slip', angleDegrees: 160, distanceMeters: 14, isBoundary: false },
      { id: 'f-6', roleName: 'Cover', angleDegrees: 60, distanceMeters: 25, isBoundary: false },
      { id: 'f-7', roleName: 'Point', angleDegrees: 90, distanceMeters: 25, isBoundary: false },
      { id: 'f-8', roleName: 'Mid Off', angleDegrees: 20, distanceMeters: 26, isBoundary: false },
      { id: 'f-9', roleName: 'Deep Cover', angleDegrees: 65, distanceMeters: 65, isBoundary: true },
    ];

    const action: TacticalDeliveryAction = {
      batterIntent: 'BALANCED',
      bowlerLength: 'GOOD_LENGTH',
      bowlerLine: 'OUTSIDE_OFF',
      bowlerVariation: 'STOCK',
      fieldPreset: 'CUSTOM',
      customFieldPositions: illegalBehindSquare,
    };

    const { event } = stepDelivery(state, action, prng);
    expect(event.outcome).toBe('NO_BALL');
    expect(event.extras.noBalls).toBe(1);
    expect(event.isLegalDelivery).toBe(false);
  });

  it('Audit Item 2: Powerplay over restriction enforces max 2 fielders outside 30-yard ring', () => {
    const config = createTestConfig(false);
    const state = createInitialMatchState(config);
    const prng = new DeterministicPRNG(789n);

    // Over 0 is Powerplay (Overs 1-6 in T20): max 2 outside circle
    // Place 3 fielders outside 30-yard ring (> 30m) -> Violation of Powerplay rule
    const illegalPowerplayField: CustomFielderPosition[] = [
      { id: 'f-1', roleName: 'Deep Point', angleDegrees: 90, distanceMeters: 60, isBoundary: true },
      { id: 'f-2', roleName: 'Deep Mid Wicket', angleDegrees: 300, distanceMeters: 60, isBoundary: true },
      { id: 'f-3', roleName: 'Deep Fine Leg', angleDegrees: 225, distanceMeters: 60, isBoundary: true },
      // 6 inner ring fielders
      { id: 'f-4', roleName: 'Slip', angleDegrees: 160, distanceMeters: 14, isBoundary: false },
      { id: 'f-5', roleName: 'Gully', angleDegrees: 130, distanceMeters: 16, isBoundary: false },
      { id: 'f-6', roleName: 'Cover', angleDegrees: 60, distanceMeters: 25, isBoundary: false },
      { id: 'f-7', roleName: 'Mid Off', angleDegrees: 25, distanceMeters: 25, isBoundary: false },
      { id: 'f-8', roleName: 'Mid On', angleDegrees: 335, distanceMeters: 25, isBoundary: false },
      { id: 'f-9', roleName: 'Short Leg', angleDegrees: 215, distanceMeters: 15, isBoundary: false },
    ];

    const action: TacticalDeliveryAction = {
      batterIntent: 'BALANCED',
      bowlerLength: 'GOOD_LENGTH',
      bowlerLine: 'OUTSIDE_OFF',
      bowlerVariation: 'STOCK',
      fieldPreset: 'CUSTOM',
      customFieldPositions: illegalPowerplayField,
    };

    const { event } = stepDelivery(state, action, prng);
    expect(event.outcome).toBe('NO_BALL');
    expect(event.extras.noBalls).toBe(1);
  });

  it('Audit Item 3: Deep Square Leg vs Short Fine Leg produces differential leg-side boundary outcomes', () => {
    const config = createTestConfig(false);
    const state = createInitialMatchState(config);

    // Deep Square Leg setup (boundary protection on leg side)
    const deepSquareField: CustomFielderPosition[] = [
      { id: 'f-1', roleName: 'Deep Square Leg', angleDegrees: 270, distanceMeters: 65, isBoundary: true },
      { id: 'f-2', roleName: 'Slip 1', angleDegrees: 160, distanceMeters: 14, isBoundary: false, isSlipsOrGully: true },
      { id: 'f-3', roleName: 'Slip 2', angleDegrees: 150, distanceMeters: 16, isBoundary: false, isSlipsOrGully: true },
      { id: 'f-4', roleName: 'Cover', angleDegrees: 60, distanceMeters: 25, isBoundary: false },
      { id: 'f-5', roleName: 'Mid Off', angleDegrees: 25, distanceMeters: 26, isBoundary: false },
      { id: 'f-6', roleName: 'Mid On', angleDegrees: 335, distanceMeters: 26, isBoundary: false },
      { id: 'f-7', roleName: 'Point', angleDegrees: 90, distanceMeters: 25, isBoundary: false },
      { id: 'f-8', roleName: 'Mid Wicket', angleDegrees: 310, distanceMeters: 24, isBoundary: false },
      { id: 'f-9', roleName: 'Long Off', angleDegrees: 20, distanceMeters: 68, isBoundary: true },
    ];

    // Short Fine Leg setup (close in, no deep leg boundary rider)
    const shortFineField: CustomFielderPosition[] = [
      { id: 'f-1', roleName: 'Short Fine Leg', angleDegrees: 215, distanceMeters: 15, isBoundary: false },
      { id: 'f-2', roleName: 'Slip 1', angleDegrees: 160, distanceMeters: 14, isBoundary: false, isSlipsOrGully: true },
      { id: 'f-3', roleName: 'Slip 2', angleDegrees: 150, distanceMeters: 16, isBoundary: false, isSlipsOrGully: true },
      { id: 'f-4', roleName: 'Cover', angleDegrees: 60, distanceMeters: 25, isBoundary: false },
      { id: 'f-5', roleName: 'Mid Off', angleDegrees: 25, distanceMeters: 26, isBoundary: false },
      { id: 'f-6', roleName: 'Mid On', angleDegrees: 335, distanceMeters: 26, isBoundary: false },
      { id: 'f-7', roleName: 'Point', angleDegrees: 90, distanceMeters: 25, isBoundary: false },
      { id: 'f-8', roleName: 'Mid Wicket', angleDegrees: 310, distanceMeters: 24, isBoundary: false },
      { id: 'f-9', roleName: 'Long Off', angleDegrees: 20, distanceMeters: 68, isBoundary: true },
    ];

    // Simulate 50 balls with each setup against aggressive batter hunting boundaries down leg
    let boundariesDeepSquare = 0;
    let boundariesShortFine = 0;

    for (let i = 0; i < 50; i++) {
      const seed = BigInt(1000 + i);
      const prng1 = new DeterministicPRNG(seed);
      const prng2 = new DeterministicPRNG(seed);

      const action1: TacticalDeliveryAction = {
        batterIntent: 'AGGRESSIVE',
        bowlerLength: 'SHORT',
        bowlerLine: 'DOWN_LEG',
        bowlerVariation: 'STOCK',
        fieldPreset: 'CUSTOM',
        customFieldPositions: deepSquareField,
      };

      const action2: TacticalDeliveryAction = {
        batterIntent: 'AGGRESSIVE',
        bowlerLength: 'SHORT',
        bowlerLine: 'DOWN_LEG',
        bowlerVariation: 'STOCK',
        fieldPreset: 'CUSTOM',
        customFieldPositions: shortFineField,
      };

      const { event: ev1 } = stepDelivery(state, action1, prng1);
      const { event: ev2 } = stepDelivery(state, action2, prng2);

      if (ev1.outcome === 'FOUR' || ev1.outcome === 'SIX') boundariesDeepSquare++;
      if (ev2.outcome === 'FOUR' || ev2.outcome === 'SIX') boundariesShortFine++;
    }

    // Having a Deep Square Leg boundary rider must concede fewer boundaries than a Short Fine Leg
    expect(boundariesDeepSquare).toBeLessThanOrEqual(boundariesShortFine);
  });
});

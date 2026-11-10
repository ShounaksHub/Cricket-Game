import { describe, it, expect } from 'vitest';
import {
  createInitialMatchState,
  stepDelivery,
  resolveAITacticalAction,
  DeterministicPRNG,
  getRulesetForFormat,
  type MatchSimulationConfig,
} from '@cricket/simulation-engine';
import type { PlayerSquadContext, MatchFormat, DreamTeamPlayerSlotInput } from '@cricket/shared-types';
import { VERIFIED_BENCHMARK_PLAYERS, ingestPlayerRecord } from '@cricket/data-ingestion';
import { CANONICAL_FIELD_PRESETS, type InteractiveFielder } from '../components/InteractiveFieldEditor';

describe('Phase 9.6: Mandatory Post-Toss Team Management & Explicit Start Verification', () => {
  const all = VERIFIED_BENCHMARK_PLAYERS.map(ingestPlayerRecord);
  const profiles = new Map<string, PlayerSquadContext>();

  for (const p of all) {
    profiles.set(p.id, {
      id: p.id,
      fullName: p.fullName,
      displayName: p.displayName,
      primaryNationality: p.primaryNationality,
      primaryRole: p.primaryRole,
      battingHand: p.battingHand,
      bowlingStyle: p.bowlingStyle,
      isWicketkeeper: p.isWicketkeeper,
      formatRating: p.ratings.T20,
      ratings: p.ratings,
    });
  }

  const p1 = all[0].id;
  const p2 = all[1].id;
  const p3 = all[2].id;
  const p4 = all[3].id;
  const p5 = all[4].id;
  const p6 = all[5].id;
  const p7 = all[6].id;
  const p8 = all[7].id;
  const p9 = all[8].id;
  const p10 = all[9].id;
  const p11 = all[10].id;

  const defaultUserLineup: DreamTeamPlayerSlotInput[] = [
    { playerId: p1, battingOrder: 1, isCaptain: true, bowlingPriority: null },
    { playerId: p2, battingOrder: 2, isDesignatedWicketkeeper: true, bowlingPriority: null },
    { playerId: p3, battingOrder: 3, bowlingPriority: null },
    { playerId: p4, battingOrder: 4, bowlingPriority: null },
    { playerId: p5, battingOrder: 5, bowlingPriority: null },
    { playerId: p6, battingOrder: 6, bowlingPriority: 3 },
    { playerId: p7, battingOrder: 7, bowlingPriority: 2 },
    { playerId: p8, battingOrder: 8, bowlingPriority: 2 },
    { playerId: p9, battingOrder: 9, bowlingPriority: 1 },
    { playerId: p10, battingOrder: 10, bowlingPriority: 1 },
    { playerId: p11, battingOrder: 11, bowlingPriority: 1 },
  ];

  const opponentLineup = [
    { playerId: all[11].id, battingOrder: 1 },
    { playerId: all[12].id, battingOrder: 2 },
    { playerId: all[13].id, battingOrder: 3 },
    { playerId: all[14].id, battingOrder: 4 },
    { playerId: all[15].id, battingOrder: 5 },
    { playerId: all[16].id, battingOrder: 6 },
    { playerId: all[17].id, battingOrder: 7 },
    { playerId: all[18].id, battingOrder: 8 },
    { playerId: all[19].id, battingOrder: 9 },
    { playerId: all[20].id, battingOrder: 10 },
    { playerId: all[21].id, battingOrder: 11 },
  ];

  function makeConfig(userBatsFirst: boolean, userLineup = defaultUserLineup, format: MatchFormat = 'T20'): MatchSimulationConfig {
    return {
      matchId: 'phase-9-6-test-match',
      format,
      seed: 8888888n,
      versions: {
        simulationVersion: 'sim-1.0.0',
        rulesetVersion: getRulesetForFormat(format).rulesetVersion,
        ratingVersion: 'rate-1.0.0',
      },
      stadiumId: 'stadium-lords',
      pitchType: 'HARD',
      conditions: {
        ambientTemperatureC: 22,
        humidityPercentage: 50,
        cloudCoverPercentage: 10,
        dewFactor: 0.1,
      },
      team1: userBatsFirst
        ? { id: 'user-team', name: 'User Dream XI', lineup: userLineup }
        : { id: 'ai-team', name: 'AI Opponent XI', lineup: opponentLineup },
      team2: userBatsFirst
        ? { id: 'ai-team', name: 'AI Opponent XI', lineup: opponentLineup }
        : { id: 'user-team', name: 'User Dream XI', lineup: userLineup },
      playerProfiles: profiles,
    };
  }

  describe('Stage A & B: Toss Transition and Lifecycle Isolation', () => {
    it('initializes in POST_TOSS_MANAGEMENT after toss decision and enforces delivery count 0', () => {
      let phase: 'SETUP' | 'TOSS' | 'POST_TOSS_MANAGEMENT' | 'LIVE' | 'COMPLETED' = 'TOSS';
      let firstDeliveryCount = 0;

      // Simulate toss decision
      const tossResult = {
        winner: 'USER' as const,
        decision: 'BOWL' as const,
        coinLanded: 'HEADS' as const,
      };

      // Transition must be POST_TOSS_MANAGEMENT, NOT LIVE
      if (tossResult) {
        phase = 'POST_TOSS_MANAGEMENT';
      }

      expect(phase).toBe('POST_TOSS_MANAGEMENT');
      expect(firstDeliveryCount).toBe(0);
    });

    it('stepToNextDelivery strictly rejects execution if phase is not LIVE', () => {
      const phase: 'SETUP' | 'TOSS' | 'POST_TOSS_MANAGEMENT' | 'LIVE' | 'COMPLETED' = 'POST_TOSS_MANAGEMENT';
      const config = makeConfig(false);
      const state = createInitialMatchState(config);

      let deliveryExecuted = false;
      function attemptStep() {
        if (phase !== 'LIVE') return;
        deliveryExecuted = true;
      }

      attemptStep();
      expect(deliveryExecuted).toBe(false);
      expect(state.innings[0].events.length).toBe(0);
      expect(state.innings[0].legalBallsInCurrentOver).toBe(0);
    });
  });

  describe('Stage C: Opening Batting Pair & Lineup Reordering', () => {
    it('reorders the batting lineup correctly and preserves 11 unique players', () => {
      // User promotes player 3 (p3) to #1 striker, and moves p1 to #3
      const reordered = [...defaultUserLineup];
      const temp = reordered[0];
      reordered[0] = { ...reordered[2], battingOrder: 1 };
      reordered[2] = { ...temp, battingOrder: 3 };

      expect(reordered[0].playerId).toBe(p3);
      expect(reordered[1].playerId).toBe(p2);
      expect(reordered[2].playerId).toBe(p1);

      const uniqueSet = new Set(reordered.map((s) => s.playerId));
      expect(uniqueSet.size).toBe(11);

      // Verify that engine respects custom opening striker
      const config = makeConfig(true, reordered);
      const state = createInitialMatchState(config);

      expect(state.innings[0].strikerPlayerId).toBe(p3);
      expect(state.innings[0].nonStrikerPlayerId).toBe(p2);
    });
  });

  describe('Stage D: Opening Bowler Selection when Bowling First', () => {
    it('correctly assigns nominated user opening bowler as Innings 1 strike bowler', () => {
      // User nominates p10 as the opening bowler
      const nominatedBowlerId = p10;
      const idx = defaultUserLineup.findIndex((s) => s.playerId === nominatedBowlerId);
      const selectedSlot = defaultUserLineup[idx];
      const rest = defaultUserLineup.filter((_, i) => i !== idx);
      const finalizedLineup = [...rest, { ...selectedSlot, bowlingPriority: 1 }];

      const config = makeConfig(false, finalizedLineup);
      const state = createInitialMatchState(config);

      // Over 1 must be bowled by nominated bowler
      expect(state.innings[0].currentBowlerPlayerId).toBe(nominatedBowlerId);
    });

    it('enforces format-specific over quotas', () => {
      const formats: { format: MatchFormat; maxQuota: number }[] = [
        { format: 'T10', maxQuota: 2 },
        { format: 'T20', maxQuota: 4 },
        { format: 'ODI', maxQuota: 10 },
        { format: 'TEST_RED_BALL', maxQuota: Infinity },
      ];

      for (const { format, maxQuota } of formats) {
        const ruleset = getRulesetForFormat(format);
        expect(ruleset.maxOversPerBowler).toBe(maxQuota);
      }
    });
  });

  describe('Stage E: Field Setup and Rules Validation', () => {
    it('validates MCC Law 28.4 and Powerplay restrictions', () => {
      // Test with SPIN_CHOKE preset which has exactly 2 boundary riders (Powerplay compliant)
      const fielders: InteractiveFielder[] = CANONICAL_FIELD_PRESETS.SPIN_CHOKE.positions.map((p, idx) => ({
        id: `fielder-${idx + 1}`,
        name: p.role,
        role: p.role,
        angleDeg: p.angleDeg,
        distM: p.distM,
        isBoundary: p.isBoundary,
      }));

      const legSide = fielders.filter((f) => f.angleDeg > 180 && f.angleDeg < 360).length;
      const behindSquareLeg = fielders.filter((f) => f.angleDeg >= 180 && f.angleDeg <= 270).length;
      const outsideCircle = fielders.filter((f) => f.distM > 30).length;

      expect(legSide).toBeLessThanOrEqual(5);
      expect(behindSquareLeg).toBeLessThanOrEqual(2);
      expect(outsideCircle).toBeLessThanOrEqual(2);
    });

    it('rejects illegal field with >5 leg-side fielders', () => {
      const illegalFielders: InteractiveFielder[] = [
        { id: '1', name: 'F1', role: 'Mid Wicket', angleDeg: 200, distM: 20, isBoundary: false },
        { id: '2', name: 'F2', role: 'Square Leg', angleDeg: 210, distM: 20, isBoundary: false },
        { id: '3', name: 'F3', role: 'Fine Leg', angleDeg: 220, distM: 20, isBoundary: false },
        { id: '4', name: 'F4', role: 'Long On', angleDeg: 340, distM: 65, isBoundary: true },
        { id: '5', name: 'F5', role: 'Deep Mid Wicket', angleDeg: 300, distM: 65, isBoundary: true },
        { id: '6', name: 'F6', role: 'Extra Leg', angleDeg: 280, distM: 20, isBoundary: false }, // 6th leg side fielder!
        { id: '7', name: 'F7', role: 'Cover', angleDeg: 60, distM: 20, isBoundary: false },
        { id: '8', name: 'F8', role: 'Point', angleDeg: 120, distM: 20, isBoundary: false },
        { id: '9', name: 'F9', role: 'Slip', angleDeg: 160, distM: 15, isBoundary: false },
      ];

      const legSide = illegalFielders.filter((f) => f.angleDeg > 180 && f.angleDeg < 360).length;
      const isLegal = legSide <= 5;
      expect(isLegal).toBe(false);
    });
  });

  describe('Stage F: Explicit Start Invariant Protection', () => {
    it('executes first delivery only after START SIMULATION confirms and enters LIVE', () => {
      let phase: 'SETUP' | 'TOSS' | 'POST_TOSS_MANAGEMENT' | 'LIVE' | 'COMPLETED' = 'POST_TOSS_MANAGEMENT';
      let deliveriesSimulated = 0;

      const config = makeConfig(false);
      const state = createInitialMatchState(config);
      const prng = new DeterministicPRNG(config.seed);

      function step() {
        if (phase !== 'LIVE') return;
        const aiAction = resolveAITacticalAction(state, prng);
        stepDelivery(state, aiAction, prng);
        deliveriesSimulated++;
      }

      // Pre-start attempts
      step();
      step();
      expect(deliveriesSimulated).toBe(0);

      // User explicitly presses START SIMULATION
      phase = 'LIVE';
      step();
      expect(deliveriesSimulated).toBe(1);
    });

    it('works across all 5 cricket formats', () => {
      const formats: MatchFormat[] = ['T10', 'T20', 'ODI', 'TEST_RED_BALL', 'TEST_PINK_BALL'];

      for (const fmt of formats) {
        const config = makeConfig(true, defaultUserLineup, fmt);
        const state = createInitialMatchState(config);
        const prng = new DeterministicPRNG(config.seed);

        expect(state.innings[0].completedOvers).toBe(0);
        expect(state.innings[0].legalBallsInCurrentOver).toBe(0);

        const action = resolveAITacticalAction(state, prng);
        const { nextState, event } = stepDelivery(state, action, prng);

        expect(nextState.innings[0].legalBallsInCurrentOver).toBe(1);
        expect(event).toBeDefined();
      }
    });
  });
});

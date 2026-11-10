import { describe, it, expect } from 'vitest';
import {
  simulateFullMatch,
  verifyMatchReplay,
  getRulesetForFormat,
  stepDelivery,
  createInitialMatchState,
  calculateEnvironmentalDeltas,
  DeterministicPRNG,
  type MatchSimulationConfig,
  type MatchState,
} from '../src/index.js';
import {
  validateFieldingRestrictions,
  calculateOverthrowRuns,
  isLateralWide,
} from '@cricket/cricket-rules';
import type { DreamTeamPlayerSlotInput, MatchFormat, PlayerSquadContext } from '@cricket/shared-types';

function createMockLineup(prefix: string): DreamTeamPlayerSlotInput[] {
  return Array.from({ length: 11 }, (_, i) => ({
    playerId: `${prefix}-p${i + 1}`,
    battingOrder: i + 1,
    isCaptain: i === 0,
    isDesignatedWicketkeeper: i === 6,
    bowlingPriority: i >= 5 ? i - 4 : null,
  }));
}

function createMockProfiles(prefix: string, format: MatchFormat): [string, PlayerSquadContext][] {
  return Array.from({ length: 11 }, (_, i) => {
    const id = `${prefix}-p${i + 1}`;
    const isBowler = i >= 5;
    return [
      id,
      {
        id,
        fullName: `${prefix.toUpperCase()} Player ${i + 1}`,
        displayName: `${prefix.toUpperCase()}-${i + 1}`,
        primaryRole: isBowler ? 'PACE_BOWLER' : 'TOP_ORDER_BATTER',
        battingHand: 'RIGHT_HAND',
        bowlingStyle: isBowler ? (i % 2 === 0 ? 'RIGHT_ARM_FAST' : 'RIGHT_ARM_LEG_SPIN') : 'RIGHT_ARM_MEDIUM',
        isWicketkeeper: i === 6,
        formatRating: {
          format,
          overallRating: 85,
          battingRating: isBowler ? 30 : 88,
          bowlingRating: isBowler ? 88 : 25,
          fieldingRating: 80,
          confidenceTier: 'GOLD',
          confidenceScore: 0.9,
          ratingVersion: 'rate-1.0.0',
          explainability: {
            rawPrimaryMetric: 'Avg: 45',
            eraPeerBaseline: format,
            sampleSizeInnings: 50,
            shrinkageApplied: 0.02,
          },
        },
      },
    ];
  });
}

function createTestConfig(format: MatchFormat, seed = 424242n): MatchSimulationConfig {
  return {
    matchId: `audit-test-${format.toLowerCase()}`,
    format,
    seed: BigInt(seed),
    versions: {
      simulationVersion: 'sim-1.0.0',
      rulesetVersion: getRulesetForFormat(format).rulesetVersion,
      ratingVersion: 'rate-1.0.0',
    },
    stadiumId: 'stadium-lords',
    pitchType: 'HARD',
    conditions: {
      ambientTemperatureC: 22,
      humidityPercentage: 55,
      cloudCoverPercentage: 30,
      dewFactor: 0.1,
    },
    team1: {
      id: 'team-england',
      name: 'England XI',
      lineup: createMockLineup('eng'),
    },
    team2: {
      id: 'team-australia',
      name: 'Australia XI',
      lineup: createMockLineup('aus'),
    },
    playerProfiles: new Map([
      ...createMockProfiles('eng', format),
      ...createMockProfiles('aus', format),
    ]),
  };
}

describe('Phase 8.1 Engine Audit: Multi-Format & Authoritative Cricket Rules', () => {
  describe('1. Authoritative Format Rules & Version Triad', () => {
    it('verifies distinct ruleset versions across all 5 formats', () => {
      expect(getRulesetForFormat('T10').rulesetVersion).toBe('rules-t10-icc-2026.1');
      expect(getRulesetForFormat('T20').rulesetVersion).toBe('rules-t20-icc-2026.1');
      expect(getRulesetForFormat('ODI').rulesetVersion).toBe('rules-odi-icc-2026.1');
      expect(getRulesetForFormat('TEST_RED_BALL').rulesetVersion).toBe('rules-test-icc-2026.1');
      expect(getRulesetForFormat('TEST_PINK_BALL').rulesetVersion).toBe('rules-test-pink-ball-icc-2026.1');
    });

    it('verifies format-specific quotas and powerplay structures', () => {
      const t10 = getRulesetForFormat('T10');
      expect(t10.maxOversPerInnings).toBe(10);
      expect(t10.maxOversPerBowler).toBe(2);
      expect(t10.powerplay.p1EndOver).toBe(3);

      const odi = getRulesetForFormat('ODI');
      expect(odi.maxOversPerInnings).toBe(50);
      expect(odi.maxOversPerBowler).toBe(10);
      expect(odi.maxFieldersOutsideCircle(5)).toBe(2); // P1
      expect(odi.maxFieldersOutsideCircle(25)).toBe(4); // P2
      expect(odi.maxFieldersOutsideCircle(45)).toBe(5); // P3

      const test = getRulesetForFormat('TEST_RED_BALL');
      expect(test.testScheduleConfig?.scheduledDays).toBe(5);
      expect(test.testScheduleConfig?.scheduledDailyOvers).toBe(90);
      expect(test.followOnDeficitThreshold).toBe(200);
      expect(test.newBallOverThreshold).toBe(80);
    });

    it('verifies stop clock enforcement in limited overs and exemption in Test cricket', () => {
      expect(getRulesetForFormat('T10').isStopClockEnforced()).toBe(true);
      expect(getRulesetForFormat('T20').isStopClockEnforced()).toBe(true);
      expect(getRulesetForFormat('ODI').isStopClockEnforced()).toBe(true);
      expect(getRulesetForFormat('TEST_RED_BALL').isStopClockEnforced()).toBe(false);
      expect(getRulesetForFormat('TEST_PINK_BALL').isStopClockEnforced()).toBe(false);
    });
  });

  describe('2. Pink Ball Aerodynamic & Lighting Model Transitions', () => {
    const conditions = {
      ambientTemperatureC: 22,
      humidityPercentage: 55,
      cloudCoverPercentage: 30,
      dewFactor: 0.2,
    };

    it('models Session 1 (Afternoon Daylight): lacquer protection preserving shine & swing', () => {
      const deltas = calculateEnvironmentalDeltas({
        pitchType: 'HARD',
        conditions,
        pitchWearIndex: 0.1,
        ballWearIndex: 0.15,
        bowlerStyle: 'RIGHT_ARM_FAST',
        isPowerplay: false,
        format: 'TEST_PINK_BALL',
        currentSessionNumber: 1,
      });

      expect(deltas.DOT).toBeGreaterThan(0);
      expect(deltas.WICKET).toBeGreaterThan(0);
    });

    it('models Session 2 (Twilight): Purkinje effect and rapid thermal swing surge', () => {
      const session1Deltas = calculateEnvironmentalDeltas({
        pitchType: 'HARD',
        conditions,
        pitchWearIndex: 0.2,
        ballWearIndex: 0.35,
        bowlerStyle: 'RIGHT_ARM_FAST',
        isPowerplay: false,
        format: 'TEST_PINK_BALL',
        currentSessionNumber: 1,
      });

      const session2Deltas = calculateEnvironmentalDeltas({
        pitchType: 'HARD',
        conditions,
        pitchWearIndex: 0.2,
        ballWearIndex: 0.35,
        bowlerStyle: 'RIGHT_ARM_FAST',
        isPowerplay: false,
        format: 'TEST_PINK_BALL',
        currentSessionNumber: 2,
      });

      // Twilight creates dramatic wicket surge and stifles boundaries compared to daylight session 1
      expect(session2Deltas.WICKET!).toBeGreaterThan(session1Deltas.WICKET!);
      expect(session2Deltas.FOUR!).toBeLessThan(session1Deltas.FOUR!);
      expect(session2Deltas.DOT!).toBeGreaterThan(session1Deltas.DOT!);
    });

    it('models Session 3 (Night under floodlights & dew): spinners struggle for finger purchase', () => {
      const deltas = calculateEnvironmentalDeltas({
        pitchType: 'HARD',
        conditions,
        pitchWearIndex: 0.3,
        ballWearIndex: 0.5,
        bowlerStyle: 'RIGHT_ARM_OFF_SPIN',
        isPowerplay: false,
        format: 'TEST_PINK_BALL',
        currentSessionNumber: 3,
      });

      // Dew factor severely hampers spin grip and turn under lights
      expect(deltas.WICKET).toBeLessThan(-0.4);
      expect(deltas.FOUR).toBeGreaterThan(0.2);
    });
  });

  describe('3. Authoritative Test Cricket Engine Rules', () => {
    it('implements Follow-On as an optional captain decision (enforced vs declined)', () => {
      const config = createTestConfig('TEST_RED_BALL', 998877n);
      let state = createInitialMatchState(config);
      const prng = new DeterministicPRNG(998877n);

      // Simulate match until Innings 2 is completed with a 240-run deficit
      state.innings[0] = {
        ...state.innings[0],
        totalRuns: 450,
        completedOvers: 120,
        totalWickets: 10,
        isCompleted: true,
      };

      // Case A: Captain enforces follow-on
      const stateA: MatchState = {
        ...state,
        currentInningsIndex: 1,
        innings: [
          state.innings[0],
          {
            ...state.innings[0],
            inningsNumber: 2,
            battingTeamId: config.team2.id,
            bowlingTeamId: config.team1.id,
            totalRuns: 210, // Deficit = 240 (>= 200)
            totalWickets: 9,
            completedOvers: 75,
            isCompleted: false,
          },
        ],
      };

      // Advance delivery with explicit declareInnings & enforceFollowOn: true
      const { nextState: stateEnforced } = stepDelivery(
        stateA,
        {
          batterIntent: 'BALANCED',
          bowlerLine: 'OUTSIDE_OFF',
          bowlerLength: 'GOOD_LENGTH',
          bowlerVariation: 'STOCK',
          fieldPreset: 'BALANCED_RING',
          declareInnings: true,
          enforceFollowOn: true,
        },
        prng,
      );

      expect(stateEnforced.isFollowOnEligible).toBe(true);
      expect(stateEnforced.isFollowOnEnforced).toBe(true);
      expect(stateEnforced.innings[2].battingTeamId).toBe(config.team2.id); // Team 2 bats again!

      // Case B: Captain declines follow-on (bats again)
      const { nextState: stateDeclined } = stepDelivery(
        stateA,
        {
          batterIntent: 'BALANCED',
          bowlerLine: 'OUTSIDE_OFF',
          bowlerLength: 'GOOD_LENGTH',
          bowlerVariation: 'STOCK',
          fieldPreset: 'BALANCED_RING',
          declareInnings: true,
          enforceFollowOn: false,
        },
        prng,
      );

      expect(stateDeclined.isFollowOnEligible).toBe(true);
      expect(stateDeclined.isFollowOnEnforced).toBe(false);
      expect(stateDeclined.innings[2].battingTeamId).toBe(config.team1.id); // Team 1 bats again!
    });

    it('implements New Ball as an optional captain decision after 80 overs', () => {
      const config = createTestConfig('TEST_RED_BALL', 112233n);
      let state = createInitialMatchState(config);
      const prng = new DeterministicPRNG(112233n);

      // Set 79 overs completed, 5 legal balls in current over
      state = {
        ...state,
        oversSinceNewBall: 79,
        ballWearIndex: 0.75,
      };
      state.innings[0] = {
        ...state.innings[0],
        completedOvers: 79,
        legalBallsInCurrentOver: 5,
      };

      // 1. Bowl 6th ball to reach 80 overs without claiming new ball
      const { nextState: over80State } = stepDelivery(
        state,
        {
          batterIntent: 'DEFEND',
          bowlerLine: 'OUTSIDE_OFF',
          bowlerLength: 'GOOD_LENGTH',
          bowlerVariation: 'STOCK',
          fieldPreset: 'BALANCED_RING',
          takeNewBall: false, // Captain intentionally delays new ball
        },
        prng,
      );

      expect(over80State.isNewBallAvailable).toBe(true);
      expect(over80State.oversSinceNewBall).toBe(80);
      expect(over80State.ballWearIndex).toBeGreaterThan(0.70); // Ball wear preserved!

      // 2. Captain explicitly claims new ball on next over
      const { nextState: newBallState } = stepDelivery(
        over80State,
        {
          batterIntent: 'DEFEND',
          bowlerLine: 'OUTSIDE_OFF',
          bowlerLength: 'GOOD_LENGTH',
          bowlerVariation: 'STOCK',
          fieldPreset: 'BALANCED_RING',
          takeNewBall: true, // Captain takes new cherry!
        },
        prng,
      );

      expect(newBallState.isNewBallAvailable).toBe(false);
      expect(newBallState.oversSinceNewBall).toBe(0); // Counter reset
      expect(newBallState.ballWearIndex).toBe(0.05); // Brand new ball shine restored
    });

    it('implements Captain Declaration and innings termination', () => {
      const config = createTestConfig('TEST_RED_BALL', 445566n);
      let state = createInitialMatchState(config);
      const prng = new DeterministicPRNG(445566n);

      state.innings[0] = {
        ...state.innings[0],
        totalRuns: 380,
        totalWickets: 4,
        completedOvers: 88,
      };

      // Captain declares innings closed
      const { nextState: declaredState } = stepDelivery(
        state,
        {
          batterIntent: 'AGGRESSIVE',
          bowlerLine: 'OUTSIDE_OFF',
          bowlerLength: 'GOOD_LENGTH',
          bowlerVariation: 'STOCK',
          fieldPreset: 'BALANCED_RING',
          declareInnings: true,
        },
        prng,
      );

      expect(declaredState.innings[0].isDeclared).toBe(true);
      expect(declaredState.innings[0].isCompleted).toBe(true);
      expect(declaredState.currentInningsIndex).toBe(1); // Innings 2 starts
    });

    it('terminates 5-day Test in a Draw when overs expire without result', () => {
      const config = createTestConfig('TEST_RED_BALL', 778899n);
      let state = createInitialMatchState(config);
      const prng = new DeterministicPRNG(778899n);

      state = {
        ...state,
        currentDayNumber: 6, // Concluded Day 5
      };

      const { nextState } = stepDelivery(
        state,
        {
          batterIntent: 'DEFEND',
          bowlerLine: 'OUTSIDE_OFF',
          bowlerLength: 'GOOD_LENGTH',
          bowlerVariation: 'STOCK',
          fieldPreset: 'BALANCED_RING',
        },
        prng,
      );

      expect(nextState.status).toBe('COMPLETED');
      expect(nextState.result?.isDraw).toBe(true);
      expect(nextState.result?.isTie).toBe(false);
      expect(nextState.result?.summary).toContain('Match drawn');
    });
  });

  describe('4. ICC Playing Conditions & MCC Laws Compliance', () => {
    it('enforces MCC Law 28.4.1 (max 2 behind square leg) & 28.4.2 (max 5 leg side)', () => {
      // Legal field: 2 behind square leg, 4 leg side total
      const legalField = [
        { isLegSide: true, isBehindSquareLeg: true },
        { isLegSide: true, isBehindSquareLeg: true },
        { isLegSide: true, isBehindSquareLeg: false },
        { isLegSide: true, isBehindSquareLeg: false },
        { isLegSide: false, isBehindSquareLeg: false },
      ];
      expect(validateFieldingRestrictions(legalField).isValid).toBe(true);

      // Illegal field A: 3 behind square leg (MCC 28.4.1 violation)
      const illegalBehindSquare = [
        { isLegSide: true, isBehindSquareLeg: true },
        { isLegSide: true, isBehindSquareLeg: true },
        { isLegSide: true, isBehindSquareLeg: true },
      ];
      const resA = validateFieldingRestrictions(illegalBehindSquare);
      expect(resA.isValid).toBe(false);
      expect(resA.reason).toContain('MCC Law 28.4.1');

      // Illegal field B: 6 on leg side total (MCC 28.4.2 Bodyline violation)
      const illegalLegSide = [
        { isLegSide: true, isBehindSquareLeg: false },
        { isLegSide: true, isBehindSquareLeg: false },
        { isLegSide: true, isBehindSquareLeg: false },
        { isLegSide: true, isBehindSquareLeg: false },
        { isLegSide: true, isBehindSquareLeg: false },
        { isLegSide: true, isBehindSquareLeg: false },
      ];
      const resB = validateFieldingRestrictions(illegalLegSide);
      expect(resB.isValid).toBe(false);
      expect(resB.reason).toContain('MCC Law 28.4.2');
    });

    it('calculates overthrow boundaries per MCC Law 19.8 (completed runs + 4)', () => {
      // 2 completed physical runs + boundary 4 = 6 runs
      expect(calculateOverthrowRuns(2, true)).toBe(6);
      // 1 completed physical run + boundary 4 = 5 runs
      expect(calculateOverthrowRuns(1, true)).toBe(5);
      // No boundary reached = completed physical runs only
      expect(calculateOverthrowRuns(2, false)).toBe(2);
    });

    it('evaluates lateral shuffle wide line adjustment under ICC Clause 22.1', () => {
      // Normal stance (0cm shift): ball 78cm wide off stumps is a Wide (guideline is 75cm)
      expect(isLateralWide(78, 0)).toBe(true);

      // Batter steps 15cm outside off stump: wide guideline shifts from 75cm to 89cm
      // Ball at 78cm is now within batter reach -> NOT a wide!
      expect(isLateralWide(78, 15)).toBe(false);

      // Ball way beyond return crease (95cm) -> Still a wide
      expect(isLateralWide(95, 15)).toBe(true);
    });
  });

  describe('5. End-to-End Autonomous Simulation Across All 5 Formats', () => {
    it('simulates complete T10 match and verifies replay determinism', () => {
      const config = createTestConfig('T10', 101010n);
      const result = simulateFullMatch(config);
      expect(result.finalState.status).toBe('COMPLETED');
      expect(result.scorecard.innings.length).toBeGreaterThanOrEqual(1);

      const replay = verifyMatchReplay(result);
      expect(replay.isValid).toBe(true);
      expect(replay.discrepancies.length).toBe(0);
    });

    it('simulates complete ODI match and verifies replay determinism', () => {
      const config = createTestConfig('ODI', 202020n);
      const result = simulateFullMatch(config);
      expect(result.finalState.status).toBe('COMPLETED');

      const replay = verifyMatchReplay(result);
      expect(replay.isValid).toBe(true);
      expect(replay.discrepancies.length).toBe(0);
    });

    it('simulates complete Test Red Ball match and verifies multi-innings accounting', () => {
      const config = createTestConfig('TEST_RED_BALL', 303030n);
      const result = simulateFullMatch(config);
      expect(result.finalState.status).toBe('COMPLETED');
      expect(result.scorecard.innings.length).toBeGreaterThanOrEqual(2);

      const replay = verifyMatchReplay(result);
      expect(replay.isValid).toBe(true);
      expect(replay.discrepancies.length).toBe(0);
    });

    it('simulates complete Test Pink Ball match and verifies day-night accounting', () => {
      const config = createTestConfig('TEST_PINK_BALL', 404040n);
      const result = simulateFullMatch(config);
      expect(result.finalState.status).toBe('COMPLETED');

      const replay = verifyMatchReplay(result);
      expect(replay.isValid).toBe(true);
      expect(replay.discrepancies.length).toBe(0);
    });
  });
});

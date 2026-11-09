import { describe, it, expect } from 'vitest';
import {
  calculateMatchupLogitDeltas,
  extractPlayerAttributes,
  calculateOutcomeLogits,
  computeSoftmax,
  type DeliveryContext,
  type OutcomeCalculationInput,
} from '../src/index.js';
import type { PlayerSquadContext } from '@cricket/shared-types';
import type { EnvironmentalConditions, TacticalDeliveryAction } from '../src/contracts/types.js';

const mockConditions: EnvironmentalConditions = {
  ambientTemperatureC: 30,
  humidityPercentage: 50,
  cloudCoverPercentage: 10,
  dewFactor: 0.0,
};

const defaultContext: DeliveryContext = {
  format: 'T20',
  inningsNumber: 1,
  overNumber: 1,
  ballInOver: 1,
  isPowerplay: true,
  isDeathOvers: false,
  isFreeHit: false,
  totalRuns: 6,
  totalWickets: 0,
  currentRunRate: 6.0,
  ballsRemaining: 114,
  pitchWearIndex: 0.0,
  surfaceCracksIndex: 0.0,
  ballWearIndex: 0.05,
  fieldersOutsideRing: 2,
};

const defaultTactics: TacticalDeliveryAction = {
  batterIntent: 'BALANCED',
  bowlerLine: 'OUTSIDE_OFF',
  bowlerLength: 'GOOD_LENGTH',
  bowlerVariation: 'STOCK',
  fieldPreset: 'BALANCED_RING',
};

describe('Matchup Feature P4.5: Batter vs Bowler Attribute Interaction', () => {
  it('should fall back gracefully to format ratings when granular attributes are absent', () => {
    const basicPlayer: PlayerSquadContext = {
      id: 'p1',
      fullName: 'Basic Player',
      displayName: 'B. Player',
      primaryRole: 'ALL_ROUNDER',
      battingHand: 'RIGHT_HAND',
      bowlingStyle: 'RIGHT_ARM_FAST',
      isWicketkeeper: false,
      formatRating: {
        format: 'T20',
        overallRating: 75,
        battingRating: 78,
        bowlingRating: 72,
        fieldingRating: 70,
        confidenceTier: 'SILVER',
        confidenceScore: 0.8,
        ratingVersion: 'rate-1.0.0',
        explainability: {
          rawPrimaryMetric: 'Avg: 30',
          eraPeerBaseline: 'T20',
          sampleSizeInnings: 40,
          shrinkageApplied: 0.05,
        },
      },
    };

    const attrs = extractPlayerAttributes(basicPlayer, 'T20');
    expect(attrs.technique).toBe(78);
    expect(attrs.lineAndLength).toBe(72);
    expect(attrs.catching).toBe(70);
    expect(attrs.pressureHandling).toBe(75);
  });

  it('should elevate wicket and dot probability when elite pace bowler faces weak pace technique', () => {
    const eliteFastBowler: PlayerSquadContext = {
      id: 'fast-bowler-1',
      fullName: 'Dale Steyn',
      displayName: 'D. Steyn',
      primaryRole: 'FAST_BOWLER',
      battingHand: 'RIGHT_HAND',
      bowlingStyle: 'RIGHT_ARM_FAST',
      isWicketkeeper: false,
      attributes: {
        technique: 25,
        timing: 20,
        power: 45,
        strikeRotation: 20,
        defensiveAbility: 30,
        againstPace: 25,
        againstSpin: 20,
        shortBallHandling: 20,
        yorkerHandling: 20,
        deathOverBatting: 30,
        powerplayBatting: 20,
        runningBetweenWickets: 50,
        lineAndLength: 95,
        paceOrSpinExecution: 98,
        swingOrDrift: 92,
        seamOrTurn: 90,
        accuracy: 94,
        variation: 80,
        yorkerExecution: 90,
        slowerBallExecution: 75,
        bouncerExecution: 95,
        deathOverBowling: 92,
        newBallEffectiveness: 98,
        stamina: 90,
        catching: 70,
        reflexes: 75,
        groundFielding: 75,
        throwingAccuracy: 80,
        throwingPower: 85,
        wicketkeeping: 20,
        athleticism: 88,
        pressureHandling: 90,
        consistency: 92,
        matchAwareness: 88,
        bigMatchTemperament: 94,
        recoveryResilience: 85,
        formatAdaptability: 90,
        pitchAdaptability: 92,
        weatherAdaptability: 88,
        homeVsAwayNeutrality: 90,
        ratingVersion: 'rate-1.0.0',
      },
    };

    const tailEnder: PlayerSquadContext = {
      id: 'tail-ender-1',
      fullName: 'No 11 Batter',
      displayName: 'No. 11',
      primaryRole: 'BOWLER',
      battingHand: 'RIGHT_HAND',
      bowlingStyle: 'RIGHT_ARM_FAST',
      isWicketkeeper: false,
      attributes: {
        ...eliteFastBowler.attributes!,
        technique: 20,
        againstPace: 18,
      },
    };

    const deltas = calculateMatchupLogitDeltas(
      tailEnder,
      eliteFastBowler,
      defaultContext,
      defaultTactics,
    );

    expect(deltas.WICKET).toBeGreaterThan(0.3);
    expect(deltas.DOT).toBeGreaterThan(0.25);
    expect(deltas.FOUR).toBeLessThan(0);
  });

  it('should reflect spin mastery vs spin vulnerability', () => {
    const eliteSpinner: PlayerSquadContext = {
      id: 'spinner-1',
      fullName: 'Shane Warne',
      displayName: 'S. Warne',
      primaryRole: 'SPIN_BOWLER',
      battingHand: 'RIGHT_HAND',
      bowlingStyle: 'RIGHT_ARM_LEG_BREAK',
      isWicketkeeper: false,
      attributes: {
        technique: 45,
        timing: 40,
        power: 50,
        strikeRotation: 35,
        defensiveAbility: 45,
        againstPace: 40,
        againstSpin: 45,
        shortBallHandling: 40,
        yorkerHandling: 35,
        deathOverBatting: 40,
        powerplayBatting: 30,
        runningBetweenWickets: 50,
        lineAndLength: 95,
        paceOrSpinExecution: 98,
        swingOrDrift: 96,
        seamOrTurn: 99,
        accuracy: 94,
        variation: 97,
        yorkerExecution: 60,
        slowerBallExecution: 80,
        bouncerExecution: 40,
        deathOverBowling: 80,
        newBallEffectiveness: 70,
        stamina: 95,
        catching: 85,
        reflexes: 85,
        groundFielding: 80,
        throwingAccuracy: 85,
        throwingPower: 80,
        wicketkeeping: 20,
        athleticism: 75,
        pressureHandling: 98,
        consistency: 94,
        matchAwareness: 96,
        bigMatchTemperament: 98,
        recoveryResilience: 95,
        formatAdaptability: 95,
        pitchAdaptability: 95,
        weatherAdaptability: 92,
        homeVsAwayNeutrality: 92,
        ratingVersion: 'rate-1.0.0',
      },
    };

    const weakSpinBatter: PlayerSquadContext = {
      id: 'batter-weak-spin',
      fullName: 'Weak Against Spin',
      displayName: 'W. Spin',
      primaryRole: 'TOP_ORDER_BATTER',
      battingHand: 'RIGHT_HAND',
      bowlingStyle: 'RIGHT_ARM_MEDIUM',
      isWicketkeeper: false,
      attributes: {
        ...eliteSpinner.attributes!,
        againstSpin: 30,
        technique: 50,
      },
    };

    const masterSpinBatter: PlayerSquadContext = {
      id: 'batter-master-spin',
      fullName: 'Master of Spin',
      displayName: 'M. Spin',
      primaryRole: 'TOP_ORDER_BATTER',
      battingHand: 'RIGHT_HAND',
      bowlingStyle: 'RIGHT_ARM_MEDIUM',
      isWicketkeeper: false,
      attributes: {
        ...eliteSpinner.attributes!,
        againstSpin: 98,
        technique: 96,
      },
    };

    const weakDeltas = calculateMatchupLogitDeltas(
      weakSpinBatter,
      eliteSpinner,
      defaultContext,
      defaultTactics,
    );
    const masterDeltas = calculateMatchupLogitDeltas(
      masterSpinBatter,
      eliteSpinner,
      defaultContext,
      defaultTactics,
    );

    // Weak player facing elite spinner incurs severe dismissal penalty
    expect(weakDeltas.WICKET).toBeGreaterThan(0.2);
    expect(weakDeltas.WICKET ?? 0).toBeGreaterThan(masterDeltas.WICKET ?? 0);

    // Master facing standard spinner dominates the matchup
    const standardSpinner: PlayerSquadContext = {
      ...eliteSpinner,
      attributes: {
        ...eliteSpinner.attributes!,
        seamOrTurn: 65,
        swingOrDrift: 60,
        accuracy: 65,
      },
    };
    const masterVsStandard = calculateMatchupLogitDeltas(
      masterSpinBatter,
      standardSpinner,
      defaultContext,
      defaultTactics,
    );
    expect(masterVsStandard.RUN_1).toBeGreaterThan(0.15);
    expect(masterVsStandard.FOUR).toBeGreaterThan(0.1);
  });

  it('should reward hook/pull mastery against bouncer tactics while punishing poor short-ball handling', () => {
    const bouncerBowler: PlayerSquadContext = {
      id: 'bowler-bouncer',
      fullName: 'Fast Bouncer Bowler',
      displayName: 'F. Bouncer',
      primaryRole: 'FAST_BOWLER',
      battingHand: 'RIGHT_HAND',
      bowlingStyle: 'RIGHT_ARM_FAST',
      isWicketkeeper: false,
      attributes: {
        technique: 30,
        timing: 30,
        power: 50,
        strikeRotation: 30,
        defensiveAbility: 35,
        againstPace: 30,
        againstSpin: 30,
        shortBallHandling: 30,
        yorkerHandling: 30,
        deathOverBatting: 40,
        powerplayBatting: 30,
        runningBetweenWickets: 50,
        lineAndLength: 85,
        paceOrSpinExecution: 95,
        swingOrDrift: 70,
        seamOrTurn: 80,
        accuracy: 85,
        variation: 80,
        yorkerExecution: 80,
        slowerBallExecution: 75,
        bouncerExecution: 96,
        deathOverBowling: 85,
        newBallEffectiveness: 88,
        stamina: 85,
        catching: 70,
        reflexes: 70,
        groundFielding: 70,
        throwingAccuracy: 80,
        throwingPower: 85,
        wicketkeeping: 20,
        athleticism: 80,
        pressureHandling: 85,
        consistency: 85,
        matchAwareness: 85,
        bigMatchTemperament: 85,
        recoveryResilience: 85,
        formatAdaptability: 85,
        pitchAdaptability: 85,
        weatherAdaptability: 85,
        homeVsAwayNeutrality: 85,
        ratingVersion: 'rate-1.0.0',
      },
    };

    const weakPuller: PlayerSquadContext = {
      id: 'weak-puller',
      fullName: 'Weak Short Ball',
      displayName: 'W. Puller',
      primaryRole: 'MIDDLE_ORDER_BATTER',
      battingHand: 'RIGHT_HAND',
      bowlingStyle: 'RIGHT_ARM_MEDIUM',
      isWicketkeeper: false,
      attributes: {
        ...bouncerBowler.attributes!,
        shortBallHandling: 25,
      },
    };

    const masterPuller: PlayerSquadContext = {
      id: 'master-puller',
      fullName: 'Master Puller',
      displayName: 'M. Puller',
      primaryRole: 'TOP_ORDER_BATTER',
      battingHand: 'RIGHT_HAND',
      bowlingStyle: 'RIGHT_ARM_MEDIUM',
      isWicketkeeper: false,
      attributes: {
        ...bouncerBowler.attributes!,
        technique: 90,
        againstPace: 92,
        shortBallHandling: 98,
      },
    };

    const bouncerTactics: TacticalDeliveryAction = {
      ...defaultTactics,
      bowlerLength: 'SHORT',
      bowlerVariation: 'BOUNCER',
    };

    const weakDeltas = calculateMatchupLogitDeltas(
      weakPuller,
      bouncerBowler,
      defaultContext,
      bouncerTactics,
    );
    const masterDeltas = calculateMatchupLogitDeltas(
      masterPuller,
      bouncerBowler,
      defaultContext,
      bouncerTactics,
    );

    // Weak puller suffers elevated wicket risk from bouncer
    expect(weakDeltas.WICKET).toBeGreaterThan(0.3);
    expect(weakDeltas.WICKET ?? 0).toBeGreaterThan(masterDeltas.WICKET ?? 0);

    // Master puller facing standard bouncer bowler dispatches for six and four
    const standardBouncerBowler: PlayerSquadContext = {
      ...bouncerBowler,
      attributes: {
        ...bouncerBowler.attributes!,
        bouncerExecution: 68,
        paceOrSpinExecution: 70,
      },
    };
    const masterVsStandard = calculateMatchupLogitDeltas(
      masterPuller,
      standardBouncerBowler,
      defaultContext,
      bouncerTactics,
    );
    expect(masterVsStandard.SIX).toBeGreaterThan(0.18);
    expect(masterVsStandard.FOUR).toBeGreaterThan(0.12);
  });

  it('should enforce asymmetric handedness advantages (LHB vs Off-Spin, RHB vs Left-Arm Pace)', () => {
    const offSpinner: PlayerSquadContext = {
      id: 'off-spinner',
      fullName: 'Ravichandran Ashwin',
      displayName: 'R. Ashwin',
      primaryRole: 'SPIN_BOWLER',
      battingHand: 'RIGHT_HAND',
      bowlingStyle: 'RIGHT_ARM_OFF_BREAK',
      isWicketkeeper: false,
    };

    const leftHandBatter: PlayerSquadContext = {
      id: 'lhb',
      fullName: 'David Warner',
      displayName: 'D. Warner',
      primaryRole: 'TOP_ORDER_BATTER',
      battingHand: 'LEFT_HAND',
      bowlingStyle: 'RIGHT_ARM_LEG_BREAK',
      isWicketkeeper: false,
    };

    const rightHandBatter: PlayerSquadContext = {
      id: 'rhb',
      fullName: 'Rohit Sharma',
      displayName: 'R. Sharma',
      primaryRole: 'TOP_ORDER_BATTER',
      battingHand: 'RIGHT_HAND',
      bowlingStyle: 'RIGHT_ARM_OFF_BREAK',
      isWicketkeeper: false,
    };

    const lhbDeltas = calculateMatchupLogitDeltas(
      leftHandBatter,
      offSpinner,
      defaultContext,
      defaultTactics,
    );
    const rhbDeltas = calculateMatchupLogitDeltas(
      rightHandBatter,
      offSpinner,
      defaultContext,
      defaultTactics,
    );

    // Off-spinner has higher wicket threat vs Left-Hander than vs Right-Hander
    expect(lhbDeltas.WICKET ?? 0).toBeGreaterThan(rhbDeltas.WICKET ?? 0);
  });

  it('should integrate seamlessly into complete outcome logits calculation and Softmax', () => {
    const input: OutcomeCalculationInput = {
      context: defaultContext,
      batter: {
        id: 'batter-dhoni',
        fullName: 'MS Dhoni',
        displayName: 'MS Dhoni',
        primaryRole: 'WICKETKEEPER_BATTER',
        battingHand: 'RIGHT_HAND',
        bowlingStyle: 'RIGHT_ARM_MEDIUM',
        isWicketkeeper: true,
        attributes: {
          technique: 82,
          timing: 88,
          power: 96,
          strikeRotation: 90,
          defensiveAbility: 80,
          againstPace: 90,
          againstSpin: 88,
          shortBallHandling: 85,
          yorkerHandling: 98, // Elite yorker digger
          deathOverBatting: 99, // King of death overs
          powerplayBatting: 75,
          runningBetweenWickets: 98,
          lineAndLength: 40,
          paceOrSpinExecution: 40,
          swingOrDrift: 30,
          seamOrTurn: 30,
          accuracy: 40,
          variation: 40,
          yorkerExecution: 30,
          slowerBallExecution: 40,
          bouncerExecution: 30,
          deathOverBowling: 30,
          newBallEffectiveness: 30,
          stamina: 95,
          catching: 95,
          reflexes: 99,
          groundFielding: 85,
          throwingAccuracy: 95,
          throwingPower: 90,
          wicketkeeping: 99,
          athleticism: 95,
          pressureHandling: 99,
          consistency: 92,
          matchAwareness: 99,
          bigMatchTemperament: 99,
          recoveryResilience: 98,
          formatAdaptability: 95,
          pitchAdaptability: 90,
          weatherAdaptability: 92,
          homeVsAwayNeutrality: 92,
          ratingVersion: 'rate-1.0.0',
        },
      },
      bowler: {
        id: 'bowler-malinga',
        fullName: 'Lasith Malinga',
        displayName: 'L. Malinga',
        primaryRole: 'FAST_BOWLER',
        battingHand: 'RIGHT_HAND',
        bowlingStyle: 'RIGHT_ARM_FAST',
        isWicketkeeper: false,
        attributes: {
          technique: 30,
          timing: 25,
          power: 50,
          strikeRotation: 25,
          defensiveAbility: 30,
          againstPace: 30,
          againstSpin: 25,
          shortBallHandling: 25,
          yorkerHandling: 25,
          deathOverBatting: 30,
          powerplayBatting: 25,
          runningBetweenWickets: 45,
          lineAndLength: 90,
          paceOrSpinExecution: 92,
          swingOrDrift: 85,
          seamOrTurn: 80,
          accuracy: 94,
          variation: 92,
          yorkerExecution: 99, // Slinging yorker specialist
          slowerBallExecution: 95,
          bouncerExecution: 88,
          deathOverBowling: 99, // Elite death bowler
          newBallEffectiveness: 88,
          stamina: 85,
          catching: 70,
          reflexes: 75,
          groundFielding: 70,
          throwingAccuracy: 75,
          throwingPower: 80,
          wicketkeeping: 20,
          athleticism: 75,
          pressureHandling: 95,
          consistency: 90,
          matchAwareness: 92,
          bigMatchTemperament: 96,
          recoveryResilience: 90,
          formatAdaptability: 90,
          pitchAdaptability: 88,
          weatherAdaptability: 88,
          homeVsAwayNeutrality: 88,
          ratingVersion: 'rate-1.0.0',
        },
      },
      conditions: mockConditions,
      tactics: {
        ...defaultTactics,
        bowlerLength: 'YORKER',
      },
    };

    const logits = calculateOutcomeLogits(input);
    const probs = computeSoftmax(logits);

    // Both are elite in death/yorkers: outcome should remain valid, realistic and normalized
    let sum = 0;
    for (const val of Object.values(probs)) {
      sum += val;
    }
    expect(sum).toBeCloseTo(1.0, 9);
    expect(probs.WICKET).toBeGreaterThan(0.01);
    expect(probs.WICKET).toBeLessThan(0.15);
  });
});

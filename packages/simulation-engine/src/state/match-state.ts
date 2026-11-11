import type {
  MatchSimulationConfig,
  MatchState,
  InningsState,
  BatterScorecardEntry,
  BowlerScorecardEntry,
  FallOfWicket,
  DeliveryEvent,
} from '../contracts/types.js';
import { generateInitialStateHash } from '../prng/state-hash.js';

/**
 * Creates an empty, initialized BatterScorecardEntry.
 */
export function createBatterScorecardEntry(playerId: string): BatterScorecardEntry {
  return {
    playerId,
    runs: 0,
    ballsFaced: 0,
    fours: 0,
    sixes: 0,
    strikeRate: 0.0,
    isOut: false,
  };
}

/**
 * Creates an empty, initialized BowlerScorecardEntry.
 */
export function createBowlerScorecardEntry(playerId: string): BowlerScorecardEntry {
  return {
    playerId,
    ballsBowled: 0,
    oversBowledFormatted: '0.0',
    maidens: 0,
    runsConceded: 0,
    wickets: 0,
    economyRate: 0.0,
    wides: 0,
    noBalls: 0,
    dots: 0,
  };
}

/**
 * Creates a fresh, initialized InningsState.
 */
export function createInitialInningsState(
  inningsNumber: number,
  battingTeamId: string,
  bowlingTeamId: string,
  battingLineup: { playerId: string; battingOrder: number }[],
  bowlingLineup: { playerId: string }[],
  targetRuns?: number
): InningsState {
  const sortedBatters = [...battingLineup].sort((a, b) => a.battingOrder - b.battingOrder);
  const striker = sortedBatters[0]?.playerId ?? '';
  const nonStriker = sortedBatters[1]?.playerId ?? '';

  const battersMap = new Map<string, BatterScorecardEntry>();
  for (const b of sortedBatters) {
    battersMap.set(b.playerId, createBatterScorecardEntry(b.playerId));
  }

  const bowlersMap = new Map<string, BowlerScorecardEntry>();
  for (const b of bowlingLineup) {
    bowlersMap.set(b.playerId, createBowlerScorecardEntry(b.playerId));
  }

  // Initial bowler from bowling lineup
  const initialBowler = bowlingLineup[bowlingLineup.length - 1]?.playerId ?? '';

  return {
    inningsNumber,
    battingTeamId,
    bowlingTeamId,
    totalRuns: 0,
    totalWickets: 0,
    completedOvers: 0,
    legalBallsInCurrentOver: 0,
    strikerPlayerId: striker,
    nonStrikerPlayerId: nonStriker,
    currentBowlerPlayerId: initialBowler,
    targetRuns,
    leadOrDeficit: 0,
    isFollowOn: false,
    isDeclared: false,
    isCompleted: false,
    isFreeHit: false,
    batters: battersMap,
    bowlers: bowlersMap,
    fallOfWickets: [],
    events: [],
  };
}

/**
 * Initializes a new, immutable MatchState from simulation configuration.
 */
export function createInitialMatchState(config: MatchSimulationConfig): MatchState {
  const hash0 = generateInitialStateHash(config);

  // Innings 1: Team 1 bats first by default toss/schedule
  const innings1 = createInitialInningsState(
    1,
    config.team1.id,
    config.team2.id,
    config.team1.lineup.map((s) => ({ playerId: s.playerId, battingOrder: s.battingOrder })),
    config.team2.lineup.map((s) => ({ playerId: s.playerId }))
  );

  const isTest = config.format === 'TEST_RED_BALL' || config.format === 'TEST_PINK_BALL';

  return {
    config,
    initialStateHash: hash0,
    status: 'IN_PROGRESS',
    currentInningsIndex: 0,
    innings: [innings1],
    pitchWearIndex: 0.0,
    surfaceCracksIndex: 0.0,
    ballWearIndex: 0.0,
    currentDayNumber: isTest ? 1 : undefined,
    currentSessionNumber: isTest ? 1 : undefined,
    sessionOversBowled: isTest ? 0 : undefined,
    sessionElapsedMinutes: isTest ? 0 : undefined,
    isAdditionalTimeActive: false,
    isNewBallAvailable: false,
    isFollowOnEligible: false,
    oversSinceNewBall: isTest ? 0 : undefined,
    isFollowOnEnforced: isTest ? false : undefined,
    stopClockSeconds: isTest ? undefined : 60,
    stopClockWarnings: 0,
  };
}

/**
 * Pure verification function that enforces cricket laws & mathematical invariants
 * on any MatchState snapshot.
 */
export function verifyMatchInvariants(state: MatchState): {
  isValid: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  const teamIds = new Set([state.config.team1.id, state.config.team2.id]);
  if (state.result?.winningTeamId && !teamIds.has(state.result.winningTeamId)) {
    violations.push(
      `Match result references unknown winning team (${state.result.winningTeamId})`,
    );
  }
  if (state.result && state.result.marginRuns !== undefined && state.result.marginRuns < 0) {
    violations.push('Match result has a negative runs margin');
  }
  if (state.result && state.result.marginWickets !== undefined && state.result.marginWickets < 0) {
    violations.push('Match result has a negative wickets margin');
  }

  let expectedSequenceNumber = 1;

  for (const inn of state.innings) {
    // 1. Wickets Invariant: TotalWickets <= 10
    if (inn.totalWickets > 10) {
      violations.push(
        `Innings ${inn.inningsNumber}: Total wickets (${inn.totalWickets}) exceeds legal maximum (10)`
      );
    }

    // 2. Over Invariant: legalBallsInCurrentOver <= 6
    if (inn.legalBallsInCurrentOver > 6 || inn.legalBallsInCurrentOver < 0) {
      violations.push(
        `Innings ${inn.inningsNumber}: Legal balls in over (${inn.legalBallsInCurrentOver}) invalid (must be 0-6)`
      );
    }

    // 3. Runs Conservation Invariant:
    // Total runs must equal sum of batter runs + extras
    let sumBatRuns = 0;
    let sumFours = 0;
    let sumSixes = 0;
    for (const b of inn.batters.values()) {
      sumBatRuns += b.runs;
      sumFours += b.fours;
      sumSixes += b.sixes;
    }

    let sumExtras = 0;
    let legalEventsCount = 0;
    let eventRuns = 0;
    let eventWickets = 0;
    const derivedBatters = new Map<string, {
      runs: number;
      ballsFaced: number;
      fours: number;
      sixes: number;
      isOut: boolean;
    }>();
    const derivedBowlers = new Map<string, {
      ballsBowled: number;
      runsConceded: number;
      wickets: number;
      wides: number;
      noBalls: number;
    }>();

    for (const e of inn.events) {
      const eventExtras =
        e.extras.wides +
        e.extras.noBalls +
        e.extras.byes +
        e.extras.legByes +
        e.extras.penalty;
      if (Object.values(e.extras).some((value) => value < 0)) {
        violations.push(
          `Innings ${inn.inningsNumber}: delivery ${e.sequenceNumber} contains negative extras`,
        );
      }
      sumExtras += eventExtras;
      eventRuns += e.runsBat + eventExtras;
      if (e.isLegalDelivery) legalEventsCount++;
      if (e.dismissal) eventWickets++;

      if (e.sequenceNumber !== expectedSequenceNumber) {
        violations.push(
          `Innings ${inn.inningsNumber}: event sequence expected ${expectedSequenceNumber}, got ${e.sequenceNumber}`,
        );
      }
      expectedSequenceNumber++;

      const batter = derivedBatters.get(e.strikerPlayerId) ?? {
        runs: 0,
        ballsFaced: 0,
        fours: 0,
        sixes: 0,
        isOut: false,
      };
      batter.runs += e.runsBat;
      if (e.isLegalDelivery) batter.ballsFaced++;
      if (e.runsBat === 4) batter.fours++;
      if (e.runsBat === 6) batter.sixes++;
      if (e.dismissal?.dismissedPlayerId === e.strikerPlayerId) batter.isOut = true;
      derivedBatters.set(e.strikerPlayerId, batter);

      if (e.dismissal && e.dismissal.dismissedPlayerId !== e.strikerPlayerId) {
        const dismissed = derivedBatters.get(e.dismissal.dismissedPlayerId) ?? {
          runs: 0,
          ballsFaced: 0,
          fours: 0,
          sixes: 0,
          isOut: false,
        };
        dismissed.isOut = true;
        derivedBatters.set(e.dismissal.dismissedPlayerId, dismissed);
      }

      const bowler = derivedBowlers.get(e.bowlerPlayerId) ?? {
        ballsBowled: 0,
        runsConceded: 0,
        wickets: 0,
        wides: 0,
        noBalls: 0,
      };
      if (e.isLegalDelivery) bowler.ballsBowled++;
      bowler.runsConceded += e.runsBat + e.extras.wides + e.extras.noBalls;
      bowler.wides += e.extras.wides;
      bowler.noBalls += e.extras.noBalls;
      if (e.dismissal && e.dismissal.mode !== 'RUN_OUT') bowler.wickets++;
      derivedBowlers.set(e.bowlerPlayerId, bowler);

      if (e.scorecardDelta.totalRuns !== eventRuns || e.scorecardDelta.totalWickets !== eventWickets) {
        violations.push(
          `Innings ${inn.inningsNumber}: delivery ${e.sequenceNumber} scorecard delta does not match event totals`,
        );
      }
    }

    const calculatedTotal = sumBatRuns + sumExtras;
    if (inn.events.length > 0 && calculatedTotal !== inn.totalRuns) {
      violations.push(
        `Innings ${inn.inningsNumber}: Total runs mismatch. Recorded: ${inn.totalRuns}, Calculated (Bat + Extras): ${calculatedTotal}`
      );
    }

    const expectedLegalBalls = inn.completedOvers * 6 + inn.legalBallsInCurrentOver;
    if (legalEventsCount !== expectedLegalBalls) {
      violations.push(
        `Innings ${inn.inningsNumber}: legal-ball count mismatch. Recorded: ${expectedLegalBalls}, events: ${legalEventsCount}`,
      );
    }
    if (eventRuns !== inn.totalRuns) {
      violations.push(
        `Innings ${inn.inningsNumber}: event total mismatch. Recorded: ${inn.totalRuns}, events: ${eventRuns}`,
      );
    }
    if (eventWickets !== inn.totalWickets) {
      violations.push(
        `Innings ${inn.inningsNumber}: wicket total mismatch. Recorded: ${inn.totalWickets}, events: ${eventWickets}`,
      );
    }

    for (const [playerId, expected] of derivedBatters) {
      const actual = inn.batters.get(playerId);
      if (!actual || actual.runs !== expected.runs || actual.ballsFaced !== expected.ballsFaced ||
        actual.fours !== expected.fours || actual.sixes !== expected.sixes || actual.isOut !== expected.isOut) {
        violations.push(`Innings ${inn.inningsNumber}: batter figures mismatch for ${playerId}`);
      }
    }
    for (const [playerId, expected] of derivedBowlers) {
      const actual = inn.bowlers.get(playerId);
      if (!actual || actual.ballsBowled !== expected.ballsBowled || actual.runsConceded !== expected.runsConceded ||
        actual.wickets !== expected.wickets || actual.wides !== expected.wides || actual.noBalls !== expected.noBalls) {
        violations.push(`Innings ${inn.inningsNumber}: bowler figures mismatch for ${playerId}`);
      }
    }

    // 4. Fall of wickets count invariant
    if (inn.fallOfWickets.length !== inn.totalWickets) {
      violations.push(
        `Innings ${inn.inningsNumber}: Fall of wickets count (${inn.fallOfWickets.length}) does not match total wickets (${inn.totalWickets})`
      );
    }
  }

  return {
    isValid: violations.length === 0,
    violations,
  };
}

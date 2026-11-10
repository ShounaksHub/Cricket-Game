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
    for (const e of inn.events) {
      sumExtras +=
        e.extras.wides +
        e.extras.noBalls +
        e.extras.byes +
        e.extras.legByes +
        e.extras.penalty;
      if (e.isLegalDelivery) legalEventsCount++;
    }

    const calculatedTotal = sumBatRuns + sumExtras;
    if (inn.events.length > 0 && calculatedTotal !== inn.totalRuns) {
      violations.push(
        `Innings ${inn.inningsNumber}: Total runs mismatch. Recorded: ${inn.totalRuns}, Calculated (Bat + Extras): ${calculatedTotal}`
      );
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

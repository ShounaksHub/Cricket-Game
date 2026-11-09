import type { MatchFormat } from '@cricket/shared-types';
import type {
  BatterScorecardEntry,
  BowlerScorecardEntry,
  DeliveryExtras,
  FallOfWicket,
  InningsState,
  MatchState,
  MatchStatus,
} from '../contracts/types.js';

export interface PartnershipEntry {
  readonly wicketNumber: number;
  readonly batter1Id: string;
  readonly batter1Runs: number;
  readonly batter2Id: string;
  readonly batter2Runs: number;
  readonly totalRuns: number;
  readonly balls: number;
}

export interface ReconciledInningsScorecard {
  readonly inningsNumber: number;
  readonly battingTeamId: string;
  readonly battingTeamName: string;
  readonly bowlingTeamId: string;
  readonly bowlingTeamName: string;
  readonly totalRuns: number;
  readonly totalWickets: number;
  readonly oversCompletedFormatted: string;
  readonly runRate: number;
  readonly extras: DeliveryExtras & { total: number };
  readonly batters: readonly BatterScorecardEntry[];
  readonly bowlers: readonly BowlerScorecardEntry[];
  readonly fallOfWickets: readonly FallOfWicket[];
  readonly partnerships: readonly PartnershipEntry[];
}

export interface PlayerOfTheMatch {
  readonly playerId: string;
  readonly playerName: string;
  readonly teamName: string;
  readonly impactPoints: number;
  readonly performanceSummary: string;
}

export interface ReconciledMatchScorecard {
  readonly matchId: string;
  readonly format: MatchFormat;
  readonly initialStateHash: string;
  readonly status: MatchStatus;
  readonly innings: readonly ReconciledInningsScorecard[];
  readonly result?: {
    readonly winningTeamId?: string;
    readonly marginRuns?: number;
    readonly marginWickets?: number;
    readonly isTie: boolean;
    readonly isDraw: boolean;
    readonly summary: string;
  };
  readonly playerOfTheMatch?: PlayerOfTheMatch;
}

/**
 * Reconciles match state into standard cricket scorecard tables, extras breakdowns,
 * fall-of-wickets timelines, and Player of the Match determination.
 */
export function reconcileMatchScorecard(state: MatchState): ReconciledMatchScorecard {
  const reconciledInnings: ReconciledInningsScorecard[] = [];

  for (const inn of state.innings) {
    const isTeam1Batting = inn.battingTeamId === state.config.team1.id;
    const battingTeam = isTeam1Batting ? state.config.team1 : state.config.team2;
    const bowlingTeam = isTeam1Batting ? state.config.team2 : state.config.team1;

    // Total Extras calculation
    let wides = 0;
    let noBalls = 0;
    let byes = 0;
    let legByes = 0;
    let penalty = 0;

    for (const e of inn.events) {
      wides += e.extras.wides;
      noBalls += e.extras.noBalls;
      byes += e.extras.byes;
      legByes += e.extras.legByes;
      penalty += e.extras.penalty;
    }

    const totalExtras = wides + noBalls + byes + legByes + penalty;
    const extrasObj = {
      wides,
      noBalls,
      byes,
      legByes,
      penalty,
      total: totalExtras,
    };

    // Format overs: e.g. "20.0" or "18.3"
    const oversFormatted = `${inn.completedOvers}.${inn.legalBallsInCurrentOver}`;
    const totalBalls = inn.completedOvers * 6 + inn.legalBallsInCurrentOver;
    const runRate = totalBalls > 0 ? (inn.totalRuns / totalBalls) * 6 : 0;

    // Ordered batters by batting order
    const sortedBatters = [...battingTeam.lineup]
      .sort((a, b) => a.battingOrder - b.battingOrder)
      .map((slot) => {
        return (
          inn.batters.get(slot.playerId) ?? {
            playerId: slot.playerId,
            runs: 0,
            ballsFaced: 0,
            fours: 0,
            sixes: 0,
            strikeRate: 0,
            isOut: false,
          }
        );
      });

    // Bowlers who bowled at least one ball
    const sortedBowlers = Array.from(inn.bowlers.values()).filter(
      (b) => b.ballsBowled > 0,
    );

    reconciledInnings.push({
      inningsNumber: inn.inningsNumber,
      battingTeamId: inn.battingTeamId,
      battingTeamName: battingTeam.name,
      bowlingTeamId: inn.bowlingTeamId,
      bowlingTeamName: bowlingTeam.name,
      totalRuns: inn.totalRuns,
      totalWickets: inn.totalWickets,
      oversCompletedFormatted: oversFormatted,
      runRate: Math.round(runRate * 100) / 100,
      extras: extrasObj,
      batters: sortedBatters,
      bowlers: sortedBowlers,
      fallOfWickets: inn.fallOfWickets,
      partnerships: calculatePartnerships(inn),
    });
  }

  // Calculate Player of the Match
  const playerOfTheMatch = calculatePlayerOfTheMatch(state);

  return {
    matchId: state.config.matchId,
    format: state.config.format,
    initialStateHash: state.initialStateHash,
    status: state.status,
    innings: reconciledInnings,
    result: state.result,
    playerOfTheMatch,
  };
}

/**
 * Calculates match impact points to select the Player of the Match:
 * - Batting: 1 pt per run, +10 for 50+, +20 for 100+, +2 per six.
 * - Bowling: 25 pts per wicket, +10 for 3w, +25 for 5w, +1 pt per dot ball.
 */
export function calculatePlayerOfTheMatch(state: MatchState): PlayerOfTheMatch | undefined {
  if (state.status !== 'COMPLETED' || state.innings.length === 0) {
    return undefined;
  }

  const scores = new Map<string, { points: number; summary: string; teamName: string }>();

  for (const inn of state.innings) {
    const isTeam1 = inn.battingTeamId === state.config.team1.id;
    const battingTeamName = isTeam1 ? state.config.team1.name : state.config.team2.name;
    const bowlingTeamName = isTeam1 ? state.config.team2.name : state.config.team1.name;

    // Evaluate Batters
    for (const b of inn.batters.values()) {
      if (b.ballsFaced === 0 && b.runs === 0) continue;
      let pts = b.runs;
      if (b.runs >= 100) pts += 20;
      else if (b.runs >= 50) pts += 10;
      pts += b.sixes * 2;

      const existing = scores.get(b.playerId) ?? { points: 0, summary: '', teamName: battingTeamName };
      scores.set(b.playerId, {
        points: existing.points + pts,
        summary: `${b.runs} (${b.ballsFaced})`,
        teamName: battingTeamName,
      });
    }

    // Evaluate Bowlers
    for (const b of inn.bowlers.values()) {
      if (b.ballsBowled === 0) continue;
      let pts = b.wickets * 25 + b.dots;
      if (b.wickets >= 5) pts += 25;
      else if (b.wickets >= 3) pts += 10;

      const existing = scores.get(b.playerId) ?? { points: 0, summary: '', teamName: bowlingTeamName };
      const bowlDesc = `${b.wickets}/${b.runsConceded}`;
      const combinedSummary = existing.summary ? `${existing.summary} & ${bowlDesc}` : bowlDesc;

      scores.set(b.playerId, {
        points: existing.points + pts,
        summary: combinedSummary,
        teamName: existing.teamName || bowlingTeamName,
      });
    }
  }

  let bestPlayerId = '';
  let maxPoints = -1;
  let bestData = { summary: '', teamName: '' };

  for (const [playerId, data] of scores.entries()) {
    if (data.points > maxPoints) {
      maxPoints = data.points;
      bestPlayerId = playerId;
      bestData = data;
    }
  }

  if (!bestPlayerId) return undefined;

  const profile = state.config.playerProfiles.get(bestPlayerId);
  const playerName = profile ? profile.fullName : bestPlayerId;

  return {
    playerId: bestPlayerId,
    playerName,
    teamName: bestData.teamName,
    impactPoints: maxPoints,
    performanceSummary: bestData.summary,
  };
}

/**
 * Deterministically reconstructs sequential partnerships (completed and unbroken)
 * for an innings from its delivery event stream.
 */
export function calculatePartnerships(inn: InningsState): readonly PartnershipEntry[] {
  if (inn.events.length === 0) {
    return [];
  }

  const partnerships: PartnershipEntry[] = [];
  let wicketNumber = 1;

  // Initial pair from the first delivery event
  let batter1Id = inn.events[0].strikerPlayerId;
  let batter2Id = inn.events[0].nonStrikerPlayerId;
  let batter1Runs = 0;
  let batter2Runs = 0;
  let totalRuns = 0;
  let balls = 0;

  for (let i = 0; i < inn.events.length; i++) {
    const e = inn.events[i];
    const deliveryRuns =
      e.runsBat +
      e.extras.wides +
      e.extras.noBalls +
      e.extras.byes +
      e.extras.legByes +
      e.extras.penalty;

    totalRuns += deliveryRuns;
    if (e.isLegalDelivery) {
      balls++;
    }

    if (e.runsBat > 0) {
      if (e.strikerPlayerId === batter1Id) {
        batter1Runs += e.runsBat;
      } else if (e.strikerPlayerId === batter2Id) {
        batter2Runs += e.runsBat;
      } else {
        batter1Runs += e.runsBat;
      }
    }

    if (e.dismissal) {
      partnerships.push({
        wicketNumber,
        batter1Id,
        batter1Runs,
        batter2Id,
        batter2Runs,
        totalRuns,
        balls,
      });

      wicketNumber++;
      totalRuns = 0;
      balls = 0;
      batter1Runs = 0;
      batter2Runs = 0;

      const dismissedId = e.dismissal.dismissedPlayerId;
      const survivingId =
        dismissedId === batter1Id
          ? batter2Id
          : dismissedId === batter2Id
            ? batter1Id
            : e.strikerPlayerId === dismissedId
              ? e.nonStrikerPlayerId
              : e.strikerPlayerId;

      let incomingId = '';
      for (let j = i + 1; j < inn.events.length; j++) {
        const nextE = inn.events[j];
        if (nextE.strikerPlayerId !== survivingId) {
          incomingId = nextE.strikerPlayerId;
          break;
        }
        if (nextE.nonStrikerPlayerId !== survivingId) {
          incomingId = nextE.nonStrikerPlayerId;
          break;
        }
      }

      batter1Id = survivingId;
      batter2Id = incomingId;
    }
  }

  // Unbroken partnership at innings conclusion
  if (balls > 0 || totalRuns > 0 || inn.totalWickets < 10) {
    if (partnerships.length === 0 || totalRuns > 0 || balls > 0) {
      partnerships.push({
        wicketNumber,
        batter1Id,
        batter1Runs,
        batter2Id,
        batter2Runs,
        totalRuns,
        balls,
      });
    }
  }

  return partnerships;
}

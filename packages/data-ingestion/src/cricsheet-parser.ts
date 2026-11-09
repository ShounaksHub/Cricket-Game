import type { DismissalType, ExtraType, MatchFormat, PlayerRawFormatStats } from '@cricket/shared-types';

export interface CricsheetMatchDelivery {
  readonly batter: string;
  readonly bowler: string;
  readonly non_striker: string;
  readonly runs: {
    readonly batter: number;
    readonly extras: number;
    readonly total: number;
  };
  readonly extras?: {
    readonly wides?: number;
    readonly noballs?: number;
    readonly byes?: number;
    readonly legbyes?: number;
    readonly penalty?: number;
  };
  readonly wickets?: Array<{
    readonly kind: string;
    readonly player_out: string;
    readonly fielders?: Array<{ name: string }>;
  }>;
}

export interface CricsheetMatchOver {
  readonly over: number;
  readonly deliveries: CricsheetMatchDelivery[];
}

export interface CricsheetMatchInnings {
  readonly team: string;
  readonly overs: CricsheetMatchOver[];
}

export interface CricsheetMatchJson {
  readonly info: {
    readonly match_type: string;
    readonly dates: string[];
    readonly teams: string[];
    readonly registry?: {
      readonly people?: Record<string, string>; // Name -> Cricsheet ID
    };
    readonly venue?: string;
    readonly city?: string;
    readonly outcome?: {
      readonly winner?: string;
      readonly by?: {
        readonly runs?: number;
        readonly wickets?: number;
      };
      readonly result?: string;
    };
  };
  readonly innings: CricsheetMatchInnings[];
}

/**
 * Maps Cricsheet match_type string to our canonical MatchFormat enum.
 */
export function mapCricsheetMatchType(matchType: string): MatchFormat | null {
  const normalized = matchType.toLowerCase().trim();
  if (normalized === 't20' || normalized === 'it20') {
    return 'T20';
  }
  if (normalized === 'odi' || normalized === 'mdm') {
    return 'ODI';
  }
  if (normalized === 'test') {
    return 'TEST_RED_BALL';
  }
  if (normalized === 't10') {
    return 'T10';
  }
  return null;
}

/**
 * Maps Cricsheet dismissal kind string to canonical DismissalType enum.
 */
export function mapCricsheetDismissal(kind: string): DismissalType {
  const k = kind.toLowerCase().trim();
  switch (k) {
    case 'bowled':
      return 'BOWLED';
    case 'caught':
    case 'caught and bowled':
      return 'CAUGHT';
    case 'lbw':
      return 'LBW';
    case 'run out':
      return 'RUN_OUT';
    case 'stumped':
      return 'STUMPED';
    case 'hit wicket':
      return 'HIT_WICKET';
    case 'retired out':
      return 'RETIRED_OUT';
    case 'retired hurt':
      return 'RETIRED_HURT';
    case 'obstructing the field':
      return 'OBSTRUCTING_FIELD';
    case 'timed out':
      return 'TIMED_OUT';
    default:
      return 'NOT_OUT';
  }
}

/**
 * Aggregates match events into raw format stats for all players participating in a match.
 */
export interface PlayerMatchAggregation {
  inningsBatted: boolean;
  runsScored: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  isDismissed: boolean;
  ballsBowled: number;
  runsConceded: number;
  wicketsTaken: number;
  catchesTaken: number;
  stumpingsMade: number;
}

export function parseCricsheetMatch(
  match: CricsheetMatchJson
): {
  format: MatchFormat;
  playerStats: Map<string, PlayerMatchAggregation>;
} | null {
  const format = mapCricsheetMatchType(match.info.match_type);
  if (!format) return null;

  const playerStats = new Map<string, PlayerMatchAggregation>();

  const getOrCreate = (name: string): PlayerMatchAggregation => {
    let stat = playerStats.get(name);
    if (!stat) {
      stat = {
        inningsBatted: false,
        runsScored: 0,
        ballsFaced: 0,
        fours: 0,
        sixes: 0,
        isDismissed: false,
        ballsBowled: 0,
        runsConceded: 0,
        wicketsTaken: 0,
        catchesTaken: 0,
        stumpingsMade: 0,
      };
      playerStats.set(name, stat);
    }
    return stat;
  };

  for (const innings of match.innings) {
    for (const over of innings.overs) {
      for (const delivery of over.deliveries) {
        const batter = getOrCreate(delivery.batter);
        const bowler = getOrCreate(delivery.bowler);
        getOrCreate(delivery.non_striker); // ensure registered

        // Batter scoring
        batter.inningsBatted = true;
        batter.ballsFaced += delivery.extras?.wides ? 0 : 1;
        batter.runsScored += delivery.runs.batter;
        if (delivery.runs.batter === 4) batter.fours += 1;
        if (delivery.runs.batter === 6) batter.sixes += 1;

        // Bowler delivery
        const isLegal = !delivery.extras?.wides && !delivery.extras?.noballs;
        if (isLegal) {
          bowler.ballsBowled += 1;
        }
        // Bowler concedes batter runs + wides + noballs (byes and legbyes are not conceded by bowler)
        const bowlerConceded =
          delivery.runs.batter +
          (delivery.extras?.wides ?? 0) +
          (delivery.extras?.noballs ?? 0);
        bowler.runsConceded += bowlerConceded;

        // Wickets
        if (delivery.wickets) {
          for (const w of delivery.wickets) {
            const dismissed = getOrCreate(w.player_out);
            dismissed.isDismissed = true;

            const kind = mapCricsheetDismissal(w.kind);
            // Run outs and timed out are not credited to bowler
            if (kind !== 'RUN_OUT' && kind !== 'RETIRED_OUT' && kind !== 'RETIRED_HURT' && kind !== 'TIMED_OUT' && kind !== 'OBSTRUCTING_FIELD') {
              bowler.wicketsTaken += 1;
            }

            // Fielders
            if (w.fielders) {
              for (const f of w.fielders) {
                const fielder = getOrCreate(f.name);
                if (kind === 'CAUGHT') fielder.catchesTaken += 1;
                if (kind === 'STUMPED') fielder.stumpingsMade += 1;
              }
            }
          }
        }
      }
    }
  }

  return {
    format,
    playerStats,
  };
}

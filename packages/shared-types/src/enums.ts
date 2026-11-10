export type MatchFormat =
  | 'T10'
  | 'T20'
  | 'ODI'
  | 'TEST_RED_BALL'
  | 'TEST_PINK_BALL';

export type HistoricalEra =
  | 'GOLDEN_AGE_PRE_1914'
  | 'INTERWAR_1919_1939'
  | 'POST_WAR_1946_1970'
  | 'PACE_REVOLUTION_1971_1991'
  | 'GLOBALIZED_1992_2007'
  | 'T20_REVOLUTION_2008_2020'
  | 'CONTEMPORARY_2021_PRESENT';

export type PrimaryRole =
  | 'TOP_ORDER_BATTER'
  | 'MIDDLE_ORDER_BATTER'
  | 'WICKETKEEPER_BATTER'
  | 'BATTING_ALL_ROUNDER'
  | 'BOWLING_ALL_ROUNDER'
  | 'PACE_BOWLER'
  | 'SPIN_BOWLER';

export type BattingHand = 'RIGHT_HAND' | 'LEFT_HAND';

export type BowlingStyle =
  | 'RIGHT_ARM_FAST'
  | 'RIGHT_ARM_FAST_MEDIUM'
  | 'RIGHT_ARM_MEDIUM'
  | 'LEFT_ARM_FAST'
  | 'LEFT_ARM_FAST_MEDIUM'
  | 'LEFT_ARM_MEDIUM'
  | 'RIGHT_ARM_OFF_BREAK'
  | 'RIGHT_ARM_LEG_BREAK'
  | 'LEFT_ARM_ORTHODOX'
  | 'LEFT_ARM_UNORTHODOX'
  | 'NONE';

export type PitchType =
  | 'GREEN'
  | 'DRY'
  | 'DUSTY'
  | 'FLAT_BATTING'
  | 'HARD_BOUNCY'
  | 'SLOW'
  | 'TURNING'
  | 'BALANCED';

export type MatchStatus =
  | 'SCHEDULED'
  | 'TOSS_PENDING'
  | 'IN_PROGRESS'
  | 'INNINGS_BREAK'
  | 'STUMPS'
  | 'COMPLETED'
  | 'ABANDONED';

export type DismissalType =
  | 'BOWLED'
  | 'CAUGHT'
  | 'LBW'
  | 'RUN_OUT'
  | 'STUMPED'
  | 'HIT_WICKET'
  | 'RETIRED_OUT'
  | 'RETIRED_HURT'
  | 'OBSTRUCTING_FIELD'
  | 'TIMED_OUT'
  | 'NOT_OUT';

export type ExtraType =
  | 'NONE'
  | 'WIDE'
  | 'NO_BALL'
  | 'BYE'
  | 'LEG_BYE'
  | 'PENALTY';

export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';

export type ConfidenceTier = 'MEASURED' | 'ESTIMATED' | 'IMPUTED';

export type LicenseType =
  | 'CC_BY_4_0'
  | 'CC_BY_SA_4_0'
  | 'PUBLIC_DOMAIN'
  | 'PROPRIETARY'
  | 'OPEN_DATA';

export type TossDecision = 'BAT' | 'BOWL';

export type DreamTeamStatus = 'DRAFT' | 'MATCH_READY';

export type CareerCategory = 'INTERNATIONAL' | 'DOMESTIC_ONLY' | 'HISTORICAL_LEGEND';


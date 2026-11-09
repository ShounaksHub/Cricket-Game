import type {
  BattingHand,
  BowlingStyle,
  HistoricalEra,
  PrimaryRole,
} from '@cricket/shared-types';

export interface WikidataBiographicalEntity {
  readonly qid: string;
  readonly label: string;
  readonly dateOfBirth?: string;
  readonly countryOfCitizenship?: string;
  readonly playingRole?: string;
  readonly battingHand?: string;
  readonly bowlingStyle?: string;
  readonly debutYear?: number;
  readonly retirementYear?: number;
  readonly isWicketkeeper?: boolean;
}

/**
 * Derives the canonical HistoricalEra bracket based on career debut year.
 */
export function deriveHistoricalEra(debutYear: number): HistoricalEra {
  if (debutYear <= 1914) return 'GOLDEN_AGE_PRE_1914';
  if (debutYear <= 1939) return 'INTERWAR_1919_1939';
  if (debutYear <= 1970) return 'POST_WAR_1946_1970';
  if (debutYear <= 1991) return 'PACE_REVOLUTION_1971_1991';
  if (debutYear <= 2007) return 'GLOBALIZED_1992_2007';
  if (debutYear <= 2020) return 'T20_REVOLUTION_2008_2020';
  return 'CONTEMPORARY_2021_PRESENT';
}

/**
 * Maps raw role strings to canonical PrimaryRole enum.
 */
export function mapWikidataRole(roleString?: string, isWicketkeeper = false): PrimaryRole {
  if (isWicketkeeper) return 'WICKETKEEPER_BATTER';
  if (!roleString) return 'TOP_ORDER_BATTER';

  const r = roleString.toLowerCase();
  if (r.includes('wicket-keeper') || r.includes('wicketkeeper')) {
    return 'WICKETKEEPER_BATTER';
  }
  if (r.includes('all-rounder') || r.includes('all rounder')) {
    if (r.includes('bowl')) return 'BOWLING_ALL_ROUNDER';
    return 'BATTING_ALL_ROUNDER';
  }
  if (r.includes('fast') || r.includes('pace') || r.includes('seam') || r.includes('medium')) {
    return 'PACE_BOWLER';
  }
  if (r.includes('spin') || r.includes('slow') || r.includes('orthodox') || r.includes('leg break') || r.includes('off break')) {
    return 'SPIN_BOWLER';
  }
  if (r.includes('bowler')) {
    return 'PACE_BOWLER';
  }
  if (r.includes('middle order')) {
    return 'MIDDLE_ORDER_BATTER';
  }
  return 'TOP_ORDER_BATTER';
}

/**
 * Maps raw batting hand strings to canonical BattingHand enum.
 */
export function mapWikidataBattingHand(handString?: string): BattingHand {
  if (!handString) return 'RIGHT_HAND';
  const h = handString.toLowerCase();
  if (h.includes('left')) return 'LEFT_HAND';
  return 'RIGHT_HAND';
}

/**
 * Maps raw bowling style strings to canonical BowlingStyle enum.
 */
export function mapWikidataBowlingStyle(styleString?: string): BowlingStyle {
  if (!styleString) return 'NONE';
  const s = styleString.toLowerCase();
  if (s === 'none' || s === 'n/a') return 'NONE';

  const isLeft = s.includes('left');

  if (s.includes('fast-medium') || s.includes('fast medium')) {
    return isLeft ? 'LEFT_ARM_FAST_MEDIUM' : 'RIGHT_ARM_FAST_MEDIUM';
  }
  if (s.includes('fast')) {
    return isLeft ? 'LEFT_ARM_FAST' : 'RIGHT_ARM_FAST';
  }
  if (s.includes('medium')) {
    return isLeft ? 'LEFT_ARM_MEDIUM' : 'RIGHT_ARM_MEDIUM';
  }
  if (s.includes('leg break') || s.includes('wrist spin') || s.includes('leg spin')) {
    return isLeft ? 'LEFT_ARM_UNORTHODOX' : 'RIGHT_ARM_LEG_BREAK';
  }
  if (s.includes('off break') || s.includes('finger spin') || s.includes('off spin')) {
    return isLeft ? 'LEFT_ARM_ORTHODOX' : 'RIGHT_ARM_OFF_BREAK';
  }
  if (s.includes('orthodox')) {
    return 'LEFT_ARM_ORTHODOX';
  }
  if (s.includes('unorthodox')) {
    return 'LEFT_ARM_UNORTHODOX';
  }

  return isLeft ? 'LEFT_ARM_MEDIUM' : 'RIGHT_ARM_MEDIUM';
}

import type {
  BattingHand,
  BowlingStyle,
  ConfidenceTier,
  HistoricalEra,
  MatchFormat,
  PrimaryRole,
} from '@cricket/shared-types';

export interface PlayerSearchQueryDto {
  q?: string;
  format?: MatchFormat;
  role?: PrimaryRole;
  battingHand?: BattingHand;
  bowlingStyle?: BowlingStyle;
  isActive?: boolean | string;
  era?: HistoricalEra;
  nationality?: string;
  tier?: ConfidenceTier;
  minRating?: number;
  maxRating?: number;
  limit?: number;
  offset?: number;
  sort?: 'rating' | 'name' | 'debutYear';
  order?: 'asc' | 'desc';
}

export interface PaginatedPlayerResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

import type { ConfidenceTier, HistoricalEra, MatchFormat, PrimaryRole } from '@cricket/shared-types';

export interface PlayerSearchQueryDto {
  q?: string;
  format?: MatchFormat;
  role?: PrimaryRole;
  era?: HistoricalEra;
  nationality?: string;
  tier?: ConfidenceTier;
  minRating?: number;
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

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  ingestPlayerRecord,
  normalizePlayerName,
  VERIFIED_BENCHMARK_PLAYERS,
} from '@cricket/data-ingestion';
import type {
  MatchFormat,
  PlayerFormatRating,
  PlayerProfile,
  PlayerRawFormatStats,
} from '@cricket/shared-types';
import type { PaginatedPlayerResponse, PlayerSearchQueryDto } from './dto/player-query.dto.js';

@Injectable()
export class PlayersService {
  private readonly logger = new Logger(PlayersService.name);
  private readonly benchmarkProfiles: Map<string, PlayerProfile> = new Map();

  constructor(private readonly prisma: PrismaService) {
    this.initializeBenchmarkProfiles();
  }

  private initializeBenchmarkProfiles(): void {
    for (const raw of VERIFIED_BENCHMARK_PLAYERS) {
      const profile = ingestPlayerRecord(raw);
      this.benchmarkProfiles.set(profile.id, profile);
    }
    this.logger.log(
      `Initialized ${this.benchmarkProfiles.size} verified benchmark player profiles in memory`
    );
  }

  /**
   * Search and filter players across database with benchmark catalogue fallback.
   */
  async searchPlayers(
    query: PlayerSearchQueryDto
  ): Promise<PaginatedPlayerResponse<PlayerProfile>> {
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const offset = Math.max(0, Number(query.offset) || 0);
    const selectedFormat: MatchFormat = query.format ?? 'T20';

    // Retrieve from in-memory verified cache or fallback
    let allProfiles = Array.from(this.benchmarkProfiles.values());

    // 1. Text Search Filter (q)
    if (query.q && query.q.trim().length > 0) {
      const normQ = normalizePlayerName(query.q);
      allProfiles = allProfiles.filter((p) => {
        const normFull = normalizePlayerName(p.fullName);
        const normDisplay = normalizePlayerName(p.displayName);
        return normFull.includes(normQ) || normDisplay.includes(normQ);
      });
    }

    // 2. Role Filter
    if (query.role) {
      allProfiles = allProfiles.filter((p) => p.primaryRole === query.role);
    }

    // 2b. Batting Hand Filter
    if (query.battingHand) {
      allProfiles = allProfiles.filter((p) => p.battingHand === query.battingHand);
    }

    // 2c. Bowling Style Filter
    if (query.bowlingStyle) {
      allProfiles = allProfiles.filter((p) => p.bowlingStyle === query.bowlingStyle);
    }

    // 2d. Active / Career Status Filter
    if (query.isActive !== undefined) {
      const activeBool = query.isActive === true || query.isActive === 'true';
      allProfiles = allProfiles.filter((p) => Boolean(p.isActive) === activeBool);
    }

    // 3. Historical Era Filter
    if (query.era) {
      allProfiles = allProfiles.filter((p) => p.historicalEra === query.era);
    }

    // 4. Nationality Filter
    if (query.nationality) {
      const nat = query.nationality.toLowerCase();
      allProfiles = allProfiles.filter((p) =>
        p.primaryNationality.toLowerCase().includes(nat)
      );
    }

    // 5. Confidence Tier Filter
    if (query.tier) {
      allProfiles = allProfiles.filter(
        (p) => p.ratings[selectedFormat]?.confidenceTier === query.tier
      );
    }

    // 6. Rating Range Filters
    if (query.minRating) {
      const minR = Number(query.minRating);
      allProfiles = allProfiles.filter(
        (p) => (p.ratings[selectedFormat]?.overallRating ?? 0) >= minR
      );
    }
    if (query.maxRating) {
      const maxR = Number(query.maxRating);
      allProfiles = allProfiles.filter(
        (p) => (p.ratings[selectedFormat]?.overallRating ?? 0) <= maxR
      );
    }

    // 7. Sorting
    const sortField = query.sort ?? 'rating';
    const sortOrder = query.order ?? 'desc';
    const modifier = sortOrder === 'asc' ? 1 : -1;

    allProfiles.sort((a, b) => {
      if (sortField === 'name') {
        return a.fullName.localeCompare(b.fullName) * modifier;
      }
      if (sortField === 'debutYear') {
        return (a.careerDebutYear - b.careerDebutYear) * modifier;
      }
      // Default: sort by overall rating in selected format
      const ratingA = a.ratings[selectedFormat]?.overallRating ?? 50;
      const ratingB = b.ratings[selectedFormat]?.overallRating ?? 50;
      return (ratingA - ratingB) * modifier;
    });

    const total = allProfiles.length;
    const items = allProfiles.slice(offset, offset + limit);

    return {
      items,
      total,
      limit,
      offset,
    };
  }

  /**
   * Retrieves single player profile by ID.
   */
  async getPlayerById(id: string): Promise<PlayerProfile> {
    const profile = this.benchmarkProfiles.get(id);
    if (!profile) {
      throw new NotFoundException(`Player with ID '${id}' was not found`);
    }
    return profile;
  }

  /**
   * Retrieves format-segregated statistics for a player.
   */
  async getPlayerStats(
    id: string
  ): Promise<Partial<Record<MatchFormat, PlayerRawFormatStats>>> {
    const profile = await this.getPlayerById(id);
    return profile.formatStats;
  }

  /**
   * Retrieves format ratings, 0-100 attributes, and explainable breakdown for a player.
   */
  async getPlayerRatings(id: string): Promise<{
    ratings: Partial<Record<MatchFormat, PlayerFormatRating>>;
    attributes: PlayerProfile['attributes'];
  }> {
    const profile = await this.getPlayerById(id);
    return {
      ratings: profile.ratings,
      attributes: profile.attributes,
    };
  }
}

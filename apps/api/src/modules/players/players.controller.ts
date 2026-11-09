import { Controller, Get, Param, Query } from '@nestjs/common';
import { PlayersService } from './players.service.js';
import type { PaginatedPlayerResponse, PlayerSearchQueryDto } from './dto/player-query.dto.js';
import type {
  MatchFormat,
  PlayerFormatRating,
  PlayerProfile,
  PlayerRawFormatStats,
} from '@cricket/shared-types';

@Controller('players')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get()
  async searchPlayers(
    @Query() query: PlayerSearchQueryDto
  ): Promise<PaginatedPlayerResponse<PlayerProfile>> {
    return this.playersService.searchPlayers(query);
  }

  @Get(':id')
  async getPlayerById(@Param('id') id: string): Promise<PlayerProfile> {
    return this.playersService.getPlayerById(id);
  }

  @Get(':id/stats')
  async getPlayerStats(
    @Param('id') id: string
  ): Promise<Partial<Record<MatchFormat, PlayerRawFormatStats>>> {
    return this.playersService.getPlayerStats(id);
  }

  @Get(':id/ratings')
  async getPlayerRatings(@Param('id') id: string): Promise<{
    ratings: Partial<Record<MatchFormat, PlayerFormatRating>>;
    attributes: PlayerProfile['attributes'];
  }> {
    return this.playersService.getPlayerRatings(id);
  }
}

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Headers,
} from '@nestjs/common';
import {
  DreamTeamsService,
  DEFAULT_USER_ID,
  type DreamTeamResponse,
} from './dream-teams.service.js';
import type { CreateDreamTeamDto } from './dto/create-dream-team.dto.js';
import type { UpdateDreamTeamDto } from './dto/update-dream-team.dto.js';
import type { ReorderBattingOrderDto } from './dto/reorder-lineup.dto.js';
import type { DreamTeamPlayerSlotDto } from './dto/squad-player-slot.dto.js';
import type { SquadValidationResult } from '@cricket/shared-types';

@Controller('dream-teams')
export class DreamTeamsController {
  constructor(private readonly dreamTeamsService: DreamTeamsService) {}

  @Post()
  async createTeam(
    @Headers('x-user-id') userId: string | undefined,
    @Body() dto: CreateDreamTeamDto
  ): Promise<DreamTeamResponse> {
    return this.dreamTeamsService.createTeam(userId || DEFAULT_USER_ID, dto);
  }

  @Get()
  async listTeams(
    @Headers('x-user-id') userId: string | undefined
  ): Promise<DreamTeamResponse[]> {
    return this.dreamTeamsService.listTeams(userId || DEFAULT_USER_ID);
  }

  @Get(':id')
  async getTeamById(
    @Headers('x-user-id') userId: string | undefined,
    @Param('id') id: string
  ): Promise<DreamTeamResponse> {
    return this.dreamTeamsService.getTeamById(userId || DEFAULT_USER_ID, id);
  }

  @Patch(':id')
  async updateTeam(
    @Headers('x-user-id') userId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateDreamTeamDto
  ): Promise<DreamTeamResponse> {
    return this.dreamTeamsService.updateTeam(userId || DEFAULT_USER_ID, id, dto);
  }

  @Delete(':id')
  async deleteTeam(
    @Headers('x-user-id') userId: string | undefined,
    @Param('id') id: string
  ): Promise<{ success: boolean; deletedId: string }> {
    return this.dreamTeamsService.deleteTeam(userId || DEFAULT_USER_ID, id);
  }

  @Post(':id/duplicate')
  async duplicateTeam(
    @Headers('x-user-id') userId: string | undefined,
    @Param('id') id: string
  ): Promise<DreamTeamResponse> {
    return this.dreamTeamsService.duplicateTeam(userId || DEFAULT_USER_ID, id);
  }

  @Post(':id/validate')
  async validateTeam(
    @Headers('x-user-id') userId: string | undefined,
    @Param('id') id: string
  ): Promise<SquadValidationResult> {
    return this.dreamTeamsService.validateTeam(userId || DEFAULT_USER_ID, id);
  }

  @Post(':id/players')
  async addOrUpdatePlayerSlot(
    @Headers('x-user-id') userId: string | undefined,
    @Param('id') id: string,
    @Body() slotDto: DreamTeamPlayerSlotDto
  ): Promise<DreamTeamResponse> {
    return this.dreamTeamsService.addOrUpdatePlayerSlot(
      userId || DEFAULT_USER_ID,
      id,
      slotDto
    );
  }

  @Delete(':id/players/:playerId')
  async removePlayerSlot(
    @Headers('x-user-id') userId: string | undefined,
    @Param('id') id: string,
    @Param('playerId') playerId: string
  ): Promise<DreamTeamResponse> {
    return this.dreamTeamsService.removePlayerSlot(
      userId || DEFAULT_USER_ID,
      id,
      playerId
    );
  }

  @Patch(':id/batting-order')
  async reorderBattingOrder(
    @Headers('x-user-id') userId: string | undefined,
    @Param('id') id: string,
    @Body() dto: ReorderBattingOrderDto
  ): Promise<DreamTeamResponse> {
    return this.dreamTeamsService.reorderBattingOrder(
      userId || DEFAULT_USER_ID,
      id,
      dto
    );
  }
}

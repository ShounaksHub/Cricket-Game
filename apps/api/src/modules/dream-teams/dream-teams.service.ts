import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PlayersService } from '../players/players.service.js';
import { validateDreamTeamSquad } from '@cricket/cricket-rules';
import {
  SaveDreamTeamDraftSchema,
  CreateDreamTeamSchema,
  UpdateDreamTeamSchema,
  ReorderBattingOrderSchema,
  DreamTeamPlayerSlotSchema,
} from '@cricket/validation';
import type {
  MatchFormat,
  DreamTeamStatus,
  SquadValidationResult,
  DreamTeamPlayerSlotInput,
  PlayerProfile,
  PlayerSquadContext,
} from '@cricket/shared-types';
import type { CreateDreamTeamDto } from './dto/create-dream-team.dto.js';
import type { UpdateDreamTeamDto } from './dto/update-dream-team.dto.js';
import type { ReorderBattingOrderDto } from './dto/reorder-lineup.dto.js';
import type { DreamTeamPlayerSlotDto } from './dto/squad-player-slot.dto.js';
import { randomUUID } from 'node:crypto';

export interface EnrichedDreamTeamPlayer {
  id: string;
  dreamTeamId: string;
  playerId: string;
  battingOrder: number;
  isCaptain: boolean;
  isViceCaptain: boolean;
  isDesignatedWicketkeeper: boolean;
  bowlingPriority?: number | null;
  createdAt: Date;
  player: {
    id: string;
    fullName: string;
    displayName: string;
    primaryRole: string;
    battingHand: string;
    bowlingStyle: string;
    primaryNationality: string;
    historicalEra: string;
    isWicketkeeper: boolean;
    rating: {
      overall: number;
      batting: number;
      bowling: number;
      fielding: number;
      tier: string;
    };
  };
}

export interface DreamTeamResponse {
  id: string;
  userId: string;
  teamName: string;
  description?: string | null;
  status: DreamTeamStatus;
  badgeIcon: string;
  primaryColor: string;
  secondaryColor: string;
  formatCode: MatchFormat;
  overallStrengthRating: number;
  battingStrengthRating: number;
  bowlingStrengthRating: number;
  isValid: boolean;
  createdAt: Date;
  updatedAt: Date;
  players: EnrichedDreamTeamPlayer[];
  validation?: SquadValidationResult;
}

interface InMemSlot {
  id: string;
  playerId: string;
  battingOrder: number;
  isCaptain: boolean;
  isViceCaptain: boolean;
  isDesignatedWicketkeeper: boolean;
  bowlingPriority?: number | null;
  createdAt: Date;
}

interface InMemTeam {
  id: string;
  userId: string;
  teamName: string;
  description?: string | null;
  status: DreamTeamStatus;
  badgeIcon: string;
  primaryColor: string;
  secondaryColor: string;
  formatCode: MatchFormat;
  overallStrengthRating: number;
  battingStrengthRating: number;
  bowlingStrengthRating: number;
  isValid: boolean;
  createdAt: Date;
  updatedAt: Date;
  players: Map<string, InMemSlot>;
}

export const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';

@Injectable()
export class DreamTeamsService {
  private readonly logger = new Logger(DreamTeamsService.name);
  private inMemoryTeams: Map<string, InMemTeam> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly playersService: PlayersService
  ) {}

  /**
   * Helper to resolve player profile context for squad validator.
   */
  private async getSquadContextMap(
    playerIds: string[],
    format?: MatchFormat
  ): Promise<Map<string, PlayerSquadContext>> {
    const map = new Map<string, PlayerSquadContext>();
    for (const pid of playerIds) {
      try {
        const p: PlayerProfile = await this.playersService.getPlayerById(pid);
        map.set(pid, {
          id: p.id,
          fullName: p.fullName,
          displayName: p.displayName,
          primaryRole: p.primaryRole,
          battingHand: p.battingHand,
          bowlingStyle: p.bowlingStyle,
          isWicketkeeper: p.isWicketkeeper,
          formatRating: format ? p.ratings[format] : undefined,
          ratings: p.ratings,
        });
      } catch (err) {
        this.logger.debug(`Could not resolve profile for player ${pid}: ${err}`);
      }
    }
    return map;
  }

  /**
   * Calculates overall, batting, and bowling strength ratings.
   */
  private calculateStrengths(
    format: MatchFormat,
    lineup: DreamTeamPlayerSlotInput[],
    contextMap: Map<string, PlayerSquadContext>
  ): { overall: number; batting: number; bowling: number } {
    if (lineup.length === 0) {
      return { overall: 0, batting: 0, bowling: 0 };
    }

    let totalBatting = 0;
    let totalBowling = 0;
    let totalFielding = 0;
    let count = 0;

    const bowlingRatings: number[] = [];

    for (const slot of lineup) {
      const p = contextMap.get(slot.playerId);
      if (!p) continue;
      const fmtRating = p.formatRating ?? p.ratings?.[format];
      const bat = fmtRating?.battingRating ?? 50;
      const bowl = fmtRating?.bowlingRating ?? 50;
      const fld = fmtRating?.fieldingRating ?? 50;

      totalBatting += bat;
      totalFielding += fld;
      bowlingRatings.push(bowl);
      count++;
    }

    if (count === 0) return { overall: 0, batting: 0, bowling: 0 };

    bowlingRatings.sort((a, b) => b - a);
    const topBowlers = bowlingRatings.slice(0, Math.min(5, bowlingRatings.length));
    const avgBowling = topBowlers.reduce((acc, v) => acc + v, 0) / topBowlers.length;
    const avgBatting = totalBatting / count;
    const avgFielding = totalFielding / count;

    const overall = Math.round(avgBatting * 0.45 + avgBowling * 0.45 + avgFielding * 0.1);

    return {
      overall: Math.min(99, Math.max(1, overall)),
      batting: Math.min(99, Math.max(1, Math.round(avgBatting))),
      bowling: Math.min(99, Math.max(1, Math.round(avgBowling))),
    };
  }

  /**
   * Enriches an internal team with player details and squad validation results.
   */
  private async enrichTeam(team: InMemTeam): Promise<DreamTeamResponse> {
    const sortedSlots = Array.from(team.players.values()).sort(
      (a, b) => a.battingOrder - b.battingOrder
    );

    const playerIds = sortedSlots.map((s) => s.playerId);
    const contextMap = await this.getSquadContextMap(playerIds, team.formatCode);

    const enrichedPlayers: EnrichedDreamTeamPlayer[] = [];

    for (const slot of sortedSlots) {
      const profile = contextMap.get(slot.playerId);
      const fmtRating = profile?.formatRating ?? profile?.ratings?.[team.formatCode];

      enrichedPlayers.push({
        id: slot.id,
        dreamTeamId: team.id,
        playerId: slot.playerId,
        battingOrder: slot.battingOrder,
        isCaptain: slot.isCaptain,
        isViceCaptain: slot.isViceCaptain,
        isDesignatedWicketkeeper: slot.isDesignatedWicketkeeper,
        bowlingPriority: slot.bowlingPriority,
        createdAt: slot.createdAt,
        player: {
          id: slot.playerId,
          fullName: profile?.fullName ?? 'Unknown Player',
          displayName: profile?.displayName ?? 'Unknown',
          primaryRole: profile?.primaryRole ?? 'MIDDLE_ORDER_BATTER',
          battingHand: profile?.battingHand ?? 'RIGHT_HAND',
          bowlingStyle: profile?.bowlingStyle ?? 'NONE',
          primaryNationality: (profile as unknown as PlayerProfile)?.primaryNationality ?? 'Unknown',
          historicalEra: (profile as unknown as PlayerProfile)?.historicalEra ?? 'MODERN_ERA_2000_2019',
          isWicketkeeper: profile?.isWicketkeeper ?? false,
          rating: {
            overall: fmtRating?.overallRating ?? 50,
            batting: fmtRating?.battingRating ?? 50,
            bowling: fmtRating?.bowlingRating ?? 50,
            fielding: fmtRating?.fieldingRating ?? 50,
            tier: fmtRating?.confidenceTier ?? 'TIER_3_INFERRED',
          },
        },
      });
    }

    const validation = validateDreamTeamSquad(
      team.formatCode,
      sortedSlots,
      contextMap,
      { requireMatchReady: team.status === 'MATCH_READY' }
    );

    const strengths = this.calculateStrengths(team.formatCode, sortedSlots, contextMap);

    return {
      id: team.id,
      userId: team.userId,
      teamName: team.teamName,
      description: team.description,
      status: team.status,
      badgeIcon: team.badgeIcon,
      primaryColor: team.primaryColor,
      secondaryColor: team.secondaryColor,
      formatCode: team.formatCode,
      overallStrengthRating: strengths.overall,
      battingStrengthRating: strengths.batting,
      bowlingStrengthRating: strengths.bowling,
      isValid: validation.isMatchReady,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
      players: enrichedPlayers,
      validation,
    };
  }

  /**
   * CREATE: Creates a new dream team (draft or match ready).
   */
  async createTeam(
    userId: string,
    dto: CreateDreamTeamDto
  ): Promise<DreamTeamResponse> {
    const isMatchReady = dto.status === 'MATCH_READY';

    // 1. Validate DTO against Zod schema
    const schema = isMatchReady ? CreateDreamTeamSchema : SaveDreamTeamDraftSchema;
    const parseResult = schema.safeParse(dto);
    if (!parseResult.success) {
      throw new BadRequestException({
        message: 'Invalid dream team data',
        errors: parseResult.error.flatten(),
      });
    }

    const validData = parseResult.data;
    const teamId = randomUUID();
    const now = new Date();

    const team: InMemTeam = {
      id: teamId,
      userId: userId || DEFAULT_USER_ID,
      teamName: validData.teamName,
      description: validData.description ?? null,
      status: (validData.status as DreamTeamStatus) ?? 'DRAFT',
      badgeIcon: validData.badgeIcon ?? 'SHIELD_CLASSIC',
      primaryColor: validData.primaryColor ?? '#0D4A38',
      secondaryColor: validData.secondaryColor ?? '#D4AF37',
      formatCode: validData.format as MatchFormat,
      overallStrengthRating: 0,
      battingStrengthRating: 0,
      bowlingStrengthRating: 0,
      isValid: false,
      createdAt: now,
      updatedAt: now,
      players: new Map(),
    };

    if (validData.lineup && validData.lineup.length > 0) {
      for (const slot of validData.lineup) {
        team.players.set(slot.playerId, {
          id: randomUUID(),
          playerId: slot.playerId,
          battingOrder: slot.battingOrder,
          isCaptain: slot.isCaptain ?? false,
          isViceCaptain: slot.isViceCaptain ?? false,
          isDesignatedWicketkeeper: slot.isDesignatedWicketkeeper ?? false,
          bowlingPriority: slot.bowlingPriority ?? null,
          createdAt: now,
        });
      }
    }

    this.inMemoryTeams.set(teamId, team);
    this.logger.log(`Created dream team '${team.teamName}' [${teamId}] for user ${userId}`);

    return this.enrichTeam(team);
  }

  /**
   * LIST: Lists all dream teams belonging to the user.
   */
  async listTeams(userId: string): Promise<DreamTeamResponse[]> {
    const uid = userId || DEFAULT_USER_ID;
    const teams = Array.from(this.inMemoryTeams.values()).filter((t) => t.userId === uid);
    teams.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    const result: DreamTeamResponse[] = [];
    for (const t of teams) {
      result.push(await this.enrichTeam(t));
    }
    return result;
  }

  /**
   * GET: Retrieves a dream team by ID with ownership check.
   */
  async getTeamById(userId: string, teamId: string): Promise<DreamTeamResponse> {
    const uid = userId || DEFAULT_USER_ID;
    const team = this.inMemoryTeams.get(teamId);
    if (!team) {
      throw new NotFoundException(`Dream team with ID '${teamId}' was not found`);
    }
    if (team.userId !== uid) {
      throw new ForbiddenException('You do not have permission to access this dream team');
    }

    return this.enrichTeam(team);
  }

  /**
   * UPDATE: Updates dream team metadata.
   */
  async updateTeam(
    userId: string,
    teamId: string,
    dto: UpdateDreamTeamDto
  ): Promise<DreamTeamResponse> {
    const uid = userId || DEFAULT_USER_ID;
    const team = this.inMemoryTeams.get(teamId);
    if (!team) {
      throw new NotFoundException(`Dream team with ID '${teamId}' was not found`);
    }
    if (team.userId !== uid) {
      throw new ForbiddenException('You do not have permission to update this dream team');
    }

    const parseResult = UpdateDreamTeamSchema.safeParse(dto);
    if (!parseResult.success) {
      throw new BadRequestException({
        message: 'Invalid update parameters',
        errors: parseResult.error.flatten(),
      });
    }

    const data = parseResult.data;
    if (data.teamName !== undefined) team.teamName = data.teamName;
    if (data.description !== undefined) team.description = data.description;
    if (data.badgeIcon !== undefined) team.badgeIcon = data.badgeIcon;
    if (data.primaryColor !== undefined) team.primaryColor = data.primaryColor;
    if (data.secondaryColor !== undefined) team.secondaryColor = data.secondaryColor;
    if (data.format !== undefined) team.formatCode = data.format as MatchFormat;

    if (data.status !== undefined) {
      if (data.status === 'MATCH_READY') {
        const slots = Array.from(team.players.values()).sort((a, b) => a.battingOrder - b.battingOrder);
        const targetFormat = (data.format as MatchFormat) ?? team.formatCode;
        const contextMap = await this.getSquadContextMap(slots.map((s) => s.playerId), targetFormat);
        const validation = validateDreamTeamSquad(
          targetFormat,
          slots,
          contextMap,
          { requireMatchReady: true }
        );
        if (!validation.isMatchReady) {
          throw new BadRequestException({
            message: 'Cannot mark team as MATCH_READY: squad has validation errors',
            validation,
          });
        }
      }
      team.status = data.status;
    }

    team.updatedAt = new Date();
    return this.enrichTeam(team);
  }

  /**
   * DELETE: Deletes a dream team.
   */
  async deleteTeam(
    userId: string,
    teamId: string
  ): Promise<{ success: boolean; deletedId: string }> {
    const uid = userId || DEFAULT_USER_ID;
    const team = this.inMemoryTeams.get(teamId);
    if (!team) {
      throw new NotFoundException(`Dream team with ID '${teamId}' was not found`);
    }
    if (team.userId !== uid) {
      throw new ForbiddenException('You do not have permission to delete this dream team');
    }

    this.inMemoryTeams.delete(teamId);
    this.logger.log(`Deleted dream team ${teamId}`);
    return { success: true, deletedId: teamId };
  }

  /**
   * DUPLICATE: Creates a deep clone of the dream team with new UUIDs and '(Copy)' name.
   */
  async duplicateTeam(
    userId: string,
    teamId: string
  ): Promise<DreamTeamResponse> {
    const uid = userId || DEFAULT_USER_ID;
    const source = this.inMemoryTeams.get(teamId);
    if (!source) {
      throw new NotFoundException(`Dream team with ID '${teamId}' was not found`);
    }
    if (source.userId !== uid) {
      throw new ForbiddenException('You do not have permission to duplicate this dream team');
    }

    const newTeamId = randomUUID();
    const now = new Date();

    const clonedTeam: InMemTeam = {
      id: newTeamId,
      userId: uid,
      teamName: `${source.teamName} (Copy)`.slice(0, 64),
      description: source.description,
      status: 'DRAFT',
      badgeIcon: source.badgeIcon,
      primaryColor: source.primaryColor,
      secondaryColor: source.secondaryColor,
      formatCode: source.formatCode,
      overallStrengthRating: source.overallStrengthRating,
      battingStrengthRating: source.battingStrengthRating,
      bowlingStrengthRating: source.bowlingStrengthRating,
      isValid: false,
      createdAt: now,
      updatedAt: now,
      players: new Map(),
    };

    for (const [pid, slot] of source.players) {
      clonedTeam.players.set(pid, {
        ...slot,
        id: randomUUID(),
        createdAt: now,
      });
    }

    this.inMemoryTeams.set(newTeamId, clonedTeam);
    return this.enrichTeam(clonedTeam);
  }

  /**
   * VALIDATE: Validates the team's current lineup and returns structured errors & warnings.
   */
  async validateTeam(
    userId: string,
    teamId: string
  ): Promise<SquadValidationResult> {
    const team = await this.getTeamById(userId, teamId);
    return team.validation!;
  }

  /**
   * ADD/UPDATE SLOT: Adds or updates a player slot in the lineup.
   */
  async addOrUpdatePlayerSlot(
    userId: string,
    teamId: string,
    slotDto: DreamTeamPlayerSlotDto
  ): Promise<DreamTeamResponse> {
    const uid = userId || DEFAULT_USER_ID;
    const team = this.inMemoryTeams.get(teamId);
    if (!team) {
      throw new NotFoundException(`Dream team with ID '${teamId}' was not found`);
    }
    if (team.userId !== uid) {
      throw new ForbiddenException('You do not have permission to modify this dream team');
    }

    const parseResult = DreamTeamPlayerSlotSchema.safeParse(slotDto);
    if (!parseResult.success) {
      throw new BadRequestException({
        message: 'Invalid player slot data',
        errors: parseResult.error.flatten(),
      });
    }

    const data = parseResult.data;

    // Check player exists
    await this.playersService.getPlayerById(data.playerId);

    // If squad already has 11 players and this is a NEW player, reject
    if (team.players.size >= 11 && !team.players.has(data.playerId)) {
      throw new BadRequestException('Squad cannot exceed 11 players. Remove a player first.');
    }

    // Check if battingOrder is occupied by someone else; if so, swap or replace
    for (const [existingPid, existingSlot] of team.players.entries()) {
      if (existingSlot.battingOrder === data.battingOrder && existingPid !== data.playerId) {
        // Find first free slot or swap
        const freeOrder = this.findFirstAvailableBattingOrder(team);
        if (freeOrder) {
          existingSlot.battingOrder = freeOrder;
        } else {
          // Replace
          team.players.delete(existingPid);
        }
      }
    }

    const existingSlot = team.players.get(data.playerId);
    team.players.set(data.playerId, {
      id: existingSlot?.id ?? randomUUID(),
      playerId: data.playerId,
      battingOrder: data.battingOrder,
      isCaptain: data.isCaptain ?? existingSlot?.isCaptain ?? false,
      isViceCaptain: data.isViceCaptain ?? existingSlot?.isViceCaptain ?? false,
      isDesignatedWicketkeeper:
        data.isDesignatedWicketkeeper ?? existingSlot?.isDesignatedWicketkeeper ?? false,
      bowlingPriority:
        data.bowlingPriority !== undefined
          ? data.bowlingPriority
          : existingSlot?.bowlingPriority ?? null,
      createdAt: existingSlot?.createdAt ?? new Date(),
    });

    team.updatedAt = new Date();
    return this.enrichTeam(team);
  }

  /**
   * REMOVE SLOT: Removes a player from the dream team.
   */
  async removePlayerSlot(
    userId: string,
    teamId: string,
    playerId: string
  ): Promise<DreamTeamResponse> {
    const uid = userId || DEFAULT_USER_ID;
    const team = this.inMemoryTeams.get(teamId);
    if (!team) {
      throw new NotFoundException(`Dream team with ID '${teamId}' was not found`);
    }
    if (team.userId !== uid) {
      throw new ForbiddenException('You do not have permission to modify this dream team');
    }

    if (!team.players.has(playerId)) {
      throw new NotFoundException(`Player '${playerId}' is not in this dream team`);
    }

    team.players.delete(playerId);

    // Automatically set status to DRAFT and isValid to false if squad < 11
    if (team.players.size < 11) {
      team.status = 'DRAFT';
      team.isValid = false;
    }

    team.updatedAt = new Date();
    return this.enrichTeam(team);
  }

  /**
   * REORDER: Atomically updates batting order positions for players in the team.
   */
  async reorderBattingOrder(
    userId: string,
    teamId: string,
    dto: ReorderBattingOrderDto
  ): Promise<DreamTeamResponse> {
    const uid = userId || DEFAULT_USER_ID;
    const team = this.inMemoryTeams.get(teamId);
    if (!team) {
      throw new NotFoundException(`Dream team with ID '${teamId}' was not found`);
    }
    if (team.userId !== uid) {
      throw new ForbiddenException('You do not have permission to modify this dream team');
    }

    const parseResult = ReorderBattingOrderSchema.safeParse(dto);
    if (!parseResult.success) {
      throw new BadRequestException({
        message: 'Invalid batting order reordering data',
        errors: parseResult.error.flatten(),
      });
    }

    // Verify all players belong to this team
    for (const item of dto.orders) {
      if (!team.players.has(item.playerId)) {
        throw new BadRequestException(
          `Player '${item.playerId}' does not belong to this dream team`
        );
      }
    }

    // Check uniqueness of new batting orders
    const ordersSet = new Set(dto.orders.map((o) => o.battingOrder));
    if (ordersSet.size !== dto.orders.length) {
      throw new BadRequestException('Target batting orders must be unique');
    }

    // Apply updates
    for (const item of dto.orders) {
      const slot = team.players.get(item.playerId)!;
      slot.battingOrder = item.battingOrder;
    }

    team.updatedAt = new Date();
    return this.enrichTeam(team);
  }

  private findFirstAvailableBattingOrder(team: InMemTeam): number | null {
    const occupied = new Set(Array.from(team.players.values()).map((s) => s.battingOrder));
    for (let i = 1; i <= 11; i++) {
      if (!occupied.has(i)) return i;
    }
    return null;
  }
}

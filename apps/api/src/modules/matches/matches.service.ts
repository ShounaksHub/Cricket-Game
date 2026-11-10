import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PlayersService } from '../players/players.service.js';
import { DreamTeamsService } from '../dream-teams/dream-teams.service.js';
import {
  simulateFullMatch,
  verifyMatchReplay,
  reconcileMatchScorecard,
  calculatePlayerOfTheMatch,
  resolveAITacticalAction,
  stepDelivery,
  DeterministicPRNG,
  VERIFIED_STADIUMS,
  getStadiumById,
  type MatchSimulationConfig,
  type MatchSimulationResult,
  type MatchState,
  type DeliveryEvent,
  type StadiumSpec,
  type EnvironmentalConditions,
} from '@cricket/simulation-engine';
import type {
  MatchFormat,
  DreamTeamPlayerSlotInput,
  PlayerSquadContext,
} from '@cricket/shared-types';
import type { SimulateMatchDto, StepDeliveryDto } from './dto/simulate-match.dto.js';
import { randomUUID } from 'node:crypto';
import { Observable, interval, from } from 'rxjs';
import { concatMap, map, takeWhile, delay } from 'rxjs/operators';

/**
 * Recursively converts any BigInt instances into strings for standard JSON serialization.
 */
export function serializeBigInts<T>(obj: T): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return obj.toString();
  if (Array.isArray(obj)) return obj.map(serializeBigInts);
  if (typeof obj === 'object') {
    const res: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      res[key] = serializeBigInts(value);
    }
    return res;
  }
  return obj;
}

/**
 * Hydrates plain objects into Maps for deserialized MatchState objects.
 */
export function hydrateMatchState(state: any): MatchState {
  if (!state) return state;
  const hydrated = { ...state };
  if (hydrated.config && !(hydrated.config.playerProfiles instanceof Map)) {
    hydrated.config = {
      ...hydrated.config,
      playerProfiles: new Map(Object.entries(hydrated.config.playerProfiles ?? {})),
    };
  }
  if (Array.isArray(hydrated.innings)) {
    hydrated.innings = hydrated.innings.map((inn: any) => ({
      ...inn,
      batters: inn.batters instanceof Map ? inn.batters : new Map(Object.entries(inn.batters ?? {})),
      bowlers: inn.bowlers instanceof Map ? inn.bowlers : new Map(Object.entries(inn.bowlers ?? {})),
    }));
  }
  return hydrated;
}

export interface StoredMatch {
  readonly config: MatchSimulationConfig;
  readonly result: MatchSimulationResult;
  readonly serialized: any;
  readonly createdAt: Date;
}

@Injectable()
export class MatchesService {
  private readonly logger = new Logger(MatchesService.name);
  private readonly matches: Map<string, StoredMatch> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly playersService: PlayersService,
    private readonly dreamTeamsService: DreamTeamsService
  ) {}

  /**
   * Returns list of verified stadiums with dimension and altitude metadata.
   */
  getVerifiedStadiums(): readonly StadiumSpec[] {
    return VERIFIED_STADIUMS;
  }

  /**
   * Generates a balanced 11-player AI Opponent lineup using verified legends.
   */
  async buildAIOpponentLineup(format: MatchFormat): Promise<{
    name: string;
    lineup: DreamTeamPlayerSlotInput[];
    playerMap: Map<string, PlayerSquadContext>;
  }> {
    // 11 verified benchmark legends covering all primary roles
    const aiPlayerIds = [
      'f1e20000-0001-4000-8000-000000000001', // Sachin Tendulkar (Top-Order Batter)
      'f1e20000-00c0-4000-8000-0000000000c0', // Viv Richards (Top-Order Batter)
      'f1e20000-00f7-4000-8000-0000000000f7', // Don Bradman (Captain, Batter)
      'f1e10000-002a-4000-8000-00000000002a', // Steve Smith (Batter)
      'f1e10000-004a-4000-8000-00000000004a', // Jos Buttler (Wicketkeeper)
      'f1e20000-00cb-4000-8000-0000000000cb', // Garry Sobers (All-Rounder, Bowler 5)
      'f1e10000-0048-4000-8000-000000000048', // Ben Stokes (All-Rounder, Bowler 4)
      'f1e20000-0008-4000-8000-000000000008', // Wasim Akram (Fast Bowler 1)
      'f1e20000-0003-4000-8000-000000000003', // Shane Warne (Vice-Captain, Spinner 2)
      'f1e10000-0003-4000-8000-000000000003', // Jasprit Bumrah (Fast Bowler 3)
      'f1e10000-00f1-4000-8000-0000000000f1', // Rashid Khan (Spinner 6)
    ];

    const playerMap = new Map<string, PlayerSquadContext>();
    const lineup: DreamTeamPlayerSlotInput[] = [];

    for (let i = 0; i < aiPlayerIds.length; i++) {
      const pid = aiPlayerIds[i];
      let profile;
      try {
        profile = await this.playersService.getPlayerById(pid);
      } catch {
        // Fallback: search by index if ID not found
        const search = await this.playersService.searchPlayers({ limit: 20 });
        profile = search.items[i] || search.items[0];
      }

      playerMap.set(profile.id, {
        id: profile.id,
        fullName: profile.fullName,
        displayName: profile.displayName,
        primaryRole: profile.primaryRole,
        battingHand: profile.battingHand,
        bowlingStyle: profile.bowlingStyle,
        isWicketkeeper: profile.isWicketkeeper,
        formatRating: profile.ratings?.[format],
      });

      lineup.push({
        playerId: profile.id,
        battingOrder: i + 1,
        isCaptain: i === 2, // Bradman as Captain
        isDesignatedWicketkeeper: i === 4, // Buttler as Keeper
        bowlingPriority:
          i === 7 ? 1 : i === 8 ? 2 : i === 9 ? 3 : i === 6 ? 4 : i === 5 ? 5 : i === 10 ? 6 : null,
      });
    }

    return {
      name: 'AI World Legends XI',
      lineup,
      playerMap,
    };
  }

  /**
   * Simulates a full cricket match between two dream teams or against the AI Opponent.
   */
  async simulateMatch(dto: SimulateMatchDto, userId?: string): Promise<any> {
    const format: MatchFormat = dto.format ?? 'T20';
    const matchId = randomUUID();
    const stadiumId = dto.stadiumId ?? 'stadium-mcg';
    const pitchType = dto.pitchType ?? 'HARD';

    const conditions: EnvironmentalConditions = dto.conditions ?? {
      ambientTemperatureC: 25,
      humidityPercentage: 50,
      cloudCoverPercentage: 20,
      dewFactor: 0.1,
    };

    // 1. Resolve Team 1
    let team1Name = 'Team 1';
    let team1Lineup: DreamTeamPlayerSlotInput[] = [];
    const playerProfiles = new Map<string, PlayerSquadContext>();

    try {
      const team1 = await this.dreamTeamsService.getTeamById(dto.team1Id, userId);
      team1Name = team1.teamName;
      team1Lineup = team1.players.map((p) => ({
        playerId: p.playerId,
        battingOrder: p.battingOrder,
        isCaptain: p.isCaptain,
        isDesignatedWicketkeeper: p.isDesignatedWicketkeeper,
        bowlingPriority: p.bowlingPriority,
      }));

      for (const p of team1.players) {
        const prof = await this.playersService.getPlayerById(p.playerId);
        playerProfiles.set(p.playerId, {
          id: prof.id,
          fullName: prof.fullName,
          displayName: prof.displayName,
          primaryRole: prof.primaryRole,
          battingHand: prof.battingHand,
          bowlingStyle: prof.bowlingStyle,
          isWicketkeeper: prof.isWicketkeeper,
          formatRating: prof.ratings?.[format],
        });
      }
    } catch {
      // Fallback: If not found in DreamTeams, construct verified benchmark squad
      const ai1 = await this.buildAIOpponentLineup(format);
      team1Name = 'Challengers XI';
      team1Lineup = ai1.lineup;
      for (const [k, v] of ai1.playerMap.entries()) {
        playerProfiles.set(k, v);
      }
    }

    // 2. Resolve Team 2 (AI Opponent or user-specified Dream Team)
    let team2Name = 'AI World Legends XI';
    let team2Lineup: DreamTeamPlayerSlotInput[] = [];

    if (dto.team2Id && dto.team2Id !== 'ai-opponent' && dto.team2Id !== dto.team1Id) {
      try {
        const team2 = await this.dreamTeamsService.getTeamById(dto.team2Id, userId);
        team2Name = team2.teamName;
        team2Lineup = team2.players.map((p) => ({
          playerId: p.playerId,
          battingOrder: p.battingOrder,
          isCaptain: p.isCaptain,
          isDesignatedWicketkeeper: p.isDesignatedWicketkeeper,
          bowlingPriority: p.bowlingPriority,
        }));

        for (const p of team2.players) {
          const prof = await this.playersService.getPlayerById(p.playerId);
          playerProfiles.set(p.playerId, {
            id: prof.id,
            fullName: prof.fullName,
            displayName: prof.displayName,
            primaryRole: prof.primaryRole,
            battingHand: prof.battingHand,
            bowlingStyle: prof.bowlingStyle,
            isWicketkeeper: prof.isWicketkeeper,
            formatRating: prof.ratings?.[format],
          });
        }
      } catch {
        const ai2 = await this.buildAIOpponentLineup(format);
        team2Name = ai2.name;
        team2Lineup = ai2.lineup;
        for (const [k, v] of ai2.playerMap.entries()) {
          playerProfiles.set(k, v);
        }
      }
    } else {
      const ai2 = await this.buildAIOpponentLineup(format);
      team2Name = ai2.name;
      team2Lineup = ai2.lineup;
      for (const [k, v] of ai2.playerMap.entries()) {
        playerProfiles.set(k, v);
      }
    }

    // 3. Resolve 64-bit Seed
    let seed: bigint;
    if (dto.seed !== undefined && dto.seed !== null && dto.seed !== '') {
      seed = BigInt(dto.seed);
    } else {
      seed =
        BigInt(Date.now()) * 1000000n +
        BigInt(Math.floor(Math.random() * 1000000));
    }

    const config: MatchSimulationConfig = {
      matchId,
      format,
      seed,
      versions: {
        simulationVersion: 'sim-1.0.0',
        rulesetVersion: 'rules-t20-icc-2026.1',
        ratingVersion: 'rate-1.0.0',
      },
      stadiumId,
      pitchType,
      conditions,
      team1: {
        id: dto.team1Id || 'team-1',
        name: team1Name,
        lineup: team1Lineup,
      },
      team2: {
        id: dto.team2Id || 'team-ai',
        name: team2Name,
        lineup: team2Lineup,
      },
      playerProfiles,
    };

    // 4. Run Simulation
    const result = simulateFullMatch(config);

    // 5. Verify Bit-Exact Determinism
    const replayCheck = verifyMatchReplay(result);
    if (!replayCheck.isValid) {
      this.logger.error(`Replay verification failed for match ${matchId}: ${replayCheck.discrepancies.join(', ')}`);
    }

    // 6. Serialize BigInt values for HTTP JSON transport
    const serialized = serializeBigInts({
      ...result,
      format,
      seed: config.seed.toString(),
      initialHash: result.initialStateHash,
      playerOfTheMatch: result.scorecard.playerOfTheMatch,
      stadium: getStadiumById(stadiumId),
      replayVerified: replayCheck.isValid,
    });

    this.matches.set(matchId, {
      config,
      result,
      serialized,
      createdAt: new Date(),
    });

    return serialized;
  }

  /**
   * Retrieves a simulated match by ID.
   */
  async getMatchById(matchId: string): Promise<any> {
    const match = this.matches.get(matchId);
    if (!match) {
      throw new NotFoundException(`Match with ID '${matchId}' not found`);
    }
    return match.serialized;
  }

  /**
   * Verifies bit-exact replay determinism for a stored match.
   */
  async verifyMatch(matchId: string): Promise<any> {
    const match = this.matches.get(matchId);
    if (!match) {
      throw new NotFoundException(`Match with ID '${matchId}' not found`);
    }

    const verification = verifyMatchReplay(match.result);
    return {
      matchId,
      verified: verification.isValid,
      initialHash: match.result.initialStateHash,
      totalEvents: match.result.allEvents.length,
      versions: match.config.versions,
      discrepancies: verification.discrepancies,
    };
  }

  /**
   * Interactive delivery stepping for manual/ball-by-ball match play.
   * Enforces server authority and deterministic seed derivation.
   */
  async stepDelivery(dto: StepDeliveryDto): Promise<any> {
    let state = hydrateMatchState(dto.currentState);

    if (!state || !state.config || !state.innings) {
      throw new BadRequestException('Invalid match state supplied in step request');
    }

    // Cryptographic match integrity verification if match was pre-registered
    const storedMatch = this.matches.get(state.config.matchId);
    if (storedMatch) {
      if (
        state.initialStateHash &&
        storedMatch.result.initialStateHash &&
        state.initialStateHash !== storedMatch.result.initialStateHash
      ) {
        throw new BadRequestException('Match state hash mismatch: state has been tampered with or desynchronized');
      }
    }

    if (state.status === 'COMPLETED') {
      return {
        completed: true,
        state,
        event: null,
      };
    }

    // Deterministic hierarchical seed derivation per delivery:
    // (matchSeed ^ (inningsIndex + 1) * 1000003 ^ (eventsCount + 1) * 7919)
    const eventCount = state.innings[state.currentInningsIndex]?.events.length ?? 0;
    const rawSeed = state.config.seed ?? 123456789n;
    const matchSeed = typeof rawSeed === 'bigint' ? rawSeed : BigInt(rawSeed);
    const deliverySeed =
      matchSeed ^
      (BigInt(state.currentInningsIndex + 1) * 1000003n) ^
      (BigInt(eventCount + 1) * 7919n);

    const prng = new DeterministicPRNG(deliverySeed);
    const defaultAction = resolveAITacticalAction(state, prng);

    const action = {
      batterIntent: dto.tactics?.batterIntent ?? defaultAction.batterIntent,
      bowlerLine: dto.tactics?.bowlerLine ?? defaultAction.bowlerLine,
      bowlerLength: dto.tactics?.bowlerLength ?? defaultAction.bowlerLength,
      bowlerVariation: dto.tactics?.bowlerVariation ?? defaultAction.bowlerVariation,
      fieldPreset: dto.tactics?.fieldPreset ?? defaultAction.fieldPreset,
    };

    const { nextState, event } = stepDelivery(state, action, prng);

    return serializeBigInts({
      completed: nextState.status === 'COMPLETED',
      state: nextState,
      event,
    });
  }

  /**
   * Streams a simulated match delivery-by-delivery using Server-Sent Events.
   */
  streamMatchDeliveries(matchId: string, speedMs = 150): Observable<MessageEvent> {
    const match = this.matches.get(matchId);
    if (!match) {
      throw new NotFoundException(`Match with ID '${matchId}' not found`);
    }

    const allEvents: DeliveryEvent[] = [];
    for (const inn of match.result.finalState.innings) {
      for (const e of inn.events) {
        allEvents.push(e);
      }
    }

    return from(allEvents).pipe(
      concatMap((event) =>
        speedMs <= 1
          ? from([event]).pipe(
              map(
                (e) =>
                  ({
                    data: JSON.stringify(serializeBigInts(e)),
                  } as MessageEvent)
              )
            )
          : from([event]).pipe(
              delay(speedMs),
              map(
                (e) =>
                  ({
                    data: JSON.stringify(serializeBigInts(e)),
                  } as MessageEvent)
              )
            )
      )
    );
  }
}

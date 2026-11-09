import { describe, expect, it, beforeEach } from 'vitest';
import { MatchesService } from '../src/modules/matches/matches.service.js';
import { MatchesController } from '../src/modules/matches/matches.controller.js';
import { DreamTeamsService, DEFAULT_USER_ID } from '../src/modules/dream-teams/dream-teams.service.js';
import { PlayersService } from '../src/modules/players/players.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { firstValueFrom, toArray } from 'rxjs';

describe('Matches Simulation Module (API)', () => {
  let matchesService: MatchesService;
  let matchesController: MatchesController;
  let dreamTeamsService: DreamTeamsService;
  let playersService: PlayersService;
  let createdTeamId: string;

  beforeEach(async () => {
    const mockPrisma = {
      dreamTeam: {
        findMany: () => Promise.resolve([]),
        findUnique: () => Promise.resolve(null),
      },
    } as unknown as PrismaService;

    playersService = new PlayersService(mockPrisma);
    dreamTeamsService = new DreamTeamsService(mockPrisma, playersService);
    matchesService = new MatchesService(mockPrisma, playersService, dreamTeamsService);
    matchesController = new MatchesController(matchesService);

    // Create a valid user dream team
    const playersResult = await playersService.searchPlayers({ limit: 15 });
    const lineup = playersResult.items.slice(0, 11).map((p, idx) => ({
      playerId: p.id,
      battingOrder: idx + 1,
      isCaptain: idx === 0,
      isViceCaptain: idx === 1,
      isDesignatedWicketkeeper: idx === 4,
      bowlingPriority: idx >= 6 ? idx - 5 : null,
    }));

    const team = await dreamTeamsService.createTeam(DEFAULT_USER_ID, {
      teamName: 'Royal Challengers Bangalore XI',
      description: 'Challengers dream squad',
      format: 'T20',
      badgeIcon: 'LION_CREST',
      primaryColor: '#EC1C24',
      secondaryColor: '#000000',
      status: 'MATCH_READY',
      lineup,
    });

    createdTeamId = team.id;
  });

  describe('GET /matches/stadiums', () => {
    it('returns the list of verified real-world stadiums with boundary and altitude metadata', () => {
      const stadiums = matchesController.getStadiums();
      expect(stadiums.length).toBeGreaterThanOrEqual(5);

      const mcg = stadiums.find((s) => s.id === 'stadium-mcg');
      expect(mcg).toBeDefined();
      expect(mcg?.name).toBe('Melbourne Cricket Ground');
      expect(mcg?.averageBoundaryRadiusMeters).toBe(82);

      const chinnaswamy = stadiums.find((s) => s.id === 'stadium-chinnaswamy');
      expect(chinnaswamy).toBeDefined();
      expect(chinnaswamy?.averageBoundaryRadiusMeters).toBe(62);
      expect(chinnaswamy?.altitudeMeters).toBe(920);
    });
  });

  describe('POST /matches/simulate', () => {
    it('simulates a full T20 match between user dream team and AI World Legends XI', async () => {
      const result = await matchesController.simulateMatch({
        team1Id: createdTeamId,
        team2Id: 'ai-opponent',
        format: 'T20',
        stadiumId: 'stadium-wankhede',
        pitchType: 'FLAT',
        seed: '12345678901234',
        conditions: {
          ambientTemperatureC: 28,
          humidityPercentage: 65,
          cloudCoverPercentage: 15,
          dewFactor: 0.3,
        },
      });

      expect(result.matchId).toBeDefined();
      expect(result.format).toBe('T20');
      expect(result.seed).toBe('12345678901234');
      expect(result.initialHash).toBeDefined();
      expect(typeof result.initialHash).toBe('string');
      expect(result.replayVerified).toBe(true);

      // Verify final state
      expect(result.finalState.status).toBe('COMPLETED');
      expect(result.finalState.innings.length).toBe(2);
      expect(result.finalState.innings[0].totalRuns).toBeGreaterThan(0);
      expect(result.finalState.innings[1].totalRuns).toBeGreaterThan(0);

      // Verify reconciled scorecards
      expect(result.scorecard).toBeDefined();
      expect(result.scorecard.innings.length).toBe(2);
      expect(result.scorecard.innings[0].batters.length).toBeGreaterThan(0);
      expect(result.scorecard.innings[0].bowlers.length).toBeGreaterThan(0);

      // Verify Player of the Match
      expect(result.playerOfTheMatch).toBeDefined();
      expect(result.playerOfTheMatch.playerId).toBeDefined();
      expect(result.playerOfTheMatch.impactPoints).toBeGreaterThan(0);
    });

    it('simulates a match using purely auto-generated benchmark teams if team1 is not in DB', async () => {
      const result = await matchesController.simulateMatch({
        team1Id: 'non-existent-team',
        team2Id: 'ai-opponent',
        format: 'T20',
        stadiumId: 'stadium-eden',
        pitchType: 'TURNING',
      });

      expect(result.matchId).toBeDefined();
      expect(result.finalState.status).toBe('COMPLETED');
      expect(result.replayVerified).toBe(true);
    });
  });

  describe('GET /matches/:id & GET /matches/:id/verify', () => {
    it('retrieves stored match and validates 100% bit-exact replay reproducibility', async () => {
      const sim = await matchesController.simulateMatch({
        team1Id: createdTeamId,
        format: 'T20',
        seed: '998877665544',
      });

      const retrieved = await matchesController.getMatchById(sim.matchId);
      expect(retrieved.matchId).toBe(sim.matchId);
      expect(retrieved.seed).toBe('998877665544');

      const verification = await matchesController.verifyMatch(sim.matchId);
      expect(verification.matchId).toBe(sim.matchId);
      expect(verification.verified).toBe(true);
      expect(verification.initialHash).toBe(sim.initialHash);
      expect(verification.totalEvents).toBeGreaterThan(120);
    });
  });

  describe('POST /matches/step (Interactive Delivery Stepping)', () => {
    it('steps through a delivery interactively advancing match state', async () => {
      // Simulate partial match to get initial state
      const sim = await matchesController.simulateMatch({
        team1Id: createdTeamId,
        format: 'T20',
        seed: '55555',
      });

      // Construct a fresh live match state
      const stepResult = await matchesController.stepDelivery({
        matchId: 'live-interactive-match-1',
        format: 'T20',
        stadiumId: 'stadium-mcg',
        pitchType: 'HARD',
        currentState: {
          ...sim.finalState,
          status: 'IN_PROGRESS',
          currentInningsIndex: 0,
          innings: [
            {
              ...sim.finalState.innings[0],
              isCompleted: false,
              completedOvers: 2,
              legalBallsInCurrentOver: 3,
              events: sim.finalState.innings[0].events.slice(0, 15),
            },
          ],
        },
        tactics: {
          batterIntent: 'AGGRESSIVE',
          bowlerLength: 'GOOD_LENGTH',
          bowlerLine: 'OUTSIDE_OFF',
        },
      });

      expect(stepResult.state).toBeDefined();
      expect(stepResult.event).toBeDefined();
      expect(stepResult.event.outcome).toBeDefined();
    });
  });

  describe('GET /matches/:id/stream (Server-Sent Events Delivery Streaming)', () => {
    it('streams match delivery events sequentially via observable', async () => {
      const sim = await matchesController.simulateMatch({
        team1Id: createdTeamId,
        format: 'T20',
        seed: '33333',
      });

      const stream$ = matchesController.streamMatch(sim.matchId, 'instant');
      const messages = await firstValueFrom(stream$.pipe(toArray()));

      expect(messages.length).toBeGreaterThan(100);
      const firstEvent = JSON.parse(messages[0].data);
      expect(firstEvent.sequenceNumber).toBe(1);
      expect(firstEvent.outcome).toBeDefined();
    });
  });
});

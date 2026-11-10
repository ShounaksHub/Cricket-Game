import { describe, expect, it } from 'vitest';
import {
  createInitialMatchState,
  getRulesetForFormat,
  reconcileMatchScorecard,
  resolveAITacticalAction,
  simulateFullMatch,
  stepDelivery,
  DeterministicPRNG,
  type MatchFormat,
  type MatchSimulationConfig,
  type TacticalDeliveryAction,
} from '../src/index.js';

const formats: MatchFormat[] = ['T10', 'T20', 'ODI', 'TEST_RED_BALL', 'TEST_PINK_BALL'];

function makeConfig(format: MatchFormat, matchId = `phase-9-8-${format}`): MatchSimulationConfig {
  const lineup = (prefix: string) => Array.from({ length: 11 }, (_, index) => ({
    playerId: `${prefix}-${index + 1}`,
    battingOrder: index + 1,
    isCaptain: index === 0,
    isDesignatedWicketkeeper: index === 1,
    bowlingPriority: index >= 6 ? index - 5 : null,
  }));
  return {
    matchId,
    format,
    seed: 9082026n,
    versions: { simulationVersion: 'sim-1.0.0', rulesetVersion: getRulesetForFormat(format).rulesetVersion, ratingVersion: 'rate-1.0.0' },
    stadiumId: 'stadium-eden',
    pitchType: 'FLAT',
    conditions: { ambientTemperatureC: 25, humidityPercentage: 50, cloudCoverPercentage: 10, dewFactor: 0 },
    team1: { id: 'user-team', name: 'User XI', lineup: lineup('user') },
    team2: { id: 'ai-team', name: 'AI XI', lineup: lineup('ai') },
    playerProfiles: new Map(),
  };
}

const manualAction: TacticalDeliveryAction = {
  batterIntent: 'BALANCED',
  bowlerLine: 'OUTSIDE_OFF',
  bowlerLength: 'GOOD_LENGTH',
  bowlerVariation: 'STOCK',
  fieldPreset: 'BALANCED_RING',
  bowlingPaceStrategy: 'CONTROLLED',
  bowlingIntent: 'BALANCED',
  bowlingPlan: 'BALANCED',
  activePhase: 'POWERPLAY',
  actionId: 'manual-1',
};

describe('Phase 9.8 readiness checks', () => {
  it('completes all five formats from initialized toss outcome to result', () => {
    for (const format of formats) {
      const result = simulateFullMatch(makeConfig(format));
      expect(result.matchId).toBe(`phase-9-8-${format}`);
      expect(result.finalState.status).toBe('COMPLETED');
      expect(result.scorecard.innings.length).toBeGreaterThanOrEqual(format.startsWith('TEST') ? 2 : 1);
      expect(result.finalState.config.team1.name).toBe('User XI');
      expect(result.finalState.config.team2.name).toBe('AI XI');
    }
  }, 30_000);

  it('keeps identity and scores consistent across live state, result and serialized history', () => {
    const result = simulateFullMatch(makeConfig('T20', 'identity-check'));
    const liveScorecard = reconcileMatchScorecard(result.finalState);
    const history = JSON.parse(JSON.stringify({
      id: result.matchId,
      team1Name: result.finalState.config.team1.name,
      team2Name: result.finalState.config.team2.name,
      innings: liveScorecard.innings.map((innings) => ({
        team: innings.battingTeamName,
        score: `${innings.totalRuns}/${innings.totalWickets}`,
      })),
    }));
    expect(history.id).toBe(result.matchId);
    expect(history.team1Name).toBe(result.finalState.config.team1.name);
    expect(history.innings[0].score).toBe(`${liveScorecard.innings[0].totalRuns}/${liveScorecard.innings[0].totalWickets}`);
  });

  it('restores Test quota semantics from serialized format state', () => {
    const config = makeConfig('TEST_RED_BALL');
    const restored = JSON.parse(JSON.stringify({ format: config.format, seed: config.seed.toString() }));
    const ruleset = getRulesetForFormat(restored.format as MatchFormat);
    expect(restored.format).toBe('TEST_RED_BALL');
    expect(ruleset.maxOversPerBowler).toBe(Infinity);
    expect(ruleset.maxOversPerInnings).toBe(Infinity);
  });

  it('resumes an active innings exactly from recorded delivery actions', () => {
    const config = makeConfig('T20', 'resume-check');
    let live = createInitialMatchState(config);
    const prng = new DeterministicPRNG(config.seed);
    const events = [] as ReturnType<typeof stepDelivery>['event'][];
    for (let i = 0; i < 12; i++) {
      const step = stepDelivery(live, { ...manualAction, actionId: `manual-${i}` }, prng);
      live = step.nextState;
      events.push(step.event);
    }
    let resumed = createInitialMatchState(config);
    const resumedPrng = new DeterministicPRNG(config.seed);
    for (const event of events) resumed = stepDelivery(resumed, event.tactics ?? manualAction, resumedPrng).nextState;
    expect(resumed.innings[0].totalRuns).toBe(live.innings[0].totalRuns);
    expect(resumed.innings[0].totalWickets).toBe(live.innings[0].totalWickets);
    expect(resumed.innings[0].strikerPlayerId).toBe(live.innings[0].strikerPlayerId);
    expect(resumed.innings[0].nonStrikerPlayerId).toBe(live.innings[0].nonStrikerPlayerId);
  });

  it('replays an interactive manual-bowling action history exactly', () => {
    const config = makeConfig('T20', 'interactive-replay-check');
    let original = createInitialMatchState(config);
    const originalPrng = new DeterministicPRNG(config.seed);
    const actions = Array.from({ length: 18 }, (_, index) => ({ ...manualAction, actionId: `interactive-${index}`, bowlingPlan: index < 9 ? 'ATTACK' as const : 'DEFENSIVE' as const }));
    for (const action of actions) original = stepDelivery(original, action, originalPrng).nextState;
    let replayed = createInitialMatchState(config);
    const replayPrng = new DeterministicPRNG(config.seed);
    for (const action of actions) replayed = stepDelivery(replayed, action, replayPrng).nextState;
    expect(replayed.innings[0].totalRuns).toBe(original.innings[0].totalRuns);
    expect(replayed.innings[0].totalWickets).toBe(original.innings[0].totalWickets);
    expect(replayed.innings[0].events.map((event) => event.outcome)).toEqual(original.innings[0].events.map((event) => event.outcome));
  });

  it('automatic captaincy recommends and applies a legal next-over bowler', () => {
    const config = makeConfig('T20', 'automatic-bowling-check');
    let state = createInitialMatchState(config);
    const prng = new DeterministicPRNG(config.seed);
    let guard = 0;
    while (state.innings[0].legalBallsInCurrentOver < 5 && guard++ < 30) {
      state = stepDelivery(state, manualAction, prng).nextState;
    }
    expect(state.innings[0].legalBallsInCurrentOver).toBe(5);
    const recommendation = resolveAITacticalAction(state, prng);
    expect(recommendation.bowlingPlan).toBeDefined();
    expect(recommendation.nextBowlerPlayerId).toBeDefined();
    const next = stepDelivery(state, recommendation, prng).nextState;
    expect(next.innings[0].currentBowlerPlayerId).toBe(recommendation.nextBowlerPlayerId);
  });
});

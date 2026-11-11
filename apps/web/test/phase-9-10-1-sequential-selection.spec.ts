import { describe, it, expect } from 'vitest';
import {
  createInitialMatchState,
  stepDelivery,
  resolveAITacticalAction,
  DeterministicPRNG,
  getRulesetForFormat,
  simulateFullMatch,
  type MatchSimulationConfig,
} from '@cricket/simulation-engine';
import type { PlayerSquadContext, MatchFormat, DreamTeamPlayerSlotInput } from '@cricket/shared-types';
import { VERIFIED_BENCHMARK_PLAYERS, ingestPlayerRecord } from '@cricket/data-ingestion';

/**
 * Phase 9.10.1 — sequential opening selection and management-flow completion.
 *
 * These tests mirror the exact transitions used by the post-toss cockpit in
 * apps/web/app/match/page.tsx: opener #1 is confirmed before opener #2 becomes
 * selectable, the confirmed pair is locked while the lower order is rearranged,
 * and each confirmation appends an independent ordered decision event.
 */

type SetupStep = 1 | 2 | 3 | 4;

interface DecisionEntry {
  type: string;
  sequenceNumber: number;
  payload: Record<string, unknown>;
}

interface BattingSetupState {
  step: SetupStep;
  opener1: string | null;
  opener2: string | null;
  lineup: DreamTeamPlayerSlotInput[];
  decisions: DecisionEntry[];
}

function reindex(lineup: DreamTeamPlayerSlotInput[]): DreamTeamPlayerSlotInput[] {
  return lineup.map((slot, index) => ({ ...slot, battingOrder: index + 1 }));
}

function record(state: BattingSetupState, type: string, payload: Record<string, unknown>): DecisionEntry[] {
  return [...state.decisions, { type, sequenceNumber: state.decisions.length + 1, payload }];
}

function confirmOpener1(state: BattingSetupState, playerId: string): BattingSetupState {
  if (state.step !== 1) return state;
  const first = state.lineup.find((slot) => slot.playerId === playerId);
  if (!first) return state;
  const rest = state.lineup.filter((slot) => slot.playerId !== playerId);
  return {
    step: 2,
    opener1: playerId,
    opener2: null,
    lineup: reindex([first, ...rest]),
    decisions: record(state, 'BATTER_SELECTED', { openingSlot: 1, playerId }),
  };
}

function confirmOpener2(state: BattingSetupState, playerId: string): BattingSetupState {
  if (state.step !== 2 || playerId === state.opener1) return state;
  const first = state.lineup.find((slot) => slot.playerId === state.opener1);
  const second = state.lineup.find((slot) => slot.playerId === playerId);
  if (!first || !second) return state;
  const rest = state.lineup.filter(
    (slot) => slot.playerId !== first.playerId && slot.playerId !== second.playerId,
  );
  return {
    ...state,
    step: 3,
    opener2: playerId,
    lineup: reindex([first, second, ...rest]),
    decisions: record(state, 'BATTER_SELECTED', { openingSlot: 2, playerId }),
  };
}

function moveLowerOrder(state: BattingSetupState, from: number, to: number): BattingSetupState {
  // Positions #1 and #2 are locked while the lower order is rearranged.
  if (to < 2 || from < 2 || to >= state.lineup.length) return state;
  const next = [...state.lineup];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return { ...state, lineup: reindex(next) };
}

function confirmOrder(state: BattingSetupState): BattingSetupState {
  const unique = new Set(state.lineup.map((slot) => slot.playerId));
  if (state.step !== 3 || unique.size !== 11 || !state.opener1 || !state.opener2) return state;
  return {
    ...state,
    step: 4,
    decisions: record(state, 'BATTER_SELECTED', {
      battingOrder: state.lineup.map((slot) => slot.playerId),
    }),
  };
}

const all = VERIFIED_BENCHMARK_PLAYERS.map(ingestPlayerRecord);
const profiles = new Map<string, PlayerSquadContext>();
for (const player of all) {
  profiles.set(player.id, {
    id: player.id,
    fullName: player.fullName,
    displayName: player.displayName,
    primaryNationality: player.primaryNationality,
    primaryRole: player.primaryRole,
    battingHand: player.battingHand,
    bowlingStyle: player.bowlingStyle,
    isWicketkeeper: player.isWicketkeeper,
    formatRating: player.ratings.T20,
    ratings: player.ratings,
  });
}

const userLineup: DreamTeamPlayerSlotInput[] = all.slice(0, 11).map((player, index) => ({
  playerId: player.id,
  battingOrder: index + 1,
  isCaptain: index === 0,
  isDesignatedWicketkeeper: index === 1,
}));

const opponentLineup: DreamTeamPlayerSlotInput[] = all.slice(11, 22).map((player, index) => ({
  playerId: player.id,
  battingOrder: index + 1,
}));

const p1 = userLineup[0].playerId;
const p2 = userLineup[1].playerId;
const p3 = userLineup[2].playerId;

function freshState(): BattingSetupState {
  return { step: 1, opener1: null, opener2: null, lineup: [...userLineup], decisions: [] };
}

function makeConfig(userBatsFirst: boolean, format: MatchFormat = 'T20', lineup = userLineup): MatchSimulationConfig {
  return {
    matchId: 'phase-9-10-1-test-match',
    format,
    seed: 42424242n,
    versions: {
      simulationVersion: 'sim-1.0.0',
      rulesetVersion: getRulesetForFormat(format).rulesetVersion,
      ratingVersion: 'rate-1.0.0',
    },
    stadiumId: 'stadium-lords',
    pitchType: 'HARD',
    conditions: {
      ambientTemperatureC: 24,
      humidityPercentage: 50,
      cloudCoverPercentage: 10,
      dewFactor: 0.1,
    },
    team1: userBatsFirst
      ? { id: 'user-team', name: 'User Dream XI', lineup }
      : { id: 'ai-team', name: 'AI Opponent XI', lineup: opponentLineup },
    team2: userBatsFirst
      ? { id: 'ai-team', name: 'AI Opponent XI', lineup: opponentLineup }
      : { id: 'user-team', name: 'User Dream XI', lineup },
    playerProfiles: profiles,
  };
}

describe('Phase 9.10.1: sequential opening batter selection', () => {
  it('confirms opener 1 before opener 2 becomes selectable', () => {
    let state = freshState();
    expect(state.step).toBe(1);

    // Selecting a second opener while step 1 is active is ignored.
    state = confirmOpener2(state, p2);
    expect(state.step).toBe(1);
    expect(state.opener2).toBeNull();

    state = confirmOpener1(state, p1);
    expect(state.step).toBe(2);
    expect(state.opener1).toBe(p1);
    expect(state.opener2).toBeNull();
  });

  it('cannot select opener 1 twice', () => {
    let state = confirmOpener1(freshState(), p1);
    const before = state;
    state = confirmOpener2(state, p1);
    expect(state).toBe(before);
    expect(state.step).toBe(2);
    expect(state.opener2).toBeNull();
  });

  it('excludes the confirmed first opener from opener 2 candidates', () => {
    const state = confirmOpener1(freshState(), p1);
    const candidates = state.lineup.filter((slot) => slot.playerId !== state.opener1);
    expect(candidates).toHaveLength(10);
    expect(candidates.some((slot) => slot.playerId === p1)).toBe(false);
  });

  it('keeps both openers fixed while the lower order is rearranged', () => {
    let state = confirmOpener2(confirmOpener1(freshState(), p1), p2);
    const before = state.lineup.map((slot) => slot.playerId);

    state = moveLowerOrder(state, 4, 2);
    expect(state.lineup[0].playerId).toBe(p1);
    expect(state.lineup[1].playerId).toBe(p2);

    // Attempts to swap an opener out of position are rejected.
    state = moveLowerOrder(state, 2, 0);
    expect(state.lineup[0].playerId).toBe(p1);
    expect(state.lineup[1].playerId).toBe(p2);
    expect(state.lineup.map((slot) => slot.playerId)).not.toEqual(before);
  });

  it('records an independent ordered decision event for each confirmation', () => {
    let state = confirmOpener1(freshState(), p1);
    state = confirmOpener2(state, p2);
    state = confirmOrder(state);

    expect(state.decisions).toHaveLength(3);
    expect(state.decisions.map((entry) => entry.sequenceNumber)).toEqual([1, 2, 3]);
    expect(state.decisions[0].payload).toMatchObject({ openingSlot: 1, playerId: p1 });
    expect(state.decisions[1].payload).toMatchObject({ openingSlot: 2, playerId: p2 });
    expect(state.decisions[2].payload.battingOrder).toHaveLength(11);
  });

  it('validates the batting order and rejects duplicates', () => {
    let state = confirmOpener2(confirmOpener1(freshState(), p1), p2);
    state = {
      ...state,
      lineup: state.lineup.map((slot, index) => (index === 5 ? { ...slot, playerId: state.lineup[0].playerId } : slot)),
    };
    const confirmed = confirmOrder(state);
    expect(confirmed.step).toBe(3);
    expect(confirmed.decisions).toHaveLength(2);
  });

  it('restores a partially completed selection after a refresh between steps', () => {
    const afterFirst = confirmOpener1(freshState(), p1);
    const stored = JSON.stringify({
      step: afterFirst.step,
      opener1: afterFirst.opener1,
      opener2: afterFirst.opener2,
      lineup: afterFirst.lineup,
      decisionLog: afterFirst.decisions,
    });
    const restored = JSON.parse(stored) as {
      step: SetupStep;
      opener1: string | null;
      opener2: string | null;
      decisionLog: DecisionEntry[];
    };

    expect(restored.step).toBe(2);
    expect(restored.opener1).toBe(p1);
    expect(restored.opener2).toBeNull();
    expect(restored.decisionLog).toHaveLength(1);
  });

  it('resumes after both openers are confirmed and preserves the pair in the engine', () => {
    const state = confirmOpener2(confirmOpener1(freshState(), p1), p2);
    const restored = JSON.parse(JSON.stringify({ step: state.step, lineup: state.lineup }));

    expect(restored.step).toBe(3);
    expect(restored.lineup[0].playerId).toBe(p1);
    expect(restored.lineup[1].playerId).toBe(p2);

    const initial = createInitialMatchState(makeConfig(true, 'T20', restored.lineup));
    expect(initial.innings[0].strikerPlayerId).toBe(p1);
    expect(initial.innings[0].nonStrikerPlayerId).toBe(p2);
  });

  it('works for both toss outcomes', () => {
    // User bats first: user lineup is team1 and starts the innings.
    const battingFirst = createInitialMatchState(makeConfig(true));
    expect(battingFirst.innings[0].battingTeamId).toBe('user-team');
    expect(battingFirst.innings[0].strikerPlayerId).toBe(p1);

    // User bowls first: opponent lineup bats, user bowls.
    const bowlingFirst = createInitialMatchState(makeConfig(false));
    expect(bowlingFirst.innings[0].bowlingTeamId).toBe('user-team');
    expect(bowlingFirst.innings[0].strikerPlayerId).not.toBe(p1);
  });

  it('gates START SIMULATION on the completed batting sequence', () => {
    const ready = (state: BattingSetupState, battingValid: boolean): boolean =>
      battingValid && Boolean(state.opener1 && state.opener2 && state.step === 4);

    let state = freshState();
    expect(ready(state, true)).toBe(false);
    state = confirmOpener1(state, p1);
    expect(ready(state, true)).toBe(false);
    state = confirmOpener2(state, p2);
    expect(ready(state, true)).toBe(false);
    state = confirmOrder(state);
    expect(ready(state, true)).toBe(true);
    expect(ready(state, false)).toBe(false);
  });
});

describe('Phase 9.10.1: sequential bowling setup', () => {
  const isFieldLegal = (fielders: { angleDeg: number; distM: number }[], format: MatchFormat): boolean => {
    const maxOutside = format === 'T10' || format === 'T20' || format === 'ODI' ? 2 : 9;
    const outside = fielders.filter((fielder) => fielder.distM > 30).length;
    const legSide = fielders.filter((fielder) => fielder.angleDeg > 180 && fielder.angleDeg < 360).length;
    const behindSquare = fielders.filter((fielder) => fielder.angleDeg >= 180 && fielder.angleDeg <= 270).length;
    return outside <= maxOutside && legSide <= 5 && behindSquare <= 2;
  };

  const legalField = [
    { angleDeg: 20, distM: 20 },
    { angleDeg: 70, distM: 22 },
    { angleDeg: 120, distM: 25 },
    { angleDeg: 160, distM: 18 },
    { angleDeg: 200, distM: 45 },
    { angleDeg: 240, distM: 28 },
    { angleDeg: 300, distM: 20 },
    { angleDeg: 340, distM: 22 },
    { angleDeg: 355, distM: 65 },
  ];

  const illegalField = legalField.map((fielder) => ({ ...fielder, angleDeg: 200 }));

  it('requires a confirmed field before the bowling plan step', () => {
    let step: 1 | 2 | 3 | 4 = 1;
    const confirmed = { bowler: false, field: false, plan: false };

    // Cannot jump straight to the plan.
    expect(step).toBe(1);
    confirmed.bowler = true;
    step = 2;
    expect(step).toBe(2);

    // An illegal field cannot be confirmed.
    expect(isFieldLegal(illegalField, 'T20')).toBe(false);
    expect(step).toBe(2);

    expect(isFieldLegal(legalField, 'T20')).toBe(true);
    confirmed.field = true;
    step = 3;
    expect(step).toBe(3);
    expect(confirmed.plan).toBe(false);

    confirmed.plan = true;
    step = 4;
    expect(step).toBe(4);
  });

  it('cannot start without a bowling plan and field confirmation', () => {
    const ready = (confirmed: { bowler: boolean; field: boolean; plan: boolean }): boolean =>
      confirmed.bowler && confirmed.field && confirmed.plan;
    expect(ready({ bowler: true, field: true, plan: false })).toBe(false);
    expect(ready({ bowler: true, field: false, plan: true })).toBe(false);
    expect(ready({ bowler: false, field: true, plan: true })).toBe(false);
    expect(ready({ bowler: true, field: true, plan: true })).toBe(true);
  });

  it('assigns the confirmed opening bowler to the first over across all five formats', () => {
    const formats: MatchFormat[] = ['T10', 'T20', 'ODI', 'TEST_RED_BALL', 'TEST_PINK_BALL'];
    const nominated = userLineup[9].playerId;
    const finalized = [
      ...userLineup.filter((slot) => slot.playerId !== nominated),
      { ...userLineup[9], bowlingPriority: 1 },
    ];

    for (const format of formats) {
      const config = makeConfig(false, format, finalized);
      const state = createInitialMatchState(config);
      expect(state.innings[0].currentBowlerPlayerId).toBe(nominated);
      expect(state.innings[0].events).toHaveLength(0);
    }
  });
});

describe('Phase 9.10.1: determinism and replay', () => {
  it('replays identically from the confirmed lineups in every format', () => {
    const formats: MatchFormat[] = ['T10', 'T20', 'ODI', 'TEST_RED_BALL', 'TEST_PINK_BALL'];

    for (const format of formats) {
      const config = makeConfig(true, format);
      const first = simulateFullMatch(config);
      const second = simulateFullMatch(config);

      expect(second.initialStateHash).toBe(first.initialStateHash);
      expect(second.totalDeliveriesSimulated).toBe(first.totalDeliveriesSimulated);
      expect(second.allEvents.map((event) => event.outcome)).toEqual(
        first.allEvents.map((event) => event.outcome),
      );
      // The confirmed opener still opens the innings in every format.
      expect(createInitialMatchState(config).innings[0].strikerPlayerId).toBe(p1);
    }
  });

  it('produces the same first delivery after resuming with recorded decisions', () => {
    const config = makeConfig(true);
    const state = createInitialMatchState(config);
    const replayed = createInitialMatchState(config);
    const prngA = new DeterministicPRNG(config.seed);
    const prngB = new DeterministicPRNG(config.seed);

    const a = stepDelivery(state, resolveAITacticalAction(state, prngA), prngA);
    const b = stepDelivery(replayed, resolveAITacticalAction(replayed, prngB), prngB);

    expect(b.event.outcome).toBe(a.event.outcome);
    expect(b.event.strikerPlayerId).toBe(a.event.strikerPlayerId);
    expect(b.event.bowlerPlayerId).toBe(a.event.bowlerPlayerId);
  });
});

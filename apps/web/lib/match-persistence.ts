import {
  createInitialMatchState,
  DeterministicPRNG,
  stepDelivery,
  type DeliveryEvent,
  type MatchSimulationConfig,
  type MatchState,
} from '@cricket/simulation-engine';

export const ACTIVE_MATCH_SESSION_STORAGE_KEY = 'cricket_active_match_session';
export const MATCH_HISTORY_STORAGE_KEY = 'cricket_match_history';

export interface RecordedReplayResult {
  readonly state: MatchState;
  readonly prng: DeterministicPRNG;
  readonly replayedEvents: readonly DeliveryEvent[];
  readonly missingActionIndex: number | null;
}

/**
 * Replays the exact delivery actions persisted on DeliveryEvent.tactics.
 * The web UI uses this for both refresh/resume and archived interactive matches
 * so those paths cannot silently drift into separate replay implementations.
 */
export function replayRecordedDeliveryEvents(
  config: MatchSimulationConfig,
  events: readonly DeliveryEvent[],
): RecordedReplayResult {
  let state = createInitialMatchState(config);
  const prng = new DeterministicPRNG(config.seed);
  const replayedEvents: DeliveryEvent[] = [];

  for (let index = 0; index < events.length; index += 1) {
    const recorded = events[index];
    if (!recorded.tactics || state.status === 'COMPLETED') {
      return { state, prng, replayedEvents, missingActionIndex: index };
    }

    const stepped = stepDelivery(state, recorded.tactics, prng);
    replayedEvents.push(stepped.event);
    state = stepped.nextState;
  }

  return { state, prng, replayedEvents, missingActionIndex: null };
}

/** JSON round-trip used by tests and storage callers that already normalize Maps and bigint values. */
export function serializeMatchPersistence(value: unknown): string {
  return JSON.stringify(value, (_key, currentValue: unknown) =>
    typeof currentValue === 'bigint' ? currentValue.toString() : currentValue,
  );
}

export function parseMatchPersistence<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

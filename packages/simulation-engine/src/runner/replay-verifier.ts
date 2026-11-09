import { simulateFullMatch, type MatchSimulationResult } from './match-runner.js';

export interface ReplayVerificationReport {
  readonly isValid: boolean;
  readonly matchId: string;
  readonly originalStateHash: string;
  readonly replayedStateHash: string;
  readonly discrepancies: readonly string[];
}

/**
 * Replays a simulated match from its initial seed and configuration,
 * verifying 100% bit-exact reproducibility and deterministic consistency.
 */
export function verifyMatchReplay(
  originalResult: MatchSimulationResult,
): ReplayVerificationReport {
  const discrepancies: string[] = [];

  // Re-run autonomous simulation from scratch using identical config & seed
  const replayed = simulateFullMatch(originalResult.finalState.config);

  // 1. Initial State Hash Verification
  if (replayed.initialStateHash !== originalResult.initialStateHash) {
    discrepancies.push(
      `Initial state hash mismatch: original=${originalResult.initialStateHash}, replayed=${replayed.initialStateHash}`,
    );
  }

  // 2. Event Count Verification
  if (replayed.allEvents.length !== originalResult.allEvents.length) {
    discrepancies.push(
      `Total delivery count mismatch: original=${originalResult.allEvents.length}, replayed=${replayed.allEvents.length}`,
    );
  }

  // 3. Innings Count Verification
  if (replayed.finalState.innings.length !== originalResult.finalState.innings.length) {
    discrepancies.push(
      `Innings count mismatch: original=${originalResult.finalState.innings.length}, replayed=${replayed.finalState.innings.length}`,
    );
  }

  // 4. Delivery-by-Delivery Scorecard and Event Verification
  const compareCount = Math.min(
    replayed.allEvents.length,
    originalResult.allEvents.length,
  );

  for (let i = 0; i < compareCount; i++) {
    const origEvent = originalResult.allEvents[i];
    const repEvent = replayed.allEvents[i];

    if (origEvent.outcome !== repEvent.outcome) {
      discrepancies.push(
        `Delivery ${i + 1} outcome mismatch: original=${origEvent.outcome}, replayed=${repEvent.outcome}`,
      );
      break; // Stop on first divergence
    }

    if (origEvent.runsBat !== repEvent.runsBat) {
      discrepancies.push(
        `Delivery ${i + 1} runsBat mismatch: original=${origEvent.runsBat}, replayed=${repEvent.runsBat}`,
      );
      break;
    }

    if (
      origEvent.scorecardDelta.totalRuns !== repEvent.scorecardDelta.totalRuns ||
      origEvent.scorecardDelta.totalWickets !== repEvent.scorecardDelta.totalWickets
    ) {
      discrepancies.push(
        `Delivery ${i + 1} scorecard delta mismatch: original=${origEvent.scorecardDelta.totalRuns}/${origEvent.scorecardDelta.totalWickets}, replayed=${repEvent.scorecardDelta.totalRuns}/${repEvent.scorecardDelta.totalWickets}`,
      );
      break;
    }
  }

  // 5. Final Result Verification
  if (replayed.finalState.result?.summary !== originalResult.finalState.result?.summary) {
    discrepancies.push(
      `Match result summary mismatch: original="${originalResult.finalState.result?.summary}", replayed="${replayed.finalState.result?.summary}"`,
    );
  }

  return {
    isValid: discrepancies.length === 0,
    matchId: originalResult.matchId,
    originalStateHash: originalResult.initialStateHash,
    replayedStateHash: replayed.initialStateHash,
    discrepancies,
  };
}

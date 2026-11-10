import type { MatchFormat, PlayerSquadContext } from '@cricket/shared-types';
import type {
  BatterScorecardEntry,
  BowlerScorecardEntry,
  DeliveryDismissal,
  DeliveryEvent,
  FallOfWicket,
  InningsState,
  MatchState,
  MatchStatus,
  TacticalDeliveryAction,
} from '../contracts/types.js';
import type { DeterministicPRNG } from '../prng/splitmix64.js';
import { executeDeliveryPipeline } from '../pipeline/delivery-pipeline.js';
import { resolveDeliveryOutcome } from '../pipeline/dismissal-engine.js';
import type { DeliveryContext } from '../pipeline/types.js';
import { getRulesetForFormat } from '../rulesets/t20-ruleset.js';
import { createInitialInningsState, verifyMatchInvariants } from '../state/match-state.js';
import { calculateWearIncrement } from '../environment/environmental-engine.js';
import { generateCommentary } from './commentary.js';
import { generateTrajectory } from './trajectory.js';

export interface StepDeliveryResult {
  readonly nextState: MatchState;
  readonly event: DeliveryEvent;
}

/**
 * Pure, deterministic single-delivery match state transition function:
 * S_t, A_t, PRNG_t -> (S_t+1, E_t, PRNG_t+1)
 *
 * Implements MCC Laws:
 * - Legal ball counter (6 balls per over; wides/no-balls do not count).
 * - Striker rotation on odd runs (1, 3, 5, byes, leg-byes).
 * - Over-end strike rotation (batters swap ends).
 * - Bowler change at over end (MCC Law 21.7: no consecutive overs).
 * - Fall-of-wicket replacement.
 * - Scorecard reconciliation & match invariant verification.
 */
export function stepDelivery(
  state: MatchState,
  action: TacticalDeliveryAction,
  prng: DeterministicPRNG,
): StepDeliveryResult {
  if (state.status === 'COMPLETED') {
    throw new Error('Cannot step delivery on a completed match');
  }

  const inningsIndex = state.currentInningsIndex;
  const currentInnings = state.innings[inningsIndex];

  if (!currentInnings || currentInnings.isCompleted) {
    throw new Error('Current innings is already completed or undefined');
  }

  const ruleset = getRulesetForFormat(state.config.format);
  const isTeam1Batting = currentInnings.battingTeamId === state.config.team1.id;
  const battingTeam = isTeam1Batting ? state.config.team1 : state.config.team2;
  const bowlingTeam = isTeam1Batting ? state.config.team2 : state.config.team1;

  // 1. Identify active striker and bowler
  const strikerId = currentInnings.strikerPlayerId;
  const nonStrikerId = currentInnings.nonStrikerPlayerId;
  const bowlerId = currentInnings.currentBowlerPlayerId;

  const strikerProfile = state.config.playerProfiles.get(strikerId) ?? {
    id: strikerId,
    fullName: strikerId,
    displayName: strikerId,
    primaryRole: 'TOP_ORDER_BATTER',
    battingHand: 'RIGHT_HAND',
    bowlingStyle: 'RIGHT_ARM_MEDIUM',
    isWicketkeeper: false,
  };

  const bowlerProfile = state.config.playerProfiles.get(bowlerId) ?? {
    id: bowlerId,
    fullName: bowlerId,
    displayName: bowlerId,
    primaryRole: 'PACE_BOWLER',
    battingHand: 'RIGHT_HAND',
    bowlingStyle: 'RIGHT_ARM_FAST',
    isWicketkeeper: false,
  };

  // 2. Check current innings state for Free Hit (ICC Clause 21.19)
  const lastEvent = currentInnings.events[currentInnings.events.length - 1];
  const isFreeHit =
    currentInnings.isFreeHit || (lastEvent ? lastEvent.outcome === 'NO_BALL' : false);

  // 3. Construct DeliveryContext
  const currentRunRate =
    currentInnings.completedOvers > 0 || currentInnings.legalBallsInCurrentOver > 0
      ? (currentInnings.totalRuns /
          (currentInnings.completedOvers * 6 + currentInnings.legalBallsInCurrentOver)) *
        6
      : 0;

  const maxTotalBalls = ruleset.maxOversPerInnings * 6;
  const ballsBowledSoFar =
    currentInnings.completedOvers * 6 + currentInnings.legalBallsInCurrentOver;
  const ballsRemaining = Math.max(0, maxTotalBalls - ballsBowledSoFar);

  const runsNeeded = currentInnings.targetRuns
    ? Math.max(0, currentInnings.targetRuns - currentInnings.totalRuns)
    : undefined;
  const requiredRunRate =
    runsNeeded !== undefined && ballsRemaining > 0
      ? (runsNeeded / ballsRemaining) * 6
      : undefined;

  const deliveryContext: DeliveryContext = {
    format: state.config.format,
    inningsNumber: currentInnings.inningsNumber,
    overNumber: currentInnings.completedOvers,
    ballInOver: currentInnings.legalBallsInCurrentOver + 1,
    isPowerplay: ruleset.isPowerplayOver(currentInnings.completedOvers),
    isDeathOvers:
      state.config.format === 'T20'
        ? currentInnings.completedOvers >= 15
        : currentInnings.completedOvers >= 40,
    isFreeHit,
    totalRuns: currentInnings.totalRuns,
    totalWickets: currentInnings.totalWickets,
    currentRunRate,
    targetRuns: currentInnings.targetRuns,
    requiredRunRate,
    ballsRemaining,
    pitchWearIndex: state.pitchWearIndex,
    surfaceCracksIndex: state.surfaceCracksIndex,
    ballWearIndex: state.ballWearIndex,
    pitchType: state.config.pitchType,
    stadiumId: state.config.stadiumId,
    fieldersOutsideRing: ruleset.getMaxFieldersOutsideRing(
      currentInnings.completedOvers,
    ),
    currentSessionNumber: state.currentSessionNumber ?? 1,
  };

  // 4. Execute Delivery Pipeline and Resolve Dismissal
  const pipelineResult = executeDeliveryPipeline(
    {
      context: deliveryContext,
      batter: strikerProfile,
      bowler: bowlerProfile,
      conditions: state.config.conditions,
      tactics: action,
    },
    prng,
  );

  const resolution = resolveDeliveryOutcome({
    outcome: pipelineResult.outcome,
    isNoBall: pipelineResult.outcome === 'NO_BALL',
    isFreeHit,
    isWide: pipelineResult.outcome === 'WIDE',
    strikerPlayerId: strikerId,
    nonStrikerPlayerId: nonStrikerId,
    bowlerPlayerId: bowlerId,
    bowlerStyle: bowlerProfile.bowlingStyle,
    bowlingTeamLineup: bowlingTeam.lineup,
    fieldPreset: action.fieldPreset,
    prng,
  });

  const trajectory = generateTrajectory(resolution.outcome, prng);
  const commentary = generateCommentary({
    bowlerName: bowlerProfile.displayName,
    strikerName: strikerProfile.displayName,
    outcome: resolution.outcome,
    runsBat: resolution.runsBat,
    extras: resolution.extras,
    dismissal: resolution.dismissal,
    isFreeHit,
    overNumber: currentInnings.completedOvers,
    ballInOver: currentInnings.legalBallsInCurrentOver + 1,
  });

  // 5. Scorecard Updates (Batters)
  const battersMap = new Map<string, BatterScorecardEntry>(currentInnings.batters);
  const existingStriker = battersMap.get(strikerId) ?? {
    playerId: strikerId,
    runs: 0,
    ballsFaced: 0,
    fours: 0,
    sixes: 0,
    strikeRate: 0,
    isOut: false,
  };

  const isWideOutcome = resolution.extras.wides > 0;
  const isDismissedStriker =
    resolution.dismissal?.dismissedPlayerId === strikerId;
  const isDismissedNonStriker =
    resolution.dismissal?.dismissedPlayerId === nonStrikerId;

  const newBallsFaced = isWideOutcome
    ? existingStriker.ballsFaced
    : existingStriker.ballsFaced + 1;
  const newRuns = existingStriker.runs + resolution.runsBat;
  const newFours =
    resolution.runsBat === 4 ? existingStriker.fours + 1 : existingStriker.fours;
  const newSixes =
    resolution.runsBat === 6 ? existingStriker.sixes + 1 : existingStriker.sixes;
  const newStrikeRate =
    newBallsFaced > 0 ? (newRuns / newBallsFaced) * 100 : 0;

  battersMap.set(strikerId, {
    ...existingStriker,
    runs: newRuns,
    ballsFaced: newBallsFaced,
    fours: newFours,
    sixes: newSixes,
    strikeRate: Math.round(newStrikeRate * 100) / 100,
    isOut: isDismissedStriker ? true : existingStriker.isOut,
    dismissal: isDismissedStriker ? resolution.dismissal : existingStriker.dismissal,
  });

  if (isDismissedNonStriker) {
    const existingNonStriker = battersMap.get(nonStrikerId)!;
    battersMap.set(nonStrikerId, {
      ...existingNonStriker,
      isOut: true,
      dismissal: resolution.dismissal,
    });
  }

  // 6. Scorecard Updates (Bowlers)
  const bowlersMap = new Map<string, BowlerScorecardEntry>(currentInnings.bowlers);
  const existingBowler = bowlersMap.get(bowlerId) ?? {
    playerId: bowlerId,
    ballsBowled: 0,
    oversBowledFormatted: '0.0',
    maidens: 0,
    runsConceded: 0,
    wickets: 0,
    economyRate: 0,
    wides: 0,
    noBalls: 0,
    dots: 0,
  };

  const newBowlerBalls = resolution.isLegalDelivery
    ? existingBowler.ballsBowled + 1
    : existingBowler.ballsBowled;
  const newRunsConceded =
    existingBowler.runsConceded +
    resolution.runsBat +
    resolution.extras.wides +
    resolution.extras.noBalls;
  const isBowlerWicket =
    resolution.dismissal && resolution.dismissal.mode !== 'RUN_OUT';
  const newBowlerWickets = isBowlerWicket
    ? existingBowler.wickets + 1
    : existingBowler.wickets;
  const isDotBall =
    resolution.runsBat === 0 &&
    resolution.extras.wides === 0 &&
    resolution.extras.noBalls === 0;
  const newBowlerDots = isDotBall
    ? existingBowler.dots + 1
    : existingBowler.dots;

  const oversFormatted = `${Math.floor(newBowlerBalls / 6)}.${newBowlerBalls % 6}`;
  const newEconRate =
    newBowlerBalls > 0 ? (newRunsConceded / (newBowlerBalls / 6)) : 0;

  bowlersMap.set(bowlerId, {
    ...existingBowler,
    ballsBowled: newBowlerBalls,
    oversBowledFormatted: oversFormatted,
    runsConceded: newRunsConceded,
    wickets: newBowlerWickets,
    dots: newBowlerDots,
    wides: existingBowler.wides + resolution.extras.wides,
    noBalls: existingBowler.noBalls + resolution.extras.noBalls,
    economyRate: Math.round(newEconRate * 100) / 100,
  });

  // 7. Total Runs & Wickets
  const totalDeliveryRuns =
    resolution.runsBat +
    resolution.extras.wides +
    resolution.extras.noBalls +
    resolution.extras.byes +
    resolution.extras.legByes +
    resolution.extras.penalty;

  const newTotalRuns = currentInnings.totalRuns + totalDeliveryRuns;
  const newTotalWickets =
    currentInnings.totalWickets + (resolution.dismissal ? 1 : 0);

  // 8. Fall of Wickets
  const newFallOfWickets: FallOfWicket[] = [...currentInnings.fallOfWickets];
  if (resolution.dismissal) {
    const elapsedBalls =
      currentInnings.legalBallsInCurrentOver +
      (resolution.isLegalDelivery ? 1 : 0);
    newFallOfWickets.push({
      wicketNumber: newTotalWickets,
      teamRuns: newTotalRuns,
      oversElapsed: `${currentInnings.completedOvers}.${elapsedBalls}`,
      dismissedPlayerId: resolution.dismissal.dismissedPlayerId,
    });
  }

  // 9. Batter Replacement on Dismissal
  let nextStrikerId = strikerId;
  let nextNonStrikerId = nonStrikerId;

  if (resolution.dismissal) {
    if (newTotalWickets < 10) {
      // Slot index in batting lineup: wickets 1 to 9 brings slot index wickets+1 (i.e. index 2 to 10)
      const incomingBatterSlot = battingTeam.lineup[newTotalWickets + 1];
      const incomingBatterId = incomingBatterSlot?.playerId;

      if (incomingBatterId) {
        if (!battersMap.has(incomingBatterId)) {
          battersMap.set(incomingBatterId, {
            playerId: incomingBatterId,
            runs: 0,
            ballsFaced: 0,
            fours: 0,
            sixes: 0,
            strikeRate: 0,
            isOut: false,
          });
        }

        if (isDismissedStriker) {
          nextStrikerId = incomingBatterId;
        } else {
          nextNonStrikerId = incomingBatterId;
        }
      }
    }
  }

  // 10. Strike Rotation on Runs Scored
  // Batters swap on odd runs off bat or odd byes/leg-byes
  const strikeRotateRuns =
    resolution.runsBat + resolution.extras.byes + resolution.extras.legByes;
  if (strikeRotateRuns % 2 !== 0) {
    const temp = nextStrikerId;
    nextStrikerId = nextNonStrikerId;
    nextNonStrikerId = temp;
  }

  // 11. Over Accounting & Strike Rotation at End of Over
  let nextCompletedOvers = currentInnings.completedOvers;
  let nextLegalBalls = currentInnings.legalBallsInCurrentOver;
  let nextBowlerId = bowlerId;
  let isOverComplete = false;

  if (resolution.isLegalDelivery) {
    nextLegalBalls += 1;

    if (nextLegalBalls === 6) {
      nextCompletedOvers += 1;
      nextLegalBalls = 0;
      isOverComplete = true;

      // End of over strike rotation (batters switch ends)
      const temp = nextStrikerId;
      nextStrikerId = nextNonStrikerId;
      nextNonStrikerId = temp;

      // Select next bowler (MCC Law 21.7: bowler cannot bowl consecutive overs)
      // Filter bowlers from bowling lineup
      const eligibleBowlers = bowlingTeam.lineup.filter((slot) => {
        if (slot.playerId === bowlerId) return false; // Cannot bowl consecutive overs
        const bowlerScore = bowlersMap.get(slot.playerId);
        const oversBowled = bowlerScore
          ? Math.floor(bowlerScore.ballsBowled / 6)
          : 0;
        return oversBowled < ruleset.maxOversPerBowler;
      });

      if (eligibleBowlers.length > 0) {
        // Pick bowler with priority or cycle
        nextBowlerId = eligibleBowlers[0].playerId;
      }
    }
  }

  // 12. Create Monotonic Delivery Event (strictly monotonic across the whole match)
  let totalPriorEvents = 0;
  for (let i = 0; i < state.currentInningsIndex; i++) {
    totalPriorEvents += state.innings[i].events.length;
  }
  const sequenceNumber = totalPriorEvents + currentInnings.events.length + 1;

  const event: DeliveryEvent = {
    sequenceNumber,
    inningsNumber: currentInnings.inningsNumber,
    overNumber: currentInnings.completedOvers,
    ballInOver: currentInnings.legalBallsInCurrentOver + 1,
    isLegalDelivery: resolution.isLegalDelivery,
    bowlerPlayerId: bowlerId,
    strikerPlayerId: strikerId,
    nonStrikerPlayerId: nonStrikerId,
    outcome: resolution.outcome,
    runsBat: resolution.runsBat,
    extras: resolution.extras,
    dismissal: resolution.dismissal,
    trajectory,
    commentary,
    scorecardDelta: {
      totalRuns: newTotalRuns,
      totalWickets: newTotalWickets,
    },
  };

  // 13. Innings Completion Evaluation
  const format = state.config.format;
  const isLimitedOvers = format === 'T10' || format === 'T20' || format === 'ODI';
  const isTest = format === 'TEST_RED_BALL' || format === 'TEST_PINK_BALL';

  const isAllOut = newTotalWickets >= 10;
  const isOverLimit = ruleset.isOverLimitReached(
    nextCompletedOvers,
    state.config.format,
  );
  const isTargetOverhauled =
    currentInnings.targetRuns !== undefined &&
    newTotalRuns >= currentInnings.targetRuns;
  const isDeclared =
    (isTest && action?.declareInnings === true) || Boolean(currentInnings.isDeclared);

  const isInningsDone = isAllOut || isOverLimit || isTargetOverhauled || isDeclared;

  // Free Hit State Transition (ICC Men's T20I Playing Conditions Clause 21.19 / ODI Clause 21.19):
  // 1. A No-Ball creates a Free Hit for the next delivery ONLY in formats where freeHitAfterNoBall is true (Limited Overs).
  // 2. In Test cricket, free hits are not awarded following a No-Ball (ICC Test Clause 21.19).
  // 3. If the current delivery was a Free Hit and the bowler bowls an illegal ball (Wide or No-Ball),
  //    the Free Hit carries over to the subsequent delivery.
  // 4. If the current delivery was a Free Hit and is bowled legally, the Free Hit is consumed.
  // 5. A Free Hit never carries over between innings or after an innings is completed.
  let nextIsFreeHit = false;
  if (!isInningsDone && ruleset.freeHitAfterNoBall) {
    if (resolution.outcome === 'NO_BALL' || resolution.extras.noBalls > 0) {
      nextIsFreeHit = true;
    } else if (isFreeHit && !resolution.isLegalDelivery) {
      nextIsFreeHit = true;
    }
  }

  const updatedInnings: InningsState = {
    ...currentInnings,
    totalRuns: newTotalRuns,
    totalWickets: newTotalWickets,
    completedOvers: nextCompletedOvers,
    legalBallsInCurrentOver: nextLegalBalls,
    strikerPlayerId: nextStrikerId,
    nonStrikerPlayerId: nextNonStrikerId,
    currentBowlerPlayerId: nextBowlerId,
    isCompleted: isInningsDone,
    isDeclared,
    isFreeHit: nextIsFreeHit,
    batters: battersMap,
    bowlers: bowlersMap,
    fallOfWickets: newFallOfWickets,
    events: [...currentInnings.events, event],
  };

  // 14. Match Status Transition & Next Innings Setup
  let matchStatus: MatchStatus = state.status;
  let result = state.result;
  const updatedInningsArray = [...state.innings];
  updatedInningsArray[inningsIndex] = updatedInnings;

  let nextInningsIndex = inningsIndex;

  let currentDay = state.currentDayNumber ?? (isTest ? 1 : undefined);
  let currentSession = state.currentSessionNumber ?? (isTest ? 1 : undefined);
  let sessionOvers = state.sessionOversBowled ?? (isTest ? 0 : undefined);
  let oversSinceNewBall = state.oversSinceNewBall ?? (isTest ? 0 : undefined);
  let isFollowOnEnforced = state.isFollowOnEnforced ?? false;
  let isFollowOnEligible = state.isFollowOnEligible ?? false;
  let sessionElapsedMinutes = state.sessionElapsedMinutes ?? (isTest ? 0 : undefined);
  let isAdditionalTimeActive = state.isAdditionalTimeActive ?? false;
  let isNewBallAvailable = state.isNewBallAvailable ?? false;
  let stopClockSeconds = state.stopClockSeconds ?? (isLimitedOvers ? 60 : undefined);
  let stopClockWarnings = state.stopClockWarnings ?? 0;

  if (isOverComplete) {
    if (isTest) {
      sessionOvers = (sessionOvers ?? 0) + 1;
      oversSinceNewBall = (oversSinceNewBall ?? 0) + 1;
      sessionElapsedMinutes = (sessionElapsedMinutes ?? 0) + 4; // ~15 overs per hour

      // Permitted additional time (ICC Clause 16.2.2):
      // If 9 wickets down at scheduled end of session/day, play may be extended up to 30 mins
      const isNineWicketsDown = newTotalWickets === 9;
      if (sessionOvers >= 30 && isNineWicketsDown && !isAdditionalTimeActive) {
        isAdditionalTimeActive = true;
      }

      const sessionMaxOvers = isAdditionalTimeActive ? 38 : 30;
      if (sessionOvers >= sessionMaxOvers || (!isNineWicketsDown && isAdditionalTimeActive)) {
        sessionOvers = 0;
        sessionElapsedMinutes = 0;
        isAdditionalTimeActive = false;
        currentSession = (currentSession ?? 1) + 1;
        if (currentSession > 3) {
          currentSession = 1;
          currentDay = (currentDay ?? 1) + 1;
        }
      }
    } else if (isLimitedOvers && ruleset.isStopClockEnforced()) {
      // Reset 60-second stop clock between overs (ICC 41.9)
      stopClockSeconds = ruleset.stopClockLimitSeconds();
    }
  }

  // Check New Ball eligibility (ICC Test Clause 4.3: Available after 80 overs)
  if (isTest && (oversSinceNewBall ?? 0) >= 80) {
    isNewBallAvailable = true;
  }

  // 15. Pitch & Ball Wear Progression
  const { pitchWearDelta, ballWearDelta } = calculateWearIncrement(
    state.config.format,
    resolution.isLegalDelivery,
  );
  let nextBallWear = Math.min(1.0, state.ballWearIndex + ballWearDelta);
  const nextPitchWear = Math.min(1.0, state.pitchWearIndex + pitchWearDelta);

  // New ball claimed by fielding captain (optional tactical action)
  if (isTest && isNewBallAvailable && action?.takeNewBall === true) {
    oversSinceNewBall = 0;
    nextBallWear = 0.05;
    isNewBallAvailable = false;
  }

  if (isInningsDone) {
    if (isLimitedOvers) {
      if (currentInnings.inningsNumber === 1) {
        // Limited Overs Innings 1 concluded -> Initialize Innings 2 with target
        const targetRuns = newTotalRuns + 1;
        const innings2 = createInitialInningsState(
          2,
          state.config.team2.id,
          state.config.team1.id,
          state.config.team2.lineup as any,
          state.config.team1.lineup as any,
          targetRuns,
        );

        updatedInningsArray.push(innings2);
        nextInningsIndex = 1;
      } else if (currentInnings.inningsNumber === 2) {
        // Limited Overs Match Completed!
        matchStatus = 'COMPLETED';
        const inn1 = updatedInningsArray[0];
        const inn2 = updatedInnings;

        if (inn2.totalRuns > inn1.totalRuns) {
          // Team 2 Won Chasing
          const wicketsLeft = 10 - inn2.totalWickets;
          result = {
            winningTeamId: inn2.battingTeamId,
            marginWickets: wicketsLeft,
            isTie: false,
            isDraw: false,
            summary: `${state.config.team2.name} won by ${wicketsLeft} wicket${wicketsLeft === 1 ? '' : 's'}`,
          };
        } else if (inn1.totalRuns > inn2.totalRuns) {
          // Team 1 Defended Target
          const runsMargin = inn1.totalRuns - inn2.totalRuns;
          result = {
            winningTeamId: inn1.battingTeamId,
            marginRuns: runsMargin,
            isTie: false,
            isDraw: false,
            summary: `${state.config.team1.name} won by ${runsMargin} run${runsMargin === 1 ? '' : 's'}`,
          };
        } else {
          // Tie
          result = {
            isTie: true,
            isDraw: false,
            summary: 'Match tied!',
          };
        }
      }
    } else if (isTest) {
      // Test Red Ball / Pink Ball Multi-Innings State Transitions
      if (currentInnings.inningsNumber === 1) {
        // Test Innings 1 Concluded -> Team 2 bats Innings 2
        const innings2 = createInitialInningsState(
          2,
          state.config.team2.id,
          state.config.team1.id,
          state.config.team2.lineup as any,
          state.config.team1.lineup as any,
        );
        updatedInningsArray.push(innings2);
        nextInningsIndex = 1;
        oversSinceNewBall = 0;
        nextBallWear = 0.05;
      } else if (currentInnings.inningsNumber === 2) {
        // Test Innings 2 Concluded -> Evaluate Follow-On
        const inn1 = updatedInningsArray[0];
        const inn2 = updatedInnings;
        const deficit = inn1.totalRuns - inn2.totalRuns;

        // If Team 2 is behind by 200+ runs, follow-on is eligible
        if (deficit >= 200) {
          isFollowOnEligible = true;
          // Follow-on is captain's OPTIONAL decision:
          const shouldEnforce =
            action?.enforceFollowOn !== undefined
              ? action.enforceFollowOn
              : (deficit >= 240 || inn2.completedOvers < 90);

          if (shouldEnforce) {
            isFollowOnEnforced = true;
            // Team 2 bats again in Innings 3
            const innings3 = createInitialInningsState(
              3,
              state.config.team2.id,
              state.config.team1.id,
              state.config.team2.lineup as any,
              state.config.team1.lineup as any,
            );
            updatedInningsArray.push({
              ...innings3,
              isFollowOn: true,
              leadOrDeficit: -deficit,
            });
          } else {
            isFollowOnEnforced = false;
            // Captain opted not to enforce follow-on: Team 1 bats again in Innings 3
            const innings3 = createInitialInningsState(
              3,
              state.config.team1.id,
              state.config.team2.id,
              state.config.team1.lineup as any,
              state.config.team2.lineup as any,
            );
            updatedInningsArray.push({
              ...innings3,
              isFollowOn: false,
              leadOrDeficit: deficit,
            });
          }
        } else {
          isFollowOnEligible = false;
          isFollowOnEnforced = false;
          // Standard: Team 1 bats again in Innings 3
          const innings3 = createInitialInningsState(
            3,
            state.config.team1.id,
            state.config.team2.id,
            state.config.team1.lineup as any,
            state.config.team2.lineup as any,
          );
          updatedInningsArray.push({
            ...innings3,
            isFollowOn: false,
            leadOrDeficit: deficit,
          });
        }
        nextInningsIndex = 2;
        oversSinceNewBall = 0;
        nextBallWear = 0.05;
        isNewBallAvailable = false;
      } else if (currentInnings.inningsNumber === 3) {
        // Test Innings 3 Concluded
        const inn1 = updatedInningsArray[0];
        const inn2 = updatedInningsArray[1];
        const inn3 = updatedInnings;

        if (isFollowOnEnforced) {
          // Team 2 batted Innings 2 and 3
          const team2Aggregate = inn2.totalRuns + inn3.totalRuns;
          if (team2Aggregate < inn1.totalRuns) {
            // Team 1 wins by innings and runs!
            const inningsMargin = inn1.totalRuns - team2Aggregate;
            matchStatus = 'COMPLETED';
            result = {
              winningTeamId: state.config.team1.id,
              marginRuns: inningsMargin,
              isInningsWin: true,
              isTie: false,
              isDraw: false,
              summary: `${state.config.team1.name} won by an innings and ${inningsMargin} run${inningsMargin === 1 ? '' : 's'}`,
            };
          } else {
            // Team 2 erased deficit and set target for Team 1
            const targetRuns = team2Aggregate - inn1.totalRuns + 1;
            const innings4 = createInitialInningsState(
              4,
              state.config.team1.id,
              state.config.team2.id,
              state.config.team1.lineup as any,
              state.config.team2.lineup as any,
              targetRuns,
            );
            updatedInningsArray.push(innings4);
            nextInningsIndex = 3;
            oversSinceNewBall = 0;
            nextBallWear = 0.05;
          }
        } else {
          // Standard Test: Team 1 batted Innings 1 and 3
          const team1Aggregate = inn1.totalRuns + inn3.totalRuns;
          const lead = team1Aggregate - inn2.totalRuns;
          if (lead > 0) {
            const targetRuns = lead + 1;
            const innings4 = createInitialInningsState(
              4,
              state.config.team2.id,
              state.config.team1.id,
              state.config.team2.lineup as any,
              state.config.team1.lineup as any,
              targetRuns,
            );
            updatedInningsArray.push(innings4);
            nextInningsIndex = 3;
            oversSinceNewBall = 0;
            nextBallWear = 0.05;
          } else {
            // Extremely rare: Team 2 already ahead after 1st innings
            matchStatus = 'COMPLETED';
            result = {
              winningTeamId: state.config.team2.id,
              marginWickets: 10,
              isTie: false,
              isDraw: false,
              summary: `${state.config.team2.name} won by 10 wickets`,
            };
          }
        }
      } else if (currentInnings.inningsNumber === 4) {
        // Test Innings 4 Concluded -> Match Completed!
        matchStatus = 'COMPLETED';
        const inn4 = updatedInnings;
        const chasingTeamId = inn4.battingTeamId;
        const defendingTeamId = inn4.bowlingTeamId;
        const chasingTeamName =
          chasingTeamId === state.config.team1.id ? state.config.team1.name : state.config.team2.name;
        const defendingTeamName =
          defendingTeamId === state.config.team1.id ? state.config.team1.name : state.config.team2.name;

        const target = inn4.targetRuns ?? 0;
        if (inn4.totalRuns >= target) {
          const wicketsLeft = 10 - inn4.totalWickets;
          result = {
            winningTeamId: chasingTeamId,
            marginWickets: wicketsLeft,
            isTie: false,
            isDraw: false,
            summary: `${chasingTeamName} won by ${wicketsLeft} wicket${wicketsLeft === 1 ? '' : 's'}`,
          };
        } else if (inn4.totalWickets >= 10) {
          const runDeficit = target - 1 - inn4.totalRuns;
          if (runDeficit > 0) {
            result = {
              winningTeamId: defendingTeamId,
              marginRuns: runDeficit,
              isTie: false,
              isDraw: false,
              summary: `${defendingTeamName} won by ${runDeficit} run${runDeficit === 1 ? '' : 's'}`,
            };
          } else {
            result = {
              isTie: true,
              isDraw: false,
              summary: 'Match tied!',
            };
          }
        }
      }
    }
  }

  // Check 5-Day Stumps Draw condition for Test matches
  if (isTest && currentDay && currentDay > 5 && matchStatus !== 'COMPLETED') {
    matchStatus = 'COMPLETED';
    result = {
      isTie: false,
      isDraw: true,
      summary: 'Match drawn (Day 5 overs concluded)',
    };
  }

  const nextState: MatchState = {
    ...state,
    status: matchStatus,
    currentInningsIndex: nextInningsIndex,
    innings: updatedInningsArray,
    ballWearIndex: Math.round(nextBallWear * 1000) / 1000,
    pitchWearIndex: Math.round(nextPitchWear * 1000) / 1000,
    currentDayNumber: currentDay,
    currentSessionNumber: currentSession,
    sessionOversBowled: sessionOvers,
    sessionElapsedMinutes,
    isAdditionalTimeActive,
    isNewBallAvailable,
    isFollowOnEligible,
    oversSinceNewBall,
    isFollowOnEnforced,
    stopClockSeconds,
    stopClockWarnings,
    result,
  };

  // 16. Verify Domain Invariants
  verifyMatchInvariants(nextState);

  return {
    nextState,
    event,
  };
}

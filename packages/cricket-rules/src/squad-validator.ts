import type {
  MatchFormat,
  PlayerSquadContext,
  SquadValidationIssue,
  SquadValidationResult,
  DreamTeamPlayerSlotInput,
} from '@cricket/shared-types';

export interface SquadValidationOptions {
  /**
   * If true, validates whether the squad is ready to play a live match.
   * If false, allows incomplete drafts (e.g. 5/11 players) without failing on squad size.
   */
  requireMatchReady?: boolean;
}

/**
 * Checks whether a player provides a realistic bowling option.
 * Evaluates format-specific bowling rating and style rather than relying solely on nominal role.
 */
export function isRealisticBowlingOption(
  slot: DreamTeamPlayerSlotInput,
  context?: PlayerSquadContext,
): boolean {
  // If explicitly flagged with bowling priority 1-7
  if (slot.bowlingPriority !== undefined && slot.bowlingPriority !== null && slot.bowlingPriority > 0) {
    return true;
  }

  if (!context) {
    return false;
  }

  // Wicketkeeper with gloves does not bowl
  if (slot.isDesignatedWicketkeeper) {
    return false;
  }

  // Bowling rating >= 40 indicates practical match utility
  if (context.formatRating && context.formatRating.bowlingRating >= 40) {
    return true;
  }

  // Recognized bowling role
  const role = context.primaryRole;
  if (
    role === 'PACE_BOWLER' ||
    role === 'SPIN_BOWLER' ||
    role === 'BOWLING_ALL_ROUNDER' ||
    role === 'BATTING_ALL_ROUNDER'
  ) {
    return true;
  }

  // Has recognized non-NONE bowling action
  if (context.bowlingStyle && context.bowlingStyle !== 'NONE') {
    return true;
  }

  return false;
}

/**
 * Minimum required bowling resources to fulfill over quotas by format.
 */
export function getRequiredBowlersForFormat(format: MatchFormat): number {
  switch (format) {
    case 'T10':
    case 'T20':
    case 'ODI':
      return 5; // Quota requires at least 5 distinct bowling options
    case 'TEST_RED_BALL':
    case 'TEST_PINK_BALL':
      return 4; // Multi-day sustained spells require at least 4 frontline options
  }
}

/**
 * Authoritative Squad Validation Engine
 * Validates a playing XI lineup against official cricket laws, format rules, and tactical constraints.
 */
export function validateDreamTeamSquad(
  format: MatchFormat,
  lineup: readonly DreamTeamPlayerSlotInput[],
  playerContexts?: ReadonlyMap<string, PlayerSquadContext>,
  options: SquadValidationOptions = { requireMatchReady: true },
): SquadValidationResult {
  const errors: SquadValidationIssue[] = [];
  const warnings: SquadValidationIssue[] = [];

  const isMatchReadyRequired = options.requireMatchReady ?? true;

  // 1. Squad Size Validation
  const count = lineup.length;
  if (isMatchReadyRequired) {
    if (count !== 11) {
      errors.push({
        code: 'SQUAD_SIZE_INVALID',
        message: `A match-ready Playing XI must contain exactly 11 players. Found: ${count}.`,
        severity: 'HARD_ERROR',
        suggestedCorrection: count < 11 ? `Add ${11 - count} more players` : `Remove ${count - 11} players`,
      });
    }
  } else {
    if (count > 11) {
      errors.push({
        code: 'SQUAD_SIZE_INVALID',
        message: `A squad cannot exceed 11 players. Found: ${count}.`,
        severity: 'HARD_ERROR',
        suggestedCorrection: `Remove ${count - 11} players`,
      });
    }
  }

  // 2. Duplicate Player Detection
  const seenPlayerIds = new Set<string>();
  const duplicatePlayerIds = new Set<string>();

  for (const slot of lineup) {
    if (seenPlayerIds.has(slot.playerId)) {
      duplicatePlayerIds.add(slot.playerId);
    }
    seenPlayerIds.add(slot.playerId);
  }

  for (const dupId of duplicatePlayerIds) {
    errors.push({
      code: 'DUPLICATE_PLAYER',
      message: `Player appears multiple times in the playing XI.`,
      severity: 'HARD_ERROR',
      playerId: dupId,
      suggestedCorrection: 'Replace the duplicate entry with another cricketer',
    });
  }

  // 3. Batting Order Range and Uniqueness
  const seenBattingOrders = new Set<number>();
  const duplicateOrders = new Set<number>();

  for (const slot of lineup) {
    if (slot.battingOrder < 1 || slot.battingOrder > 11) {
      errors.push({
        code: 'INVALID_BATTING_ORDER_RANGE',
        message: `Batting position ${slot.battingOrder} is invalid. Must be between 1 and 11.`,
        severity: 'HARD_ERROR',
        battingOrder: slot.battingOrder,
        playerId: slot.playerId,
        suggestedCorrection: 'Assign a valid position between 1 and 11',
      });
    }

    if (seenBattingOrders.has(slot.battingOrder)) {
      duplicateOrders.add(slot.battingOrder);
    }
    seenBattingOrders.add(slot.battingOrder);
  }

  for (const dupOrder of duplicateOrders) {
    errors.push({
      code: 'DUPLICATE_BATTING_ORDER',
      message: `Batting order position ${dupOrder} is assigned to multiple players.`,
      severity: 'HARD_ERROR',
      battingOrder: dupOrder,
      suggestedCorrection: 'Ensure every player holds a unique position from 1 to 11',
    });
  }

  // In match-ready mode, verify all positions 1 through 11 are filled without gaps
  if (isMatchReadyRequired && count === 11) {
    for (let pos = 1; pos <= 11; pos++) {
      if (!seenBattingOrders.has(pos)) {
        errors.push({
          code: 'BATTING_ORDER_GAPS',
          message: `Missing batting position ${pos} in the lineup.`,
          severity: 'HARD_ERROR',
          battingOrder: pos,
          suggestedCorrection: `Assign position ${pos} to an active player`,
        });
      }
    }
  }

  // 4. Wicketkeeper Designation
  const keeperSlots = lineup.filter((s) => s.isDesignatedWicketkeeper);
  const keeperCount = keeperSlots.length;

  if (isMatchReadyRequired && keeperCount === 0) {
    errors.push({
      code: 'MISSING_WICKETKEEPER',
      message: 'At least one player in the starting XI must be a designated wicketkeeper.',
      severity: 'HARD_ERROR',
      suggestedCorrection: 'Select a designated wicketkeeper in your lineup',
    });
  } else if (keeperCount > 1) {
    warnings.push({
      code: 'MULTIPLE_WICKETKEEPERS',
      message: `Multiple wicketkeepers designated (${keeperCount}). Only the first will field behind the stumps; others will field in the outfield.`,
      severity: 'ADVISORY_WARNING',
      suggestedCorrection: 'Designate exactly one primary wicketkeeper',
    });
  }

  // 5. Captaincy
  const captains = lineup.filter((s) => s.isCaptain);
  if (isMatchReadyRequired && captains.length === 0) {
    warnings.push({
      code: 'NO_CAPTAIN_DESIGNATED',
      message: 'No team captain is designated. Tactical leadership will use default AI policy.',
      severity: 'ADVISORY_WARNING',
      suggestedCorrection: 'Select a designated captain',
    });
  } else if (captains.length > 1) {
    errors.push({
      code: 'MULTIPLE_CAPTAINS_DESIGNATED',
      message: `Squad has ${captains.length} captains designated. Exactly one captain is allowed.`,
      severity: 'HARD_ERROR',
      suggestedCorrection: 'Select only one captain',
    });
  }

  // 6. Bowling Quota Resources
  let bowlerCount = 0;
  let pacerCount = 0;
  let spinnerCount = 0;

  for (const slot of lineup) {
    const ctx = playerContexts?.get(slot.playerId);
    if (isRealisticBowlingOption(slot, ctx)) {
      bowlerCount++;
      if (ctx) {
        if (ctx.bowlingStyle.includes('FAST') || ctx.bowlingStyle.includes('MEDIUM') || ctx.primaryRole === 'PACE_BOWLER') {
          pacerCount++;
        }
        if (ctx.bowlingStyle.includes('BREAK') || ctx.bowlingStyle.includes('ORTHODOX') || ctx.primaryRole === 'SPIN_BOWLER') {
          spinnerCount++;
        }
      }
    }

    // Format rating check
    if (ctx && !ctx.formatRating) {
      errors.push({
        code: 'MISSING_FORMAT_RATING',
        message: `Player ${ctx.displayName} does not have a valid rating for ${format}.`,
        severity: 'HARD_ERROR',
        playerId: slot.playerId,
      });
    }
  }

  const requiredBowlers = getRequiredBowlersForFormat(format);
  if (isMatchReadyRequired && bowlerCount < requiredBowlers) {
    errors.push({
      code: 'INSUFFICIENT_BOWLING_RESOURCES',
      message: `Insufficient bowling resources for ${format}. Requires at least ${requiredBowlers} bowling options to satisfy over quotas. Found: ${bowlerCount}.`,
      severity: 'HARD_ERROR',
      suggestedCorrection: `Add at least ${requiredBowlers - bowlerCount} recognized bowler(s) or all-rounder(s)`,
    });
  }

  // 7. Tactical Advisory Warnings
  if (isMatchReadyRequired && bowlerCount >= requiredBowlers) {
    if (spinnerCount === 0) {
      warnings.push({
        code: 'INSUFFICIENT_SPIN_OPTIONS',
        message: 'No spin bowling options selected. Team will be vulnerable on turning or dusty pitch conditions.',
        severity: 'ADVISORY_WARNING',
        suggestedCorrection: 'Consider adding at least one off-break or leg-break spinner',
      });
    }
    if (pacerCount < 2) {
      warnings.push({
        code: 'INSUFFICIENT_PACE_OPTIONS',
        message: 'Fewer than 2 pace bowling options selected. Team will lack penetration on green or bouncy tracks.',
        severity: 'ADVISORY_WARNING',
        suggestedCorrection: 'Consider adding a fast or medium-fast seamer',
      });
    }
  }

  // Tail length check: positions 8-11
  if (playerContexts && count === 11) {
    const tailSlots = lineup.filter((s) => s.battingOrder >= 8);
    let tailBatSum = 0;
    let tailKnown = 0;
    for (const ts of tailSlots) {
      const ctx = playerContexts.get(ts.playerId);
      if (ctx?.formatRating) {
        tailBatSum += ctx.formatRating.battingRating;
        tailKnown++;
      }
    }
    if (tailKnown >= 3 && tailBatSum / tailKnown < 32) {
      warnings.push({
        code: 'TAIL_TOO_LONG',
        message: 'Lower order batting (positions 8–11) is fragile with minimal batting depth.',
        severity: 'ADVISORY_WARNING',
        suggestedCorrection: 'Consider selecting bowling all-rounders who can bat',
      });
    }
  }

  const isValid = errors.length === 0;
  const isMatchReady = isValid && count === 11;

  return {
    isValid,
    isMatchReady,
    errors,
    warnings,
    summary: {
      playerCount: count,
      keeperCount,
      bowlerCount,
      captainCount: captains.length,
    },
  };
}

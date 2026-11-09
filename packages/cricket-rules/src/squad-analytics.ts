import type {
  MatchFormat,
  DreamTeamPlayerSlotInput,
  PlayerSquadContext,
  SquadAnalyticsResult,
  SquadDimensionScore,
  SquadDimensionGrade,
} from '@cricket/shared-types';

function scoreToGrade(score: number): SquadDimensionGrade {
  if (score >= 85) return 'ELITE';
  if (score >= 70) return 'STRONG';
  if (score >= 55) return 'BALANCED';
  if (score >= 40) return 'VULNERABLE';
  return 'CRITICAL';
}

function clamp(val: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, Math.round(val)));
}

function isPaceStyle(style?: string): boolean {
  if (!style) return false;
  return [
    'RIGHT_ARM_FAST',
    'RIGHT_ARM_FAST_MEDIUM',
    'RIGHT_ARM_MEDIUM_FAST',
    'RIGHT_ARM_MEDIUM',
    'LEFT_ARM_FAST',
    'LEFT_ARM_FAST_MEDIUM',
    'LEFT_ARM_MEDIUM_FAST',
    'LEFT_ARM_MEDIUM',
  ].includes(style);
}

function isSpinStyle(style?: string): boolean {
  if (!style) return false;
  return [
    'RIGHT_ARM_OFF_BREAK',
    'RIGHT_ARM_LEG_BREAK',
    'LEFT_ARM_ORTHODOX',
    'LEFT_ARM_UNORTHODOX',
  ].includes(style);
}

/**
 * Computes an 8-dimension tactical analytics profile for a cricket squad.
 */
export function calculateSquadAnalytics(
  format: MatchFormat,
  lineup: readonly DreamTeamPlayerSlotInput[],
  playerContexts: Map<string, PlayerSquadContext>
): SquadAnalyticsResult {
  const sorted = [...lineup].sort((a, b) => a.battingOrder - b.battingOrder);

  // Helper to get format rating
  const getFormatRating = (slot: DreamTeamPlayerSlotInput) => {
    const ctx = playerContexts.get(slot.playerId);
    return ctx?.formatRating ?? ctx?.ratings?.[format];
  };

  // 1. Batting Strength (Top 7)
  const top7Weights = [0.18, 0.18, 0.20, 0.16, 0.12, 0.09, 0.07];
  let weightedBattingSum = 0;
  let weightSum = 0;

  for (let i = 0; i < 7; i++) {
    const slot = sorted.find((s) => s.battingOrder === i + 1);
    const weight = top7Weights[i];
    if (slot) {
      const r = getFormatRating(slot);
      weightedBattingSum += (r?.battingRating ?? 50) * weight;
    } else {
      weightedBattingSum += 30 * weight; // Unfilled slot penalty
    }
    weightSum += weight;
  }
  const battingScore = clamp(weightedBattingSum / weightSum);

  // Collect Pace and Spin Bowlers
  const paceRatings: number[] = [];
  const spinRatings: number[] = [];
  const allBowlerRatings: number[] = [];

  let keeperFielding = 60;
  let totalFielding = 0;
  let genuineAllRoundersCount = 0;
  let allRounderQualitySum = 0;

  for (const slot of sorted) {
    const ctx = playerContexts.get(slot.playerId);
    const r = getFormatRating(slot);
    const bat = r?.battingRating ?? 50;
    const bowl = r?.bowlingRating ?? 50;
    const fld = r?.fieldingRating ?? 55;

    totalFielding += fld;

    if (slot.isDesignatedWicketkeeper) {
      keeperFielding = fld;
    }

    // Check All-Rounder
    const isAllRounderRole =
      ctx?.primaryRole === 'BATTING_ALL_ROUNDER' ||
      ctx?.primaryRole === 'BOWLING_ALL_ROUNDER';

    if (isAllRounderRole || (bat >= 60 && bowl >= 50)) {
      genuineAllRoundersCount++;
      allRounderQualitySum += (bat + bowl) / 2;
    }

    // Classify Bowlers
    const isPace = isPaceStyle(ctx?.bowlingStyle) || ctx?.primaryRole === 'PACE_BOWLER';
    const isSpin = isSpinStyle(ctx?.bowlingStyle) || ctx?.primaryRole === 'SPIN_BOWLER';

    if (isPace) {
      paceRatings.push(bowl);
    } else if (isSpin) {
      spinRatings.push(bowl);
    }

    if (bowl >= 40 || slot.bowlingPriority) {
      allBowlerRatings.push(bowl);
    }
  }

  paceRatings.sort((a, b) => b - a);
  spinRatings.sort((a, b) => b - a);
  allBowlerRatings.sort((a, b) => b - a);

  // 2. Pace Threat (Top 3 pace options)
  const p1 = paceRatings[0] ?? 25;
  const p2 = paceRatings[1] ?? 25;
  const p3 = paceRatings[2] ?? 25;
  const paceScore = clamp(p1 * 0.5 + p2 * 0.3 + p3 * 0.2);

  // 3. Spin Threat (Top 2 spin options)
  const s1 = spinRatings[0] ?? 20;
  const s2 = spinRatings[1] ?? (spinRatings.length === 1 ? 25 : 20);
  const spinScore = clamp(s1 * 0.65 + s2 * 0.35);

  // 4. Bowling Depth (5th, 6th, 7th bowling options)
  const b5 = allBowlerRatings[4] ?? 30;
  const b6 = allBowlerRatings[5] ?? 25;
  const b7 = allBowlerRatings[6] ?? 20;
  const depthScore = clamp(b5 * 0.5 + b6 * 0.3 + b7 * 0.2);

  // 5. Fielding Strength
  const avgTeamFielding = sorted.length > 0 ? totalFielding / sorted.length : 50;
  const fieldingScore = clamp(keeperFielding * 0.3 + avgTeamFielding * 0.7);

  // 6. All-Rounder Balance
  let allRounderScore = 30;
  if (genuineAllRoundersCount >= 3) {
    allRounderScore = clamp(75 + (allRounderQualitySum / genuineAllRoundersCount - 50) * 0.5);
  } else if (genuineAllRoundersCount === 2) {
    allRounderScore = clamp(65 + (allRounderQualitySum / 2 - 50) * 0.4);
  } else if (genuineAllRoundersCount === 1) {
    allRounderScore = clamp(50 + (allRounderQualitySum - 50) * 0.3);
  }

  // 7. Lower-Order Batting (Positions 8 to 11)
  let tailBattingSum = 0;
  let tailCount = 0;
  for (let i = 8; i <= 11; i++) {
    const slot = sorted.find((s) => s.battingOrder === i);
    if (slot) {
      const r = getFormatRating(slot);
      tailBattingSum += r?.battingRating ?? 35;
      tailCount++;
    }
  }
  const tailScore = clamp(tailCount > 0 ? tailBattingSum / tailCount : 30);

  // 8. Overall Squad Balance
  // Penalize missing either pace or spin completely
  let penalty = 0;
  if (paceRatings.length === 0) penalty += 15;
  if (spinRatings.length === 0) penalty += 15;
  if (allBowlerRatings.length < 5) penalty += 10;

  const rawBalance =
    battingScore * 0.25 +
    paceScore * 0.2 +
    spinScore * 0.15 +
    depthScore * 0.15 +
    fieldingScore * 0.1 +
    allRounderScore * 0.1 +
    tailScore * 0.05;

  const overallBalance = clamp(rawBalance - penalty);

  const makeDim = (
    code: string,
    name: string,
    score: number,
    description: string
  ): SquadDimensionScore => ({
    code,
    name,
    score,
    grade: scoreToGrade(score),
    description,
  });

  return {
    overallBalance,
    dimensions: {
      battingStrength: makeDim(
        'BATTING_STRENGTH',
        'Batting Strength',
        battingScore,
        `Top 7 order evaluated at rating ${battingScore} (${scoreToGrade(battingScore)}).`
      ),
      paceThreat: makeDim(
        'PACE_THREAT',
        'Pace Threat',
        paceScore,
        `${paceRatings.length} recognized pace options, primary pace strike at ${p1}.`
      ),
      spinThreat: makeDim(
        'SPIN_THREAT',
        'Spin Threat',
        spinScore,
        `${spinRatings.length} recognized spin options, primary turn control at ${s1}.`
      ),
      bowlingDepth: makeDim(
        'BOWLING_DEPTH',
        'Bowling Depth',
        depthScore,
        `Quota resilience through 5th (${b5}) and 6th (${b6}) options.`
      ),
      fieldingStrength: makeDim(
        'FIELDING_STRENGTH',
        'Fielding Strength',
        fieldingScore,
        `Composite wicketkeeper glovework and outfield agility rated at ${fieldingScore}.`
      ),
      allRounderBalance: makeDim(
        'ALL_ROUNDER_BALANCE',
        'All-Rounder Balance',
        allRounderScore,
        `${genuineAllRoundersCount} dual-discipline players providing tactical flexibility.`
      ),
      lowerOrderBatting: makeDim(
        'LOWER_ORDER_BATTING',
        'Lower-Order Batting',
        tailScore,
        `Positions 8-11 run contribution and resilience rated at ${tailScore}.`
      ),
      overallSquadBalance: makeDim(
        'OVERALL_SQUAD_BALANCE',
        'Overall Squad Balance',
        overallBalance,
        `Synthesized squad equilibrium index: ${overallBalance}/100.`
      ),
    },
    summary: `Squad exhibits ${scoreToGrade(overallBalance)} tactical equilibrium (${overallBalance}/100) with ${paceRatings.length} pace and ${spinRatings.length} spin options.`,
  };
}

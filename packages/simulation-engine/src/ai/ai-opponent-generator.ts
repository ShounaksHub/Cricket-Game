import type {
  MatchFormat,
  DreamTeamPlayerSlotInput,
  PlayerSquadContext,
} from '@cricket/shared-types';
import { DeterministicPRNG } from '../prng/splitmix64.js';

export type AIDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type PitchType = 'HARD' | 'FLAT' | 'TURNING' | 'GREEN' | 'DUSTY';

export interface AIOpponentGenerationOptions {
  userLineup?: readonly DreamTeamPlayerSlotInput[];
  difficulty?: AIDifficulty;
  pitchType?: PitchType;
  format?: MatchFormat;
  seed?: bigint;
}

export interface AIOpponentTeamResult {
  id: string;
  name: string;
  difficulty: AIDifficulty;
  lineup: DreamTeamPlayerSlotInput[];
  captainPlayerId: string;
  wicketkeeperPlayerId: string;
  strategyRationale: string;
  tacticalTraits: {
    paceEmphasis: number;
    spinEmphasis: number;
    aggressionLevel: 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE';
    counterSelectionReason?: string;
  };
}

/**
 * Intelligent AI Opponent Squad Generator
 * Synthesizes an authoritative, role-balanced 11-player AI Dream Team
 * tailored to match format, pitch conditions, difficulty level, and user squad profile.
 * Guarantees zero duplicate player overlap with the user's squad.
 */
export function generateAIOpponentTeam(
  allPlayerProfiles: ReadonlyMap<string, PlayerSquadContext> | PlayerSquadContext[],
  options: AIOpponentGenerationOptions = {},
): AIOpponentTeamResult {
  const difficulty: AIDifficulty = options.difficulty || 'MEDIUM';
  const pitchType: PitchType = options.pitchType || 'HARD';
  const format: MatchFormat = options.format || 'T20';
  const seed = options.seed ?? BigInt(987654321);
  const prng = new DeterministicPRNG(seed);

  // Normalize profiles map
  const profilesMap = new Map<string, PlayerSquadContext>();
  if (Array.isArray(allPlayerProfiles)) {
    for (const p of allPlayerProfiles) {
      profilesMap.set(p.id, p);
    }
  } else {
    for (const [id, p] of allPlayerProfiles.entries()) {
      profilesMap.set(id, p);
    }
  }

  // Exclude user players to guarantee zero overlap
  const userPlayerIds = new Set(options.userLineup?.map((s) => s.playerId) ?? []);
  const availablePool: PlayerSquadContext[] = [];

  for (const [id, profile] of profilesMap.entries()) {
    if (!userPlayerIds.has(id)) {
      availablePool.push(profile);
    }
  }

  if (availablePool.length < 11) {
    throw new Error(
      `Insufficient available players to generate AI opponent. Required: 11, Available: ${availablePool.length}`,
    );
  }

  // 1. Analyze User Lineup Weaknesses & Tendencies
  let userLhbCount = 0;
  let userRhbCount = 0;
  if (options.userLineup && options.userLineup.length > 0) {
    for (const slot of options.userLineup) {
      const p = profilesMap.get(slot.playerId);
      if (p) {
        if (p.battingHand === 'LEFT_HAND') userLhbCount++;
        else userRhbCount++;
      }
    }
  }

  // 2. Determine Strategy & Composition Targets based on Pitch & Difficulty
  let paceTarget = 3;
  let spinTarget = 2;
  let aggression: 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE' = 'BALANCED';
  let counterReason = '';

  if (pitchType === 'TURNING' || pitchType === 'DUSTY') {
    spinTarget = difficulty === 'HARD' ? 3 : 2;
    paceTarget = difficulty === 'HARD' ? 2 : 3;
    counterReason = `Exploiting ${pitchType.toLowerCase()} wicket with spin stranglehold and tactical drift.`;
  } else if (pitchType === 'GREEN') {
    paceTarget = difficulty === 'HARD' ? 4 : 3;
    spinTarget = difficulty === 'HARD' ? 1 : 2;
    counterReason = 'Deploying seam attack to maximize lateral deviation and bounce on green surface.';
  } else if (pitchType === 'FLAT') {
    paceTarget = 3;
    spinTarget = 2;
    aggression = difficulty === 'EASY' ? 'BALANCED' : 'AGGRESSIVE';
    counterReason = 'Loading top-order boundary hitters to exploit high-scoring flat track.';
  } else {
    // HARD pitch
    paceTarget = 3;
    spinTarget = 2;
    counterReason = 'Balanced pace-spin equilibrium on true-bounce hard wicket.';
  }

  if (difficulty === 'HARD') {
    aggression = 'AGGRESSIVE';
    if (userRhbCount >= 6) {
      counterReason += ` Targeted user right-hand heavy order (${userRhbCount} RHBs) with off-spin / leg-break variations.`;
    } else if (userLhbCount >= 4) {
      counterReason += ` Targeted user left-hand order (${userLhbCount} LHBs) with off-break control and left-arm angle.`;
    }
  } else if (difficulty === 'EASY') {
    aggression = 'CONSERVATIVE';
    counterReason = 'Classic, entertaining legacy squad with balanced format representation.';
  }

  // Helper to rate a player for a role and format
  const getRating = (p: PlayerSquadContext) => {
    return p.formatRating?.overallRating ?? 75;
  };

  const getBowlingRating = (p: PlayerSquadContext) => {
    return p.formatRating?.bowlingRating ?? 50;
  };

  const getBattingRating = (p: PlayerSquadContext) => {
    return p.formatRating?.battingRating ?? 50;
  };

  // 3. Partition Candidates by Role
  const keepers = availablePool
    .filter((p) => p.isWicketkeeper || p.primaryRole === 'WICKETKEEPER_BATTER')
    .sort((a, b) => getRating(b) - getRating(a));

  const topOrderBatters = availablePool
    .filter((p) => p.primaryRole === 'TOP_ORDER_BATTER')
    .sort((a, b) => getBattingRating(b) - getBattingRating(a));

  const middleOrderBatters = availablePool
    .filter((p) => p.primaryRole === 'MIDDLE_ORDER_BATTER')
    .sort((a, b) => getBattingRating(b) - getBattingRating(a));

  const allRounders = availablePool
    .filter((p) => p.primaryRole === 'BATTING_ALL_ROUNDER' || p.primaryRole === 'BOWLING_ALL_ROUNDER')
    .sort((a, b) => getRating(b) - getRating(a));

  const pacers = availablePool
    .filter((p) => p.primaryRole === 'PACE_BOWLER' || p.bowlingStyle.includes('FAST') || p.bowlingStyle.includes('MEDIUM'))
    .sort((a, b) => getBowlingRating(b) - getBowlingRating(a));

  const spinners = availablePool
    .filter((p) => p.primaryRole === 'SPIN_BOWLER' || p.bowlingStyle.includes('BREAK') || p.bowlingStyle.includes('ORTHODOX'))
    .sort((a, b) => getBowlingRating(b) - getBowlingRating(a));

  // 4. Assemble the Starting XI
  const selectedPlayers: PlayerSquadContext[] = [];
  const selectedIds = new Set<string>();

  const pickCandidate = (pool: PlayerSquadContext[]): PlayerSquadContext | null => {
    for (const c of pool) {
      if (!selectedIds.has(c.id)) {
        selectedIds.add(c.id);
        selectedPlayers.push(c);
        return c;
      }
    }
    return null;
  };

  // Step A: Pick 1 Primary Wicketkeeper
  let wk = pickCandidate(keepers);
  if (!wk) {
    // Fallback: pick any player with wicketkeeper skill or highest fielding
    wk = pickCandidate(availablePool.filter((p) => p.isWicketkeeper)) || pickCandidate(availablePool)!;
  }

  // Step B: Pick Frontline Pacers
  for (let i = 0; i < paceTarget; i++) {
    pickCandidate(pacers);
  }

  // Step C: Pick Frontline Spinners
  for (let i = 0; i < spinTarget; i++) {
    pickCandidate(spinners);
  }

  // Step D: Pick All-Rounders (aim for 2)
  for (let i = 0; i < 2; i++) {
    pickCandidate(allRounders);
  }

  // Step E: Pick Specialist Batters (Top and Middle) to fill remaining slots up to 11
  while (selectedPlayers.length < 11) {
    const nextBatter = pickCandidate(topOrderBatters) || pickCandidate(middleOrderBatters) || pickCandidate(availablePool);
    if (!nextBatter) break;
  }

  // If still under 11, backfill from available pool
  while (selectedPlayers.length < 11) {
    const filler = pickCandidate(availablePool);
    if (!filler) break;
  }

  // 5. Organize Batting Order & Roles
  // Separate into batters, keeper, all-rounders, bowlers
  const pureBatters = selectedPlayers.filter(
    (p) => p.id !== wk.id && (p.primaryRole === 'TOP_ORDER_BATTER' || p.primaryRole === 'MIDDLE_ORDER_BATTER'),
  );
  const selectedARs = selectedPlayers.filter(
    (p) => p.id !== wk.id && (p.primaryRole === 'BATTING_ALL_ROUNDER' || p.primaryRole === 'BOWLING_ALL_ROUNDER'),
  );
  const selectedBowlers = selectedPlayers.filter(
    (p) => p.id !== wk.id && !pureBatters.includes(p) && !selectedARs.includes(p),
  );

  // Sort batters by batting rating descending
  pureBatters.sort((a, b) => getBattingRating(b) - getBattingRating(a));
  selectedBowlers.sort((a, b) => getBattingRating(b) - getBattingRating(a)); // Bowlers ordered by batting utility (8-11)

  // Construct structured 1..11 order:
  // 1-4: Top specialist batters
  // 5: Wicketkeeper
  // 6-7: All-rounders
  // 8-11: Frontline bowlers (tail sorted best to least batter)
  const orderedSquad: PlayerSquadContext[] = [];

  // Top 4 batters
  for (let i = 0; i < 4; i++) {
    if (pureBatters.length > 0) {
      orderedSquad.push(pureBatters.shift()!);
    } else if (selectedARs.length > 0) {
      orderedSquad.push(selectedARs.shift()!);
    } else if (selectedBowlers.length > 0) {
      orderedSquad.push(selectedBowlers.shift()!);
    }
  }

  // #5: Wicketkeeper
  orderedSquad.push(wk);

  // #6-7: All-rounders or remaining batters
  while (orderedSquad.length < 7) {
    if (selectedARs.length > 0) {
      orderedSquad.push(selectedARs.shift()!);
    } else if (pureBatters.length > 0) {
      orderedSquad.push(pureBatters.shift()!);
    } else if (selectedBowlers.length > 0) {
      orderedSquad.push(selectedBowlers.shift()!);
    }
  }

  // #8-11: Bowlers
  while (orderedSquad.length < 11) {
    if (selectedBowlers.length > 0) {
      orderedSquad.push(selectedBowlers.shift()!);
    } else if (selectedARs.length > 0) {
      orderedSquad.push(selectedARs.shift()!);
    } else if (pureBatters.length > 0) {
      orderedSquad.push(pureBatters.shift()!);
    }
  }

  // 6. Designate Captain & Bowling Priorities
  // Pick Captain: highest rating or natural leader (e.g. Imran Khan, Steve Smith, Dravid, Ponting, Sangakkara)
  const captainCandidate =
    orderedSquad.find((p) => p.primaryRole === 'TOP_ORDER_BATTER' || p.primaryRole === 'MIDDLE_ORDER_BATTER') ||
    orderedSquad[2] ||
    orderedSquad[0];

  const captainId = captainCandidate.id;
  const keeperId = wk.id;

  // Assign bowling priorities (1 to 5+)
  let pacePriority = 1;
  let spinPriority = 2;

  const lineup: DreamTeamPlayerSlotInput[] = orderedSquad.map((player, idx) => {
    const isCapt = player.id === captainId;
    const isWk = player.id === keeperId;

    let priority: number | null = null;
    const isPace = player.primaryRole === 'PACE_BOWLER' || player.bowlingStyle.includes('FAST') || player.bowlingStyle.includes('MEDIUM');
    const isSpin = player.primaryRole === 'SPIN_BOWLER' || player.bowlingStyle.includes('BREAK') || player.bowlingStyle.includes('ORTHODOX');
    const isAR = player.primaryRole === 'BATTING_ALL_ROUNDER' || player.primaryRole === 'BOWLING_ALL_ROUNDER';

    if (!isWk) {
      if (isPace && pacePriority <= 2) {
        priority = 1; // Opening pace bowler
        pacePriority++;
      } else if (isSpin && spinPriority <= 3) {
        priority = 2; // Primary spin control
        spinPriority++;
      } else if (isAR) {
        priority = 4; // First-change / tactical all-rounder
      } else if (getBowlingRating(player) >= 45) {
        priority = 5; // Backup option
      }
    }

    return {
      playerId: player.id,
      battingOrder: idx + 1,
      isCaptain: isCapt,
      isDesignatedWicketkeeper: isWk,
      bowlingPriority: priority,
    };
  });

  // Team Naming based on difficulty & venue
  const teamNames: Record<AIDifficulty, string> = {
    HARD: 'Apex Legends XI',
    MEDIUM: 'AI World XI',
    EASY: 'Classic All-Stars XI',
  };

  const rationale = `[${difficulty} AI Strategy]: ${counterReason} Designated ${captainCandidate.displayName} as tactical captain and ${wk.displayName} behind the stumps. Configured ${paceTarget} pace and ${spinTarget} spin options for optimal ${format} quota management.`;

  return {
    id: `ai-opponent-${difficulty.toLowerCase()}-${pitchType.toLowerCase()}`,
    name: teamNames[difficulty],
    difficulty,
    lineup,
    captainPlayerId: captainId,
    wicketkeeperPlayerId: keeperId,
    strategyRationale: rationale,
    tacticalTraits: {
      paceEmphasis: Math.round((paceTarget / 5) * 100),
      spinEmphasis: Math.round((spinTarget / 5) * 100),
      aggressionLevel: aggression,
      counterSelectionReason: counterReason,
    },
  };
}

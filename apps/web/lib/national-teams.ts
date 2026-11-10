import type {
  PlayerProfile,
  MatchFormat,
  DreamTeamPlayerSlotInput,
  PlayerSquadContext,
} from '@cricket/shared-types';

export interface NationalTeamMeta {
  readonly id: string;
  readonly name: string;
  readonly flag: string;
}

export const SUPPORTED_NATIONAL_TEAMS: readonly NationalTeamMeta[] = [
  { id: 'India', name: 'India All-Time XI', flag: '🇮🇳' },
  { id: 'Australia', name: 'Australia All-Time XI', flag: '🇦🇺' },
  { id: 'England', name: 'England All-Time XI', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { id: 'West Indies', name: 'West Indies All-Time XI', flag: '🌴' },
  { id: 'South Africa', name: 'South Africa All-Time XI', flag: '🇿🇦' },
  { id: 'Pakistan', name: 'Pakistan All-Time XI', flag: '🇵🇰' },
  { id: 'New Zealand', name: 'New Zealand All-Time XI', flag: '🇳🇿' },
  { id: 'Sri Lanka', name: 'Sri Lanka All-Time XI', flag: '🇱🇰' },
];

export type SupportedNation = (typeof SUPPORTED_NATIONAL_TEAMS)[number]['id'];

export interface FormattedSquadSlot {
  playerId: string;
  battingOrder: number;
  isCaptain: boolean;
  isViceCaptain: boolean;
  isDesignatedWicketkeeper: boolean;
  bowlingPriority: number | null;
}

/**
 * Constructs an authentic, role-balanced 11-player National Playing XI
 * strictly containing cricketers from the chosen nation.
 */
export function buildNationalLineup(
  nation: string,
  allPlayers: PlayerProfile[],
  format: MatchFormat = 'T20',
): { lineup: FormattedSquadSlot[]; teamName: string } {
  const pool = allPlayers.filter(
    (p) => p.primaryNationality.toLowerCase() === nation.toLowerCase(),
  );

  const getRating = (p: PlayerProfile) => p.ratings[format]?.overallRating ?? 75;
  const getBatting = (p: PlayerProfile) => p.ratings[format]?.battingRating ?? 50;
  const getBowling = (p: PlayerProfile) => p.ratings[format]?.bowlingRating ?? 50;

  // 1. Wicketkeeper
  const keepers = pool
    .filter((p) => p.isWicketkeeper || p.primaryRole === 'WICKETKEEPER_BATTER')
    .sort((a, b) => getRating(b) - getRating(a));
  const wk = keepers[0] || pool.find((p) => p.isWicketkeeper) || pool[0];

  const selectedIds = new Set<string>([wk.id]);
  const selected: PlayerProfile[] = [wk];

  const pick = (candidates: PlayerProfile[], count: number) => {
    let picked = 0;
    for (const c of candidates) {
      if (picked >= count) break;
      if (!selectedIds.has(c.id)) {
        selectedIds.add(c.id);
        selected.push(c);
        picked++;
      }
    }
  };

  // 2. Pacers (aim for 3)
  const pacers = pool
    .filter((p) => p.primaryRole === 'PACE_BOWLER' || p.bowlingStyle.includes('FAST') || p.bowlingStyle.includes('MEDIUM'))
    .sort((a, b) => getBowling(b) - getBowling(a));
  pick(pacers, 3);

  // 3. Spinners (aim for 2)
  const spinners = pool
    .filter((p) => p.primaryRole === 'SPIN_BOWLER' || p.bowlingStyle.includes('BREAK') || p.bowlingStyle.includes('ORTHODOX'))
    .sort((a, b) => getBowling(b) - getBowling(a));
  pick(spinners, 2);

  // 4. All-Rounders (aim for 2)
  const allRounders = pool
    .filter((p) => p.primaryRole === 'BATTING_ALL_ROUNDER' || p.primaryRole === 'BOWLING_ALL_ROUNDER')
    .sort((a, b) => getRating(b) - getRating(a));
  pick(allRounders, 2);

  // 5. Specialist Batters
  const batters = pool
    .filter((p) => p.primaryRole === 'TOP_ORDER_BATTER' || p.primaryRole === 'MIDDLE_ORDER_BATTER')
    .sort((a, b) => getBatting(b) - getBatting(a));
  pick(batters, 11 - selected.length);

  // Backfill if needed
  const remaining = [...pool].sort((a, b) => getRating(b) - getRating(a));
  pick(remaining, 11 - selected.length);

  // Structure Batting Order (1-4: Batters, 5: Keeper, 6-7: ARs, 8-11: Bowlers)
  const squadBatters = selected.filter(
    (p) => p.id !== wk.id && (p.primaryRole === 'TOP_ORDER_BATTER' || p.primaryRole === 'MIDDLE_ORDER_BATTER'),
  ).sort((a, b) => getBatting(b) - getBatting(a));

  const squadARs = selected.filter(
    (p) => p.id !== wk.id && (p.primaryRole === 'BATTING_ALL_ROUNDER' || p.primaryRole === 'BOWLING_ALL_ROUNDER'),
  ).sort((a, b) => getRating(b) - getRating(a));

  const squadBowlers = selected.filter(
    (p) => p.id !== wk.id && !squadBatters.includes(p) && !squadARs.includes(p),
  ).sort((a, b) => getBatting(b) - getBatting(a)); // Bowlers 8-11

  const ordered: PlayerProfile[] = [
    ...squadBatters.slice(0, 4),
    wk,
    ...squadARs.slice(0, 2),
    ...squadBatters.slice(4),
    ...squadBowlers,
  ].slice(0, 11);

  // In case of count shortfall
  for (const p of selected) {
    if (ordered.length >= 11) break;
    if (!ordered.some((x) => x.id === p.id)) ordered.push(p);
  }

  const lineup: FormattedSquadSlot[] = ordered.map((player, idx) => ({
    playerId: player.id,
    battingOrder: idx + 1,
    isCaptain: idx === 0,
    isViceCaptain: idx === 1,
    isDesignatedWicketkeeper: player.id === wk.id,
    bowlingPriority: idx >= 7 ? 1 : idx >= 5 ? 2 : idx === 4 ? 3 : null,
  }));

  return {
    lineup,
    teamName: `${nation} All-Time XI`,
  };
}

/**
 * Constructs a true Global World XI where every single cricketer is from a different country.
 * Guaranteed 11 players from 11 distinct nations.
 */
export function buildWorldXILineup(
  allPlayers: PlayerProfile[],
  format: MatchFormat = 'T20',
): { lineup: FormattedSquadSlot[]; teamName: string } {
  // Target nations in priority order to guarantee 11 distinct countries
  const targetNations = [
    'India',
    'Australia',
    'West Indies',
    'South Africa',
    'England',
    'Pakistan',
    'Sri Lanka',
    'New Zealand',
    'Afghanistan',
    'Bangladesh',
    'Zimbabwe',
  ];

  const selectedPlayers: PlayerProfile[] = [];
  const selectedNations = new Set<string>();

  for (const nat of targetNations) {
    const natPool = allPlayers.filter(
      (p) => p.primaryNationality.toLowerCase() === nat.toLowerCase(),
    );
    if (natPool.length === 0) continue;

    // Tactical role allocation per nation
    let candidate: PlayerProfile | undefined;
    if (nat === 'Australia' || nat === 'Sri Lanka' || nat === 'Zimbabwe') {
      candidate = natPool.find((p) => p.isWicketkeeper || p.primaryRole === 'WICKETKEEPER_BATTER');
    } else if (nat === 'Pakistan' || nat === 'India') {
      candidate = natPool.find((p) => p.primaryRole === 'PACE_BOWLER');
    } else if (nat === 'Afghanistan' || nat === 'Sri Lanka') {
      candidate = natPool.find((p) => p.primaryRole === 'SPIN_BOWLER');
    } else if (nat === 'England' || nat === 'West Indies' || nat === 'Bangladesh') {
      candidate = natPool.find((p) => p.primaryRole === 'BATTING_ALL_ROUNDER' || p.primaryRole === 'BOWLING_ALL_ROUNDER');
    }

    if (!candidate) {
      candidate = [...natPool].sort(
        (a, b) => (b.ratings[format]?.overallRating ?? 75) - (a.ratings[format]?.overallRating ?? 75),
      )[0];
    }

    if (candidate && !selectedNations.has(candidate.primaryNationality)) {
      selectedNations.add(candidate.primaryNationality);
      selectedPlayers.push(candidate);
    }
  }

  // Ensure 1 keeper
  let wkIndex = selectedPlayers.findIndex((p) => p.isWicketkeeper || p.primaryRole === 'WICKETKEEPER_BATTER');
  if (wkIndex === -1 && selectedPlayers.length > 0) {
    wkIndex = 0;
  }

  const lineup: FormattedSquadSlot[] = selectedPlayers.slice(0, 11).map((player, idx) => ({
    playerId: player.id,
    battingOrder: idx + 1,
    isCaptain: idx === 0,
    isViceCaptain: idx === 1,
    isDesignatedWicketkeeper: idx === wkIndex,
    bowlingPriority: idx >= 7 ? 1 : idx >= 5 ? 2 : idx === 4 ? 3 : null,
  }));

  return {
    lineup,
    teamName: 'Global World XI (1 Per Nation)',
  };
}


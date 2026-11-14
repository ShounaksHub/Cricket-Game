/**
 * Realistic Player Portrait Manifest & Role Fallbacks
 * Keyed by canonical player UUID.
 */

export const REALISTIC_INDIVIDUAL_PORTRAITS: Record<string, string> = {
  "f1e10000-0001-4000-8000-000000000001": "/assets/players/realistic/f1e10000-0001-4000-8000-000000000001.png",
  "f1e10000-0002-4000-8000-000000000002": "/assets/players/realistic/f1e10000-0002-4000-8000-000000000002.png",
  "f1e10000-0003-4000-8000-000000000003": "/assets/players/realistic/f1e10000-0003-4000-8000-000000000003.png",
  "f1e10000-0007-4000-8000-000000000007": "/assets/players/realistic/f1e10000-0007-4000-8000-000000000007.png",
  "f1e10000-0029-4000-8000-000000000029": "/assets/players/realistic/f1e10000-0029-4000-8000-000000000029.png",
  "f1e10000-002b-4000-8000-00000000002b": "/assets/players/realistic/f1e10000-002b-4000-8000-00000000002b.png",
  "f1e10000-0048-4000-8000-000000000048": "/assets/players/realistic/f1e10000-0048-4000-8000-000000000048.png",
  "f1e10000-00f1-4000-8000-0000000000f1": "/assets/players/realistic/f1e10000-00f1-4000-8000-0000000000f1.png",
  "f1e20000-0001-4000-8000-000000000001": "/assets/players/realistic/f1e20000-0001-4000-8000-000000000001.png",
  "f1e20000-0002-4000-8000-000000000002": "/assets/players/realistic/f1e20000-0002-4000-8000-000000000002.png",
  "f1e20000-0003-4000-8000-000000000003": "/assets/players/realistic/f1e20000-0003-4000-8000-000000000003.png",
  "f1e20000-0004-4000-8000-000000000004": "/assets/players/realistic/f1e20000-0004-4000-8000-000000000004.png",
  "f1e20000-0005-4000-8000-000000000005": "/assets/players/realistic/f1e20000-0005-4000-8000-000000000005.png",
  "f1e20000-0006-4000-8000-000000000006": "/assets/players/realistic/f1e20000-0006-4000-8000-000000000006.jpg",
  "f1e20000-0007-4000-8000-000000000007": "/assets/players/realistic/f1e20000-0007-4000-8000-000000000007.png",
  "f1e20000-0008-4000-8000-000000000008": "/assets/players/realistic/f1e20000-0008-4000-8000-000000000008.png",
  "f1e20000-000a-4000-8000-00000000000a": "/assets/players/realistic/f1e20000-000a-4000-8000-00000000000a.jpg",
  "f1e20000-001b-4000-8000-00000000001b": "/assets/players/realistic/f1e20000-001b-4000-8000-00000000001b.png",
  "f1e20000-001f-4000-8000-00000000001f": "/assets/players/realistic/f1e20000-001f-4000-8000-00000000001f.jpg",
  "f1e20000-0030-4000-8000-000000000030": "/assets/players/realistic/f1e20000-0030-4000-8000-000000000030.png"
};

export const REALISTIC_ROLE_FALLBACKS: Record<string, string> = {
  PACE_BOWLER: '/assets/players/realistic/generic-fast-bowler.jpg',
  SPIN_BOWLER: '/assets/players/realistic/generic-spinner.jpg',
  WICKETKEEPER_BATTER: '/assets/players/realistic/generic-wicketkeeper.jpg',
  TOP_ORDER_BATTER: '/assets/players/realistic/generic-batter.jpg',
  MIDDLE_ORDER_BATTER: '/assets/players/realistic/generic-batter.jpg',
  OPENING_BATTER: '/assets/players/realistic/generic-batter.jpg',
  BATTER: '/assets/players/realistic/generic-batter.jpg',
  BATTING_ALL_ROUNDER: '/assets/players/realistic/generic-batter.jpg',
  BOWLING_ALL_ROUNDER: '/assets/players/realistic/generic-fast-bowler.jpg',
  ALL_ROUNDER: '/assets/players/realistic/generic-batter.jpg',
  DEFAULT: '/assets/players/realistic/generic-batter.jpg',
};

export function hasRealisticPortrait(id?: string): boolean {
  if (!id) return false;
  return Boolean(REALISTIC_INDIVIDUAL_PORTRAITS[id]);
}

export function getRealisticFallback(primaryRole?: string): string {
  if (!primaryRole) return REALISTIC_ROLE_FALLBACKS.DEFAULT;
  const normalized = primaryRole.toUpperCase().replace(/\s+/g, '_');
  if (REALISTIC_ROLE_FALLBACKS[normalized]) {
    return REALISTIC_ROLE_FALLBACKS[normalized];
  }
  if (normalized.includes('BOWL') || normalized.includes('PACE') || normalized.includes('FAST') || normalized.includes('SEAM')) {
    return REALISTIC_ROLE_FALLBACKS.PACE_BOWLER;
  }
  if (normalized.includes('SPIN')) {
    return REALISTIC_ROLE_FALLBACKS.SPIN_BOWLER;
  }
  if (normalized.includes('KEEP') || normalized.includes('WK')) {
    return REALISTIC_ROLE_FALLBACKS.WICKETKEEPER_BATTER;
  }
  return REALISTIC_ROLE_FALLBACKS.TOP_ORDER_BATTER;
}

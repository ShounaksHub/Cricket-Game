/**
 * Central Feature Registry & Transparency Configuration
 *
 * Implements strict classification under Phase 9.3.3:
 * - AVAILABLE: Fully implemented, interactive, tested and operational today.
 * - IN_DEVELOPMENT: Actively in development, functional backend or partial prototype exists.
 * - COMING_SOON: High-priority planned feature on the public roadmap.
 *
 * Rule: Never display fake success messages, fake progress bars, or fake sync states.
 */

export type FeatureStatus = 'AVAILABLE' | 'IN_DEVELOPMENT' | 'COMING_SOON';

export type FeatureCategory =
  | 'GAMEPLAY_SIMULATION'
  | 'CAREER_TOURNAMENT'
  | 'ONLINE_IDENTITY'
  | 'BROADCAST_AUDIO';

export interface PlannedFeature {
  id: string;
  name: string;
  category: FeatureCategory;
  status: FeatureStatus;
  shortDescription: string;
  detailedRoadmap: string;
  releaseTarget: string;
  badgeLabel?: string;
}

export const CATEGORY_METADATA: Record<
  FeatureCategory,
  { label: string; description: string; icon: string }
> = {
  GAMEPLAY_SIMULATION: {
    label: 'Match Simulation & Rules Engine',
    description: 'Cricket laws, officiating technology, tactical field control, and match scenarios.',
    icon: '🏏',
  },
  CAREER_TOURNAMENT: {
    label: 'Career & Tournament Modes',
    description: 'Dynamic knockout ladders, franchise leagues, and persistent player legacy.',
    icon: '🏆',
  },
  ONLINE_IDENTITY: {
    label: 'Cloud Sync & Head-to-Head',
    description: 'Cross-device cloud profiles, live PvP matchmaking, and community rosters.',
    icon: '🌐',
  },
  BROADCAST_AUDIO: {
    label: 'Broadcast Audio & Presentation',
    description: 'Ball-strike sound effects, dynamic commentary speech synthesis, and stadium ambiance.',
    icon: '🎙️',
  },
};

export const FEATURE_REGISTRY: Record<string, PlannedFeature> = {
  // Gameplay & Simulation
  'drs-hawk-eye': {
    id: 'drs-hawk-eye',
    name: 'DRS, UltraEdge & Ball Tracking',
    category: 'GAMEPLAY_SIMULATION',
    status: 'COMING_SOON',
    shortDescription: 'Player reviews for LBW and caught-behind decisions with 3D trajectory tracking and audio spike analysis.',
    detailedRoadmap: 'Will integrate with the existing SplitMix64 deterministic physics model to calculate precise impact points on stumps, height over bail, and snickometer contact spikes.',
    releaseTarget: 'Future Update',
  },
  'rain-dls': {
    id: 'rain-dls',
    name: 'Weather Interruptions & DLS Method',
    category: 'GAMEPLAY_SIMULATION',
    status: 'COMING_SOON',
    shortDescription: 'Over reductions, revised targets via the Duckworth-Lewis-Stern algorithm, and wet outfield ball physics.',
    detailedRoadmap: 'Engine implementation of standard DLS resource tables (Resources Remaining vs. Overs & Wickets lost) with dynamic target recalculations during interrupted chases.',
    releaseTarget: 'Future Update',
  },
  'super-over': {
    id: 'super-over',
    name: 'Tiebreaker Super Over',
    category: 'GAMEPLAY_SIMULATION',
    status: 'COMING_SOON',
    shortDescription: 'Single-over tiebreak showdown when scores are level at the conclusion of standard overs.',
    detailedRoadmap: 'Dedicated single-over innings cycle featuring 3 selected batters, 1 nominated bowler, and instant sudden-death victory conditions.',
    releaseTarget: 'Future Update',
  },
  'stop-clock': {
    id: 'stop-clock',
    name: 'ICC Stop Clock & Over Rate Penalties',
    category: 'GAMEPLAY_SIMULATION',
    status: 'COMING_SOON',
    shortDescription: '60-second between-overs clock with automatic fielder boundary restrictions for slow over rates.',
    detailedRoadmap: 'Full in-match visual countdown timer enforcing ICC Law 41.9 with automatic transition to extra-fielder-inside-the-ring penalties on third violation.',
    releaseTarget: 'Future Update',
  },
  'gabba-heist-scenario': {
    id: 'gabba-heist-scenario',
    name: 'The Gabba Heist (Brisbane 2021 Scenario)',
    category: 'GAMEPLAY_SIMULATION',
    status: 'COMING_SOON',
    shortDescription: 'Recreate or rewrite the historic Day 5 chase of 328 runs at the fortress Gabba with depleted squad depth.',
    detailedRoadmap: 'Custom match injector pre-populating day 5 pitch conditions, deteriorating wear, 100 overs remaining, and authentic historical lineups.',
    releaseTarget: 'Future Update',
  },
  'replay-viewer': {
    id: 'replay-viewer',
    name: 'Cinematic Replay Viewer',
    category: 'GAMEPLAY_SIMULATION',
    status: 'IN_DEVELOPMENT',
    shortDescription: 'Ball-by-ball 2D PixiJS playback engine reconstructing saved match delivery timelines.',
    detailedRoadmap: 'The underlying event logs are fully saved in IndexedDB; the UI timeline scrubber and smooth interpolation player are currently being polished.',
    releaseTarget: 'Next Release',
  },

  // Career & Tournament
  'tournament-mode': {
    id: 'tournament-mode',
    name: 'World Cup & Franchise Tournaments',
    category: 'CAREER_TOURNAMENT',
    status: 'COMING_SOON',
    shortDescription: 'Multi-stage group stages, playoff brackets, net run-rate calculations, and trophy celebrations.',
    detailedRoadmap: 'Tournament fixture manager supporting round-robin leagues, knockout qualifiers, and cumulative squad fatigue across 8-to-16 team brackets.',
    releaseTarget: 'Future Update',
  },
  'career-progression': {
    id: 'career-progression',
    name: 'Expanded Player Legacy & Career Progression',
    category: 'CAREER_TOURNAMENT',
    status: 'COMING_SOON',
    shortDescription: 'Persistent player form curves, skill training, archetype evolution, and retirement tributes.',
    detailedRoadmap: 'Form fluctuation algorithm tying match performances to temporary rating bonuses, age curves, and unlockable custom captaincy perks.',
    releaseTarget: 'Future Update',
  },

  // Online & Identity
  'cloud-sync': {
    id: 'cloud-sync',
    name: 'Cloud Profile & Cross-Device Sync',
    category: 'ONLINE_IDENTITY',
    status: 'COMING_SOON',
    shortDescription: 'Secure cloud backups for custom Dream XI squads, match logs, and stats across desktop and mobile.',
    detailedRoadmap: 'Optional end-to-end encrypted roster backup service. The game currently uses robust 100% offline IndexedDB local persistence.',
    releaseTarget: 'Future Update',
  },
  'multiplayer-pvp': {
    id: 'multiplayer-pvp',
    name: 'Head-to-Head Multiplayer PvP',
    category: 'ONLINE_IDENTITY',
    status: 'COMING_SOON',
    shortDescription: 'Real-time peer-to-peer matches against other team captains with simultaneous tactical orders.',
    detailedRoadmap: 'WebRTC/WebSocket match broker facilitating low-latency duel tactical submission without compromising local offline simulation integrity.',
    releaseTarget: 'Future Update',
  },

  // Presentation & Audio
  'commentary-audio': {
    id: 'commentary-audio',
    name: 'Commentary Voice Audio & Dynamic Sound Effects',
    category: 'BROADCAST_AUDIO',
    status: 'COMING_SOON',
    shortDescription: 'Synthesized voice lines, bat-on-ball crack physics sounds, wicket roars, and dynamic crowd applause.',
    detailedRoadmap: 'Procedural Web Audio sound generator for willow strikes, leather seam catches, and boundary roars, complementary to the current electronic OST soundtrack.',
    releaseTarget: 'Future Update',
  },
};

/**
 * Returns list of planned or in-development features
 */
export function getUpcomingFeatures(): PlannedFeature[] {
  return Object.values(FEATURE_REGISTRY).filter(
    (f) => f.status === 'COMING_SOON' || f.status === 'IN_DEVELOPMENT'
  );
}

/**
 * Get features grouped by category
 */
export function getFeaturesByCategory(): Record<FeatureCategory, PlannedFeature[]> {
  const grouped: Record<FeatureCategory, PlannedFeature[]> = {
    GAMEPLAY_SIMULATION: [],
    CAREER_TOURNAMENT: [],
    ONLINE_IDENTITY: [],
    BROADCAST_AUDIO: [],
  };

  for (const feature of Object.values(FEATURE_REGISTRY)) {
    grouped[feature.category].push(feature);
  }

  return grouped;
}

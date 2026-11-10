import { describe, it, expect } from 'vitest';
import {
  generateDeterministicCricketAvatar,
  resolvePlayerImage,
  CANONICAL_BENCHMARK_UUIDS,
} from '../lib/player-image-resolver';

describe('Player Image Resolver & Deterministic Avatar System', () => {
  it('generates a valid SVG data URI for any player', () => {
    const uri = generateDeterministicCricketAvatar({
      id: CANONICAL_BENCHMARK_UUIDS.JASPRIT_BUMRAH,
      fullName: 'Jasprit Bumrah',
      primaryRole: 'PACE_BOWLER',
      primaryNationality: 'India',
    });

    expect(uri).toContain('data:image/svg+xml');
    expect(decodeURIComponent(uri)).toContain('JB');
    expect(decodeURIComponent(uri)).toContain('IND');
  });

  it('generates distinct avatars for batter vs bowler vs wicketkeeper', () => {
    const bumrahUri = generateDeterministicCricketAvatar({
      id: CANONICAL_BENCHMARK_UUIDS.JASPRIT_BUMRAH,
      fullName: 'Jasprit Bumrah',
      primaryRole: 'PACE_BOWLER',
      primaryNationality: 'India',
    });

    const kohliUri = generateDeterministicCricketAvatar({
      id: CANONICAL_BENCHMARK_UUIDS.VIRAT_KOHLI,
      fullName: 'Virat Kohli',
      primaryRole: 'TOP_ORDER_BATTER',
      primaryNationality: 'India',
    });

    const mcgrathUri = generateDeterministicCricketAvatar({
      id: CANONICAL_BENCHMARK_UUIDS.GLENN_MCGRATH,
      fullName: 'Glenn McGrath',
      primaryRole: 'PACE_BOWLER',
      primaryNationality: 'Australia',
    });

    // Avatars must be deterministic and distinct
    expect(bumrahUri).not.toEqual(kohliUri);
    expect(bumrahUri).not.toEqual(mcgrathUri);
    expect(decodeURIComponent(mcgrathUri)).toContain('AUS');
    expect(decodeURIComponent(mcgrathUri)).toContain('GM');
  });

  it('classifies unverified player photos as GENERIC_AVATAR rather than fake authentic', () => {
    const metaBumrah = resolvePlayerImage({
      id: CANONICAL_BENCHMARK_UUIDS.JASPRIT_BUMRAH,
      fullName: 'Jasprit Bumrah',
      primaryRole: 'PACE_BOWLER',
      primaryNationality: 'India',
    });

    const metaMcGrath = resolvePlayerImage({
      id: CANONICAL_BENCHMARK_UUIDS.GLENN_MCGRATH,
      fullName: 'Glenn McGrath',
      primaryRole: 'PACE_BOWLER',
      primaryNationality: 'Australia',
    });

    expect(metaBumrah.classification).toBe('GENERIC_AVATAR');
    expect(metaMcGrath.classification).toBe('GENERIC_AVATAR');
    expect(metaBumrah.src).toContain('data:image/svg+xml');
  });

  it('is completely deterministic given the same inputs', () => {
    const run1 = generateDeterministicCricketAvatar({
      id: CANONICAL_BENCHMARK_UUIDS.SACHIN_TENDULKAR,
      fullName: 'Sachin Tendulkar',
      primaryRole: 'TOP_ORDER_BATTER',
      primaryNationality: 'India',
    });

    const run2 = generateDeterministicCricketAvatar({
      id: CANONICAL_BENCHMARK_UUIDS.SACHIN_TENDULKAR,
      fullName: 'Sachin Tendulkar',
      primaryRole: 'TOP_ORDER_BATTER',
      primaryNationality: 'India',
    });

    expect(run1).toBe(run2);
  });
});

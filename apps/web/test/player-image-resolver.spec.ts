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

  it('resolves registered benchmark players to individual 2D vector portraits and unknown players to GENERIC_AVATAR', () => {
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

    const metaUnknown = resolvePlayerImage({
      id: '00000000-0000-0000-0000-000000000000',
      fullName: 'Local Club Cricketer',
      primaryRole: 'ALL_ROUNDER',
      primaryNationality: 'India',
    });

    // Registered players with 2D cartoon face portraits
    expect(metaBumrah.classification).toBe('GENERATED_ILLUSTRATION');
    expect(metaBumrah.src).toBe(`/assets/players/${CANONICAL_BENCHMARK_UUIDS.JASPRIT_BUMRAH}.svg`);
    expect(metaMcGrath.classification).toBe('GENERATED_ILLUSTRATION');
    expect(metaMcGrath.src).toBe(`/assets/players/${CANONICAL_BENCHMARK_UUIDS.GLENN_MCGRATH}.svg`);

    // Unknown player falls back to generic 2D cartoon avatar
    expect(metaUnknown.classification).toBe('GENERIC_AVATAR');
    expect(metaUnknown.src).toContain('data:image/svg+xml');
  });

  it('resolves correct 2D cartoon faces for talent pool benchmark players', () => {
    const playersToTest = [
      { id: 'f1e20000-0004-4000-8000-000000000004', name: 'Glenn McGrath' },
      { id: 'f1e20000-0005-4000-8000-000000000005', name: 'Muttiah Muralitharan' },
      { id: 'f1e10000-0003-4000-8000-000000000003', name: 'Jasprit Bumrah' },
      { id: 'f1e20000-0001-4000-8000-000000000001', name: 'Sachin Tendulkar' },
      { id: 'f1e20000-0053-4000-8000-000000000053', name: 'Adam Parore' },
      { id: 'f1e20000-006c-4000-8000-00000000006c', name: 'Romesh Kaluwitharana' },
    ];

    for (const p of playersToTest) {
      const meta = resolvePlayerImage({ id: p.id, fullName: p.name });
      expect(meta.classification).toBe('GENERATED_ILLUSTRATION');
      expect(meta.src).toBe(`/assets/players/${p.id}.svg`);
    }

    // Name-only resolution when ID is omitted
    const metaByName = resolvePlayerImage({ fullName: 'Sachin Tendulkar' });
    expect(metaByName.src).toBe('/assets/players/f1e20000-0001-4000-8000-000000000001.svg');
    expect(metaByName.classification).toBe('GENERATED_ILLUSTRATION');
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

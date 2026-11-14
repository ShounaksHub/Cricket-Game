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

  it('resolves registered benchmark players to individual realistic portraits and unknown players to realistic generic fallback', () => {
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
      primaryRole: 'PACE_BOWLER',
      primaryNationality: 'India',
    });

    // Registered players with authentic realistic portraits
    expect(metaBumrah.classification).toBe('VERIFIED_AUTHENTIC');
    expect(metaBumrah.src).toContain('/assets/players/realistic/');
    expect(metaMcGrath.classification).toBe('VERIFIED_AUTHENTIC');
    expect(metaMcGrath.src).toContain('/assets/players/realistic/');

    // Unknown player falls back to realistic generic role-based image
    expect(metaUnknown.classification).toBe('GENERIC_AVATAR');
    expect(metaUnknown.src).toBe('/assets/players/realistic/generic-fast-bowler.jpg');
  });

  it('resolves individual realistic portraits or role-based realistic fallbacks for talent pool benchmark players', () => {
    // Individual realistic portraits
    const bumrahMeta = resolvePlayerImage({ id: 'f1e10000-0003-4000-8000-000000000003', fullName: 'Jasprit Bumrah' });
    expect(bumrahMeta.classification).toBe('VERIFIED_AUTHENTIC');
    expect(bumrahMeta.src).toBe('/assets/players/realistic/f1e10000-0003-4000-8000-000000000003.png');

    const mcgrathMeta = resolvePlayerImage({ id: 'f1e20000-0004-4000-8000-000000000004', fullName: 'Glenn McGrath' });
    expect(mcgrathMeta.classification).toBe('VERIFIED_AUTHENTIC');
    expect(mcgrathMeta.src).toBe('/assets/players/realistic/f1e20000-0004-4000-8000-000000000004.png');

    const tendulkarMeta = resolvePlayerImage({ id: 'f1e20000-0001-4000-8000-000000000001', fullName: 'Sachin Tendulkar' });
    expect(tendulkarMeta.classification).toBe('VERIFIED_AUTHENTIC');
    expect(tendulkarMeta.src).toBe('/assets/players/realistic/f1e20000-0001-4000-8000-000000000001.png');

    // Name-only resolution when ID is omitted
    const metaByName = resolvePlayerImage({ fullName: 'Sachin Tendulkar' });
    expect(metaByName.src).toBe('/assets/players/realistic/f1e20000-0001-4000-8000-000000000001.png');
    expect(metaByName.classification).toBe('VERIFIED_AUTHENTIC');

    // Dedicated realistic portrait from Batch 2
    const paroreMeta = resolvePlayerImage({
      id: 'f1e20000-0053-4000-8000-000000000053',
      fullName: 'Adam Parore',
      primaryRole: 'WICKETKEEPER_BATTER',
    });
    expect(paroreMeta.classification).toBe('VERIFIED_AUTHENTIC');
    expect(paroreMeta.src).toBe('/assets/players/realistic/f1e20000-0053-4000-8000-000000000053.jpg');

    // Fallback to realistic role-based archetype for unregistered player
    const unknownKeeperMeta = resolvePlayerImage({
      id: '00000000-0000-0000-0000-000000000099',
      fullName: 'Unregistered Club Keeper',
      primaryRole: 'WICKETKEEPER_BATTER',
    });
    expect(unknownKeeperMeta.classification).toBe('GENERIC_AVATAR');
    expect(unknownKeeperMeta.src).toBe('/assets/players/realistic/generic-wicketkeeper.jpg');
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

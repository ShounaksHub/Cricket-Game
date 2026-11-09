import type { MatchSimulationConfig } from '../contracts/types.js';

/**
 * Universal UTF-8 byte encoder supporting browser and Node runtimes.
 */
function toUtf8Bytes(str: string): number[] {
  const g = typeof globalThis !== 'undefined' ? (globalThis as any) : undefined;
  if (g && typeof g.TextEncoder !== 'undefined') {
    return Array.from(new g.TextEncoder().encode(str) as Uint8Array);
  }
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c < 0x80) {
      bytes.push(c);
    } else if (c < 0x800) {
      bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else if (c < 0xd800 || c >= 0xe000) {
      bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    } else {
      i++;
      c = 0x10000 + (((c & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      bytes.push(
        0xf0 | (c >> 18),
        0x80 | ((c >> 12) & 0x3f),
        0x80 | ((c >> 6) & 0x3f),
        0x80 | (c & 0x3f),
      );
    }
  }
  return bytes;
}

/**
 * Pure TypeScript, zero-dependency SHA-256 implementation (FIPS 180-4).
 * Ensures 100% isomorphic execution across Node.js, Web Workers,
 * and browsers without requiring 'node:crypto' or browser globals.
 */
export function sha256(input: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const bytes = toUtf8Bytes(input);
  const bitLength = bytes.length * 8;

  // Append 0x80 (1 bit followed by zeros)
  bytes.push(0x80);
  // Pad with 0x00 until (length % 64) === 56
  while (bytes.length % 64 !== 56) {
    bytes.push(0);
  }

  // Pack bytes into 32-bit big-endian words
  const words: number[] = [];
  for (let i = 0; i < bytes.length; i++) {
    words[i >> 2] = (words[i >> 2] ?? 0) | (bytes[i] << ((3 - (i % 4)) * 8));
  }

  // Append 64-bit length in bits (big-endian)
  const highBits = Math.floor(bitLength / 0x100000000);
  const lowBits = bitLength >>> 0;
  words.push(highBits);
  words.push(lowBits);

  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
    0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
    0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
    0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
    0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
    0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  for (let j = 0; j < words.length; j += 16) {
    const w = words.slice(j, j + 16);
    const oldHash = [...hash];

    for (let i = 0; i < 64; i++) {
      let temp1: number;
      if (i < 16) {
        temp1 =
          hash[7] +
          (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) +
          ((hash[4] & hash[5]) ^ (~hash[4] & hash[6])) +
          k[i] +
          w[i];
      } else {
        const w15 = w[i - 15];
        const w2 = w[i - 2];
        const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
        const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
        temp1 =
          hash[7] +
          (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) +
          ((hash[4] & hash[5]) ^ (~hash[4] & hash[6])) +
          k[i] +
          w[i];
      }

      const temp2 =
        (rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22)) +
        ((hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]));

      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + temp1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (temp1 + temp2) | 0;
    }

    for (let i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  let result = '';
  for (let i = 0; i < 8; i++) {
    for (let j = 3; j >= 0; j--) {
      const b = (hash[i] >>> (j * 8)) & 0xff;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

/**
 * Computes an immutable SHA-256 Initial State Hash (H0) for a match.
 * Guarantees that any variation in lineups, format, pitch, or seeds
 * produces a completely distinct match fingerprint.
 */
export function generateInitialStateHash(config: MatchSimulationConfig): string {
  const canonicalPayload = {
    matchId: config.matchId,
    format: config.format,
    seed: config.seed.toString(),
    versions: config.versions,
    stadiumId: config.stadiumId,
    pitchType: config.pitchType,
    conditions: config.conditions,
    team1: {
      id: config.team1.id,
      name: config.team1.name,
      lineup: config.team1.lineup.map((s) => ({
        playerId: s.playerId,
        battingOrder: s.battingOrder,
        isCaptain: !!s.isCaptain,
        isViceCaptain: !!s.isViceCaptain,
        isDesignatedWicketkeeper: !!s.isDesignatedWicketkeeper,
        bowlingPriority: s.bowlingPriority ?? null,
      })),
    },
    team2: {
      id: config.team2.id,
      name: config.team2.name,
      lineup: config.team2.lineup.map((s) => ({
        playerId: s.playerId,
        battingOrder: s.battingOrder,
        isCaptain: !!s.isCaptain,
        isViceCaptain: !!s.isViceCaptain,
        isDesignatedWicketkeeper: !!s.isDesignatedWicketkeeper,
        bowlingPriority: s.bowlingPriority ?? null,
      })),
    },
  };

  return sha256(JSON.stringify(canonicalPayload));
}

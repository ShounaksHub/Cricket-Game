/**
 * SplitMix64 Pseudo-Random Number Generator.
 *
 * Implements a fast, 64-bit splittable PRNG with period 2^64.
 * Guaranteed bit-exact identical sequences across Node.js, Web Workers,
 * and browser runtimes regardless of platform architecture.
 */
export class DeterministicPRNG {
  private state: bigint;

  constructor(seed: bigint | number | string) {
    if (typeof seed === 'bigint') {
      this.state = seed;
    } else if (typeof seed === 'number') {
      this.state = BigInt(Math.floor(seed));
    } else {
      this.state = BigInt(seed);
    }
  }

  /**
   * Generates next 64-bit unsigned BigInt and advances internal state.
   */
  public nextBigInt(): bigint {
    this.state = (this.state + 0x9e3779b97f4a7c15n) & 0xffffffffffffffffn;
    let z = this.state;
    z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & 0xffffffffffffffffn;
    z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & 0xffffffffffffffffn;
    z = (z ^ (z >> 31n)) & 0xffffffffffffffffn;
    return z;
  }

  /**
   * Generates next double-precision floating-point number in [0.0, 1.0).
   */
  public nextFloat(): number {
    const raw = this.nextBigInt();
    // 53 bits of precision for IEEE 754 float
    const mantissa = Number(raw & 0x001fffffffffffffn);
    return mantissa / 0x0020000000000000;
  }

  /**
   * Generates a random integer in inclusive range [min, max].
   */
  public nextInt(min: number, max: number): number {
    if (min > max) {
      throw new Error(`min (${min}) cannot be greater than max (${max})`);
    }
    const range = max - min + 1;
    return min + Math.floor(this.nextFloat() * range);
  }

  /**
   * Generates standard normal (Gaussian) variate via Box-Muller transform.
   */
  public nextGaussian(mean = 0, stdDev = 1): number {
    let u1 = 0;
    let u2 = 0;
    while (u1 <= 1e-15) {
      u1 = this.nextFloat();
    }
    u2 = this.nextFloat();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z0 * stdDev;
  }

  /**
   * Returns copy of current internal state.
   */
  public getState(): bigint {
    return this.state;
  }

  /**
   * Clones this generator at its exact current state.
   */
  public clone(): DeterministicPRNG {
    return new DeterministicPRNG(this.state);
  }
}

/**
 * Derives a dedicated 64-bit seed for an individual delivery.
 * Combines match seed, innings, over, and ball without collision.
 */
export function deriveDeliverySeed(
  matchSeed: bigint,
  inningsNumber: number,
  overNumber: number,
  ballInOver: number
): bigint {
  const innComponent = BigInt(inningsNumber) << 32n;
  const overComponent = BigInt(overNumber) << 16n;
  const ballComponent = BigInt(ballInOver);
  const combined = (matchSeed ^ innComponent ^ overComponent ^ ballComponent) & 0xffffffffffffffffn;

  // Run SplitMix mixing step
  let z = (combined + 0x9e3779b97f4a7c15n) & 0xffffffffffffffffn;
  z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & 0xffffffffffffffffn;
  z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & 0xffffffffffffffffn;
  return (z ^ (z >> 31n)) & 0xffffffffffffffffn;
}

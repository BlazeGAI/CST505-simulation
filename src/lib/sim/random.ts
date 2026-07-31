/**
 * Deterministic pseudo-random number generator shared by every simulation
 * module. Given the same seed, `SeededRandom` produces the same sequence of
 * values on every machine and every run — this is what makes "golden seed"
 * tests and student-reproducible traces possible.
 *
 * Algorithm: mulberry32 (public domain). Chosen for its small, auditable
 * implementation and good statistical behavior for instructional
 * simulations — this is not a cryptographic RNG and must never be used for
 * anything security-sensitive.
 */
export class SeededRandom {
  private state: number;
  readonly seed: number;

  constructor(seed: number) {
    if (!Number.isFinite(seed)) {
      throw new Error(`SeededRandom seed must be a finite number, got ${seed}`);
    }
    this.seed = seed >>> 0;
    this.state = seed >>> 0;
  }

  /** Returns the next float in [0, 1). */
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Returns an integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    if (max < min) throw new Error(`int(min, max): max (${max}) < min (${min})`);
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** Returns a float in [min, max). */
  float(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Returns true with the given probability (default 0.5). */
  bool(probability = 0.5): boolean {
    return this.next() < probability;
  }

  /** Returns a uniformly chosen element from a non-empty array. */
  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error("pick() requires a non-empty array");
    return items[this.int(0, items.length - 1)];
  }

  /** Returns a new array containing a Fisher-Yates shuffle of `items`. */
  shuffle<T>(items: readonly T[]): T[] {
    const result = items.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /** Creates an independent child generator, deterministic from this one. */
  fork(label: string): SeededRandom {
    let hash = this.seed;
    for (let i = 0; i < label.length; i++) {
      hash = (Math.imul(hash, 31) + label.charCodeAt(i)) | 0;
    }
    return new SeededRandom(hash >>> 0);
  }
}

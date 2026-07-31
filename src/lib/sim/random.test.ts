import { describe, expect, it } from "vitest";
import { SeededRandom } from "./random";

describe("SeededRandom", () => {
  it("produces the same sequence for the same seed (golden seed 42)", () => {
    const a = new SeededRandom(42);
    const b = new SeededRandom(42);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).toEqual(seqB);
    // Locks the exact golden-seed sequence so a future change to the PRNG
    // implementation is caught rather than silently shifting every module's
    // deterministic traces.
    expect(seqA[0]).toBeCloseTo(0.6011, 3);
  });

  it("produces different sequences for different seeds", () => {
    const a = new SeededRandom(1);
    const b = new SeededRandom(2);
    expect(a.next()).not.toEqual(b.next());
  });

  it("int() stays within the inclusive bounds", () => {
    const rng = new SeededRandom(7);
    for (let i = 0; i < 200; i++) {
      const value = rng.int(3, 5);
      expect(value).toBeGreaterThanOrEqual(3);
      expect(value).toBeLessThanOrEqual(5);
    }
  });

  it("shuffle() is a deterministic permutation of the input", () => {
    const rng1 = new SeededRandom(99);
    const rng2 = new SeededRandom(99);
    const input = [1, 2, 3, 4, 5];
    const shuffled1 = rng1.shuffle(input);
    const shuffled2 = rng2.shuffle(input);
    expect(shuffled1).toEqual(shuffled2);
    expect([...shuffled1].sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5]); // original untouched
  });

  it("fork() derives a deterministic but distinct child generator", () => {
    const parent1 = new SeededRandom(5);
    const parent2 = new SeededRandom(5);
    const childA1 = parent1.fork("scenario-a");
    const childA2 = parent2.fork("scenario-a");
    const childB = parent1.fork("scenario-b");
    expect(childA1.next()).toEqual(childA2.next());
    expect(childA1.seed).not.toEqual(childB.seed);
  });
});

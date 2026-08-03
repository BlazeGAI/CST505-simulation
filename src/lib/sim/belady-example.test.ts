import { describe, expect, it } from "vitest";
import { computeBeladyComparison, computeBeladyComparisons } from "./belady-example";

describe("Belady's anomaly reference (fixed classic string)", () => {
  it("reproduces the textbook anomaly: FIFO faults increase from 3 to 4 frames", () => {
    const [threeFrames, fourFrames] = computeBeladyComparisons();
    expect(threeFrames.fifoFaults).toBe(9);
    expect(fourFrames.fifoFaults).toBe(10);
    expect(fourFrames.fifoFaults).toBeGreaterThan(threeFrames.fifoFaults);
  });

  it("optimal never gets worse with more frames (monotonic in frame count)", () => {
    const [threeFrames, fourFrames] = computeBeladyComparisons();
    expect(threeFrames.optimalFaults).toBe(7);
    expect(fourFrames.optimalFaults).toBe(6);
    expect(fourFrames.optimalFaults).toBeLessThanOrEqual(threeFrames.optimalFaults);
  });

  it("optimal never faults more than FIFO at the same frame count", () => {
    for (const frameCount of [3, 4]) {
      const comparison = computeBeladyComparison(frameCount);
      expect(comparison.optimalFaults).toBeLessThanOrEqual(comparison.fifoFaults);
    }
  });

  it("is deterministic and requires no seed", () => {
    expect(computeBeladyComparison(3)).toEqual(computeBeladyComparison(3));
  });
});

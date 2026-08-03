import { describe, expect, it } from "vitest";
import { runSimulation } from "./engine";
import { virtualMemoryModule, ASSESSED_SEED } from "./virtual-memory";

function run(policy: "fifo" | "lru" | "clock", frames: number, isolateAnalytics = false) {
  return runSimulation(virtualMemoryModule, { policy, frames, isolateAnalytics }, ASSESSED_SEED);
}

describe("virtualMemoryModule golden seed (assessed seed 100)", () => {
  it("at 4 frames, LRU faults less than FIFO despite an identical reference string", () => {
    const fifo = run("fifo", 4);
    const lru = run("lru", 4);
    expect(fifo.metrics).toMatchObject({ frames: 4, totalRefs: 54, faults: 29, hits: 25 });
    expect(lru.metrics).toMatchObject({ frames: 4, totalRefs: 54, faults: 28, hits: 26 });
    expect(lru.metrics.faults).toBeLessThan(fifo.metrics.faults);
  });

  it("Clock costs more faults than true LRU at a tight frame count (3), matching at looser counts", () => {
    const clock3 = run("clock", 3);
    const lru3 = run("lru", 3);
    expect(clock3.metrics.faults).toBeGreaterThan(lru3.metrics.faults);

    const clock6 = run("clock", 6);
    const lru6 = run("lru", 6);
    expect(clock6.metrics.faults).toBe(lru6.metrics.faults);
  });

  it("more frames never increases faults for any of these three policies on this reference string", () => {
    for (const policy of ["fifo", "lru", "clock"] as const) {
      const faults3 = run(policy, 3).metrics.faults;
      const faults4 = run(policy, 4).metrics.faults;
      const faults6 = run(policy, 6).metrics.faults;
      expect(faults4).toBeLessThanOrEqual(faults3);
      expect(faults6).toBeLessThanOrEqual(faults4);
    }
  });

  it("flags thrashing with the underlying window fault rate exposed, not just a bare label", () => {
    const result = run("fifo", 3);
    expect(result.metrics.thrashingDetectedAtIndex).toBeGreaterThanOrEqual(0);
    expect(result.metrics.thrashingWindowFaultRate).toBeGreaterThanOrEqual(0.6);
  });

  it("isolateAnalytics protects hot pages through the analytics sweep, improving the post-sweep recovery hit rate", () => {
    const off = run("lru", 4, false);
    const on = run("lru", 4, true);
    expect(off.metrics).toMatchObject({ recoveryHits: 2, recoveryFaults: 4, controlApplied: 0 });
    expect(on.metrics).toMatchObject({ recoveryHits: 3, recoveryFaults: 3, controlApplied: 1 });
    expect(on.metrics.recoveryHits).toBeGreaterThan(off.metrics.recoveryHits);
    expect(on.metrics.faults).toBeLessThan(off.metrics.faults);
  });

  it("is deterministic: identical params and seed produce identical results", () => {
    expect(run("clock", 4)).toEqual(run("clock", 4));
  });

  it("rejects an out-of-range frame count", () => {
    expect(() => runSimulation(virtualMemoryModule, { policy: "lru", frames: 20, isolateAnalytics: false }, 1)).toThrow();
  });
});
